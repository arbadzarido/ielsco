"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connectApi } from "@/lib/connect/api";
import type { CallInfo } from "@/lib/connect/types";

export type Media = "asking" | "ready" | "mic_denied" | "no_device";
export type LinkState = "connecting" | "connected" | "reconnecting" | "failed";

// One Quick Match call: peer-to-peer WebRTC, handshake relayed through the quick_match_signal(s) RPCs (polling).
// The caller (who joined second) sends the offer. The microphone is required; the camera is optional and starts OFF:
// a video transceiver is created up front so turning the camera on/off is a replaceTrack(), never a renegotiation.
// The call ends at the server's expires_at (clock skew corrected with server_now), when either side leaves, or when
// the server reports it ended (timeout, block, the other side left). A closed tab is noticed by the other side's
// connection state and, at the latest, by the server's expiry.
export function useCall(supabase: SupabaseClient, info: CallInfo, onEnded: () => void) {
  const [media, setMedia] = useState<Media>("asking");
  const [link, setLink] = useState<LinkState>("connecting");
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localVideo, setLocalVideo] = useState<MediaStream | null>(null);
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(info.expires_at).getTime() - new Date(info.server_now).getTime()));
  const pc = useRef<RTCPeerConnection | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const cam = useRef<MediaStreamTrack | null>(null);
  const videoTx = useRef<RTCRtpTransceiver | null>(null);
  const done = useRef(false);
  const skew = useRef(new Date(info.server_now).getTime() - Date.now());

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    pc.current?.close();
    mic.current?.getTracks().forEach((t) => t.stop());
    cam.current?.stop();
    onEnded();
  }, [onEnded]);

  const hangUp = useCallback(async (reason: "left" | "skipped" | "failed" | "reported" | "blocked" = "left") => {
    if (done.current) return;
    try { await connectApi.qmSignal(supabase, info.id, "bye", {}); } catch { /* the call may already be over */ }
    try { await connectApi.qmEnd(supabase, info.id, reason); } catch { /* ended server-side already */ }
    finish();
  }, [supabase, info.id, finish]);

  // Countdown from the server's limit.
  useEffect(() => {
    const expires = new Date(info.expires_at).getTime();
    const t = setInterval(() => {
      const left = Math.max(0, expires - (Date.now() + skew.current));
      setRemaining(left);
      if (left === 0) finish();
    }, 500);
    return () => clearInterval(t);
  }, [info.expires_at, finish]);

  useEffect(() => {
    let cancelled = false;
    let after = 0;
    const pendingIce: RTCIceCandidateInit[] = [];
    const timers: ReturnType<typeof setInterval>[] = [];
    const send = (kind: "offer" | "answer" | "ice", payload: unknown) => connectApi.qmSignal(supabase, info.id, kind, payload).catch(() => undefined);

    // The server is the source of truth for the call ending (timeout, block, other side gone). Started before the
    // microphone prompt, so a member whose mic is blocked still sees the call end.
    timers.push(setInterval(async () => {
      try { if ((await connectApi.qmCall(supabase, info.id)).ended) finish(); } catch { /* keep going */ }
    }, 5000));

    (async () => {
      let ice: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
      try {
        const r = await fetch("/api/connect/ice", { cache: "no-store" });
        if (r.ok) ice = { iceServers: (await r.json()).iceServers };
      } catch { /* fall back to public STUN */ }
      try {
        mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      } catch (e) {
        if (!cancelled) setMedia((e as DOMException).name === "NotFoundError" ? "no_device" : "mic_denied");
        return;
      }
      if (cancelled) return;
      setMedia("ready");

      const peer = new RTCPeerConnection(ice);
      pc.current = peer;
      mic.current.getAudioTracks().forEach((t) => peer.addTrack(t, mic.current!));
      if (info.mode === "video") videoTx.current = peer.addTransceiver("video", { direction: "sendrecv" });
      const remote = new MediaStream();
      setRemoteStream(remote);
      peer.ontrack = (ev) => { remote.addTrack(ev.track); setRemoteStream(new MediaStream(remote.getTracks())); };
      peer.onicecandidate = (ev) => { if (ev.candidate) send("ice", ev.candidate.toJSON()); };
      peer.onconnectionstatechange = async () => {
        const s = peer.connectionState;
        if (s === "connected") setLink("connected");
        else if (s === "disconnected") setLink("reconnecting");
        else if (s === "failed") {
          setLink("reconnecting");
          if (info.role === "caller") {
            peer.restartIce();
            const offer = await peer.createOffer({ iceRestart: true });
            await peer.setLocalDescription(offer);
            send("offer", offer);
          }
          setTimeout(() => { if (peer.connectionState === "failed") setLink("failed"); }, 15000);
        }
      };

      if (info.role === "caller") {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await send("offer", offer);
      }

      // Handshake + "bye" via polling: fast while connecting, slower once connected.
      let polling = false;
      const poll = async () => {
        if (polling || done.current) return;
        polling = true;
        try {
          const signals = await connectApi.qmSignals(supabase, info.id, after);
          for (const s of signals) {
            after = Math.max(after, s.id);
            if (s.kind === "bye") return finish();
            if (s.kind === "offer") {
              await peer.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await send("answer", answer);
              while (pendingIce.length) await peer.addIceCandidate(pendingIce.shift());
            } else if (s.kind === "answer") {
              await peer.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
              while (pendingIce.length) await peer.addIceCandidate(pendingIce.shift());
            } else if (s.kind === "ice") {
              const c = s.payload as RTCIceCandidateInit;
              if (peer.remoteDescription) await peer.addIceCandidate(c).catch(() => undefined);
              else pendingIce.push(c);
            }
          }
        } catch { /* transient; the next poll retries */ } finally { polling = false; }
      };
      timers.push(setInterval(() => { if (peer.connectionState !== "connected") poll(); }, 1000));
      timers.push(setInterval(poll, 3000));
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearInterval);
    };
  }, [supabase, info.id, info.mode, info.role, finish]);

  const toggleMute = () => {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = async () => {
    if (!videoTx.current) return;
    setCameraError(null);
    if (camera) {
      await videoTx.current.sender.replaceTrack(null);
      cam.current?.stop();
      cam.current = null;
      setLocalVideo(null);
      setCamera(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      cam.current = s.getVideoTracks()[0];
      await videoTx.current.sender.replaceTrack(cam.current);
      setLocalVideo(s);
      setCamera(true);
    } catch {
      setCameraError("Camera blocked or not found. You can keep talking with audio only.");
    }
  };

  return { media, link, muted, camera, cameraError, remoteStream, localVideo, remaining, toggleMute, toggleCamera, hangUp };
}

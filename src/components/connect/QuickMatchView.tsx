"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, SkipForward, Video, VideoOff } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { Notice } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, cardGloss, focusRing } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import type { CallInfo, CallMode, CallStyle } from "@/lib/connect/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Chips, ConnectFrame, LoadGate, SafetyMenu, useLoad } from "./shared";
import { useCall } from "./useCall";
import { ElcoMascot } from "@/components/elco/ElcoMascot";

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function MediaEl({ stream, kind, muted, className }: { stream: MediaStream | null; kind: "audio" | "video"; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return kind === "audio"
    ? <audio ref={ref} autoPlay />
    : <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function CallScreen({ ctx, info, onEnded }: { ctx: DashboardCtx; info: CallInfo; onEnded: () => void }) {
  const c = useCall(ctx.supabase, info, onEnded);
  const hasRemoteVideo = c.remoteVideo;
  const ctrl = cn("inline-flex h-12 w-12 items-center justify-center rounded-full border", focusRing);

  if (c.media === "mic_denied" || c.media === "no_device") {
    return (
      <section className={cn(cardGloss, "space-y-4 p-6")} data-testid="call-mic-error">
        <h2 className="text-xl font-bold">{c.media === "mic_denied" ? "Microphone access is blocked" : "No microphone found"}</h2>
        <p className="text-base text-[#2F4157]/70">Quick Match needs a microphone. Allow microphone access for this site in your browser settings, then start a new match.</p>
        <button type="button" onClick={() => c.hangUp("failed")} className={btnPrimary}>Leave this match</button>
      </section>
    );
  }

  return (
    <section className={cn(cardGloss, "space-y-5 p-6")} data-testid="call-screen" aria-label={`Call with ${info.other.display_name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={info.other.display_name} url={info.other.avatar_url} size={44} />
          <div>
            <p className="font-bold">{info.other.display_name}</p>
            <p className="text-sm text-[#2F4157]/65" role="status" data-testid="call-link">
              {c.media === "asking" ? "Waiting for microphone permission…" : { connecting: "Connecting…", connected: "Connected", reconnecting: "Reconnecting…", failed: "Connection failed. Your network may be blocking calls." }[c.link]}
            </p>
          </div>
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums" aria-label="Time left" data-testid="call-timer">{mmss(c.remaining)}</p>
      </div>
      {info.prompt && <div className="rounded-xl bg-[#F1F4F8] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#577E90]">Topic</p><p className="text-lg font-semibold">{info.prompt}</p></div>}
      {info.mode === "video" && (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[#1F2B3A]">
          <MediaEl stream={c.remoteStream} kind="video" className={cn("h-full w-full object-cover", !hasRemoteVideo && "hidden")} />
          {!hasRemoteVideo && <p className="absolute inset-0 flex items-center justify-center text-white/70">{info.other.display_name}&apos;s camera is off</p>}
          {c.localVideo && <MediaEl stream={c.localVideo} kind="video" muted className="absolute bottom-3 right-3 w-1/4 rounded-lg border border-white/40" />}
        </div>
      )}
      {info.mode === "voice" && <MediaEl stream={c.remoteStream} kind="audio" />}
      {c.cameraError && <p role="alert" className="text-sm text-[#B4383A]">{c.cameraError}</p>}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} aria-label={c.muted ? "Unmute" : "Mute"} className={cn(ctrl, c.muted ? "bg-[#2F4157] text-white" : "bg-white")}>{c.muted ? <MicOff /> : <Mic />}</button>
        {info.mode === "video" && (
          <button type="button" onClick={c.toggleCamera} aria-pressed={c.camera} aria-label={c.camera ? "Turn camera off" : "Turn camera on"} className={cn(ctrl, c.camera ? "bg-white" : "bg-[#2F4157] text-white")}>{c.camera ? <Video /> : <VideoOff />}</button>
        )}
        <button type="button" onClick={() => c.hangUp("skipped")} className={cn(btnSecondary)}><SkipForward size={16} /> Skip</button>
        <button type="button" onClick={() => c.hangUp("left")} className={cn(btnPrimary, "bg-[#B4383A] hover:bg-[#9a2f31]")} data-testid="call-end"><PhoneOff size={16} /> End</button>
        <SafetyMenu supabase={ctx.supabase} person={info.other} context="call" contextId={info.id} onBlocked={() => c.hangUp("blocked")} />
      </div>
      <p className="text-center text-sm text-[#2F4157]/55">Calls are never recorded. Your camera stays off unless you turn it on. The call ends automatically after 8 minutes.</p>
    </section>
  );
}

function AfterCall({ ctx, info, onDone }: { ctx: DashboardCtx; info: CallInfo; onDone: () => void }) {
  const [enjoyed, setEnjoyed] = useState<boolean | null>(null);
  const [connect, setConnect] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await connectApi.qmFeedback(ctx.supabase, info.id, !!connect, !!enjoyed);
      track("connect_call_feedback", { mode: info.mode, connect: !!connect, mutual: r === "connected" });
      setResult(r === "connected" ? `You and ${info.other.display_name} both said yes. You're connected and can message each other.`
        : connect ? `Saved. If ${info.other.display_name} also says yes, you'll be connected.` : "Thanks for the feedback.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const yesNo = (v: boolean | null, set: (b: boolean) => void, legend: string) => (
    <Chips legend={legend} single options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={v === null ? [] : [v ? "yes" : "no"]} onChange={(x) => set(x[0] === "yes")} />
  );
  return (
    <section className={cn(cardGloss, "space-y-5 p-6")} data-testid="after-call">
      <h2 className="text-xl font-bold">Call ended{info.end_reason === "timeout" ? " (8 minutes)" : ""}</h2>
      {result ? (
        <>
          <p role="status" className="text-base" data-testid="after-call-result">{result}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onDone} className={btnPrimary}>Find another match</button>
            <Link href="/dashboard/connect/connections" className={btnSecondary}>My connections</Link>
          </div>
        </>
      ) : (
        <>
          {yesNo(enjoyed, setEnjoyed, "Did you enjoy the conversation?")}
          {yesNo(connect, setConnect, `Would you like to connect with ${info.other.display_name}?`)}
          <p className="text-sm text-[#2F4157]/60">You&apos;re only connected if you both say yes. {info.other.display_name} won&apos;t see your answer otherwise.</p>
          {error && <p role="alert" className="text-[#B4383A]">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy || connect === null} onClick={submit} className={btnPrimary} data-testid="after-call-submit">Send</button>
            <SafetyMenu supabase={ctx.supabase} person={info.other} context="call" contextId={info.id} />
          </div>
        </>
      )}
    </section>
  );
}

type Phase = { p: "idle" } | { p: "waiting" } | { p: "call"; info: CallInfo } | { p: "after"; info: CallInfo };

export function QuickMatchView(ctx: DashboardCtx) {
  const status = useLoad(() => connectApi.qmPoll(ctx.supabase), [ctx.supabase]);
  const [mode, setMode] = useState<CallMode>("voice");
  const [style, setStyle] = useState<CallStyle>("ai_topic");
  const [phase, setPhase] = useState<Phase>({ p: "idle" });
  const [error, setError] = useState<string | null>(null);

  const openCall = useCallback(async (id: string) => {
    const info = await connectApi.qmCall(ctx.supabase, id);
    track("connect_quick_match_matched", { mode: info.mode });
    setPhase(info.ended ? { p: "after", info } : { p: "call", info });
  }, [ctx.supabase]);

  // Resume after a reload: an active call or a queue entry.
  useEffect(() => {
    if (status.state.s !== "ready") return;
    const s = status.state.data;
    if (s.call_id) openCall(s.call_id).catch(() => undefined);
    else if (s.waiting) { setMode(s.waiting.mode); setStyle(s.waiting.style); setPhase({ p: "waiting" }); }
  }, [status.state, openCall]);

  // While waiting: keep the queue entry alive and pick up a match.
  useEffect(() => {
    if (phase.p !== "waiting") return;
    const t = setInterval(async () => {
      try {
        const s = await connectApi.qmPoll(ctx.supabase);
        if (s.call_id) await openCall(s.call_id);
        else if (!s.waiting) {
          const r = await connectApi.qmJoin(ctx.supabase, mode, style);
          if (r.status === "matched" && r.call_id) await openCall(r.call_id);
        }
      } catch (e) { setError((e as Error).message); setPhase({ p: "idle" }); }
    }, 3000);
    return () => clearInterval(t);
  }, [phase.p, ctx.supabase, mode, style, openCall]);

  const start = async () => {
    setError(null);
    try {
      const r = await connectApi.qmJoin(ctx.supabase, mode, style);
      if (r.status === "matched" && r.call_id) await openCall(r.call_id);
      else setPhase({ p: "waiting" });
    } catch (e) { setError((e as Error).message); }
  };
  const cancel = async () => { await connectApi.qmLeave(ctx.supabase).catch(() => undefined); setPhase({ p: "idle" }); };
  const ended = useCallback(async () => {
    if (phase.p !== "call") return;
    const info = await connectApi.qmCall(ctx.supabase, phase.info.id).catch(() => phase.info);
    setPhase({ p: "after", info });
  }, [phase, ctx.supabase]);

  return (
    <ConnectFrame title="Quick Match" description="A short one-to-one conversation with another member: voice or video, up to 8 minutes. Connect afterwards only if you both want to.">
      <LoadGate state={status.state} onRetry={status.reload} />
      {status.state.s === "ready" && !status.state.data.enabled && (
        <section data-testid="qm-disabled" className={cn(cardGloss, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center")}>
          <ElcoMascot mood="neutral" size={88} />
          <div className="space-y-3">
          <h2 className="text-xl font-bold">Quick Match isn&apos;t switched on yet</h2>
          <p className="text-base text-[#2F4157]/70">Live voice and video calls are being prepared and tested. Until then, you can meet people through <Link href="/dashboard/connect/discover" className="font-semibold underline">Discover</Link> and <Link href="/dashboard/connect/rooms" className="font-semibold underline">community rooms</Link>.</p>
          </div>
        </section>
      )}
      {status.state.s === "ready" && status.state.data.enabled && !status.state.data.ready && (
        <Notice testId="qm-passport">Finish your <Link href="/dashboard/connect/passport" className="font-semibold underline">Passport</Link> first (display name, Connect guidelines, 18+ confirmation).</Notice>
      )}
      {status.state.s === "ready" && status.state.data.enabled && status.state.data.ready && (
        <>
          {error && <p role="alert" className="text-[#B4383A]">{error}</p>}
          {phase.p === "idle" && (
            <section className={cn(cardGloss, "space-y-5 p-6")} data-testid="qm-setup">
              <Chips legend="Call type" single options={[{ value: "voice", label: "Voice" }, { value: "video", label: "Video (camera optional)" }]} value={[mode]} onChange={(v) => v[0] && setMode(v[0] as CallMode)} />
              <Chips legend="Conversation" single options={[{ value: "ai_topic", label: "Topic card (a suggested question)" }, { value: "free_talk", label: "Free talk" }]} value={[style]} onChange={(v) => v[0] && setStyle(v[0] as CallStyle)} />
              <p className="text-sm text-[#2F4157]/60">Topic cards come from IELSco&apos;s own question library. You won&apos;t be matched with someone you blocked or met in the last 24 hours.</p>
              <button type="button" onClick={start} className={btnPrimary} data-testid="qm-start">Start searching</button>
            </section>
          )}
          {phase.p === "waiting" && (
            <section className={cn(cardGloss, "space-y-4 p-6 text-center")} data-testid="qm-waiting">
              {/* Idle Elco while waiting: decorative only. The text below is the actual status (no match yet). */}
              <ElcoMascot mood="relaxed" size={96} className="mx-auto" />
              <p className="text-xl font-bold" role="status">Looking for someone to talk to…</p>
              <p className="text-base text-[#2F4157]/65">You&apos;ll be matched with the next member who starts a {mode} Quick Match. If nobody is online, nothing happens. You can cancel anytime.</p>
              <button type="button" onClick={cancel} className={btnSecondary}>Cancel</button>
            </section>
          )}
          {phase.p === "call" && <CallScreen ctx={ctx} info={phase.info} onEnded={ended} />}
          {phase.p === "after" && <AfterCall ctx={ctx} info={phase.info} onDone={() => setPhase({ p: "idle" })} />}
        </>
      )}
    </ConnectFrame>
  );
}

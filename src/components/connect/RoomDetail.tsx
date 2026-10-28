"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { btnPrimary, btnSecondary, card, cardGloss, tag } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { label } from "@/lib/connect/options";
import { formatInZone } from "@/lib/connect/time";
import type { Room } from "@/lib/connect/types";
import { LINKS } from "@/data/dashboard/config";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { STATE_LABEL } from "./RoomsView";
import { ConnectFrame, LoadGate, SafetyMenu, useLoad, when } from "./shared";

function HostPanel({ ctx, room, onChange }: { ctx: DashboardCtx; room: Room; onChange: () => void }) {
  const people = useLoad(() => connectApi.participants(ctx.supabase, room.id), [ctx.supabase, room.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = async (s: "published" | "draft" | "cancelled") => {
    if (s === "cancelled" && !window.confirm("Cancel this room for everyone? This can't be undone.")) return;
    setBusy(true); setError(null);
    try { await connectApi.setRoomStatus(ctx.supabase, room.id, s); onChange(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const ended = room.state === "completed" || room.state === "cancelled";
  return (
    <section className={cn(cardGloss, "space-y-4 p-6")} data-testid="host-panel">
      <h2 className="text-xl font-bold">You&apos;re hosting</h2>
      {!ended && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/connect/rooms/${room.id}/edit`} className={btnSecondary}>Edit</Link>
          {room.status === "draft" && <button type="button" disabled={busy} onClick={() => status("published")} className={btnPrimary} data-testid="room-publish-now">Publish</button>}
          {room.status === "published" && <button type="button" disabled={busy} onClick={() => status("draft")} className={btnSecondary}>Unpublish</button>}
          <button type="button" disabled={busy} onClick={() => status("cancelled")} className={cn(btnSecondary, "text-[#B4383A]")} data-testid="room-cancel">Cancel room</button>
        </div>
      )}
      {room.visibility === "unlisted" && room.status === "published" && <p className="text-sm text-[#2F4157]/65">Unlisted: share this page&apos;s link with the people you invite.</p>}
      {error && <p role="alert" className="text-[#B4383A]">{error}</p>}
      <div>
        <h3 className="mb-2 font-semibold">Registered ({room.registered_count}/{room.capacity})</h3>
        <LoadGate state={people.state} onRetry={people.reload} />
        {people.state.s === "ready" && (people.state.data.length === 0 ? <p className="text-base text-[#2F4157]/60">Nobody has registered yet.</p> : (
          <ul data-testid="participants" className="space-y-2">
            {people.state.data.map((p) => (
              <li key={p.id} className="flex items-center gap-2"><Avatar name={p.display_name} url={p.avatar_url} size={28} /> <span>{p.display_name}</span> <span className="text-sm text-[#2F4157]/50">· {when(p.registered_at)}</span></li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

function Meeting({ ctx, room }: { ctx: DashboardCtx; room: Room }) {
  const m = useLoad(() => connectApi.meeting(ctx.supabase, room.id), [ctx.supabase, room.id]);
  if (m.state.s !== "ready") return <LoadGate state={m.state} onRetry={m.reload} />;
  const d = m.state.data;
  if (!d) return null;
  return (
    <section data-testid="meeting-details" className={cn(card, "space-y-2 border-[#577E90]/40 bg-[#577E90]/5 p-5")}>
      <h2 className="text-lg font-bold">How to join</h2>
      {d.meeting_notes && <p className="whitespace-pre-line text-base">{d.meeting_notes}</p>}
      {d.meeting_url ? (
        <a href={d.meeting_url} target="_blank" rel="noopener noreferrer" className={btnPrimary}><ExternalLink size={16} /> Open {d.delivery === "discord" ? "on Discord" : "meeting link"}</a>
      ) : <p className="text-base text-[#2F4157]/65">The host hasn&apos;t added a link yet. Check back closer to the start.</p>}
      {d.delivery === "discord" && LINKS.circleDiscord && (
        <p className="text-sm text-[#2F4157]/65">Not on the IELS Discord yet? <a href={LINKS.circleDiscord} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Join the server</a> first.</p>
      )}
    </section>
  );
}

export function RoomDetail(ctx: DashboardCtx & { id: string }) {
  const data = useLoad(() => connectApi.room(ctx.supabase, ctx.id), [ctx.supabase, ctx.id]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const act = async (fn: () => Promise<string>, text: string | null) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (text) setMsg({ ok: true, text }); await data.reload(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  return (
    <ConnectFrame title={data.state.s === "ready" ? data.state.data.title : "Room"}>
      <Link href="/dashboard/connect/rooms" className={cn(btnSecondary, "w-max px-4 py-2 text-sm")}>← All rooms</Link>
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (() => {
        const r = data.state.data;
        const s = STATE_LABEL[r.state];
        const canRegister = !r.is_host && !r.is_registered && r.state === "open";
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className={cn(cardGloss, "space-y-4 p-6")} data-testid="room-detail">
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.cls)} data-testid="room-state">{s.text}</span>
                <span className={tag}>{label("category", r.category)}</span>
                <span className={tag}>Community room</span>
              </div>
              <dl className="grid gap-2 text-base sm:grid-cols-2">
                <div><dt className="text-sm font-semibold text-[#2F4157]/55">When</dt><dd>{formatInZone(r.starts_at, r.timezone)}</dd></div>
                <div><dt className="text-sm font-semibold text-[#2F4157]/55">Your time</dt><dd>{when(r.starts_at)}</dd></div>
                <div><dt className="text-sm font-semibold text-[#2F4157]/55">Duration</dt><dd>{r.duration_min} minutes</dd></div>
                <div><dt className="text-sm font-semibold text-[#2F4157]/55">Language</dt><dd>{label("language", r.language)}</dd></div>
                <div><dt className="text-sm font-semibold text-[#2F4157]/55">Seats</dt><dd>{r.registered_count} of {r.capacity} taken</dd></div>
                {r.registration_deadline && <div><dt className="text-sm font-semibold text-[#2F4157]/55">Registration closes</dt><dd>{formatInZone(r.registration_deadline, r.timezone)}</dd></div>}
              </dl>
              {r.topic && <p className="text-base"><span className="font-semibold">Topic:</span> {r.topic}</p>}
              {r.description && <p className="whitespace-pre-line text-base text-[#2F4157]/80">{r.description}</p>}
              <div className="flex items-center gap-3 border-t border-[#E3E7ED]/60 pt-4">
                <Avatar name={r.host.display_name} url={r.host.avatar_url} size={36} />
                <p className="flex-1 text-base">Hosted by <Link href={`/dashboard/connect/people/${r.host.id}`} className="font-semibold hover:underline">{r.host.display_name}</Link></p>
                {!r.is_host && <SafetyMenu supabase={ctx.supabase} person={r.host} context="room" contextId={r.id} onBlocked={data.reload} />}
              </div>
            </section>
            <div className="space-y-4">
              {msg && <p role="status" className={cn("text-base", !msg.ok && "text-[#B4383A]")}>{msg.text}</p>}
              {canRegister && (
                <button type="button" disabled={busy} className={cn(btnPrimary, "w-full")} data-testid="room-register"
                  onClick={() => act(async () => { const x = await connectApi.register(ctx.supabase, r.id); track("connect_room_registered", { category: r.category }); return x; }, null)}>Register</button>
              )}
              {!r.is_host && !r.is_registered && r.state !== "open" && <p className="text-base text-[#2F4157]/70" data-testid="room-unavailable">{r.state === "full" ? "This room is full." : r.state === "closed" ? "Registration has closed." : `This room is ${s.text.toLowerCase()}.`}</p>}
              {r.is_registered && (
                <div className="space-y-3">
                  <p className="text-base font-semibold text-[#2E6B4F]" data-testid="room-registered">You&apos;re registered.</p>
                  {r.status === "published" ? <Meeting ctx={ctx} room={r} /> : <p className="text-base text-[#2F4157]/65">The host unpublished this room, so joining details are hidden for now.</p>}
                  {!["completed", "cancelled"].includes(r.state) && (
                    <button type="button" disabled={busy} className={btnSecondary} data-testid="room-unregister" onClick={() => act(() => connectApi.unregister(ctx.supabase, r.id), "Registration cancelled.")}>Cancel registration</button>
                  )}
                </div>
              )}
              {r.is_host && <><Meeting ctx={ctx} room={r} /><HostPanel ctx={ctx} room={r} onChange={data.reload} /></>}
            </div>
          </div>
        );
      })()}
    </ConnectFrame>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { btnPrimary, btnSecondary, cardGloss, inputClass, labelClass } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { LANGUAGES, ROOM_CATEGORIES, TIMEZONES } from "@/lib/connect/options";
import { utcToZoned, zonedToUtc } from "@/lib/connect/time";
import type { MeetingDetails, Room, RoomInput } from "@/lib/connect/types";
import { LINKS } from "@/data/dashboard/config";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, useLoad } from "./shared";

type Draft = Omit<RoomInput, "starts_at" | "registration_deadline"> & { localStart: string; localDeadline: string };

function blank(prefill: { topic?: string; category?: string } = {}): Draft {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
  return { title: "", description: "", topic: (prefill.topic ?? "").slice(0, 120), category: ROOM_CATEGORIES.some((c) => c.value === prefill.category) ? prefill.category! : "english_practice", localStart: "", localDeadline: "", timezone: tz, duration_min: 60,
    capacity: 10, language: "en", visibility: "members", delivery: "discord", meeting_url: "", meeting_notes: "" };
}

function fromRoom(r: Room, m: MeetingDetails | null): Draft {
  return { title: r.title, description: r.description ?? "", topic: r.topic ?? "", category: r.category, timezone: r.timezone,
    localStart: utcToZoned(r.starts_at, r.timezone), localDeadline: r.registration_deadline ? utcToZoned(r.registration_deadline, r.timezone) : "",
    duration_min: r.duration_min, capacity: r.capacity, language: r.language, visibility: r.visibility,
    delivery: r.delivery === "external_link" ? "external_link" : "discord", meeting_url: m?.meeting_url ?? "", meeting_notes: m?.meeting_notes ?? "" };
}

function Editor({ ctx, roomId, initial, published }: { ctx: DashboardCtx; roomId: string | null; initial: Draft; published: boolean }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState(TIMEZONES);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  useEffect(() => { if (!TIMEZONES.includes(initial.timezone)) setZones([initial.timezone, ...TIMEZONES]); }, [initial.timezone]);

  const save = async (e: FormEvent, publish: boolean) => {
    e.preventDefault();
    setError(null);
    const starts = zonedToUtc(d.localStart, d.timezone);
    if (!starts) return setError("Choose a start date and time.");
    const deadline = d.localDeadline ? zonedToUtc(d.localDeadline, d.timezone) : null;
    setBusy(true);
    try {
      const { localStart: _s, localDeadline: _d, ...rest } = d;
      void _s; void _d;
      const id = await connectApi.saveRoom(ctx.supabase, roomId, { ...rest, starts_at: starts, registration_deadline: deadline, publish });
      if (roomId && publish && !published) await connectApi.setRoomStatus(ctx.supabase, roomId, "published");
      track("connect_room_saved", { created: !roomId, published: publish || published });
      router.push(`/dashboard/connect/rooms/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => save(e, published)} data-testid="room-form" className={cn(cardGloss, "space-y-5 p-6")} noValidate>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="rf-title" className={labelClass}>Title *</label>
          <input id="rf-title" required minLength={3} maxLength={120} value={d.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="Saturday English speaking hour" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="rf-desc" className={labelClass}>What will you do?</label>
          <textarea id="rf-desc" rows={4} maxLength={2000} value={d.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="rf-cat" className={labelClass}>Category</label>
          <select id="rf-cat" value={d.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
            {ROOM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rf-topic" className={labelClass}>Topic (optional)</label>
          <input id="rf-topic" maxLength={120} value={d.topic} onChange={(e) => set("topic", e.target.value)} className={inputClass} placeholder="Talking about your hometown" />
        </div>
        <div>
          <label htmlFor="rf-start" className={labelClass}>Starts *</label>
          <input id="rf-start" type="datetime-local" required value={d.localStart} onChange={(e) => set("localStart", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="rf-tz" className={labelClass}>Time zone</label>
          <select id="rf-tz" value={d.timezone} onChange={(e) => set("timezone", e.target.value)} className={inputClass}>{zones.map((z) => <option key={z}>{z}</option>)}</select>
        </div>
        <div>
          <label htmlFor="rf-dur" className={labelClass}>Duration (minutes)</label>
          <input id="rf-dur" type="number" min={15} max={240} step={15} value={d.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="rf-cap" className={labelClass}>Maximum participants</label>
          <input id="rf-cap" type="number" min={2} max={500} value={d.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="rf-deadline" className={labelClass}>Registration closes (optional)</label>
          <input id="rf-deadline" type="datetime-local" value={d.localDeadline} onChange={(e) => set("localDeadline", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="rf-lang" className={labelClass}>Main language</label>
          <select id="rf-lang" value={d.language} onChange={(e) => set("language", e.target.value)} className={inputClass}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rf-vis" className={labelClass}>Who can find it</label>
          <select id="rf-vis" value={d.visibility} onChange={(e) => set("visibility", e.target.value as Draft["visibility"])} className={inputClass}>
            <option value="members">All IELS members (listed in Rooms)</option>
            <option value="unlisted">Only people with the link</option>
          </select>
        </div>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-[#E3E7ED] p-4">
        <legend className="px-1 font-semibold">Where it happens</legend>
        <p className="text-sm text-[#2F4157]/65">IELSco handles registration; the meeting itself happens on Discord or another platform. Only you and registered members see the link and instructions.</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="radio" name="delivery" checked={d.delivery === "discord"} onChange={() => set("delivery", "discord")} /> IELS Discord</label>
          <label className="flex items-center gap-2"><input type="radio" name="delivery" checked={d.delivery === "external_link"} onChange={() => set("delivery", "external_link")} /> Another meeting link (Zoom, Meet…)</label>
        </div>
        <div>
          <label htmlFor="rf-url" className={labelClass}>{d.delivery === "discord" ? "Discord channel or event link" : "Meeting link"}</label>
          <input id="rf-url" type="url" inputMode="url" maxLength={500} value={d.meeting_url} onChange={(e) => set("meeting_url", e.target.value)} className={inputClass}
            placeholder={d.delivery === "discord" ? "https://discord.com/channels/…" : "https://"} />
          {d.delivery === "discord" && LINKS.circleDiscord && <p className="mt-1 text-sm text-[#2F4157]/60">Not on the IELS server yet? Registered members get the server invite too.</p>}
        </div>
        <div>
          <label htmlFor="rf-notes" className={labelClass}>Joining instructions</label>
          <textarea id="rf-notes" rows={3} maxLength={1000} value={d.meeting_notes} onChange={(e) => set("meeting_notes", e.target.value)} className={inputClass} placeholder="Join the #speaking-room voice channel 5 minutes early." />
        </div>
      </fieldset>

      {error && <p role="alert" className="text-base text-[#B4383A]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {published ? (
          <button type="submit" disabled={busy} className={btnPrimary} data-testid="room-save">{busy ? "Saving…" : "Save changes"}</button>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={(e) => save(e, true)} className={btnPrimary} data-testid="room-publish">{busy ? "Saving…" : "Publish room"}</button>
            <button type="button" disabled={busy} onClick={(e) => save(e, false)} className={btnSecondary} data-testid="room-draft">Save as draft</button>
          </>
        )}
      </div>
    </form>
  );
}

export function RoomFormView(ctx: DashboardCtx & { id?: string; prefill?: { topic?: string; category?: string } }) {
  const data = useLoad(async () => {
    if (!ctx.id) return { draft: blank(ctx.prefill), published: false, editable: true };
    const [room, meeting] = await Promise.all([connectApi.room(ctx.supabase, ctx.id), connectApi.meeting(ctx.supabase, ctx.id)]);
    return { draft: fromRoom(room, meeting), published: room.status === "published", editable: room.is_host && !["cancelled", "completed"].includes(room.state) };
  }, [ctx.supabase, ctx.id]);
  return (
    <ConnectFrame title={ctx.id ? "Edit room" : "Host a room"} description="Rooms are scheduled community activities with a host and a seat limit.">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (data.state.data.editable
        ? <Editor ctx={ctx} roomId={ctx.id ?? null} initial={data.state.data.draft} published={data.state.data.published} />
        : <p className="text-base">Only the host can edit this room, and only before it ends or is cancelled.</p>)}
    </ConnectFrame>
  );
}

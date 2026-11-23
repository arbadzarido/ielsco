"use client";

// Business-stream UI: logo, badges, the multi-select picker for forms and the filter for lists. A stream says what a
// record is about; it never limits who can work on it (the database decides access by sensitivity and division).
import Image from "next/image";
import { useState } from "react";
import { friendlyError } from "./data";
import { useOsMe } from "./OsProvider";
import { STREAMS, normalizeStreams, streamByCode, streamsLabel, toggleStream, type StreamCode } from "@/lib/os/streams";
import { Badge, Select, btn, btnGhost, muted, ring } from "./ui";
import { cn } from "@/lib/utils";

export function StreamLogo({ code, size = 20 }: { code: string; size?: number }) {
  const s = streamByCode(code);
  if (!s) return null;
  if (s.code === "HQ") {
    // HQ is the central layer above the three streams: the IELSco and Elco marks together, as before.
    return (
      <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} aria-label="HQ" role="img">
        <Image src="/icon-192.png" alt="" width={size} height={size} className="absolute left-0 top-0 rounded-[4px]" style={{ width: size * 0.72, height: size * 0.72 }} />
        <span className="absolute bottom-0 right-0 rounded-full bg-white p-px" style={{ width: size * 0.62, height: size * 0.62 }}>
          <Image src="/images/contents/mascot/elco.svg" alt="" width={size} height={size} className="h-full w-full object-contain" />
        </span>
      </span>
    );
  }
  return <Image src={s.logo} alt={s.logoAlt} width={size} height={size} className={cn("shrink-0 object-contain", s.code !== "ELC" && "rounded-[4px]")} style={{ width: size, height: size }} />;
}

const TONE: Record<StreamCode, "neutral" | "blue" | "teal" | "violet"> = { HQ: "neutral", IEL: "blue", ELC: "teal", GIF: "violet" };

/** The streams a record belongs to, as small badges ("Not assigned" when none). */
export function StreamBadges({ streams, empty = true, className }: { streams: readonly string[] | null | undefined; empty?: boolean; className?: string }) {
  const n = normalizeStreams(streams);
  if (!n.length) return empty ? <span className={cn("text-xs", muted, className)}>Not assigned</span> : null;
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)} aria-label={`Streams: ${streamsLabel(n)}`}>
      {n.map((c) => <Badge key={c} tone={TONE[c]}>{streamByCode(c)!.short}</Badge>)}
    </span>
  );
}

/** Pick one or more streams (or none). Everyone can pick any stream: streams don't depend on the person's division. */
export function StreamPicker({ value, onChange, id, label = "Business streams" }: {
  value: readonly string[]; onChange: (v: StreamCode[]) => void; id?: string; label?: string;
}) {
  const n = normalizeStreams(value);
  return (
    <div id={id} role="group" aria-label={label} className="flex flex-wrap gap-1.5" data-testid="os-stream-picker">
      {STREAMS.map((s) => {
        const on = n.includes(s.code);
        return (
          <button key={s.code} type="button" aria-pressed={on} onClick={() => onChange(toggleStream(n, s.code))} data-testid={`os-stream-${s.slug}`}
            className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm", ring,
              on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#DDE2E8] bg-white text-[#3A4B60] hover:bg-[#F5F7FA]")}>
            <StreamLogo code={s.code} size={16} /> {s.short}
          </button>
        );
      })}
    </div>
  );
}

/** Filter for lists: all streams, or one (HQ also lists records not assigned yet). */
export function StreamFilter({ value, onChange, id }: { value: StreamCode | ""; onChange: (v: StreamCode | "") => void; id?: string }) {
  return <Select id={id} ariaLabel="Business stream" value={value} onChange={(v) => onChange(v as StreamCode | "")} placeholder="All streams"
    options={STREAMS.map((s) => ({ value: s.code, label: s.code === "HQ" ? "HQ (incl. not assigned)" : s.name }))} />;
}

/** A record's streams with an inline change control, for detail pages. Saving goes through the person's own session,
 * so RLS decides whether they may change it (the same people who may edit the record). */
export function StreamsEditor({ table, rpc, id, value, onSaved }: {
  /** The table to update directly (ops records), or */ table?: string;
  /** the record type for os_set_streams (budget, transaction, letter, agreement, request), which checks who may tag it. */ rpc?: "budget" | "transaction" | "letter" | "agreement" | "request";
  id: string; value: readonly string[] | null | undefined; onSaved?: () => void;
}) {
  const { supabase } = useOsMe();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StreamCode[]>(normalizeStreams(value));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    const { data, error } = rpc
      ? await supabase.rpc("os_set_streams", { p_type: rpc, p_id: id, p_streams: draft }).then((r) => ({ data: r.error ? null : true, error: r.error }))
      : await supabase.from(table!).update({ streams: draft }).eq("id", id).select("id").maybeSingle();
    setBusy(false);
    if (error || !data) return setErr(error ? friendlyError(error.message) : "You can't change the streams of this record.");
    setEditing(false); onSaved?.();
  }
  if (!editing) return (
    <span className="inline-flex flex-wrap items-center gap-1.5" data-testid="os-streams-editor">
      <StreamBadges streams={value} />
      <button type="button" className={cn(btnGhost, "min-h-7 px-1.5 text-xs")} onClick={() => { setDraft(normalizeStreams(value)); setEditing(true); }}>Change</button>
    </span>
  );
  return (
    <div className="space-y-2" data-testid="os-streams-editor">
      <StreamPicker value={draft} onChange={setDraft} />
      {err && <p className="text-xs text-[#A12D2F]" role="alert">{err}</p>}
      <div className="flex gap-2"><button type="button" className={btn} disabled={busy} onClick={save}>Save</button><button type="button" className={btnGhost} onClick={() => setEditing(false)}>Cancel</button></div>
    </div>
  );
}

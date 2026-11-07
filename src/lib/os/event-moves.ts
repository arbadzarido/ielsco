// Moving an event or one occurrence of a recurring event. Used by calendar drag and drop and by the assistant's
// "move this meeting" action. Every write runs with the caller's own Supabase session, so RLS decides. Linked tasks
// and timeline milestones are never touched: moving an event moves the event only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TZ, zonedParts } from "./calendar.ts";
import { shiftRule, splitRules, type Recurrence } from "./recurrence.ts";

export type MoveScope = "this" | "following" | "all";
export interface MovableEvent { id: string; starts_at: string; ends_at: string; all_day: boolean; timezone: string | null; recurrence: Recurrence | null }
export interface MoveTarget { occurrence_start: string; starts_at: string; ends_at: string }
export interface MoveResult { ok: boolean; error?: string; changed: string[] }

const dayDelta = (a: string, b: string, tz: string) =>
  Math.round((Date.parse(`${zonedParts(b, tz).date}T00:00:00Z`) - Date.parse(`${zonedParts(a, tz).date}T00:00:00Z`)) / 86400000);

/** When a whole series moves, its changed occurrences move with it (same offset) and keep their own changes. */
export async function rekeyExceptions(supabase: SupabaseClient, eventId: string, deltaMs: number) {
  if (!deltaMs) return;
  const { data } = await supabase.from("os_event_exceptions").select("occurrence_start, cancelled, title, description, starts_at, ends_at, location, meeting_url").eq("event_id", eventId);
  const rows = (data ?? []) as { occurrence_start: string; starts_at: string | null; ends_at: string | null }[];
  if (!rows.length) return;
  const shift = (x: string | null) => (x ? new Date(Date.parse(x) + deltaMs).toISOString() : null);
  await supabase.from("os_event_exceptions").delete().eq("event_id", eventId);
  await supabase.from("os_event_exceptions").insert(rows.map((r) => ({ ...r, event_id: eventId, occurrence_start: shift(r.occurrence_start), starts_at: shift(r.starts_at), ends_at: shift(r.ends_at) })));
}

/**
 * Move `ev` (or the occurrence `occ` of it) to [starts_at, ends_at).
 *   one-off event         → the event row
 *   scope "this"          → an exception row for that occurrence (the series is unchanged)
 *   scope "following"     → the series ends the day before; a linked new series starts at the new time
 *   scope "all"           → the series moves by the same offset (weekly days shift with it)
 * Returns the ids of the event rows that changed, so the caller can send them to Google.
 */
export async function moveEvent(supabase: SupabaseClient, ev: MovableEvent, occ: MoveTarget | null, scope: MoveScope, when: { starts_at: string; ends_at: string }): Promise<MoveResult> {
  const tz = ev.timezone || DEFAULT_TZ;
  if (!ev.recurrence || !occ) {
    const r = await supabase.from("os_events").update(when).eq("id", ev.id).select("id").maybeSingle();
    return r.error || !r.data ? { ok: false, error: "You can't change this event.", changed: [] } : { ok: true, changed: [ev.id] };
  }
  if (scope === "this") {
    const r = await supabase.from("os_event_exceptions").upsert({ event_id: ev.id, occurrence_start: occ.occurrence_start, ...when }, { onConflict: "event_id,occurrence_start" }).select("event_id").maybeSingle();
    return r.error || !r.data ? { ok: false, error: "You can't change this event.", changed: [] } : { ok: true, changed: [ev.id] };
  }
  if (scope === "following") {
    if (Date.parse(occ.occurrence_start) <= Date.parse(ev.starts_at)) return moveEvent(supabase, ev, occ, "all", when);
    const sr = splitRules(ev, occ.occurrence_start);
    const rule = shiftRule(sr.ruleForNew, dayDelta(occ.occurrence_start, when.starts_at, tz));
    const { data, error } = await supabase.rpc("os_split_series", { p_event: ev.id, p_from: occ.occurrence_start, p_until: sr.untilForOld, p: { ...when, recurrence: rule }, p_keep_exceptions: false });
    return error || !data ? { ok: false, error: "You can't change this event.", changed: [] } : { ok: true, changed: [ev.id, String(data)] };
  }
  const delta = Date.parse(when.starts_at) - Date.parse(occ.starts_at);
  const duration = Date.parse(when.ends_at) - Date.parse(when.starts_at);
  const s = new Date(Date.parse(ev.starts_at) + delta).toISOString();
  const recurrence = shiftRule(ev.recurrence, dayDelta(ev.starts_at, s, tz));
  const r = await supabase.from("os_events").update({ starts_at: s, ends_at: new Date(Date.parse(s) + duration).toISOString(), recurrence }).eq("id", ev.id).select("id").maybeSingle();
  if (r.error || !r.data) return { ok: false, error: "You can't change this event.", changed: [] };
  await rekeyExceptions(supabase, ev.id, delta);
  return { ok: true, changed: [ev.id] };
}

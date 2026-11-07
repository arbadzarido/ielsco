// Company OS conflict detection. Warnings only: nothing here blocks a save. Pure; the busy rows come from os_busy
// (free/busy for people who share a company with the caller, titles hidden as "Busy" where the caller can't see).
import { expandSeries, type ExceptionLike, type Recurrence } from "./recurrence.ts";

export interface BusyRow {
  person_id: string; source: "event" | "task"; ref_id: string | null; title: string; starts_at: string; ends_at: string; all_day: boolean;
  timezone: string | null; recurrence: Recurrence | null; exceptions: ExceptionLike[] | null;
}
export interface BusyBlock { person_id: string; source: "event" | "task"; ref_id: string | null; title: string; starts_at: string; ends_at: string; all_day: boolean; occurrence_start?: string }
export interface Conflict extends BusyBlock { name: string }

/** os_busy rows as concrete blocks in a window (recurring series expanded with their exceptions). */
export function busyBlocks(rows: BusyRow[], from: string, to: string): BusyBlock[] {
  const out: BusyBlock[] = [];
  for (const r of rows) {
    if (!r.recurrence) { out.push({ person_id: r.person_id, source: r.source, ref_id: r.ref_id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, all_day: r.all_day }); continue; }
    for (const o of expandSeries({ id: r.ref_id ?? "busy", starts_at: r.starts_at, ends_at: r.ends_at, all_day: r.all_day, timezone: r.timezone, recurrence: r.recurrence }, r.exceptions ?? [], from, to)) {
      out.push({ person_id: r.person_id, source: r.source, ref_id: r.ref_id, title: r.title, starts_at: o.starts_at, ends_at: o.ends_at, all_day: r.all_day, occurrence_start: o.occurrence_start });
    }
  }
  return out;
}

const overlap = (a0: string, a1: string, b0: string, b1: string) => Date.parse(a0) < Date.parse(b1) && Date.parse(b0) < Date.parse(a1);

/** Who is already busy during [starts_at, ends_at). All-day items (holidays, travel days, multi-day events) are not
 *  counted as clashes for timed meetings; the item being edited (any occurrence of it) is ignored. */
export function findConflicts(slot: { starts_at: string; ends_at: string; all_day: boolean; ignore?: string | null }, blocks: BusyBlock[], names: Map<string, string>): Conflict[] {
  if (slot.all_day) return [];
  const seen = new Set<string>();
  return blocks
    .filter((b) => !b.all_day && !(slot.ignore && b.ref_id === slot.ignore) && overlap(slot.starts_at, slot.ends_at, b.starts_at, b.ends_at))
    .filter((b) => { const k = `${b.person_id}|${b.ref_id ?? b.title}|${b.starts_at}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((b) => ({ ...b, name: names.get(b.person_id) ?? b.person_id }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.name.localeCompare(b.name));
}

/** Sentences for the warning panel: "Nadia: Busy, 10:00–11:00", grouped per person. */
export function conflictLines(conflicts: Conflict[], fmt: (iso: string) => string): string[] {
  const per = new Map<string, Conflict[]>();
  for (const c of conflicts) per.set(c.name, [...(per.get(c.name) ?? []), c]);
  return [...per.entries()].map(([name, cs]) => `${name}: ${cs.map((c) => `${c.title} (${fmt(c.starts_at)}–${fmt(c.ends_at)})`).join("; ")}`);
}

export interface LinkedMilestone { id: string; title: string; due_date: string | null; is_major: boolean; status: string }

/** Timeline and task warnings: scheduling past the milestone or deadline it serves. */
export function linkWarnings(slotDate: string, links: { milestone?: LinkedMilestone | null; taskDue?: { id: string; title: string; due_date: string | null }[] }): string[] {
  const w: string[] = [];
  const m = links.milestone;
  if (m?.due_date && slotDate > m.due_date && !["Done", "Cancelled"].includes(m.status)) w.push(`This is after ${m.is_major ? "major milestone" : "milestone"} ${m.id} “${m.title}”, due ${m.due_date}.`);
  for (const t of links.taskDue ?? []) if (t.due_date && slotDate > t.due_date) w.push(`This is after the deadline of ${t.id} “${t.title}” (${t.due_date}).`);
  return w;
}

/** Why a reschedule needs an explicit confirmation (empty: just do it). */
export function rescheduleReasons(x: { attendees: number; inGoogle: boolean; majorMilestone: boolean; conflicts: number; warnings: number; recurring: boolean }): string[] {
  const r: string[] = [];
  if (x.attendees >= 5) r.push(`${x.attendees} people are invited and will be notified.`);
  if (x.inGoogle) r.push("It is in Google Calendar, which will be updated too.");
  if (x.majorMilestone) r.push("It is linked to a major milestone.");
  if (x.conflicts) r.push(`${x.conflicts} clash${x.conflicts === 1 ? "" : "es"} with other commitments.`);
  if (x.warnings) r.push("It moves past a linked milestone or task deadline.");
  return r;
}

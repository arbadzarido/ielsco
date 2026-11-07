// Company OS recurring events: one master row with a rule, plus exceptions for single occurrences. Pure (no React, no
// network) so it can be unit tested.
//
// Occurrences repeat at the same wall-clock time in the event's time zone. They are generated on the fly for the
// window being shown, never stored. An exception is keyed by the occurrence's ORIGINAL start (what the rule produces),
// so moving one occurrence never shifts the others.
import { DEFAULT_TZ, addDays, weekday, zonedInstant, zonedParts } from "./calendar.ts";

export const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type Freq = "daily" | "weekly" | "monthly" | "yearly";
export interface Recurrence { freq: Freq; interval?: number; byweekday?: Weekday[]; until?: string; count?: number }

export interface SeriesLike { id: string; starts_at: string; ends_at: string; all_day: boolean; timezone: string | null; recurrence: Recurrence | null }
export interface ExceptionLike { occurrence_start: string; cancelled: boolean; starts_at?: string | null; ends_at?: string | null; title?: string | null; description?: string | null; location?: string | null; meeting_url?: string | null }
export interface Occurrence {
  key: string;                 // `${id}@${occurrence_start}` (stable, for React keys and links)
  occurrence_start: string;    // the original start, which identifies the occurrence
  starts_at: string; ends_at: string;
  index: number;               // 0 for the first occurrence of the series
  cancelled: boolean;
  exception: ExceptionLike | null;
}

/** The choices in the event form. "Every 2 weeks" is weekly with interval 2; custom keeps whatever was set. */
export const PRESETS = [
  { key: "none", label: "Does not repeat" },
  { key: "daily", label: "Every day" },
  { key: "weekdays", label: "Every weekday (Mon–Fri)" },
  { key: "weekly", label: "Every week" },
  { key: "biweekly", label: "Every 2 weeks" },
  { key: "monthly", label: "Every month" },
  { key: "yearly", label: "Every year" },
  { key: "custom", label: "Custom…" },
] as const;
export type PresetKey = (typeof PRESETS)[number]["key"];

/** A preset as a rule, for an event starting on `date`. */
export function presetRule(key: PresetKey, date: string): Recurrence | null {
  const wd = WEEKDAYS[weekday(date)];
  switch (key) {
    case "none": return null;
    case "daily": return { freq: "daily" };
    case "weekdays": return { freq: "weekly", byweekday: ["MO", "TU", "WE", "TH", "FR"] };
    case "weekly": return { freq: "weekly", byweekday: [wd] };
    case "biweekly": return { freq: "weekly", interval: 2, byweekday: [wd] };
    case "monthly": return { freq: "monthly" };
    case "yearly": return { freq: "yearly" };
    case "custom": return { freq: "weekly", byweekday: [wd] };
  }
}

/** Which preset a rule is (for showing it back in the form); "custom" if none matches exactly. */
export function presetOf(r: Recurrence | null, date: string): PresetKey {
  if (!r) return "none";
  const plain = (x: Recurrence | null) => JSON.stringify(x && { freq: x.freq, interval: x.interval ?? 1, byweekday: [...(x.byweekday ?? [])].sort() });
  for (const p of PRESETS) {
    if (p.key === "none" || p.key === "custom") continue;
    if (plain(presetRule(p.key, date)) === plain({ ...r, until: undefined, count: undefined })) return p.key;
  }
  return "custom";
}

/** The same checks the database makes (os_valid_recurrence), so the form can explain a bad rule before saving. */
export function ruleProblem(r: Recurrence | null): string | null {
  if (!r) return null;
  if (!["daily", "weekly", "monthly", "yearly"].includes(r.freq)) return "Choose how often it repeats.";
  if (r.interval !== undefined && (!Number.isInteger(r.interval) || r.interval < 1 || r.interval > 99)) return "Repeat every 1 to 99 periods.";
  if (r.count !== undefined && (!Number.isInteger(r.count) || r.count < 1 || r.count > 730)) return "Repeat between 1 and 730 times.";
  if (r.until && r.count) return "End on a date or after a number of times, not both.";
  if (r.until && !/^\d{4}-\d{2}-\d{2}$/.test(r.until)) return "The end date isn't a date.";
  if (r.byweekday && (r.freq !== "weekly" || !r.byweekday.length || r.byweekday.some((d) => !WEEKDAYS.includes(d)))) return "Pick at least one weekday.";
  return null;
}

const DAY_MS = 86400000;
const MAX_STEPS = 5000;

/** The civil dates the rule produces, in order, from the series' first date (inclusive) up to `lastDate`. */
function* ruleDates(first: string, r: Recurrence, lastDate: string): Generator<string> {
  const n = Math.max(1, r.interval ?? 1);
  const end = r.until && r.until < lastDate ? r.until : lastDate;
  const [y0, m0, d0] = first.split("-").map(Number);
  let steps = 0;
  if (r.freq === "daily") {
    for (let d = first; d <= end && steps < MAX_STEPS; d = addDays(d, n), steps++) yield d;
  } else if (r.freq === "weekly") {
    // Weeks start on Monday, as in Google Calendar (RFC 5545 WKST=MO), which matters for "every 2 weeks on Sun, Wed".
    const days = (r.byweekday?.length ? r.byweekday : [WEEKDAYS[weekday(first)]]).map((x) => (WEEKDAYS.indexOf(x) + 6) % 7).sort((a, b) => a - b);
    for (let ws = addDays(first, -((weekday(first) + 6) % 7)); ws <= end && steps < MAX_STEPS; ws = addDays(ws, 7 * n), steps++) {
      for (const dow of days) { const d = addDays(ws, dow); if (d >= first && d <= end) yield d; }
    }
  } else {
    // Monthly on the start's day of the month; yearly on its month and day. Months without that day are skipped.
    for (let k = 0; steps < MAX_STEPS; k += n, steps++) {
      const y = r.freq === "yearly" ? y0 + k : y0 + Math.floor((m0 - 1 + k) / 12);
      const m = r.freq === "yearly" ? m0 : ((m0 - 1 + k) % 12) + 1;
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      if (`${y}-${String(m).padStart(2, "0")}-01` > end) return;
      if (d0 > dim) continue;
      const d = `${y}-${String(m).padStart(2, "0")}-${String(d0).padStart(2, "0")}`;
      if (d > end) return;
      yield d;
    }
  }
}

/** Every occurrence of a series that overlaps [from, to) (instants), with exceptions applied. Cancelled occurrences
 *  are included (flagged) only when includeCancelled. A one-off event is returned as its single occurrence. */
export function expandSeries(e: SeriesLike, exceptions: ExceptionLike[], from: string, to: string, opts: { includeCancelled?: boolean } = {}): Occurrence[] {
  const tz = e.timezone || DEFAULT_TZ;
  const duration = Date.parse(e.ends_at) - Date.parse(e.starts_at);
  const byStart = new Map(exceptions.map((x) => [Date.parse(x.occurrence_start), x]));
  const overlaps = (s: string, en: string) => Date.parse(s) < Date.parse(to) && (Date.parse(en) > Date.parse(from) || (Date.parse(en) === Date.parse(s) && Date.parse(s) >= Date.parse(from)));
  const make = (start: string, index: number): Occurrence => {
    const x = byStart.get(Date.parse(start)) ?? null;
    const s = x?.starts_at ?? start;
    const en = x?.ends_at ?? new Date(Date.parse(start) + duration).toISOString();
    return { key: `${e.id}@${start}`, occurrence_start: start, starts_at: new Date(s).toISOString(), ends_at: new Date(en).toISOString(), index, cancelled: Boolean(x?.cancelled), exception: x };
  };
  if (!e.recurrence) {
    const o = make(new Date(e.starts_at).toISOString(), 0);
    return overlaps(o.starts_at, o.ends_at) ? [o] : [];
  }
  const r = e.recurrence;
  const start = zonedParts(e.starts_at, tz);
  // Moved occurrences can land in the window from outside it, so generate up to the latest of the window end and
  // any exception's original start.
  const latestException = Math.max(0, ...exceptions.map((x) => Date.parse(x.occurrence_start)));
  const horizon = new Date(Math.max(Date.parse(to), latestException) + DAY_MS).toISOString();
  const lastDate = zonedParts(horizon, tz).date;
  const out: Occurrence[] = [];
  let index = 0;
  for (const d of ruleDates(start.date, r, lastDate)) {
    if (r.count !== undefined && index >= r.count) break;
    const s = e.all_day ? zonedInstant(d, "00:00", tz) : zonedInstant(d, start.time, tz);
    const o = make(s, index++);
    if ((!o.cancelled || opts.includeCancelled) && overlaps(o.starts_at, o.ends_at)) out.push(o);
    if (Date.parse(s) > Date.parse(horizon)) break;
  }
  return out;
}

/** The occurrence starts of a series before a given original start (to carry a count over when splitting). */
export function occurrencesBefore(e: SeriesLike, before: string): number {
  return expandSeries(e, [], e.starts_at, before, { includeCancelled: true }).filter((o) => Date.parse(o.occurrence_start) < Date.parse(before)).length;
}

/** "This and following": the old series ends the day before the split occurrence (in its zone); a count rule carries
 *  the remaining number of occurrences over to the new series. */
export function splitRules(e: SeriesLike, splitAt: string): { untilForOld: string; ruleForNew: Recurrence } {
  const tz = e.timezone || DEFAULT_TZ;
  const r = e.recurrence!;
  const untilForOld = addDays(zonedParts(splitAt, tz).date, -1);
  const ruleForNew: Recurrence = { ...r };
  if (r.count !== undefined) ruleForNew.count = Math.max(1, r.count - occurrencesBefore(e, splitAt));
  return { untilForOld, ruleForNew };
}

/** Moving a whole series by some days keeps the pattern: weekly weekdays shift by the same number of days. */
export function shiftRule(r: Recurrence, days: number): Recurrence {
  if (!r.byweekday || days % 7 === 0) return r;
  const k = ((days % 7) + 7) % 7;
  return { ...r, byweekday: r.byweekday.map((d) => WEEKDAYS[(WEEKDAYS.indexOf(d) + k) % 7]) };
}

const LONG = { SU: "Sunday", MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday" } as const;
const SHORT = { SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat" } as const;
const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "Every Monday until 28 Dec 2026", "Every 2 weeks on Mon, Wed, 4 times", "Every weekday". */
export function describeRule(r: Recurrence | null): string {
  if (!r) return "Does not repeat";
  const n = r.interval ?? 1;
  let s: string;
  const days = r.byweekday ?? [];
  if (r.freq === "weekly" && n === 1 && days.length === 5 && ["MO", "TU", "WE", "TH", "FR"].every((d) => days.includes(d as Weekday))) s = "Every weekday";
  else if (r.freq === "weekly" && n === 1 && days.length === 1) s = `Every ${LONG[days[0]]}`;
  else if (r.freq === "weekly") s = `${n === 1 ? "Every week" : `Every ${n} weeks`}${days.length ? ` on ${WEEKDAYS.filter((d) => days.includes(d)).map((d) => SHORT[d]).join(", ")}` : ""}`;
  else s = n === 1 ? { daily: "Every day", monthly: "Every month", yearly: "Every year" }[r.freq] : `Every ${n} ${{ daily: "days", monthly: "months", yearly: "years" }[r.freq]}`;
  if (r.until) s += ` until ${fmtDay(r.until)}`;
  if (r.count) s += `, ${r.count} time${r.count === 1 ? "" : "s"}`;
  return s;
}

// ── Google Calendar ────────────────────────────────────────────────────────────────────────────────────────────────

const basic = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RRULE and EXDATE lines for Google. Cancelled occurrences become EXDATEs; moved ones are patched as instances. */
export function googleRecurrence(e: SeriesLike, exceptions: ExceptionLike[]): string[] {
  const r = e.recurrence;
  if (!r) return [];
  const tz = e.timezone || DEFAULT_TZ;
  const parts = [`FREQ=${r.freq.toUpperCase()}`];
  if ((r.interval ?? 1) > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.byweekday?.length) parts.push(`BYDAY=${r.byweekday.join(",")}`);
  if (r.count) parts.push(`COUNT=${r.count}`);
  if (r.until) parts.push(e.all_day ? `UNTIL=${r.until.replace(/-/g, "")}` : `UNTIL=${basic(new Date(Date.parse(zonedInstant(addDays(r.until, 1), "00:00", tz)) - 1000).toISOString())}`);
  const lines = [`RRULE:${parts.join(";")}`];
  const ex = exceptions.filter((x) => x.cancelled).map((x) => x.occurrence_start).sort();
  if (ex.length) {
    lines.push(e.all_day ? `EXDATE;VALUE=DATE:${ex.map((s) => zonedParts(s, tz).date.replace(/-/g, "")).join(",")}`
      : `EXDATE;TZID=${tz}:${ex.map((s) => { const p = zonedParts(s, tz); return `${p.date.replace(/-/g, "")}T${p.time.replace(":", "")}00`; }).join(",")}`);
  }
  return lines;
}

/** Google's ID for one instance of a recurring event: the series ID plus the original start (UTC, or the date). */
export function googleInstanceId(googleEventId: string, occurrenceStart: string, allDay: boolean, tz = DEFAULT_TZ): string {
  return `${googleEventId}_${allDay ? zonedParts(occurrenceStart, tz).date.replace(/-/g, "") : basic(occurrenceStart)}`;
}

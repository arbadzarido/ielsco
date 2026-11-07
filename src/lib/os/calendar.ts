// Company OS calendar: pure date and layout helpers (no React, no network) so they can be unit tested.
// All calendar dates are civil dates (YYYY-MM-DD) in Asia/Jakarta unless an event says otherwise.

export const CATEGORIES = ["Meeting", "Internal Activity", "Event", "Deadline", "Campaign", "Partnership", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const DEFAULT_TZ = "Asia/Jakarta";

export const CATEGORY_STYLE: Record<Category | "Task deadline" | "Scheduled task" | "Milestone" | "Content" | "Campaign span" | "Google", { bar: string; dot: string }> = {
  Meeting: { bar: "bg-[#2457A6] text-white", dot: "bg-[#2457A6]" },
  "Internal Activity": { bar: "bg-[#0B6058] text-white", dot: "bg-[#0B6058]" },
  Event: { bar: "bg-[#5638B8] text-white", dot: "bg-[#5638B8]" },
  Deadline: { bar: "bg-[#A12D2F] text-white", dot: "bg-[#A12D2F]" },
  Campaign: { bar: "bg-[#B4590B] text-white", dot: "bg-[#B4590B]" },
  Partnership: { bar: "bg-[#2E6B4F] text-white", dot: "bg-[#2E6B4F]" },
  Other: { bar: "bg-[#4A5A6E] text-white", dot: "bg-[#4A5A6E]" },
  "Task deadline": { bar: "border border-[#F1C9CA] bg-[#FDF2F2] text-[#A12D2F]", dot: "bg-[#F08A8C]" },
  "Scheduled task": { bar: "border-l-4 border-[#A12D2F] bg-[#FDF2F2] text-[#7A1F21]", dot: "bg-[#A12D2F]" },
  Milestone: { bar: "border border-dashed border-[#9C86E0] bg-[#F4F0FD] text-[#5638B8]", dot: "bg-[#9C86E0]" },
  Content: { bar: "border border-[#F3C99B] bg-[#FDF5EC] text-[#8A4307]", dot: "bg-[#E89A52]" },
  "Campaign span": { bar: "bg-[#FBE7D3] text-[#8A4307]", dot: "bg-[#F3C99B]" },
  Google: { bar: "border border-[#C9DAF5] bg-[#EEF4FD] text-[#2457A6]", dot: "bg-[#7FA6E3]" },
};

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export function addDays(iso: string, n: number): string {
  const x = new Date(`${iso}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10);
}
export const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** The civil date and time of an instant in a time zone. */
export function zonedParts(instant: string | Date, tz = DEFAULT_TZ): { date: string; time: string } {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(typeof instant === "string" ? new Date(instant) : instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** The instant of a civil date and time in a time zone (handles any fixed or DST zone by one correction step). */
export function zonedInstant(date: string, time: string, tz = DEFAULT_TZ): string {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const shown = zonedParts(new Date(guess), tz);
  const offset = Date.parse(`${shown.date}T${shown.time}:00Z`) - guess;
  let t = guess - offset;
  const check = zonedParts(new Date(t), tz);
  if (`${check.date}T${check.time}` !== `${date}T${time}`) t = guess - (Date.parse(`${check.date}T${check.time}:00Z`) - t);
  return new Date(t).toISOString();
}

/** The Sunday-to-Saturday weeks covering a month (always whole weeks). */
export function monthWeeks(year: number, month: number): string[][] {
  const first = isoDate(year, month, 1);
  let start = addDays(first, -weekday(first));
  const last = addDays(isoDate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1), -1);
  const weeks: string[][] = [];
  while (start <= last) { weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i))); start = addDays(start, 7); }
  return weeks;
}

/** A thing on the calendar, reduced to the civil days it covers (last day inclusive). */
export interface CalItem { key: string; title: string; first: string; last: string; allDay: boolean; startTime?: string; kind: string }

/** Days an event covers in a zone. All-day ends are exclusive (Google's convention); timed ends at midnight belong to
 *  the day before. */
export function itemDays(startsAt: string, endsAt: string, allDay: boolean, tz = DEFAULT_TZ): { first: string; last: string; startTime: string } {
  const s = zonedParts(startsAt, tz), e = zonedParts(endsAt, tz);
  if (allDay) return { first: s.date, last: e.date > s.date ? addDays(e.date, -1) : s.date, startTime: "" };
  const last = e.time === "00:00" && e.date > s.date ? addDays(e.date, -1) : e.date;
  return { first: s.date, last: last < s.date ? s.date : last, startTime: s.time };
}

/** Lays items out in one week row: each gets a lane and the columns it spans, like a wall calendar. Longer items take
 *  the top lanes; items beyond maxLanes are counted per day as "+N more". */
export function layoutWeek<T extends CalItem>(week: string[], items: T[], maxLanes = 3) {
  const ws = week[0], we = week[6];
  const inWeek = items.filter((i) => i.last >= ws && i.first <= we)
    .sort((a, b) => (a.first < b.first ? -1 : a.first > b.first ? 1 : 0) || daysBetween(b.first, b.last) - daysBetween(a.first, a.last) || Number(b.allDay) - Number(a.allDay) || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title));
  const lanes: number[][] = []; // per lane, the columns taken
  const placed: { item: T; lane: number; col: number; span: number; continuesBefore: boolean; continuesAfter: boolean }[] = [];
  const hidden = new Array(7).fill(0);
  for (const item of inWeek) {
    const col = Math.max(0, daysBetween(ws, item.first)), end = Math.min(6, daysBetween(ws, item.last));
    let lane = lanes.findIndex((cols) => !cols.some((c) => c >= col && c <= end));
    if (lane === -1) { lanes.push([]); lane = lanes.length - 1; }
    if (lane >= maxLanes) { for (let c = col; c <= end; c++) hidden[c]++; continue; }
    for (let c = col; c <= end; c++) lanes[lane].push(c);
    placed.push({ item, lane, col, span: end - col + 1, continuesBefore: item.first < ws, continuesAfter: item.last > we });
  }
  return { placed, hidden, lanes: Math.min(lanes.length, maxLanes) };
}

/** Items on one day, all-day first, then by start time. */
export function itemsOnDay<T extends CalItem>(day: string, items: T[]): T[] {
  return items.filter((i) => i.first <= day && i.last >= day)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.title.localeCompare(b.title));
}

// ── Google Calendar mapping ─────────────────────────────────────────────────────────────────────────────────────────

export interface OsEventLike { id: string; title: string; description: string | null; starts_at: string; ends_at: string; all_day: boolean; timezone: string; location: string | null; meeting_url: string | null; status: string }

/** The Google Calendar event body for an OS event. The OS event ID is stored as a private extended property, which is
 *  how a second push finds the first instead of creating a duplicate. */
export function toGoogleEvent(e: OsEventLike, osUrl: string) {
  const tz = e.timezone || DEFAULT_TZ;
  const desc = [e.description ?? "", e.meeting_url ? `Meeting link: ${e.meeting_url}` : "", `Company OS: ${osUrl}`].filter(Boolean).join("\n\n");
  const when = e.all_day
    ? { start: { date: zonedParts(e.starts_at, tz).date }, end: { date: zonedParts(e.ends_at, tz).date > zonedParts(e.starts_at, tz).date ? zonedParts(e.ends_at, tz).date : addDays(zonedParts(e.starts_at, tz).date, 1) } }
    : { start: { dateTime: e.starts_at, timeZone: tz }, end: { dateTime: e.ends_at, timeZone: tz } };
  return { summary: e.title, description: desc, location: e.location ?? undefined, ...when, status: e.status === "Cancelled" ? "cancelled" : "confirmed", extendedProperties: { private: { osEventId: e.id } } };
}

export interface GoogleEventLike { id: string; etag?: string; status?: string; recurrence?: string[]; attendees?: { email?: string; responseStatus?: string }[]; summary?: string; description?: string; location?: string; htmlLink?: string; start?: { date?: string; dateTime?: string; timeZone?: string }; end?: { date?: string; dateTime?: string; timeZone?: string }; extendedProperties?: { private?: Record<string, string> } }

/** A Google event as start/end instants (all-day: midnight in the zone, end exclusive). */
export function fromGoogleEvent(g: GoogleEventLike, tz = DEFAULT_TZ): { title: string; starts_at: string; ends_at: string; all_day: boolean; location: string | null } | null {
  if (!g.start || !g.end) return null;
  const allDay = Boolean(g.start.date);
  const starts_at = allDay ? zonedInstant(g.start.date!, "00:00", tz) : new Date(g.start.dateTime!).toISOString();
  const ends_at = allDay ? zonedInstant(g.end.date!, "00:00", tz) : new Date(g.end.dateTime!).toISOString();
  return { title: g.summary?.trim() || "(no title)", starts_at, ends_at, all_day: allDay, location: g.location ?? null };
}

// ── Time grid layout ────────────────────────────────────────────────────────────────────────────────────────────────

/** Side-by-side columns for overlapping timed blocks in one day (minutes from midnight). Blocks that overlap share
 *  a cluster; each gets a column and the cluster's column count, like a desk calendar. */
export function layoutDay<T extends { key: string; start: number; end: number }>(blocks: T[]): Map<string, { col: number; cols: number }> {
  const out = new Map<string, { col: number; cols: number }>();
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end || a.key.localeCompare(b.key));
  let cluster: { key: string; col: number }[] = [], clusterEnd = -1, ends: number[] = [];
  const flush = () => { const cols = Math.max(1, ends.length); for (const c of cluster) out.set(c.key, { col: c.col, cols }); cluster = []; ends = []; };
  for (const b of sorted) {
    if (b.start >= clusterEnd) { flush(); clusterEnd = -1; }
    let col = ends.findIndex((e) => e <= b.start);
    if (col === -1) { col = ends.length; ends.push(b.end); } else ends[col] = b.end;
    cluster.push({ key: b.key, col });
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
  return out;
}

/** "HH:MM" for minutes from midnight, snapped to a step and kept inside the day. */
export function minutesToTime(min: number, step = 15): string {
  const m = Math.max(0, Math.min(24 * 60 - step, Math.round(min / step) * step));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export const timeToMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

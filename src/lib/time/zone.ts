// Time zones for a global audience. Timestamps are stored in UTC (timestamptz / ISO strings with an offset); this
// module only decides how an instant is shown. The viewer's zone is an IANA name (e.g. "Europe/Berlin").
//
// Hydration rule: the server (and the first client render) always formats in SOURCE_ZONE, so markup matches; the
// TimeZoneProvider switches to the viewer's own zone after mount and components re-render.

/** IELSco's official zone. Deadlines and schedules are defined in it (e.g. careers close 29 Nov 2026 23:59 WIB). */
export const SOURCE_ZONE = "Asia/Jakarta";

// Indonesian zones have well-known abbreviations Intl does not produce ("GMT+7" instead of "WIB").
const ABBREVIATIONS: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Pontianak": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
  UTC: "UTC",
  "Etc/UTC": "UTC",
};

const toDate = (d: string | number | Date) => (d instanceof Date ? d : new Date(d));

/** True when `zone` is an IANA zone this runtime knows. */
export function isValidZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone || zone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The browser's zone, or SOURCE_ZONE when it can't be read (or on the server). */
export function browserZone(): string {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidZone(z) ? z : SOURCE_ZONE;
  } catch {
    return SOURCE_ZONE;
  }
}

/** Short label for a zone at an instant: "WIB", "GMT+8", "EST", "GMT+1". */
export function zoneLabel(zone: string, at: string | number | Date = Date.now()): string {
  if (ABBREVIATIONS[zone]) return ABBREVIATIONS[zone];
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(toDate(at)).find((p) => p.type === "timeZoneName");
    return part?.value ?? zone;
  } catch {
    return zone;
  }
}

/** Offset of `zone` from UTC in minutes at an instant (Jakarta = 420). */
export function offsetMinutes(zone: string, at: string | number | Date = Date.now()): number {
  const ms = toDate(at).getTime();
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(ms)).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)])
  );
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / 60_000) * 60_000) / 60_000);
}

/** True when two zones show the same wall-clock time at this instant. */
export const sameClock = (a: string, b: string, at: string | number | Date = Date.now()) => a === b || offsetMinutes(a, at) === offsetMinutes(b, at);

/** "11 November 2026" in `zone` (no zone label: a date alone is rarely ambiguous). */
export function formatDate(d: string | number | Date, zone: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, ...opts }).format(toDate(d));
}

/** "19:00" (24-hour) in `zone`. */
export const formatClock = (d: string | number | Date, zone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(toDate(d));

/** "Wed 11 Nov · 19:00 WIB": a date, a time and always the zone label. */
export function formatDateTime(d: string | number | Date, zone: string) {
  return `${formatDate(d, zone, { weekday: "short", day: "numeric", month: "short" })} · ${formatClock(d, zone)} ${zoneLabel(zone, d)}`;
}

/** "29 November 2026, 23:59 WIB" */
export function formatDeadline(d: string | number | Date, zone: string) {
  return `${formatDate(d, zone)}, ${formatClock(d, zone)} ${zoneLabel(zone, d)}`;
}

/**
 * An official instant shown in its source zone, plus the viewer's local equivalent when their clock differs.
 * { official: "29 November 2026, 23:59 WIB", local: "29 November 2026, 17:59 GMT+1" | null }
 */
export function dualDeadline(d: string | number | Date, viewerZone: string, sourceZone = SOURCE_ZONE) {
  const official = formatDeadline(d, sourceZone);
  return { official, local: sameClock(viewerZone, sourceZone, d) ? null : formatDeadline(d, viewerZone) };
}

/** Every zone the runtime knows (sorted), with the common ones guaranteed present. */
export function allZones(): string[] {
  let list: string[] = [];
  try {
    list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch { /* older runtimes */ }
  const common = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Bangkok", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "Australia/Sydney", "UTC"];
  return Array.from(new Set([...list, ...common])).sort();
}

/** "Asia/Jakarta (WIB, UTC+07:00)" for pickers. */
export function zoneOptionLabel(zone: string, at: string | number | Date = Date.now()) {
  const m = offsetMinutes(zone, at);
  const sign = m < 0 ? "-" : "+";
  const abs = Math.abs(m);
  const utc = `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  const label = zoneLabel(zone, at);
  return `${zone.replace(/_/g, " ")} (${label.startsWith("GMT") || label === "UTC" ? utc : `${label}, ${utc}`})`;
}

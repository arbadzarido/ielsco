// Wall-clock time in an IANA time zone <-> UTC, without a date library. Rooms store starts_at as UTC (timestamptz) plus
// the host's time zone for display; the host types a local date/time in that zone.

const pad = (n: number) => String(n).padStart(2, "0");

// Milliseconds the zone is ahead of UTC at instant `ms`.
function offsetAt(ms: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(ms)).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)])
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(ms / 1000) * 1000;
}

// "2026-11-07T19:30" in Asia/Jakarta -> "2026-11-07T12:30:00.000Z". Returns null for an invalid value.
export function zonedToUtc(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  try {
    let ms = guess - offsetAt(guess, timeZone);
    ms = guess - offsetAt(ms, timeZone); // second pass settles DST transitions
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
}

// UTC ISO -> "YYYY-MM-DDTHH:mm" in the zone (for <input type="datetime-local">).
export function utcToZoned(iso: string, timeZone: string): string {
  const ms = new Date(iso).getTime();
  const d = new Date(ms + offsetAt(ms, timeZone));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// "Sat 7 Nov 2026, 19:30 (Asia/Jakarta)"
export function formatInZone(iso: string, timeZone: string) {
  return `${new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))} (${timeZone})`;
}

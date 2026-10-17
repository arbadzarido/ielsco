// Event registration deadlines are stored as WIB (UTC+7) date and time strings that aren't always zero-padded,
// e.g. ("2026-10-9", "23:59") → "2026-10-09T23:59:00+07:00". Dependency-free so public pages can use it.
export function wibDeadline(date: string, time: string) {
  const pad = (n: string | undefined) => String(Number(n ?? 0)).padStart(2, "0");
  const [y, m, d] = date.split("-");
  const [h, min] = time.split(":");
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00+07:00`;
}

export function registrationOpen(date: string, time: string, now = new Date()) {
  return Date.parse(wibDeadline(date, time)) > now.getTime();
}

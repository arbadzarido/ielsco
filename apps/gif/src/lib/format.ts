// Dates are shown in Western Indonesia Time (WIB, UTC+7), the time zone every GIF deadline is set in.
export const TZ = "Asia/Jakarta";

export function fmtDate(iso: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso) : iso;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(d);
}

export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return `${fmtDate(iso, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} WIB`;
}

export function fmtRange(a: string, b?: string): string {
  if (!b) return fmtDate(a, { day: "numeric", month: "long", year: "numeric" });
  const da = new Date(`${a}T00:00:00+07:00`), db = new Date(`${b}T00:00:00+07:00`);
  const sameMonth = da.getUTCMonth() === db.getUTCMonth();
  return sameMonth ? `${fmtDate(a, { day: "numeric" })}–${fmtDate(b, { day: "numeric", month: "long", year: "numeric" })}`
    : `${fmtDate(a, { day: "numeric", month: "short" })} – ${fmtDate(b, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
}

export function bytes(n: number): string {
  return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

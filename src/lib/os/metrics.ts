// Division metrics: the period a value is logged for. Pure (imported by tests with the .ts extension). A value is only
// ever something a person entered; nothing here fills in a number or a target.

export type MetricPeriod = { label: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** The period that contains `today` (YYYY-MM-DD) for a KPI's reporting period: an ISO week ending Sunday, a quarter,
 * a year, or (for anything else, including an empty value) the calendar month. */
export function currentPeriod(reportingPeriod: string | null | undefined, today: string): MetricPeriod {
  const [y, m, d] = today.split("-").map(Number);
  const kind = (reportingPeriod ?? "").toLowerCase();
  if (/week/.test(kind)) {
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = date.getUTCDay() || 7; // Monday = 1 … Sunday = 7
    const sunday = new Date(date); sunday.setUTCDate(date.getUTCDate() + (7 - dow));
    const thursday = new Date(date); thursday.setUTCDate(date.getUTCDate() + (4 - dow));
    const week = Math.ceil(((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    return { label: `${thursday.getUTCFullYear()}-W${pad(week)}`, end: iso(sunday) };
  }
  if (/quarter/.test(kind)) {
    const q = Math.ceil(m / 3);
    return { label: `${y}-Q${q}`, end: iso(new Date(Date.UTC(y, q * 3, 0))) };
  }
  if (/year|annual/.test(kind)) return { label: String(y), end: `${y}-12-31` };
  return { label: `${y}-${pad(m)}`, end: iso(new Date(Date.UTC(y, m, 0))) };
}

/** A logged value with its unit, e.g. "12", "45%". */
export const metricValue = (value: number, unit: string | null | undefined) => `${value}${unit === "%" ? "%" : ""}`;

/** What someone typed as a number, or null when it isn't one. An empty box is never zero. */
export function parseMetricValue(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

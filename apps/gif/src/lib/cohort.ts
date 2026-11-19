import "server-only";
import { cache } from "react";
import { one } from "./db";
import { resolveSettings, type Settings } from "./settings";

export type Cohort = { id: string; name: string; code_prefix: string; starts_on: string; ends_on: string; route: string; capacity: number; settings: Settings };

// The cohort the site is currently selling (gif.cohorts.is_current). Cached per request.
export const currentCohort = cache(async (): Promise<Cohort> => {
  const row = await one<Omit<Cohort, "settings"> & { settings: unknown }>(
    "select id, name, code_prefix, starts_on, ends_on, route, capacity, settings from gif.cohorts where is_current limit 1");
  if (!row) throw new Error("No current GIF cohort (gif.cohorts.is_current)");
  const settings = resolveSettings(row.settings);
  settings.slots.capacity = row.capacity;
  return { ...row, settings };
});

// Public pages render even if the database is unreachable (e.g. a preview without GIF_DATABASE_URL): defaults only.
export async function currentSettingsSafe(): Promise<Settings> {
  try { return (await currentCohort()).settings; } catch { return resolveSettings({}); }
}

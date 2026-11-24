import "server-only";
import { currentCohort } from "./cohort";
import { one } from "./db";
import { selfFundedCap } from "./settings";
import { bridgeConfigured, ielscoDashboardUrl } from "./ielsco-bridge";

// Self-Funded places, counted from the database (24 Nov 2026 campaign): Super Early Bird places are taken when a delegate's
// first payment is verified among the first slots.self_funded_early; every other confirmed Self-Funded seat counts against
// the Regular allocation. Returns null when the count can't be read, so pages show the allocations without "places left".
export type Availability = { earlyTotal: number; earlyLeft: number; regularTotal: number; regularLeft: number; totalLeft: number };

export async function selfFundedAvailability(): Promise<Availability | null> {
  try {
    const cohort = await currentCohort();
    const s = cohort.settings;
    const row = await one<{ early: number; confirmed: number }>(
      `select count(*) filter (where p.early_bird_at is not null)::int as early, count(*)::int as confirmed
       from gif.participants p join gif.applications a on a.id = p.application_id
       where p.cohort_id = $1 and a.pathway = 'self_funded' and p.seat_status = 'confirmed'`, [cohort.id]);
    const earlyTotal = s.slots.self_funded_early;
    const regularTotal = s.slots.self_funded_regular;
    const early = Math.min(row?.early ?? 0, earlyTotal);
    const regular = Math.max(0, (row?.confirmed ?? 0) - early);
    const totalLeft = Math.max(0, selfFundedCap(s) - (row?.confirmed ?? 0));
    return { earlyTotal, earlyLeft: Math.max(0, earlyTotal - early), regularTotal, regularLeft: Math.min(totalLeft, Math.max(0, regularTotal - regular)), totalLeft };
  } catch {
    return null;
  }
}

// Where "Apply" sends people: the IELSco Dashboard (registration and payment live there since 21 Nov 2026), or this site's
// own application form when the IELSco sign-in bridge isn't configured (local and test environments).
export function applyHref(pathway: "self_funded" | "fully_funded" | "mentoring" = "self_funded"): string {
  return bridgeConfigured() ? ielscoDashboardUrl(pathway) : `/apply?pathway=${pathway}`;
}

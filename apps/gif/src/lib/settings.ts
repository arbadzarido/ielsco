// Programme settings: the defaults below are the published GIF Summer 2027 facts. Admins override any of them per cohort
// (gif.cohorts.settings, edited in Admin → Settings); the override is deep-merged over these defaults.
// Pure module (no "@/" imports) so `node --test` can import it.

export type Currency = "IDR" | "USD";
export type Money = { IDR: number; USD: number };
export type Pathway = "fully_funded" | "mentoring" | "self_funded";

export interface Settings {
  applications_open: boolean;
  pathways_open: Record<Pathway, boolean>;
  dates: {
    launch: string;                 // Phase 1 opens
    phase1_close: string;
    phase2_open: string;
    phase2_close: string;
    phase3_open: string;
    phase3_submit_close: string;    // 3 days to record and submit
    evaluation_close: string;       // then 4 days of evaluation
    results: string;
    preparation_start: string;
    mentoring_start: string;
    mentoring_end: string;
    programme_start: string;
    programme_end: string;
    // Not fixed in the published facts: null until the founder sets them in Admin → Settings.
    mentoring_early_bird_until: string | null;
    mentoring_registration_close: string | null;
    self_funded_registration_close: string | null;
    deposit_due_days: number | null;     // days after registration to pay the deposit (null: no due date shown)
    balance_due: string | null;
  };
  prices: {
    elco_pro_idr: number;               // Fully Funded Phase 1: 3 months of Elco Pro, always charged in IDR
    elco_pro_months: number;
    mentoring_early: Money;
    mentoring_regular: Money;
    self_funded_total: Money;
    self_funded_deposit: Money;
    partial_funded_payable: Money | null; // what a Partial Funded delegate still pays: founder decision, null until set
  };
  cashback: { fully_funded: Money; partial_funded: Money };
  slots: { fully_funded: number; partial_funded: number; capacity: number };
  payments: {
    // Midtrans processes IDR only. When true, international (USD-priced) payers may choose to pay the published IDR
    // price by card through Midtrans. Off by default: a founder decision (docs/gif/DECISIONS.md).
    allow_idr_for_international: boolean;
    bank_transfer_instructions: string; // shown for USD obligations (manual payment verified by finance)
  };
  universities: { name: string; country: string; status: "planned" | "confirmed" }[];
  contact: { email: string; whatsapp: string };
}

export const DEFAULT_SETTINGS: Settings = {
  applications_open: true,
  pathways_open: { fully_funded: true, mentoring: true, self_funded: true },
  dates: {
    launch: "2026-11-25T00:00:00+07:00",
    phase1_close: "2027-05-10T23:59:59+07:00",
    phase2_open: "2027-05-11T00:00:00+07:00",
    phase2_close: "2027-05-24T23:59:59+07:00",
    phase3_open: "2027-05-25T00:00:00+07:00",
    phase3_submit_close: "2027-05-27T23:59:59+07:00",
    evaluation_close: "2027-05-31T23:59:59+07:00",
    results: "2027-06-01T00:00:00+07:00",
    preparation_start: "2027-06-08T00:00:00+07:00",
    mentoring_start: "2027-02-02T00:00:00+07:00",
    mentoring_end: "2027-05-11T23:59:59+07:00",
    programme_start: "2027-07-27T00:00:00+07:00",
    programme_end: "2027-08-03T23:59:59+07:00",
    mentoring_early_bird_until: null,
    mentoring_registration_close: null,
    self_funded_registration_close: null,
    deposit_due_days: null,
    balance_due: null,
  },
  prices: {
    elco_pro_idr: 99000,
    elco_pro_months: 3,
    mentoring_early: { IDR: 1200000, USD: 80 },
    mentoring_regular: { IDR: 1500000, USD: 100 },
    self_funded_total: { IDR: 15000000, USD: 900 },
    self_funded_deposit: { IDR: 5000000, USD: 300 },
    partial_funded_payable: null,
  },
  cashback: { fully_funded: { IDR: 300000, USD: 20 }, partial_funded: { IDR: 750000, USD: 50 } },
  slots: { fully_funded: 10, partial_funded: 10, capacity: 100 },
  payments: {
    allow_idr_for_international: false,
    bank_transfer_instructions:
      "International payments in USD are handled by IELSco finance. Request an invoice from your portal and we will send bank transfer details from hello@ielsco.com. Your payment is marked as received only after finance verifies it.",
  },
  universities: [
    { name: "National University of Singapore (NUS)", country: "Singapore", status: "planned" },
    { name: "Universiti Malaya", country: "Malaysia", status: "planned" },
    { name: "Chulalongkorn University", country: "Thailand", status: "planned" },
  ],
  contact: { email: "hello@ielsco.com", whatsapp: "+62 882-9725-3491" },
};

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function deepMerge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? base : (over as T));
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in out)) continue; // unknown keys are ignored, so a typo can't create a setting nobody reads
    out[k] = isObj(out[k]) && isObj(v) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

export function resolveSettings(stored: unknown): Settings {
  return deepMerge(DEFAULT_SETTINGS, stored ?? {});
}

export function mentoringPrice(s: Settings, now = new Date()): { tier: "early" | "regular"; price: Money } {
  const until = s.dates.mentoring_early_bird_until;
  const early = !until || now.getTime() <= new Date(until).getTime();
  return early ? { tier: "early", price: s.prices.mentoring_early } : { tier: "regular", price: s.prices.mentoring_regular };
}

export function balanceOf(s: Settings): Money {
  return {
    IDR: s.prices.self_funded_total.IDR - s.prices.self_funded_deposit.IDR,
    USD: s.prices.self_funded_total.USD - s.prices.self_funded_deposit.USD,
  };
}

export type Phase = "before_launch" | "phase1" | "phase2" | "phase3_submit" | "evaluation" | "results" | "preparation" | "programme" | "after";

export function currentPhase(s: Settings, now = new Date()): Phase {
  const t = now.getTime();
  const d = (k: keyof Settings["dates"]) => new Date(s.dates[k] as string).getTime();
  if (t < d("launch")) return "before_launch";
  if (t <= d("phase1_close")) return "phase1";
  if (t <= d("phase2_close")) return "phase2";
  if (t <= d("phase3_submit_close")) return "phase3_submit";
  if (t < d("results")) return "evaluation";
  if (t < d("preparation_start")) return "results";
  if (t < d("programme_start")) return "preparation";
  if (t <= d("programme_end")) return "programme";
  return "after";
}

// Is a pathway accepting new registrations right now? Returns the reason when it isn't (shown to applicants).
export function pathwayOpen(s: Settings, p: Pathway, now = new Date()): { open: boolean; reason?: string } {
  const t = now.getTime();
  if (!s.applications_open) return { open: false, reason: "Applications are closed." };
  if (!s.pathways_open[p]) return { open: false, reason: "This pathway is not accepting registrations right now." };
  if (t < new Date(s.dates.launch).getTime()) return { open: false, reason: "Applications open on 25 November 2026." };
  if (p === "fully_funded" && t > new Date(s.dates.phase1_close).getTime()) return { open: false, reason: "Phase 1 closed on 10 May 2027." };
  if (p === "mentoring") {
    const close = s.dates.mentoring_registration_close;
    if (close && t > new Date(close).getTime()) return { open: false, reason: "Mentoring registration has closed." };
  }
  if (p === "self_funded") {
    const close = s.dates.self_funded_registration_close;
    if (close && t > new Date(close).getTime()) return { open: false, reason: "Self-Funded registration has closed." };
  }
  return { open: true };
}

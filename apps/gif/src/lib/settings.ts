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
    launch: string;                 // Phase 1 of the Fully Funded selection opens
    // Registration opens per pathway (21 Nov 2026 timeline): Self-Funded and Mentoring since 20 Nov 2026, Fully Funded on
    // 25 Nov 2026. Partial Funded is a result of the Fully Funded selection, so it has no registration date of its own.
    self_funded_opens: string;
    mentoring_opens: string;
    fully_funded_opens: string;
    phase1_close: string;
    phase2_open: string;
    phase2_close: string;
    phase3_open: string;
    phase3_submit_close: string;    // 3 days to record and submit
    evaluation_close: string;       // then 4 days of evaluation
    results: string;
    preparation_start: string;
    preparation_end: string;
    mentoring_start: string;
    mentoring_end: string;
    programme_start: string;
    programme_end: string;
    // Founder decisions (20 Nov 2026). null = not set; the site then says the date will be announced.
    mentoring_early_bird_until: string | null;
    mentoring_registration_close: string | null;
    self_funded_registration_close: string | null;
    deposit_due_days: number | null;     // days after registration (or offer acceptance) to pay the deposit
    balance_due: string | null;
  };
  prices: {
    elco_pro_idr: number;               // Fully Funded Phase 1: 3 months of Elco Pro, always charged in IDR
    elco_pro_months: number;
    mentoring_early: Money;
    mentoring_regular: Money;
    self_funded_total: Money;
    self_funded_deposit: Money;
    partial_funded_payable: Money | null; // the Partial Funded participant contribution
  };
  cashback: { fully_funded: Money; partial_funded: Money };
  // What each funded outcome covers, as published (founder decision 20 Nov 2026). Shown on the site and in result emails.
  awards: { fully_funded_covers: string[]; partial_funded_covers: string[]; not_included: string[] };
  slots: { fully_funded: number; partial_funded: number; capacity: number };
  payments: {
    // International (USD-priced) payers (founder decision 21 Nov 2026, docs/gif-platform/PAYMENTS.md "International"):
    // A) request an invoice (bank transfer, verified by Finance) — always available;
    // B) pay by Visa/Mastercard through Midtrans, which charges IDR: the USD amount × usd_idr_card_rate, computed on the
    //    server (lib/pricing.ts cardAmountIdr). Off until Finance switches it on (international_card_enabled).
    // Switch for B (since 21 Nov 2026, founder go-ahead): on by default; Finance can set it to false.
    international_cards: boolean;
    // Superseded 21 Nov 2026 by international_cards (a false saved here before the go-ahead must not keep cards off).
    international_card_enabled: boolean;
    usd_idr_card_rate: number; // fixed operational rate, IDR per USD 1 (never a live market rate)
    // Legacy flag from 20 Nov 2026 (card option at the published IDR price). Treated as international_card_enabled.
    allow_idr_for_international: boolean;
    bank_transfer_instructions: string; // shown for USD obligations (manual payment verified by finance)
    // Finance-approved account for invoice payments (may be a designated personal account). Shown only to a payer who
    // requested an invoice, in their portal and acknowledgement email. Null until Finance enters it; never invented.
    invoice_bank_details: string | null;
  };
  // Fully Funded Phase 1 also includes social media tasks, each verified by the team. The exact list awaits founder
  // confirmation, so it is data: edit or disable it in Admin → Settings.
  phase1_tasks: { enabled: boolean; items: { key: string; title: string; detail: string; link?: "ielsco" | "elco" | "post" }[] };
  instagram: { ielsco: string; elco: string; recruitment_post: string | null };
  universities: { name: string; country: string; status: "planned" | "confirmed" }[];
  contact: { email: string; whatsapp: string };
}

// Fixed operational USD → IDR rate for international card payments through Midtrans (founder decision 21 Nov 2026).
// The single source for the default; Finance can change it in Admin → Content → Settings (payments.usd_idr_card_rate).
export const USD_IDR_PAYMENT_RATE = 18500;

export const DEFAULT_SETTINGS: Settings = {
  applications_open: true,
  pathways_open: { fully_funded: true, mentoring: true, self_funded: true },
  dates: {
    launch: "2026-11-25T00:00:00+07:00",
    self_funded_opens: "2026-11-20T00:00:00+07:00",
    mentoring_opens: "2026-11-20T00:00:00+07:00",
    fully_funded_opens: "2026-11-25T00:00:00+07:00",
    phase1_close: "2027-05-10T23:59:59+07:00",
    phase2_open: "2027-05-11T00:00:00+07:00",
    phase2_close: "2027-05-24T23:59:59+07:00",
    phase3_open: "2027-05-25T00:00:00+07:00",
    phase3_submit_close: "2027-05-27T23:59:59+07:00",
    evaluation_close: "2027-05-31T23:59:59+07:00",
    results: "2027-06-01T00:00:00+07:00",
    preparation_start: "2027-06-08T00:00:00+07:00",
    preparation_end: "2027-07-26T23:59:59+07:00",
    mentoring_start: "2027-02-02T00:00:00+07:00",
    mentoring_end: "2027-05-11T23:59:59+07:00",
    programme_start: "2027-07-27T00:00:00+07:00",
    programme_end: "2027-08-03T23:59:59+07:00",
    mentoring_early_bird_until: "2026-12-31T23:59:59+07:00",
    mentoring_registration_close: null,
    self_funded_registration_close: null,
    deposit_due_days: 7,
    balance_due: "2027-06-30T23:59:59+07:00",
  },
  prices: {
    elco_pro_idr: 98000,
    elco_pro_months: 3,
    mentoring_early: { IDR: 1199000, USD: 79 },
    mentoring_regular: { IDR: 1499000, USD: 99 },
    self_funded_total: { IDR: 14999000, USD: 899 },
    // Deposit carried over from the original programme brief (USD 300 / IDR 5,000,000); not re-confirmed with the
    // 20 Nov price change, so it stays an admin setting (docs/gif-platform/DECISIONS.md).
    self_funded_deposit: { IDR: 5000000, USD: 300 },
    partial_funded_payable: { IDR: 10999000, USD: 699 },
  },
  cashback: { fully_funded: { IDR: 299000, USD: 19 }, partial_funded: { IDR: 749000, USD: 49 } },
  awards: {
    fully_funded_covers: ["Programme fee", "Accommodation during the programme", "In-programme transportation"],
    partial_funded_covers: ["A reduced participant contribution instead of the Self-Funded fee"],
    not_included: ["International flights to Singapore and from Thailand"],
  },
  slots: { fully_funded: 10, partial_funded: 10, capacity: 100 },
  payments: {
    // On since 21 Nov 2026 (founder go-ahead): international payers may pay USD items by card at the fixed rate.
    international_cards: true,
    international_card_enabled: true, // superseded, ignored
    usd_idr_card_rate: USD_IDR_PAYMENT_RATE,
    invoice_bank_details: null,
    allow_idr_for_international: false,
    bank_transfer_instructions:
      "Prefer bank transfer? Request an invoice and IELSco Finance will email it with the transfer details. A transfer counts once Finance has verified it.",
  },
  phase1_tasks: {
    enabled: true,
    items: [
      { key: "follow_ielsco", title: "Follow @iels.co", detail: "Follow the official IELSco Instagram account.", link: "ielsco" },
      { key: "follow_elco", title: "Follow @elco.ai", detail: "Follow the official Elco AI Instagram account.", link: "elco" },
      { key: "like_post", title: "Like the recruitment post", detail: "Like the GIF Summer 2027 recruitment post.", link: "post" },
      { key: "comment_tag3", title: "Comment and tag 3 friends", detail: "Comment on the recruitment post and tag three friends.", link: "post" },
      { key: "share_story", title: "Share the post to your Story", detail: "Share the recruitment post to your Instagram Story.", link: "post" },
    ],
  },
  instagram: { ielsco: "https://www.instagram.com/iels.co", elco: "https://www.instagram.com/elco.ai", recruitment_post: null },
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

// When registration for a pathway opens (falls back to the Phase 1 launch for settings saved before 21 Nov 2026).
export function pathwayOpensAt(s: Settings, p: Pathway): string {
  const v = p === "self_funded" ? s.dates.self_funded_opens : p === "mentoring" ? s.dates.mentoring_opens : s.dates.fully_funded_opens;
  return v || s.dates.launch;
}

// Is a pathway accepting new registrations right now? Returns the reason when it isn't (shown to applicants).
export function pathwayOpen(s: Settings, p: Pathway, now = new Date()): { open: boolean; reason?: string } {
  const t = now.getTime();
  if (!s.applications_open) return { open: false, reason: "Applications are closed." };
  if (!s.pathways_open[p]) return { open: false, reason: "This pathway is not accepting registrations right now." };
  const opens = pathwayOpensAt(s, p);
  if (t < new Date(opens).getTime()) return { open: false, reason: `Registration opens on ${new Date(opens).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}.` };
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

// What each participant owes when an application is submitted. Pure (node --test imports it).
// Prices are per participant (every team member is an individual delegate). No FX conversion happens anywhere:
// Indonesian citizens are charged the IDR price, everyone else the USD price; Elco Pro is an IDR product for everyone.
import { balanceOf, mentoringPrice, type Currency, type Pathway, type Settings } from "./settings.ts";

export function currencyFor(nationality: string): Currency {
  return nationality.toUpperCase() === "ID" ? "IDR" : "USD";
}

export type PlannedObligation = { kind: "elco_pro" | "mentoring" | "deposit" | "balance"; label: string; currency: Currency; amount: number; dueAt: string | null };

export function plannedObligations(s: Settings, pathway: Pathway, nationality: string, now = new Date()): PlannedObligation[] {
  const cur = currencyFor(nationality);
  if (pathway === "fully_funded") {
    return [{ kind: "elco_pro", label: `Elco Pro, ${s.prices.elco_pro_months} months (Phase 1)`, currency: "IDR", amount: s.prices.elco_pro_idr, dueAt: s.dates.phase1_close }];
  }
  if (pathway === "mentoring") {
    const { tier, price } = mentoringPrice(s, now);
    return [{ kind: "mentoring", label: `Project Mentoring Program (${tier === "early" ? "Early Bird" : "Regular"})`, currency: cur, amount: price[cur], dueAt: null }];
  }
  const days = s.dates.deposit_due_days;
  const depositDue = days ? new Date(now.getTime() + days * 86400000).toISOString() : null;
  return [
    { kind: "deposit", label: "Self-Funded deposit", currency: cur, amount: s.prices.self_funded_deposit[cur], dueAt: depositDue },
    { kind: "balance", label: "Self-Funded balance", currency: cur, amount: balanceOf(s)[cur], dueAt: s.dates.balance_due },
  ];
}

// Which gateway can collect an obligation, given the currency. Midtrans charges IDR only (docs.midtrans.com:
// "Midtrans currently only processes transactions in Indonesian Rupiah (IDR)").
export function collectionMethod(s: Settings, currency: Currency, midtransReady: boolean): "midtrans" | "manual" | "midtrans_idr_option" {
  if (currency === "IDR") return midtransReady ? "midtrans" : "manual";
  return midtransReady && s.payments.allow_idr_for_international ? "midtrans_idr_option" : "manual";
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === "IDR") return `IDR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
  return `USD ${new Intl.NumberFormat("en-US", { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount)}`;
}

// The IDR price an international payer would pay if the founder enables the IDR card option: the published IDR price of
// the same item, never a converted USD amount.
export function idrPriceFor(s: Settings, kind: string, now = new Date()): number | null {
  if (kind === "mentoring") return mentoringPrice(s, now).price.IDR;
  if (kind === "deposit") return s.prices.self_funded_deposit.IDR;
  if (kind === "balance") return balanceOf(s).IDR;
  if (kind === "full") return s.prices.self_funded_total.IDR;
  if (kind === "elco_pro") return s.prices.elco_pro_idr;
  return null;
}

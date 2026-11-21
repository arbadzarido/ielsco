// What each participant owes when an application is submitted. Pure (node --test imports it).
// Prices are per participant (every team member is an individual delegate). Indonesian citizens are charged the IDR
// price, everyone else the USD price; Elco Pro is an IDR product for everyone. Obligations keep their official currency
// and amount. The only conversion is for an international payer who chooses to pay a USD item by card through Midtrans
// (IDR-only): cardAmountIdr() = USD × the fixed rate in settings, recorded on the payment row (21 Nov 2026).
import { balanceOf, mentoringPrice, type Currency, type Money, type Pathway, type Settings } from "./settings.ts";

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

// Partial Funded contribution after acceptance: deposit (same configurable deposit as Self-Funded, capped at the
// contribution) due deposit_due_days after accepting, then the balance by the balance deadline.
export function partialFundedObligations(s: Settings, now = new Date()): { kind: "deposit" | "balance"; label: string; amount: Money; dueAt: string | null }[] {
  const pay = s.prices.partial_funded_payable;
  if (!pay) return [];
  const dep = { IDR: Math.min(s.prices.self_funded_deposit.IDR, pay.IDR), USD: Math.min(s.prices.self_funded_deposit.USD, pay.USD) };
  const days = s.dates.deposit_due_days;
  return [
    { kind: "deposit", label: "Partial Funded deposit", amount: dep, dueAt: days ? new Date(now.getTime() + days * 86400000).toISOString() : null },
    { kind: "balance", label: "Partial Funded balance", amount: { IDR: pay.IDR - dep.IDR, USD: pay.USD - dep.USD }, dueAt: s.dates.balance_due },
  ];
}

// Which way an obligation can be paid. Midtrans charges IDR only (docs.midtrans.com: "Midtrans currently only processes
// transactions in Indonesian Rupiah (IDR)").
// - IDR (Indonesian payers, and Elco Pro for everyone): Midtrans when it is configured, else manual.
// - USD (international payers): invoice always; plus Visa/Mastercard through Midtrans at the converted IDR amount
//   ("midtrans_idr_option") when the gateway is ready and Finance has switched international cards on.
export function collectionMethod(s: Settings, currency: Currency, midtransReady: boolean): "midtrans" | "manual" | "midtrans_idr_option" {
  if (currency === "IDR") return midtransReady ? "midtrans" : "manual";
  return midtransReady && internationalCardEnabled(s) ? "midtrans_idr_option" : "manual";
}

// payments.international_cards is the switch (default on since the founder's go-ahead on 21 Nov 2026). The older
// international_card_enabled / allow_idr_for_international keys are ignored: a false saved there before the go-ahead must not
// keep cards off.
export const internationalCardEnabled = (s: Settings) => s.payments.international_cards !== false;

// The IDR amount charged by card for a USD obligation: USD × fixed rate, rounded to whole rupiah (Midtrans requires an
// integer). Computed from the stored obligation amount on the server, never from anything the browser sends. Returns null
// for anything that is not a positive USD amount with a sane rate, so a bad setting can't produce a wrong charge.
export function cardAmountIdr(usdAmount: number, rate: number): number | null {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0 || !Number.isInteger(rate) || rate < 10000 || rate > 30000) return null;
  const cents = Math.round(usdAmount * 100); // USD amounts have at most 2 decimals; avoid float drift (e.g. 0.1 × 3)
  return Math.round((cents * rate) / 100);
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === "IDR") return `IDR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
  return `USD ${new Intl.NumberFormat("en-US", { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount)}`;
}

// The published IDR price of an item (Indonesian price list). Not used for international card payments any more: since
// 21 Nov 2026 those use cardAmountIdr(USD amount × fixed rate). Kept for reports and the admin price overview.
export function idrPriceFor(s: Settings, kind: string, now = new Date(), partial = false): number | null {
  if (partial && (kind === "deposit" || kind === "balance")) {
    const p = partialFundedObligations(s, now).find((o) => o.kind === kind);
    return p ? p.amount.IDR : null;
  }
  if (kind === "mentoring") return mentoringPrice(s, now).price.IDR;
  if (kind === "deposit") return s.prices.self_funded_deposit.IDR;
  if (kind === "balance") return balanceOf(s).IDR;
  if (kind === "full") return s.prices.self_funded_total.IDR;
  if (kind === "elco_pro") return s.prices.elco_pro_idr;
  return null;
}

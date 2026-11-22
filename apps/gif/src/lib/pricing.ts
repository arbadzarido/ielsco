// What each participant owes when an application is submitted. Pure (node --test imports it).
// Prices are per participant (every team member is an individual delegate). Indonesian citizens are charged the IDR
// price, everyone else the USD price; Elco Pro is an IDR product for everyone. Obligations keep their official currency
// and amount. The only conversion is for an international payer who chooses to pay a USD item by card through Midtrans
// (IDR-only): cardAmountIdr() = USD × the fixed rate in settings, recorded on the payment row (21 Nov 2026).
import { balanceOf, mentoringPrice, type Currency, type Money, type Pathway, type Settings } from "./settings.ts";

export function currencyFor(nationality: string): Currency {
  return nationality.toUpperCase() === "ID" ? "IDR" : "USD";
}

export type PlannedObligation = { kind: "elco_pro" | "mentoring" | "full"; label: string; currency: Currency; amount: number; dueAt: string | null; firstDueAt?: string | null };

export function plannedObligations(s: Settings, pathway: Pathway, nationality: string, now = new Date()): PlannedObligation[] {
  const cur = currencyFor(nationality);
  if (pathway === "fully_funded") {
    return [{ kind: "elco_pro", label: `Elco Pro, ${s.prices.elco_pro_months} months (Phase 1)`, currency: "IDR", amount: s.prices.elco_pro_idr, dueAt: s.dates.phase1_close }];
  }
  if (pathway === "mentoring") {
    const { tier, price } = mentoringPrice(s, now);
    return [{ kind: "mentoring", label: `Project Mentoring Program (${tier === "early" ? "Early Bird" : "Regular"})`, currency: cur, amount: price[cur], dueAt: null }];
  }
  // Self-Funded (22 Nov 2026): one programme fee paid in installments. The first payment (at least the minimum, see
  // installmentBounds) is due within deposit_due_days and confirms the seat; the rest by the balance deadline.
  const days = s.dates.deposit_due_days;
  const firstDue = days ? new Date(now.getTime() + days * 86400000).toISOString() : null;
  return [{ kind: "full", label: "Self-Funded programme fee", currency: cur, amount: s.prices.self_funded_total[cur], dueAt: s.dates.balance_due, firstDueAt: firstDue }];
}

// Partial Funded contribution after acceptance: one obligation paid in installments like the Self-Funded fee; the first
// payment is due deposit_due_days after accepting and confirms the seat, the rest by the balance deadline.
export function partialFundedObligations(s: Settings, now = new Date()): { kind: "full"; label: string; amount: Money; dueAt: string | null; firstDueAt: string | null }[] {
  const pay = s.prices.partial_funded_payable;
  if (!pay) return [];
  const days = s.dates.deposit_due_days;
  return [{ kind: "full", label: "Partial Funded contribution", amount: pay, dueAt: s.dates.balance_due, firstDueAt: days ? new Date(now.getTime() + days * 86400000).toISOString() : null }];
}

// ── Installments (flexible deposit, founder decision 22 Nov 2026) ───────────────────────────────────────────────────
// The fee obligations paid in installments: the Self-Funded fee / Partial Funded contribution ('full') and, for
// registrations made before 22 Nov 2026, the balance (and an unpaid deposit) that were split by a fixed deposit.
export const INSTALLMENT_KINDS = ["full", "deposit", "balance"] as const;
export const isInstallmentKind = (kind: string) => (INSTALLMENT_KINDS as readonly string[]).includes(kind);

const cents = (n: number) => Math.round(n * 100) / 100;

// The minimum payment in an obligation's currency: IDR min_installment_idr, or its USD equivalent at the card rate
// rounded UP to the cent (IDR 2,500,000 at 18,500 → USD 135.14), so a USD minimum is never worth less than the IDR one.
export function minInstallment(s: Settings, currency: Currency): number {
  const min = s.payments.min_installment_idr;
  return currency === "IDR" ? min : Math.ceil((min / s.payments.usd_idr_card_rate) * 100) / 100;
}

export type InstallmentBounds = {
  currency: Currency; remaining: number; min: number; max: number;
  // What the payer types and is charged by card (always IDR): bounds in IDR.
  minIdr: number; maxIdr: number; rate: number | null;
};

// Bounds for the next payment towards an obligation with `remaining` outstanding (obligation currency).
// Every payment is at least the minimum, unless the whole remainder is smaller than the minimum (then exactly the remainder).
export function installmentBounds(s: Settings, currency: Currency, remaining: number): InstallmentBounds | null {
  const rem = cents(remaining);
  if (!(rem > 0)) return null;
  const min = Math.min(minInstallment(s, currency), rem);
  if (currency === "IDR") return { currency, remaining: rem, min: Math.round(min), max: Math.round(rem), minIdr: Math.round(min), maxIdr: Math.round(rem), rate: null };
  const rate = s.payments.usd_idr_card_rate;
  const maxIdr = cardAmountIdr(rem, rate);
  if (!maxIdr) return null;
  const minIdr = Math.min(s.payments.min_installment_idr, maxIdr);
  return { currency, remaining: rem, min, max: rem, minIdr, maxIdr, rate };
}

export type InstallmentCheck = { ok: true; applied: number; chargedIdr: number; full: boolean } | { ok: false; error: string };

// An IDR amount typed by the payer (card or invoice): what it counts for in the obligation's currency. USD: IDR ÷ rate to
// the cent; paying the whole remaining IDR amount counts for exactly the remainder (no rounding residue).
export function checkInstallmentIdr(b: InstallmentBounds, amountIdr: number): InstallmentCheck {
  if (!Number.isFinite(amountIdr) || !Number.isInteger(amountIdr)) return { ok: false, error: "Enter a whole rupiah amount." };
  if (amountIdr < b.minIdr) return { ok: false, error: `The minimum payment is ${formatMoney(b.minIdr, "IDR")}${b.currency === "USD" ? ` (${formatMoney(b.min, "USD")})` : ""}.` };
  if (amountIdr > b.maxIdr) return { ok: false, error: `That is more than your remaining balance of ${formatMoney(b.maxIdr, "IDR")}${b.currency === "USD" ? ` (${formatMoney(b.remaining, "USD")})` : ""}.` };
  const full = amountIdr === b.maxIdr;
  if (b.currency === "IDR") return { ok: true, applied: amountIdr, chargedIdr: amountIdr, full };
  const applied = full ? b.remaining : Math.min(cents(amountIdr / b.rate!), b.remaining);
  return { ok: true, applied, chargedIdr: amountIdr, full: full || applied >= b.remaining };
}

// An amount in the obligation's own currency (Finance recording a transfer, USD invoices).
export function checkInstallmentAmount(b: InstallmentBounds, amount: number): InstallmentCheck {
  const a = b.currency === "IDR" ? amount : cents(amount);
  if (!Number.isFinite(a) || !(a > 0) || (b.currency === "IDR" && !Number.isInteger(a))) return { ok: false, error: "Enter a valid amount." };
  if (a < b.min - 0.001) return { ok: false, error: `The minimum payment is ${formatMoney(b.min, b.currency)}.` };
  if (a > b.max + 0.001) return { ok: false, error: `That is more than the remaining ${formatMoney(b.max, b.currency)}.` };
  const chargedIdr = b.currency === "IDR" ? a : (a >= b.remaining ? b.maxIdr : cardAmountIdr(a, b.rate!) ?? 0);
  return { ok: true, applied: a, chargedIdr, full: a >= b.remaining - 0.001 };
}

// Early bird: the fee for one of the first slots.self_funded_early Self-Funded delegates, and the discount it means.
export function earlyBirdDiscount(s: Settings, currency: Currency): number {
  const d = s.prices.self_funded_total[currency] - s.prices.self_funded_early_total[currency];
  return d > 0 ? d : 0;
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
  if (partial && kind === "full") return s.prices.partial_funded_payable?.IDR ?? null;
  if (kind === "mentoring") return mentoringPrice(s, now).price.IDR;
  if (kind === "deposit") return s.prices.self_funded_deposit.IDR;
  if (kind === "balance") return balanceOf(s).IDR;
  if (kind === "full") return s.prices.self_funded_total.IDR;
  if (kind === "elco_pro") return s.prices.elco_pro_idr;
  return null;
}

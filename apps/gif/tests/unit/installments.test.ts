import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, resolveSettings } from "../../src/lib/settings.ts";
import { checkInstallmentAmount, checkInstallmentIdr, earlyBirdDiscount, installmentBounds, isInstallmentKind, minInstallment } from "../../src/lib/pricing.ts";

const s = DEFAULT_SETTINGS;

test("minimum deposit IDR 2,500,000 = USD 135.14 at USD 1 = IDR 18,500 (rounded up to the cent)", () => {
  assert.equal(s.payments.min_installment_idr, 2500000);
  assert.equal(minInstallment(s, "IDR"), 2500000);
  assert.equal(minInstallment(s, "USD"), 135.14);
  assert.ok(135.14 * 18500 >= 2500000, "the USD minimum is never worth less than IDR 2,500,000");
});

test("prices: advertised USD 899 / IDR 14,999,000; early bird USD 799 / IDR 13,999,000 for the first 10", () => {
  assert.deepEqual(s.prices.self_funded_total, { IDR: 14999000, USD: 899 });
  assert.deepEqual(s.prices.self_funded_early_total, { IDR: 13999000, USD: 799 });
  assert.equal(s.slots.self_funded_early, 10);
  assert.equal(earlyBirdDiscount(s, "USD"), 100);
  assert.equal(earlyBirdDiscount(s, "IDR"), 1000000);
});

test("installment kinds: the Self-Funded fee / Partial Funded contribution and legacy deposit + balance only", () => {
  for (const k of ["full", "deposit", "balance"]) assert.equal(isInstallmentKind(k), true);
  for (const k of ["elco_pro", "mentoring", "other"]) assert.equal(isInstallmentKind(k), false);
});

test("USD fee USD 899: any IDR amount from 2,500,000 up to the remaining balance, converted once", () => {
  const b = installmentBounds(s, "USD", 899)!;
  assert.equal(b.minIdr, 2500000);
  assert.equal(b.maxIdr, 16631500);
  for (const [idr, usd] of [[2500000, 135.14], [3000000, 162.16], [4000000, 216.22]] as const) {
    const c = checkInstallmentIdr(b, idr);
    assert.ok(c.ok && c.applied === usd && c.chargedIdr === idr && !c.full, `${idr}`);
  }
  assert.equal(checkInstallmentIdr(b, 2499999).ok, false, "below the minimum");
  assert.equal(checkInstallmentIdr(b, 16631501).ok, false, "more than the balance");
  const all = checkInstallmentIdr(b, 16631500);
  assert.ok(all.ok && all.full && all.applied === 899, "paying the full balance clears it exactly");
  assert.equal(checkInstallmentIdr(b, 2500000.5).ok, false, "whole rupiah only");
});

test("multiple installments add up exactly to the fee (no rounding residue)", () => {
  let remaining = 899;
  for (const idr of [2500000, 3000000, 4000000]) {
    const c = checkInstallmentIdr(installmentBounds(s, "USD", remaining)!, idr);
    assert.ok(c.ok);
    remaining = Math.round((remaining - c.applied) * 100) / 100;
  }
  assert.equal(remaining, 899 - 135.14 - 162.16 - 216.22);
  const last = installmentBounds(s, "USD", remaining)!;
  const c = checkInstallmentIdr(last, last.maxIdr);
  assert.ok(c.ok && c.full && Math.round((remaining - c.applied) * 100) === 0);
});

test("a remainder smaller than the minimum can be paid in full (and only in full)", () => {
  const b = installmentBounds(s, "IDR", 1200000)!;
  assert.equal(b.minIdr, 1200000);
  assert.equal(b.maxIdr, 1200000);
  assert.ok(checkInstallmentIdr(b, 1200000).ok);
  assert.equal(checkInstallmentIdr(b, 1000000).ok, false);
  const u = installmentBounds(s, "USD", 50)!;
  assert.equal(u.maxIdr, 925000);
  assert.equal(u.minIdr, 925000);
});

test("IDR fee IDR 14,999,000: Indonesian payers choose any amount from 2,500,000, no conversion", () => {
  const b = installmentBounds(s, "IDR", 14999000)!;
  const c = checkInstallmentIdr(b, 3000000);
  assert.ok(c.ok && c.applied === 3000000 && c.chargedIdr === 3000000);
  assert.equal(installmentBounds(s, "IDR", 0), null, "nothing outstanding");
});

test("Finance recording a transfer in the fee currency: same minimum and maximum", () => {
  const b = installmentBounds(s, "USD", 899)!;
  assert.ok(checkInstallmentAmount(b, 135.14).ok);
  assert.equal(checkInstallmentAmount(b, 135.13).ok, false);
  assert.equal(checkInstallmentAmount(b, 900).ok, false);
  const full = checkInstallmentAmount(b, 899);
  assert.ok(full.ok && full.full && full.chargedIdr === 16631500);
});

test("the minimum follows the settings (rate and IDR minimum), never a hardcoded USD number", () => {
  const t = resolveSettings({ payments: { usd_idr_card_rate: 20000, min_installment_idr: 3000000 } });
  assert.equal(minInstallment(t, "USD"), 150);
  assert.equal(installmentBounds(t, "USD", 899)!.minIdr, 3000000);
});

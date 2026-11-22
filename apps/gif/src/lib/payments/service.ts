import "server-only";
import { randomBytes } from "node:crypto";
import type pg from "pg";
import { one, q, tx } from "../db";
import { audit } from "../audit";
import { currentCohort } from "../cohort";
import { siteUrl } from "../request";
import { sendEmail, deliverQueued } from "../email/send";
import { onboardingEmail, participantUrl, paymentFailedEmail, paymentReceivedEmail } from "../email/templates";
import { cardAmountIdr, checkInstallmentAmount, checkInstallmentIdr, collectionMethod, earlyBirdDiscount, formatMoney, installmentBounds, isInstallmentKind } from "../pricing";
import type { Settings } from "../settings";
import { LEGAL_VERSION, PAYMENT_CONSENTS } from "../legal";
import { recordServerEvent } from "../analytics";
import { midtransGateway, paymentsState, type GatewayStatus } from "./gateway";
import type { Normalized } from "./midtrans";
import { tasksComplete, type TaskMap } from "../tasks";
import { autoActivatePending } from "../elco";
import { guardianBlocks } from "../guardian";

// Rules (docs/gif/PAYMENTS.md):
// - The server decides the obligation, amount and order id. A browser return URL is never proof of payment: payments
//   change only from a signature-verified notification or a server-side status read from the gateway, both of which
//   re-read the authoritative status before changing anything.
// - Every change happens in one transaction with the payment row locked, so duplicate, late or out-of-order
//   notifications are applied at most once. A second settled payment for an already-paid obligation is kept, flagged
//   is_duplicate and queued for refund; it never creates a second obligation.

const CHECKOUT_MINUTES = 60;
const TERMINAL_UNPAID: Normalized[] = ["failed", "expired", "cancelled"];

export class PaymentError extends Error { constructor(msg: string, public code: string) { super(msg); } }

type ObligationRow = { id: string; application_id: string; participant_id: string; kind: string; label: string; currency: "IDR" | "USD";
  amount: number; status: string; owner_account_id: string; participant_account_id: string | null; app_status: string; pathway: string;
  legal_name: string; email: string; whatsapp: string; code: string; date_of_birth: string; guardian_consent_at: string | null;
  paid_amount: number; seat_status: string; cohort_id: string };

async function loadObligation(db: pg.PoolClient | null, obligationId: string, lock = false): Promise<ObligationRow | null> {
  const sql = `select o.id, o.application_id, o.participant_id, o.kind, o.label, o.currency, o.amount::float8 as amount, o.status,
      a.owner_account_id, p.account_id as participant_account_id, a.status as app_status, a.pathway, p.legal_name, p.email, p.whatsapp, a.code, p.date_of_birth, p.guardian_consent_at,
      o.paid_amount::float8 as paid_amount, p.seat_status, p.cohort_id
    from gif.obligations o join gif.applications a on a.id = o.application_id join gif.participants p on p.id = o.participant_id
    where o.id = $1 ${lock ? "for update of o" : ""}`;
  return db ? ((await db.query<ObligationRow>(sql, [obligationId])).rows[0] ?? null) : one<ObligationRow>(sql, [obligationId]);
}

export async function hasPaymentConsent(accountId: string): Promise<boolean> {
  const rows = await q<{ category: string; accepted: boolean }>(
    `select distinct on (category) category, accepted from gif.consents where account_id = $1 and document_version = $2 and category = any($3)
     order by category, at desc`, [accountId, LEGAL_VERSION, PAYMENT_CONSENTS]);
  return PAYMENT_CONSENTS.every((c) => rows.some((r) => r.category === c && r.accepted));
}

function newOrderId(prefix: string, kind: string) {
  const k = { elco_pro: "EP", mentoring: "MT", deposit: "DP", balance: "BL", full: "FL", other: "OT" }[kind] ?? "OT";
  return `${prefix}-${k}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export type CheckoutOut = { redirectUrl: string; orderId: string; token: string | null; snap: { clientKey: string; scriptUrl: string } | null; reused: boolean };

// Payment attempts (docs/gif-platform/PAYMENTS.md, "Attempts"): an obligation has many attempts, each with its own Midtrans
// order_id. "Pay" reopens the open attempt (Continue payment) unless the payer cancelled it or, after Midtrans refused a
// cancellation, explicitly asked for a new one (opts.forceNew). Closing the Snap popup changes nothing on the server.
export async function startCheckout(accountId: string, obligationIdIn: string, opts: { idrOption?: boolean; forceNew?: boolean; amountIdr?: number } = {}): Promise<CheckoutOut> {
  const cohort = await currentCohort();
  const s = cohort.settings;
  // An unpaid deposit + balance pair from before 22 Nov 2026 becomes one fee paid in installments.
  const obligationId = (await mergeLegacyFee(obligationIdIn)) ?? obligationIdIn;
  const ob = await loadObligation(null, obligationId);
  if (!ob || (ob.owner_account_id !== accountId && ob.participant_account_id !== accountId)) throw new PaymentError("Payment not found.", "not_found");
  if (ob.status !== "open") throw new PaymentError("This item is already settled.", "not_open");
  if (["draft", "withdrawn", "not_selected"].includes(ob.app_status)) throw new PaymentError("This application can't take payments right now.", "app_state");
  if (!(await hasPaymentConsent(accountId))) throw new PaymentError("Accept the Terms, Payment Terms and Refund Policy before paying.", "consent");
  if (guardianBlocks(ob)) throw new PaymentError("This delegate is under 18: a parent or guardian must give consent before payment. We emailed them a consent link; you can resend it from your dashboard.", "guardian");
  const gw = midtransGateway();
  const method = collectionMethod(s, ob.currency, !!gw);
  // The amount always comes from the stored obligation (and, for USD, the fixed rate in settings), never from the browser.
  // Installments (Self-Funded fee, Partial Funded contribution): the payer chooses the amount (IDR), which the server checks
  // against the minimum and the outstanding balance and converts once (USD obligations) — see lib/pricing.ts.
  let amountIdr: number;
  let applied: number | null = null;
  let fx: { originalAmount: number; originalCurrency: "USD"; rate: number } | null = null;
  const installment = isInstallmentKind(ob.kind);
  if (installment) {
    const b = installmentBounds(s, ob.currency, ob.amount - ob.paid_amount);
    if (!b) throw new PaymentError("Nothing is outstanding on this item.", "not_open");
    if (ob.currency === "IDR" && method !== "midtrans") throw new PaymentError("Online payment is not available yet. Request an invoice instead.", "gateway_off");
    if (ob.currency === "USD" && (method !== "midtrans_idr_option" || !opts.idrOption)) throw new PaymentError("Card payment isn't available for this item right now. Request an invoice instead.", "usd_manual");
    const chk = checkInstallmentIdr(b, Number(opts.amountIdr ?? b.maxIdr));
    if (!chk.ok) throw new PaymentError(chk.error, "amount");
    amountIdr = chk.chargedIdr;
    applied = chk.applied;
    if (ob.currency === "USD") fx = { originalAmount: chk.applied, originalCurrency: "USD", rate: s.payments.usd_idr_card_rate };
  } else if (ob.currency === "IDR") {
    // Indonesian payers and Elco Pro: unchanged, the official IDR amount.
    if (method !== "midtrans") throw new PaymentError("Online payment is not available yet. Request an invoice instead.", "gateway_off");
    amountIdr = Math.round(ob.amount);
  } else if (ob.currency === "USD") {
    if (method !== "midtrans_idr_option" || !opts.idrOption) throw new PaymentError("Card payment isn't available for this item right now. Request an invoice instead.", "usd_manual");
    const rate = s.payments.usd_idr_card_rate;
    const idr = cardAmountIdr(Number(ob.amount), rate);
    if (!idr) throw new PaymentError("Card payment isn't available for this item right now. Request an invoice instead.", "no_rate");
    amountIdr = idr;
    fx = { originalAmount: Number(ob.amount), originalCurrency: "USD", rate };
  } else {
    throw new PaymentError("Unsupported currency.", "currency");
  }
  if (ob.kind === "balance") {
    const dep = await one("select 1 from gif.obligations where participant_id = $1 and kind = 'deposit' and status in ('paid', 'waived')", [ob.participant_id]);
    if (!dep) throw new PaymentError("Pay the deposit first.", "deposit_first");
  }
  if (installment && ob.seat_status !== "confirmed") {
    const seats = await one<{ n: number }>("select count(*)::int as n from gif.participants where cohort_id = $1 and seat_status = 'confirmed'", [cohort.id]);
    if ((seats?.n ?? 0) >= s.slots.capacity) throw new PaymentError("All seats are taken. Contact us to join the waiting list.", "full");
  }

  // Reuse a live checkout for this obligation instead of creating a second payment, so a double click or a second tab
  // never produces two charges; the lock makes concurrent clicks wait for each other.
  const prep = await tx(async (db) => {
    await loadObligation(db, obligationId, true);
    const open = (await db.query<{ id: string; order_id: string; checkout_url: string | null; snap_token: string | null; status: string; cancel_result: string | null; amount: number; live: boolean; fresh: boolean }>(
      `select id, order_id, checkout_url, snap_token, status, cancel_result, amount::float8 as amount,
         (checkout_url is not null and checkout_expires_at > now() + interval '2 minutes') as live,
         (checkout_url is null and created_at > now() - interval '1 minute') as fresh
       from gif.payments where obligation_id = $1 and gateway = 'midtrans' and status in ('created', 'pending', 'cancelling')
       order by created_at desc`, [obligationId])).rows;
    // A cancellation is being confirmed with Midtrans: wait for it rather than opening a second order next to it.
    if (open.some((p) => p.status === "cancelling")) throw new PaymentError("Your previous payment is being cancelled. This takes a few seconds; please try again.", "cancelling");
    // Two clicks at the same moment: the first is still creating its payment page.
    if (open.some((p) => p.fresh)) throw new PaymentError("Your payment page is being prepared. Please try again in a few seconds.", "in_progress");
    const live = open.find((p) => p.live && Math.round(p.amount) === amountIdr);
    if (live && !opts.forceNew) return { reuse: live };
    // A payment of a different amount is still open: continue it, or cancel it before choosing another amount.
    const other = open.find((p) => p.live && Math.round(p.amount) !== amountIdr && p.cancel_result !== "not_cancellable");
    if (other && !opts.forceNew) throw new PaymentError(`You already started a payment of ${formatMoney(Math.round(other.amount), "IDR")}. Continue it, or cancel it to pay a different amount.`, "open_attempt");
    if (live && opts.forceNew && live.cancel_result !== "not_cancellable") {
      throw new PaymentError("Cancel your previous payment first (Cancel & change payment method), then choose a new method.", "open_attempt");
    }
    const orderId = newOrderId(cohort.code_prefix, ob.kind);
    // IDR payments use exactly the original insert, so they keep working even before migration 20261128 is applied;
    // only converted card payments write the conversion columns.
    const id = (fx
      ? await db.query<{ id: string }>(`insert into gif.payments (obligation_id, application_id, participant_id, kind, gateway, order_id, amount, currency, status, created_by, checkout_expires_at,
          original_amount, original_currency, fx_rate, fx_source, applied_amount)
        values ($1, $2, $3, $4, 'midtrans', $5, $6, 'IDR', 'created', $7, now() + make_interval(mins => $8), $9, $10, $11, 'settings.payments.usd_idr_card_rate', $12) returning id`,
        [ob.id, ob.application_id, ob.participant_id, ob.kind, orderId, amountIdr, accountId, CHECKOUT_MINUTES, fx.originalAmount, fx.originalCurrency, fx.rate, applied])
      : await db.query<{ id: string }>(`insert into gif.payments (obligation_id, application_id, participant_id, kind, gateway, order_id, amount, currency, status, created_by, checkout_expires_at, applied_amount)
          values ($1, $2, $3, $4, 'midtrans', $5, $6, 'IDR', 'created', $7, now() + make_interval(mins => $8), $9) returning id`,
        [ob.id, ob.application_id, ob.participant_id, ob.kind, orderId, amountIdr, accountId, CHECKOUT_MINUTES, applied ?? amountIdr])).rows[0].id;
    // Link the earlier attempts this one replaces (cancelled, expired, failed, or still pending after a refused cancellation).
    await db.query(`update gif.payments set replaced_by = $2 where obligation_id = $1 and id <> $2 and replaced_by is null
      and gateway = 'midtrans' and status in ('cancelled', 'expired', 'failed', 'pending', 'created')`, [ob.id, id]);
    return { orderId };
  });
  const snapInfo = gw!.snap;
  if ("reuse" in prep && prep.reuse) {
    const r = prep.reuse;
    return { redirectUrl: r.checkout_url!, orderId: r.order_id, token: r.snap_token, snap: r.snap_token ? snapInfo : null, reused: true };
  }
  const orderId = (prep as { orderId: string }).orderId;
  try {
    const { redirectUrl, token } = await gw!.createCheckout({
      orderId, amount: amountIdr, currency: "IDR", itemId: `${ob.code}-${ob.kind}`, itemName: ob.label,
      customer: { name: ob.legal_name, email: ob.email, phone: ob.whatsapp },
      finishUrl: `${siteUrl()}/portal/payments/return?order_id=${encodeURIComponent(orderId)}`,
      notificationUrl: `${siteUrl()}/api/payments/midtrans/notification`, expiryMinutes: CHECKOUT_MINUTES,
      // International (USD) items: Visa/Mastercard only, so the converted IDR amount is charged to a card.
      enabledPayments: fx ? ["credit_card"] : undefined,
    });
    await q("update gif.payments set checkout_url = $2, snap_token = $3, updated_at = now() where order_id = $1", [orderId, redirectUrl, token]);
    await recordServerEvent("payment_initiated", { pathway: ob.pathway, kind: ob.kind });
    return { redirectUrl, orderId, token, snap: snapInfo, reused: false };
  } catch (e) {
    await q("update gif.payments set status = 'failed', updated_at = now() where order_id = $1", [orderId]);
    console.error("[gif] checkout failed", (e as Error).message);
    throw new PaymentError("The payment page could not be opened. Please try again in a moment.", "gateway_error");
  }
}

// "IDR 16,631,500 (USD 899 at USD 1 = IDR 18,500)" for a converted card payment, else the plain amount.
export function paidAmountText(p: { amount: number; currency?: string; original_amount: number | null; original_currency: string | null; fx_rate: number | null }) {
  const paid = formatMoney(Number(p.amount), "IDR");
  return p.original_amount && p.original_currency === "USD" && p.fx_rate
    ? `${paid} (${formatMoney(Number(p.original_amount), "USD")} at USD 1 = ${formatMoney(Number(p.fx_rate), "IDR")})` : paid;
}

function receiptNo(prefix: string) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-R-${d}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

// Re-read the gateway's authoritative status for an order and apply it. Used by the webhook (after its signature check),
// by the return page (server-side poll) and by the reconcile cron.
export async function syncFromGateway(orderId: string, source: "webhook" | "status_check", notification?: Record<string, unknown>, signatureOk?: boolean) {
  const gw = midtransGateway();
  if (!gw) throw new PaymentError("Payments are not configured.", "gateway_off");
  const exists = await one<{ id: string }>("select id from gif.payments where order_id = $1", [orderId]);
  if (!exists) return { applied: false, reason: "unknown_order" as const };
  const st = await gw.fetchStatus(orderId);
  if (!st) return { applied: false, reason: "not_at_gateway" as const };
  return applyStatus(orderId, source, st, notification, signatureOk);
}

export async function applyStatus(orderId: string, source: "webhook" | "status_check", st: GatewayStatus, notification?: Record<string, unknown>, signatureOk?: boolean) {
  const cohort = await currentCohort();
  const outcome = await tx(async (db) => {
    const pay = (await db.query<{ id: string; obligation_id: string; application_id: string; participant_id: string; amount: number; currency: string; status: string; kind: string; is_duplicate: boolean; original_amount: number | null; original_currency: "USD" | "IDR" | null; fx_rate: number | null; cancel_requested_at: string | null }>(
      "select * from gif.payments where order_id = $1 for update", [orderId])).rows[0];
    if (!pay) return { applied: false, reason: "unknown_order" };
    const dedupe = `${orderId}:${source}:${st.transactionStatus}:${st.fraudStatus ?? ""}`;
    const ev = await db.query(`insert into gif.payment_events (payment_id, order_id, source, transaction_status, fraud_status, status_code, gross_amount, signature_ok, dedupe_key, payload)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (dedupe_key) do nothing returning id`,
      [pay.id, orderId, source, st.transactionStatus, st.fraudStatus, st.statusCode, st.amount != null ? String(st.amount) : null, signatureOk ?? null, dedupe,
        JSON.stringify({ notification: notification ?? null, status: st.raw })]);
    const firstTime = ev.rowCount === 1;
    let next = st.result;
    if (next === "unknown") return { applied: false, reason: "unknown_status" };
    if (next === "paid" && (st.amount == null || Math.round(st.amount) !== Math.round(pay.amount) || (st.currency && st.currency !== "IDR"))) {
      await audit("system", "payment_amount_mismatch", "payment", pay.id, { orderId, expected: pay.amount, got: st.amount, currency: st.currency }, null, db);
      return { applied: false, reason: "amount_mismatch" };
    }
    const cur = pay.status as Normalized | "created" | "cancelling";
    // Monotonic: a settled payment can only move to refunded; refunded never goes back.
    if (cur === "paid" && !["refunded", "partially_refunded"].includes(next)) next = "paid";
    if ((cur === "refunded") || (cur === "partially_refunded" && next !== "refunded")) next = cur;
    if (next === cur) return { applied: false, reason: firstTime ? "no_change" : "duplicate_event" };

    const sideEffects: (() => Promise<void>)[] = [];
    if (next === "paid") {
      const ob = (await db.query<{ status: string; label: string; currency: "IDR" | "USD"; kind: string; amount: number; paid_amount: number }>(
        "select status, label, currency, kind, amount::float8 as amount, paid_amount::float8 as paid_amount from gif.obligations where id = $1 for update", [pay.obligation_id])).rows[0];
      const alreadySettled = ob.status === "paid" || ob.status === "waived";
      const receipt = receiptNo(cohort.code_prefix);
      await db.query(`update gif.payments set status = 'paid', paid_at = now(), gateway_txn_id = $2, payment_type = $3, is_duplicate = $4, receipt_no = $5, updated_at = now() where id = $1`,
        [pay.id, st.transactionId, st.paymentType, alreadySettled, receipt]);
      if (alreadySettled) {
        // Duplicate payment: keep the money traceable and queue a full refund for finance to approve.
        await db.query(`insert into gif.refunds (payment_id, amount, currency, reason, method, status, refund_key, requested_by)
          values ($1, $2, 'IDR', 'Duplicate payment for an obligation that was already paid', 'gateway', 'requested', $3, 'system')`, [pay.id, pay.amount, `dup-${pay.id}`]);
        await audit("system", "duplicate_payment", "payment", pay.id, { orderId, obligation: pay.obligation_id }, null, db);
      } else if (isInstallmentKind(ob.kind)) {
        // An installment: credit what it counts for (never more than the outstanding amount; any excess goes to the refund queue).
        const counted = Number((pay as { applied_amount?: number | null }).applied_amount ?? pay.original_amount ?? ob.amount);
        const credit = await creditInstallment(db, cohort.settings, { id: pay.id, amount: Number(pay.amount), obligation_id: pay.obligation_id, participant_id: pay.participant_id }, ob, counted, "gateway");
        const who = (await db.query<{ legal_name: string; email: string; owner_email: string }>(
          `select p.legal_name, p.email, acc.email as owner_email from gif.participants p join gif.applications a on a.id = p.application_id
           join gif.accounts acc on acc.id = a.owner_account_id where p.id = $1`, [pay.participant_id])).rows[0];
        const m = paymentReceivedEmail(who.legal_name, ob.label, paidAmountText(pay), receipt, participantUrl(`/portal/receipts/${pay.id}`), credit.remainingText);
        for (const to of new Set([who.email, who.owner_email])) {
          await sendEmail({ to, template: "payment_received", ...m, dedupeKey: `paid:${pay.id}:${to}`, applicationId: pay.application_id }, db);
        }
        sideEffects.push(() => recordServerEvent("payment_succeeded", { kind: pay.kind }));
      } else {
        await db.query("update gif.obligations set status = 'paid', paid_at = now(), paid_amount = amount, updated_at = now() where id = $1", [pay.obligation_id]);
        await afterObligationPaid(db, pay.participant_id, pay.obligation_id, pay.kind);
        const who = (await db.query<{ legal_name: string; email: string; owner_email: string }>(
          `select p.legal_name, p.email, acc.email as owner_email from gif.participants p join gif.applications a on a.id = p.application_id
           join gif.accounts acc on acc.id = a.owner_account_id where p.id = $1`, [pay.participant_id])).rows[0];
        const m = paymentReceivedEmail(who.legal_name, ob.label, paidAmountText(pay), receipt, participantUrl(`/portal/receipts/${pay.id}`));
        for (const to of new Set([who.email, who.owner_email])) {
          await sendEmail({ to, template: "payment_received", ...m, dedupeKey: `paid:${pay.id}:${to}`, applicationId: pay.application_id }, db);
        }
        sideEffects.push(() => recordServerEvent("payment_succeeded", { kind: pay.kind }));
        if (pay.kind === "elco_pro") sideEffects.push(() => autoActivatePending(pay.application_id).then(() => {}));
      }
    } else if (TERMINAL_UNPAID.includes(next)) {
      await db.query(`update gif.payments set status = $2, payment_type = coalesce($3, payment_type), updated_at = now(),
        cancel_result = case when cancel_requested_at is not null and $2 = 'cancelled' then 'cancelled' else cancel_result end where id = $1`, [pay.id, next, st.paymentType]);
      // A payer who cancelled on purpose doesn't get a "payment failed" email.
      if (cur === "pending" && !pay.cancel_requested_at) {
        const who = (await db.query<{ legal_name: string; email: string; label: string }>(
          "select p.legal_name, p.email, o.label from gif.participants p join gif.obligations o on o.participant_id = p.id where o.id = $1", [pay.obligation_id])).rows[0];
        const m = paymentFailedEmail(who.legal_name, who.label);
        await sendEmail({ to: who.email, template: "payment_failed", ...m, dedupeKey: `failed:${pay.id}`, applicationId: pay.application_id }, db);
      }
      sideEffects.push(() => recordServerEvent("payment_failed", { kind: pay.kind, status: next }));
    } else if (next === "pending") {
      // While a cancellation is being confirmed the attempt stays "cancelling"; the cancel flow settles it.
      await db.query(`update gif.payments set status = case when status = 'cancelling' then 'cancelling' else 'pending' end, payment_type = $2,
        gateway_txn_id = coalesce($3, gateway_txn_id), updated_at = now() where id = $1`, [pay.id, st.paymentType, st.transactionId]);
      if (cur === "cancelling") return { applied: false, reason: "cancelling" };
    } else if (next === "refunded" || next === "partially_refunded") {
      await db.query("update gif.payments set status = $2, updated_at = now() where id = $1", [pay.id, next]);
      // Installments: refundPayment already adjusted what the payment counts for; the obligation stays payable.
      if (!pay.is_duplicate && !isInstallmentKind(pay.kind)) await db.query("update gif.obligations set status = $2, updated_at = now() where id = $1", [pay.obligation_id, next]);
    }
    await recompute(db, pay.application_id, `gateway:${source}`);
    return { applied: true, status: next, sideEffects };
  });
  if ("sideEffects" in outcome && outcome.sideEffects) for (const f of outcome.sideEffects) await f().catch(() => {});
  await deliverQueued().catch(() => {});
  return { applied: outcome.applied, status: "status" in outcome ? outcome.status : undefined, reason: "reason" in outcome ? outcome.reason : undefined };
}

// ── Installments (flexible deposit, 22 Nov 2026) ─────────────────────────────────────────────────────────────────
// Credit a verified payment to an installment obligation (row locked by the caller): never more than is outstanding; any
// excess is queued for refund. The first verified payment confirms the seat (and may assign the early-bird fee).
async function creditInstallment(db: pg.PoolClient, s: Settings, pay: { id: string; amount: number; obligation_id: string; participant_id: string },
  ob: { currency: "IDR" | "USD"; amount: number; paid_amount: number; kind: string }, counted: number, source: "gateway" | "manual") {
  const remaining = Math.max(0, Math.round((ob.amount - ob.paid_amount) * 100) / 100);
  const credit = Math.min(counted, remaining);
  const excess = Math.round((counted - credit) * 100) / 100;
  const paidNow = Math.round((ob.paid_amount + credit) * 100) / 100;
  const full = paidNow >= ob.amount - 0.004;
  await db.query(`update gif.obligations set paid_amount = $2, status = case when $3 then 'paid' else status end,
    paid_at = case when $3 then now() else paid_at end, updated_at = now() where id = $1`, [pay.obligation_id, paidNow, full]);
  await db.query("update gif.payments set applied_amount = $2 where id = $1", [pay.id, credit]);
  if (excess > 0.004) {
    const refundAmount = source === "gateway" ? Math.round(pay.amount * excess / counted) : excess;
    await db.query(`insert into gif.refunds (payment_id, amount, currency, reason, method, status, refund_key, requested_by)
      values ($1, $2, $3, 'Paid more than the outstanding balance', $4, 'requested', $5, 'system') on conflict do nothing`,
      [pay.id, refundAmount, source === "gateway" ? "IDR" : ob.currency, source === "gateway" ? "gateway" : "manual", `over-${pay.id}`]);
    await audit("system", "installment_overpaid", "payment", pay.id, { excess, currency: ob.currency }, null, db);
  }
  const seat = (await db.query<{ id: string }>(
    "update gif.participants set seat_status = 'confirmed', seat_confirmed_at = now(), updated_at = now() where id = $1 and seat_status = 'none' returning id", [pay.participant_id])).rows[0];
  if (seat) await assignEarlyBirds(db, s, pay.participant_id);
  if (full) await afterObligationPaid(db, pay.participant_id, pay.obligation_id, ob.kind);
  const now = (await db.query<{ amount: number; paid_amount: number; currency: "IDR" | "USD" }>("select amount::float8 as amount, paid_amount::float8 as paid_amount, currency from gif.obligations where id = $1", [pay.obligation_id])).rows[0];
  const left = Math.max(0, Math.round((now.amount - now.paid_amount) * 100) / 100);
  return { full: left <= 0.004, remaining: left, remainingText: left > 0.004 ? formatMoney(left, now.currency) : "Fully paid" };
}

// Early bird (22 Nov 2026): the first slots.self_funded_early Self-Funded delegates whose seat is confirmed (first verified
// payment; seats confirmed before this change count first, in order) pay self_funded_early_total. The cohort row is locked
// so two payments at the same moment can't both take the last place. A discount that leaves the fee overpaid queues a refund.
export async function assignEarlyBirds(db: pg.PoolClient, s: Settings, _participantId?: string) {
  void _participantId;
  const slots = s.slots.self_funded_early ?? 0;
  if (!(slots > 0)) return 0;
  const cohort = (await db.query<{ id: string }>("select id from gif.cohorts where is_current for update")).rows[0];
  if (!cohort) return 0;
  const taken = (await db.query<{ n: number }>("select count(*)::int as n from gif.participants where cohort_id = $1 and early_bird_at is not null", [cohort.id])).rows[0].n;
  if (taken >= slots) return 0;
  const next = (await db.query<{ id: string; currency: "IDR" | "USD" }>(
    `select p.id, p.currency from gif.participants p join gif.applications a on a.id = p.application_id
     where p.cohort_id = $1 and a.pathway = 'self_funded' and p.seat_status = 'confirmed' and p.early_bird_at is null and p.withdrawn_at is null
     order by p.seat_confirmed_at, p.created_at limit $2`, [cohort.id, slots - taken])).rows;
  for (const p of next) {
    const discount = earlyBirdDiscount(s, p.currency);
    const fee = (await db.query<{ id: string; amount: number; paid_amount: number }>(
      `select id, amount::float8 as amount, paid_amount::float8 as paid_amount from gif.obligations
       where participant_id = $1 and kind in ('full', 'balance') and status in ('open', 'paid') order by case kind when 'full' then 0 else 1 end, created_at desc limit 1 for update`, [p.id])).rows[0];
    await db.query("update gif.participants set early_bird_at = now(), fee_discount = $2, fee_discount_currency = $3, updated_at = now() where id = $1", [p.id, discount, p.currency]);
    if (fee && discount > 0) {
      const amount = Math.max(0, Math.round((fee.amount - discount) * 100) / 100);
      const full = fee.paid_amount >= amount - 0.004;
      await db.query(`update gif.obligations set amount = $2, status = case when $3 then 'paid' else status end,
        paid_at = case when $3 then coalesce(paid_at, now()) else paid_at end, updated_at = now() where id = $1`, [fee.id, amount, full]);
      const over = Math.round((fee.paid_amount - amount) * 100) / 100;
      if (over > 0.004) {
        // Already paid more than the early-bird fee: refund the difference from the latest payment towards this fee.
        const last = (await db.query<{ id: string; gateway: string; amount: number; applied_amount: number | null }>(
          "select id, gateway, amount::float8 as amount, applied_amount::float8 as applied_amount from gif.payments where obligation_id = $1 and status = 'paid' and not is_duplicate order by paid_at desc limit 1", [fee.id])).rows[0];
        if (last) {
          const refund = last.gateway === "midtrans" ? Math.round(last.amount * over / Number(last.applied_amount || over)) : over;
          await db.query(`insert into gif.refunds (payment_id, amount, currency, reason, method, status, refund_key, requested_by)
            values ($1, $2, $3, 'Early-bird price applied after payment', $4, 'requested', $5, 'system') on conflict do nothing`,
            [last.id, Math.min(refund, last.amount), last.gateway === "midtrans" ? "IDR" : p.currency, last.gateway === "midtrans" ? "gateway" : "manual", `earlybird-${p.id}`]);
        }
        await db.query("update gif.obligations set paid_amount = amount where id = $1", [fee.id]);
      }
    }
    await audit("system", "early_bird_assigned", "participant", p.id, { discount, currency: p.currency }, null, db);
  }
  return next.length;
}

// Older registrations (before 22 Nov 2026) have a fixed deposit + balance. While nothing has been paid or started on either,
// they become one fee obligation paid in installments (the originals are kept as 'cancelled'). Returns the new id, if merged.
export async function mergeLegacyFee(obligationId: string): Promise<string | null> {
  return tx(async (db) => {
    const ob = (await db.query<{ participant_id: string; kind: string }>("select participant_id, kind from gif.obligations where id = $1", [obligationId])).rows[0];
    if (!ob || (ob.kind !== "deposit" && ob.kind !== "balance")) return null;
    return mergeLegacyFeeFor(db, ob.participant_id);
  });
}

export async function mergeLegacyFeeFor(db: pg.PoolClient, participantId: string): Promise<string | null> {
  const pair = (await db.query<{ id: string; kind: string; label: string; currency: string; amount: number; due_at: string | null; status: string; paid_amount: number; application_id: string }>(
    `select id, kind, label, currency, amount::float8 as amount, due_at, status, paid_amount::float8 as paid_amount, application_id from gif.obligations
     where participant_id = $1 and kind in ('deposit', 'balance') and status <> 'cancelled' for update`, [participantId])).rows;
  const dep = pair.find((o) => o.kind === "deposit"), bal = pair.find((o) => o.kind === "balance");
  if (!dep || !bal || dep.status !== "open" || bal.status !== "open" || dep.paid_amount > 0 || bal.paid_amount > 0 || dep.currency !== bal.currency) return null;
  const started = (await db.query("select 1 from gif.payments where obligation_id = any($1) and status not in ('failed', 'expired', 'cancelled') limit 1", [[dep.id, bal.id]])).rowCount;
  if (started) return null;
  const label = dep.label.startsWith("Partial") ? "Partial Funded contribution" : "Self-Funded programme fee";
  const id = (await db.query<{ id: string }>(`insert into gif.obligations (application_id, participant_id, kind, label, currency, amount, due_at, first_due_at, created_by)
    values ($1, $2, 'full', $3, $4, $5, $6, $7, 'system:installments') returning id`,
    [dep.application_id, participantId, label, dep.currency, Math.round((dep.amount + bal.amount) * 100) / 100, bal.due_at, dep.due_at])).rows[0].id;
  await db.query("update gif.obligations set status = 'cancelled', updated_at = now() where id = any($1)", [[dep.id, bal.id]]);
  if ((await db.query<{ ok: boolean }>("select to_regclass('gif.invoice_requests') is not null as ok")).rows[0]?.ok) {
    await db.query("update gif.invoice_requests set obligation_id = $2, updated_at = now() where obligation_id = any($1) and status in ('invoice_requested', 'invoice_sent')", [[dep.id, bal.id], id]);
  }
  await audit("system", "fee_combined_for_installments", "participant", participantId, { from: [dep.id, bal.id], to: id }, null, db);
  return id;
}

// What paying an obligation unlocks.
export async function afterObligationPaid(db: pg.PoolClient, participantId: string, obligationId: string, kind: string) {
  // An open invoice request for this item is settled by any verified payment (card or bank transfer).
  // (Skipped while migration 20261128 isn't applied, so settling a payment never depends on it.)
  if ((await db.query<{ ok: boolean }>("select to_regclass('gif.invoice_requests') is not null as ok")).rows[0]?.ok) {
    await db.query(`update gif.invoice_requests set status = 'paid', updated_at = now() where obligation_id = $1 and status in ('invoice_requested', 'invoice_sent')`, [obligationId]);
  }
  if (kind === "elco_pro") {
    await db.query("update gif.elco_fulfilments set status = 'pending_activation', updated_at = now() where obligation_id = $1 and status = 'awaiting_payment'", [obligationId]);
  }
  if (kind === "deposit" || kind === "full") {
    await db.query("update gif.participants set seat_status = 'confirmed', seat_confirmed_at = now(), updated_at = now() where id = $1 and seat_status = 'none'", [participantId]);
  }
}

// Recompute an application's payment_status and payment-driven status. Idempotent; call after any money change.
export async function recompute(db: pg.PoolClient, applicationId: string, actor: string) {
  const app = (await db.query<{ id: string; status: string; pathway: string; offer_accepted_at: string | null; code: string; owner_email: string }>(
    `select a.id, a.status, a.pathway, a.offer_accepted_at, a.code, acc.email as owner_email from gif.applications a join gif.accounts acc on acc.id = a.owner_account_id
     where a.id = $1 for update of a`, [applicationId])).rows[0];
  if (!app) return;
  const obs = (await db.query<{ id: string; kind: string; status: string; participant_id: string }>(
    `select o.id, o.kind, o.status, o.participant_id from gif.obligations o join gif.participants p on p.id = o.participant_id
     where o.application_id = $1 and o.status <> 'cancelled' and p.withdrawn_at is null`, [applicationId])).rows;
  const pending = (await db.query<{ obligation_id: string }>("select obligation_id from gif.payments where application_id = $1 and status in ('pending', 'cancelling')", [applicationId])).rows;
  const settled = (o: { status: string }) => o.status === "paid" || o.status === "waived";
  const paymentStatus = obs.length === 0 ? "none" : obs.every(settled) ? "paid" : obs.some((o) => o.status === "refunded") && !obs.some(settled) ? "refunded"
    : pending.length ? "pending" : obs.some(settled) ? "partially_paid" : "due";
  await db.query("update gif.applications set payment_status = $2, updated_at = now() where id = $1", [applicationId, paymentStatus]);

  let target: string | null = null;
  const requiredKind = app.pathway === "fully_funded" ? "elco_pro" : app.pathway === "mentoring" ? "mentoring" : "deposit";
  // Self-Funded and Partial Funded (installments, 22 Nov 2026): a delegate's seat is confirmed by their first verified payment.
  const seats = app.pathway === "self_funded" || app.status === "selected_partial_funded"
    ? (await db.query<{ seat_status: string }>("select seat_status from gif.participants where application_id = $1 and withdrawn_at is null", [applicationId])).rows : [];
  const seatsConfirmed = seats.length > 0 && seats.every((p) => p.seat_status === "confirmed");
  if (app.pathway === "self_funded" && ["submitted", "awaiting_payment", "payment_verification"].includes(app.status)) {
    const fee = obs.filter((o) => isInstallmentKind(o.kind));
    target = seatsConfirmed ? "confirmed_participant" : fee.some((o) => pending.some((p) => p.obligation_id === o.id)) ? "payment_verification" : "awaiting_payment";
  } else if (["submitted", "awaiting_payment", "payment_verification"].includes(app.status)) {
    const req = obs.filter((o) => o.kind === requiredKind);
    if (req.length && req.every(settled)) {
      if (app.pathway === "fully_funded") {
        // Phase 1 = application + Elco Pro + the social media tasks, each verified by the team.
        const s = (await currentCohort()).settings;
        const people = (await db.query<{ social_tasks: TaskMap }>("select social_tasks from gif.participants where application_id = $1 and withdrawn_at is null", [applicationId])).rows;
        target = people.every((p) => tasksComplete(s, p.social_tasks)) ? "phase_1_completed" : "submitted";
      } else target = app.pathway === "self_funded" ? "confirmed_participant" : "phase_1_completed";
    }
    else if (req.some((o) => pending.some((p) => p.obligation_id === o.id))) target = "payment_verification";
    else target = "awaiting_payment";
  }
  if ((app.status === "selected_partial_funded" || app.status === "selected_fully_funded") && app.offer_accepted_at) {
    const pay = obs.filter((o) => o.kind === "full" || o.kind === "deposit");
    const ready = app.status === "selected_fully_funded" ? pay.every(settled) : seatsConfirmed || (pay.length > 0 && pay.every(settled));
    if (ready) target = "confirmed_participant";
  }
  if (target && target !== app.status) {
    await db.query("update gif.applications set status = $2, updated_at = now() where id = $1", [applicationId, target]);
    await db.query("insert into gif.status_history (application_id, from_status, to_status, actor) values ($1, $2, $3, $4)", [applicationId, app.status, target, actor]);
    if (target === "confirmed_participant") {
      await db.query(`update gif.participants set seat_status = 'confirmed', seat_confirmed_at = coalesce(seat_confirmed_at, now())
        where application_id = $1 and withdrawn_at is null and seat_status = 'none'`, [applicationId]);
      const ps = (await db.query<{ legal_name: string; email: string }>("select legal_name, email from gif.participants where application_id = $1 and withdrawn_at is null", [applicationId])).rows;
      for (const p of ps) await sendEmail({ to: p.email, template: "onboarding", ...onboardingEmail(p.legal_name), dedupeKey: `onboarding:${applicationId}:${p.email}`, applicationId }, db);
    }
  }
}

export async function recomputeNow(applicationId: string, actor: string) {
  await tx((db) => recompute(db, applicationId, actor));
  await deliverQueued().catch(() => {});
}

// Staff records a payment received outside the gateway (bank transfer, invoice). Audited; never for an already-paid item.
export async function recordManualPayment(staffEmail: string, obligationId: string, amount: number, currency: "IDR" | "USD", reference: string, ip: string | null) {
  const cohort = await currentCohort();
  const result = await tx(async (db) => {
    const ob = await loadObligation(db, obligationId, true);
    if (!ob) throw new PaymentError("Obligation not found.", "not_found");
    if (ob.status !== "open") throw new PaymentError("This obligation is not open.", "not_open");
    if (guardianBlocks(ob)) throw new PaymentError("Record the parent or guardian consent for this delegate (under 18) before recording a payment.", "guardian");
    const installment = isInstallmentKind(ob.kind);
    if (currency !== ob.currency) throw new PaymentError(`Record this item in ${ob.currency}.`, "currency");
    if (installment) {
      // A bank transfer towards the fee: at least the minimum (or the whole smaller remainder), at most the outstanding amount.
      const b = installmentBounds(cohort.settings, ob.currency, ob.amount - ob.paid_amount);
      const chk = b ? checkInstallmentAmount(b, amount) : { ok: false as const, error: "Nothing is outstanding on this item." };
      if (!chk.ok) throw new PaymentError(chk.error, "amount");
    } else if (Math.round(amount * 100) !== Math.round(ob.amount * 100)) {
      throw new PaymentError(`The amount must equal the obligation (${formatMoney(ob.amount, ob.currency)}). Partial manual payments are not supported.`, "amount");
    }
    const id = (await db.query<{ id: string }>(`insert into gif.payments (obligation_id, application_id, participant_id, kind, gateway, order_id, amount, currency, status, manual_reference, receipt_no, paid_at, created_by, applied_amount)
      values ($1, $2, $3, $4, 'manual', $5, $6, $7, 'paid', $8, $9, now(), $10, $6) returning id`,
      [ob.id, ob.application_id, ob.participant_id, ob.kind, `${cohort.code_prefix}-MAN-${randomBytes(5).toString("hex").toUpperCase()}`, amount, currency, reference, receiptNo(cohort.code_prefix), staffEmail])).rows[0].id;
    let remainingText: string | undefined;
    if (installment) {
      const credit = await creditInstallment(db, cohort.settings, { id, amount, obligation_id: ob.id, participant_id: ob.participant_id }, ob, amount, "manual");
      remainingText = credit.remainingText;
      // The transfer Finance recorded settles the invoice request it answered.
      if ((await db.query<{ ok: boolean }>("select to_regclass('gif.invoice_requests') is not null as ok")).rows[0]?.ok) {
        await db.query("update gif.invoice_requests set status = 'paid', updated_at = now() where obligation_id = $1 and status in ('invoice_requested', 'invoice_sent')", [ob.id]);
      }
    } else {
      await db.query("update gif.obligations set status = 'paid', paid_at = now(), paid_amount = amount, updated_at = now() where id = $1", [ob.id]);
      await afterObligationPaid(db, ob.participant_id, ob.id, ob.kind);
    }
    await audit(staffEmail, "manual_payment_recorded", "payment", id, { obligation: ob.id, amount, currency, reference }, ip, db);
    const pay = (await db.query<{ receipt_no: string }>("select receipt_no from gif.payments where id = $1", [id])).rows[0];
    const m = paymentReceivedEmail(ob.legal_name, ob.label, formatMoney(amount, currency), pay.receipt_no, participantUrl(`/portal/receipts/${id}`), remainingText);
    await sendEmail({ to: ob.email, template: "payment_received", ...m, dedupeKey: `paid:${id}:${ob.email}`, applicationId: ob.application_id }, db);
    await recompute(db, ob.application_id, staffEmail);
    return id;
  });
  await deliverQueued().catch(() => {});
  await autoActivatePending().catch(() => 0);
  return result;
}

// Refund through the gateway (Midtrans payments) or record a manual refund (bank transfer back). Partial allowed.
export async function refundPayment(staffEmail: string, paymentId: string, amount: number, reason: string, ip: string | null, existingRefundId?: string) {
  const pay = await one<{ id: string; order_id: string; gateway: string; amount: number; currency: string; status: string; obligation_id: string; application_id: string; is_duplicate: boolean; kind: string; applied_amount: number | null }>(
    "select id, order_id, gateway, amount::float8 as amount, currency, status, obligation_id, application_id, is_duplicate, kind, applied_amount::float8 as applied_amount from gif.payments where id = $1", [paymentId]);
  if (!pay) throw new PaymentError("Payment not found.", "not_found");
  if (!["paid", "partially_refunded"].includes(pay.status)) throw new PaymentError("Only settled payments can be refunded.", "not_paid");
  const done = await one<{ s: number }>("select coalesce(sum(amount), 0)::numeric as s from gif.refunds where payment_id = $1 and status = 'succeeded'", [paymentId]);
  const left = pay.amount - (done?.s ?? 0);
  if (!(amount > 0) || amount > left + 0.001) throw new PaymentError(`Refund must be between 0 and ${formatMoney(left, pay.currency as "IDR" | "USD")}.`, "amount");
  if (pay.gateway === "midtrans" && !Number.isInteger(amount)) throw new PaymentError("Midtrans refunds are whole rupiah.", "amount");
  const refundId = existingRefundId ?? (await one<{ id: string }>(
    `insert into gif.refunds (payment_id, amount, currency, reason, method, status, refund_key, requested_by) values ($1, $2, $3, $4, $5, 'processing', $6, $7) returning id`,
    [paymentId, amount, pay.currency, reason, pay.gateway === "midtrans" ? "gateway" : "manual", `rf-${randomBytes(8).toString("hex")}`, staffEmail]))!.id;
  if (existingRefundId) await q("update gif.refunds set status = 'processing', amount = $2, requested_by = $3 where id = $1", [refundId, amount, staffEmail]);
  let ok = true, raw: Record<string, unknown> = { method: "manual" };
  if (pay.gateway === "midtrans") {
    const gw = midtransGateway();
    if (!gw) throw new PaymentError("Payments are not configured.", "gateway_off");
    const key = (await one<{ refund_key: string }>("select refund_key from gif.refunds where id = $1", [refundId]))!.refund_key;
    const r = await gw.refund(pay.order_id, key, amount, reason);
    ok = r.ok; raw = r.raw;
  }
  await tx(async (db) => {
    await db.query("update gif.refunds set status = $2, gateway_response = $3, processed_at = now() where id = $1", [refundId, ok ? "succeeded" : "failed", JSON.stringify(raw)]);
    if (ok) {
      const full = amount >= left - 0.001;
      const st = full ? "refunded" : "partially_refunded";
      await db.query("update gif.payments set status = $2, updated_at = now() where id = $1", [paymentId, st]);
      if (!pay.is_duplicate && isInstallmentKind(pay.kind)) {
        // The refunded share of what this payment counted for comes off the paid total; the fee stays payable.
        const back = Math.round((Number(pay.applied_amount ?? 0) * amount / pay.amount) * 100) / 100;
        await db.query(`update gif.obligations set paid_amount = greatest(paid_amount - $2, 0),
          status = case when greatest(paid_amount - $2, 0) >= amount then status else 'open' end, updated_at = now() where id = $1`, [pay.obligation_id, back]);
      } else if (!pay.is_duplicate) await db.query("update gif.obligations set status = $2, updated_at = now() where id = $1", [pay.obligation_id, st]);
      await recompute(db, pay.application_id, staffEmail);
    }
    await audit(staffEmail, ok ? "refund_succeeded" : "refund_failed", "payment", paymentId, { refundId, amount, reason, gateway: pay.gateway }, ip, db);
  });
  return { ok, refundId };
}

export { paymentsState };

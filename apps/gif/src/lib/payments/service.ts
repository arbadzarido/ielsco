import "server-only";
import { randomBytes } from "node:crypto";
import type pg from "pg";
import { one, q, tx } from "../db";
import { audit } from "../audit";
import { currentCohort } from "../cohort";
import { siteUrl } from "../request";
import { sendEmail, deliverQueued } from "../email/send";
import { onboardingEmail, paymentFailedEmail, paymentReceivedEmail } from "../email/templates";
import { collectionMethod, formatMoney, idrPriceFor } from "../pricing";
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
  legal_name: string; email: string; whatsapp: string; code: string; date_of_birth: string; guardian_consent_at: string | null };

async function loadObligation(db: pg.PoolClient | null, obligationId: string, lock = false): Promise<ObligationRow | null> {
  const sql = `select o.id, o.application_id, o.participant_id, o.kind, o.label, o.currency, o.amount, o.status,
      a.owner_account_id, p.account_id as participant_account_id, a.status as app_status, a.pathway, p.legal_name, p.email, p.whatsapp, a.code, p.date_of_birth, p.guardian_consent_at
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
export async function startCheckout(accountId: string, obligationId: string, opts: { idrOption?: boolean; forceNew?: boolean } = {}): Promise<CheckoutOut> {
  const cohort = await currentCohort();
  const s = cohort.settings;
  const ob = await loadObligation(null, obligationId);
  if (!ob || (ob.owner_account_id !== accountId && ob.participant_account_id !== accountId)) throw new PaymentError("Payment not found.", "not_found");
  if (ob.status !== "open") throw new PaymentError("This item is already settled.", "not_open");
  if (["draft", "withdrawn", "not_selected"].includes(ob.app_status)) throw new PaymentError("This application can't take payments right now.", "app_state");
  if (!(await hasPaymentConsent(accountId))) throw new PaymentError("Accept the Terms, Payment Terms and Refund Policy before paying.", "consent");
  if (guardianBlocks(ob)) throw new PaymentError("This delegate is under 18: a parent or guardian must give consent before payment. We emailed them a consent link; you can resend it from your dashboard.", "guardian");
  const gw = midtransGateway();
  const method = collectionMethod(s, ob.currency, !!gw);
  let amountIdr: number;
  if (ob.currency === "IDR") {
    if (method !== "midtrans") throw new PaymentError("Online payment is not available yet. Request an invoice instead.", "gateway_off");
    amountIdr = ob.amount;
  } else {
    if (method !== "midtrans_idr_option" || !opts.idrOption) throw new PaymentError("USD payments are made by invoice. Request an invoice from your portal.", "usd_manual");
    const idr = idrPriceFor(s, ob.kind, new Date(), ob.pathway === "fully_funded");
    if (!idr) throw new PaymentError("No IDR price is published for this item.", "no_idr_price");
    amountIdr = idr;
  }
  if (ob.kind === "balance") {
    const dep = await one("select 1 from gif.obligations where participant_id = $1 and kind = 'deposit' and status in ('paid', 'waived')", [ob.participant_id]);
    if (!dep) throw new PaymentError("Pay the deposit first.", "deposit_first");
  }
  if (ob.kind === "deposit") {
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
    if (live && opts.forceNew && live.cancel_result !== "not_cancellable") {
      throw new PaymentError("Cancel your previous payment first (Cancel & change payment method), then choose a new method.", "open_attempt");
    }
    const orderId = newOrderId(cohort.code_prefix, ob.kind);
    const id = (await db.query<{ id: string }>(`insert into gif.payments (obligation_id, application_id, participant_id, kind, gateway, order_id, amount, currency, status, created_by, checkout_expires_at)
      values ($1, $2, $3, $4, 'midtrans', $5, $6, 'IDR', 'created', $7, now() + make_interval(mins => $8)) returning id`,
      [ob.id, ob.application_id, ob.participant_id, ob.kind, orderId, amountIdr, accountId, CHECKOUT_MINUTES])).rows[0].id;
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
    const pay = (await db.query<{ id: string; obligation_id: string; application_id: string; participant_id: string; amount: number; currency: string; status: string; kind: string; is_duplicate: boolean; cancel_requested_at: string | null }>(
      "select id, obligation_id, application_id, participant_id, amount, currency, status, kind, is_duplicate, cancel_requested_at from gif.payments where order_id = $1 for update", [orderId])).rows[0];
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
      const ob = (await db.query<{ status: string; label: string; currency: string }>("select status, label, currency from gif.obligations where id = $1 for update", [pay.obligation_id])).rows[0];
      const alreadySettled = ob.status === "paid" || ob.status === "waived";
      const receipt = receiptNo(cohort.code_prefix);
      await db.query(`update gif.payments set status = 'paid', paid_at = now(), gateway_txn_id = $2, payment_type = $3, is_duplicate = $4, receipt_no = $5, updated_at = now() where id = $1`,
        [pay.id, st.transactionId, st.paymentType, alreadySettled, receipt]);
      if (alreadySettled) {
        // Duplicate payment: keep the money traceable and queue a full refund for finance to approve.
        await db.query(`insert into gif.refunds (payment_id, amount, currency, reason, method, status, refund_key, requested_by)
          values ($1, $2, 'IDR', 'Duplicate payment for an obligation that was already paid', 'gateway', 'requested', $3, 'system')`, [pay.id, pay.amount, `dup-${pay.id}`]);
        await audit("system", "duplicate_payment", "payment", pay.id, { orderId, obligation: pay.obligation_id }, null, db);
      } else {
        await db.query("update gif.obligations set status = 'paid', paid_at = now(), updated_at = now() where id = $1", [pay.obligation_id]);
        await afterObligationPaid(db, pay.participant_id, pay.obligation_id, pay.kind);
        const who = (await db.query<{ legal_name: string; email: string; owner_email: string }>(
          `select p.legal_name, p.email, acc.email as owner_email from gif.participants p join gif.applications a on a.id = p.application_id
           join gif.accounts acc on acc.id = a.owner_account_id where p.id = $1`, [pay.participant_id])).rows[0];
        const m = paymentReceivedEmail(who.legal_name, ob.label, formatMoney(pay.amount, "IDR"), receipt, `${siteUrl()}/portal/receipts/${pay.id}`);
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
      if (!pay.is_duplicate) await db.query("update gif.obligations set status = $2, updated_at = now() where id = $1", [pay.obligation_id, next]);
    }
    await recompute(db, pay.application_id, `gateway:${source}`);
    return { applied: true, status: next, sideEffects };
  });
  if ("sideEffects" in outcome && outcome.sideEffects) for (const f of outcome.sideEffects) await f().catch(() => {});
  await deliverQueued().catch(() => {});
  return { applied: outcome.applied, status: "status" in outcome ? outcome.status : undefined, reason: "reason" in outcome ? outcome.reason : undefined };
}

// What paying an obligation unlocks.
export async function afterObligationPaid(db: pg.PoolClient, participantId: string, obligationId: string, kind: string) {
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
  if (["submitted", "awaiting_payment", "payment_verification"].includes(app.status)) {
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
    const ready = app.status === "selected_fully_funded" ? pay.every(settled) : pay.length > 0 && pay.every(settled);
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
    if (currency !== ob.currency || Math.round(amount * 100) !== Math.round(ob.amount * 100)) {
      throw new PaymentError(`The amount must equal the obligation (${formatMoney(ob.amount, ob.currency)}). Partial manual payments are not supported.`, "amount");
    }
    const id = (await db.query<{ id: string }>(`insert into gif.payments (obligation_id, application_id, participant_id, kind, gateway, order_id, amount, currency, status, manual_reference, receipt_no, paid_at, created_by)
      values ($1, $2, $3, $4, 'manual', $5, $6, $7, 'paid', $8, $9, now(), $10) returning id`,
      [ob.id, ob.application_id, ob.participant_id, ob.kind, `${cohort.code_prefix}-MAN-${randomBytes(5).toString("hex").toUpperCase()}`, amount, currency, reference, receiptNo(cohort.code_prefix), staffEmail])).rows[0].id;
    await db.query("update gif.obligations set status = 'paid', paid_at = now(), updated_at = now() where id = $1", [ob.id]);
    await afterObligationPaid(db, ob.participant_id, ob.id, ob.kind);
    await audit(staffEmail, "manual_payment_recorded", "payment", id, { obligation: ob.id, amount, currency, reference }, ip, db);
    const pay = (await db.query<{ receipt_no: string }>("select receipt_no from gif.payments where id = $1", [id])).rows[0];
    const m = paymentReceivedEmail(ob.legal_name, ob.label, formatMoney(amount, currency), pay.receipt_no, `${siteUrl()}/portal/receipts/${id}`);
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
  const pay = await one<{ id: string; order_id: string; gateway: string; amount: number; currency: string; status: string; obligation_id: string; application_id: string; is_duplicate: boolean }>(
    "select id, order_id, gateway, amount, currency, status, obligation_id, application_id, is_duplicate from gif.payments where id = $1", [paymentId]);
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
      if (!pay.is_duplicate) await db.query("update gif.obligations set status = $2, updated_at = now() where id = $1", [pay.obligation_id, st]);
      await recompute(db, pay.application_id, staffEmail);
    }
    await audit(staffEmail, ok ? "refund_succeeded" : "refund_failed", "payment", paymentId, { refundId, amount, reason, gateway: pay.gateway }, ip, db);
  });
  return { ok, refundId };
}

export { paymentsState };

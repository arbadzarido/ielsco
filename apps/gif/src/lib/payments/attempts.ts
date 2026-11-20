import "server-only";
import type pg from "pg";
import { one, q, tx } from "../db";
import { audit } from "../audit";
import { midtransGateway } from "./gateway";
import { applyStatus, PaymentError, recomputeNow, syncFromGateway } from "./service";

// Payment attempt recovery: Continue payment (reopen the same Snap page) and Cancel & change payment method.
//
// Rules (docs/gif-platform/PAYMENTS.md, "Attempts"):
// - Closing the Snap popup is not a cancellation; nothing changes on the server.
// - An attempt is cancelled only after Midtrans confirms it (POST /v2/{order}/cancel, or /expire when cancel is refused) or
//   when Midtrans has no transaction for it (no method was chosen yet). The authoritative status is re-read afterwards.
// - A verified payment always wins: it is applied through applyStatus whatever the attempt's state, and a second settled
//   payment for the same obligation is flagged as a duplicate with a refund queued (never a second obligation).
// - Repeated clicks are answered from the attempt's state ("cancelling" for up to 90 s); the row is locked while claiming.
// - When Midtrans refuses to cancel (some methods/states), the payer can continue the attempt, wait for it to expire, or
//   explicitly start a new attempt (startCheckout forceNew); if both end up paid, the duplicate is refunded.

type AttemptRow = { id: string; order_id: string; status: string; owner: string; pacct: string | null; cancel_requested_at: string | null;
  cancel_prev_status: string | null; cancel_result: string | null; snap_token: string | null; checkout_url: string | null; expires: string | null;
  gateway: string; application_id: string };

async function attemptFor(accountId: string, orderId: string, db?: pg.PoolClient, lock = false): Promise<AttemptRow | null> {
  const sql = `select p.id, p.order_id, p.status, a.owner_account_id as owner, pt.account_id as pacct, p.cancel_requested_at, p.cancel_prev_status,
      p.cancel_result, p.snap_token, p.checkout_url, p.checkout_expires_at as expires, p.gateway, p.application_id
    from gif.payments p join gif.applications a on a.id = p.application_id join gif.participants pt on pt.id = p.participant_id
    where p.order_id = $1 ${lock ? "for update of p" : ""}`;
  const r = db ? (await db.query<AttemptRow>(sql, [orderId])).rows[0] : await one<AttemptRow>(sql, [orderId]);
  if (!r || (r.owner !== accountId && r.pacct !== accountId)) return null;
  return r;
}

export type CancelOutcome = "cancelled" | "paid" | "closed" | "in_progress" | "not_cancellable" | "error";
export type CancelResult = { outcome: CancelOutcome; status: string; message: string };

const MSG = {
  paid: "This payment went through before it could be cancelled, so there is nothing more to pay for this item.",
  cancelled: "Your previous payment was cancelled. You can now choose a payment method.",
  closed: "This payment is already closed. You can choose a payment method now.",
  inProgress: "We're already cancelling this payment. This takes a few seconds.",
  notCancellable: "The payment provider doesn't allow cancelling this payment at this stage. You can continue it, wait for it to expire, or start a new payment (if both are paid, the second one is refunded in full).",
  error: "We couldn't confirm the cancellation with the payment provider. Your payment hasn't been changed. Please try again in a minute.",
};

export async function cancelAttempt(accountId: string, orderId: string): Promise<CancelResult> {
  const gw = midtransGateway();
  if (!gw) throw new PaymentError("Payments are not configured.", "gateway_off");

  // 1. Claim the attempt (row locked), so double clicks and parallel tabs see "cancelling" and wait.
  const claim = await tx(async (db): Promise<{ stop: CancelResult } | { prev: string }> => {
    const a = await attemptFor(accountId, orderId, db, true);
    if (!a || a.gateway !== "midtrans") return { stop: { outcome: "error", status: "not_found", message: "Payment not found." } };
    if (["paid", "refunded", "partially_refunded"].includes(a.status)) return { stop: { outcome: "paid", status: a.status, message: MSG.paid } };
    if (["cancelled", "expired", "failed"].includes(a.status)) return { stop: { outcome: "closed", status: a.status, message: MSG.closed } };
    if (a.status === "cancelling" && a.cancel_requested_at && Date.now() - new Date(a.cancel_requested_at).getTime() < 90_000) {
      return { stop: { outcome: "in_progress", status: "cancelling", message: MSG.inProgress } };
    }
    const prev = a.status === "cancelling" ? (a.cancel_prev_status ?? "pending") : a.status;
    await db.query(`update gif.payments set status = 'cancelling', cancel_requested_at = now(), cancel_prev_status = $2, cancel_result = null,
      updated_at = now() where id = $1`, [a.id, prev]);
    return { prev };
  });
  if ("stop" in claim) return claim.stop;
  const prev = claim.prev;

  // Settle the attempt only if nothing else (a verified payment, a webhook) moved it meanwhile.
  const settle = (result: string, status: string | null) =>
    q(`update gif.payments set status = coalesce($3, status), cancel_result = $2, updated_at = now() where order_id = $1 and status = 'cancelling'`,
      [orderId, result, status]);
  // A terminal or paid status from Midtrans is applied normally; while the attempt is "cancelling" a pending status is not.
  const apply = async () => {
    const st = await gw.fetchStatus(orderId);
    if (st) await applyStatus(orderId, "status_check", st);
    return st;
  };

  try {
    const st = await gw.fetchStatus(orderId);
    if (!st) {
      // No transaction: no method was chosen yet. Expire the Snap order too (best effort; Midtrans may answer 404 because
      // there is nothing to expire) and close the attempt. If a transaction appeared in the meantime, handle it as pending.
      await gw.expire(orderId).catch(() => null);
      const again = await gw.fetchStatus(orderId).catch(() => null);
      if (!again) await settle("no_transaction", "cancelled");
      else if (again.result !== "pending") await applyStatus(orderId, "status_check", again);
      else return await cancelPending(gw, orderId, prev, accountId, settle, apply);
      await audit(`account:${accountId}`, "payment_attempt_cancelled", "payment", orderId, { via: "no_transaction" });
      return await result(orderId);
    }
    if (st.result !== "pending") {
      await applyStatus(orderId, "status_check", st);
      await settle(st.result === "paid" ? "paid" : "closed", null);
      return await result(orderId);
    }
    return await cancelPending(gw, orderId, prev, accountId, settle, apply);
  } catch (e) {
    console.error("[gif] cancel failed", (e as Error).message);
    await settle("gateway_error", prev);
    return await result(orderId);
  } finally {
    const p = await one<{ application_id: string }>("select application_id from gif.payments where order_id = $1", [orderId]);
    if (p) await recomputeNow(p.application_id, "payment:cancel").catch(() => {});
  }
}

async function cancelPending(gw: NonNullable<ReturnType<typeof midtransGateway>>, orderId: string, prev: string, accountId: string,
  settle: (r: string, s: string | null) => Promise<unknown>, apply: () => Promise<unknown>): Promise<CancelResult> {
  const c = await gw.cancel(orderId);
  let via = "cancel";
  if (!c.ok) {
    // Refused (412) or unsupported for this method/state: Midtrans also offers Expire for pending transactions.
    const e = await gw.expire(orderId).catch(() => null);
    via = "expire";
    if (!e?.ok) {
      await apply(); // it may have been paid meanwhile: that wins
      await settle("not_cancellable", prev);
      await audit(`account:${accountId}`, "payment_cancel_refused", "payment", orderId, { cancel: c.statusCode, expire: e?.statusCode ?? null });
      return result(orderId);
    }
  }
  await apply(); // a payment that settled first wins here
  // Midtrans confirmed the cancel/expire in its signed server-to-server response; if its status read still lags, trust the
  // confirmation (no-op when the attempt already moved on).
  await settle("cancelled", "cancelled");
  await audit(`account:${accountId}`, "payment_attempt_cancelled", "payment", orderId, { via });
  return result(orderId);
}

async function result(orderId: string): Promise<CancelResult> {
  const now = await one<{ status: string; cancel_result: string | null }>("select status, cancel_result from gif.payments where order_id = $1", [orderId]);
  const st = now?.status ?? "unknown";
  if (st === "paid") return { outcome: "paid", status: st, message: MSG.paid };
  if (["cancelled", "expired", "failed"].includes(st)) return { outcome: "cancelled", status: st, message: MSG.cancelled };
  if (now?.cancel_result === "not_cancellable") return { outcome: "not_cancellable", status: st, message: MSG.notCancellable };
  return { outcome: "error", status: st, message: MSG.error };
}

export type ResumeResult = { status: string; token: string | null; redirectUrl: string | null; snap: { clientKey: string; scriptUrl: string } | null };

// Continue payment: the open attempt's Snap token, after re-reading its status (it may have been paid or expired meanwhile).
export async function resumeAttempt(accountId: string, orderId: string): Promise<ResumeResult> {
  const gw = midtransGateway();
  if (!gw) throw new PaymentError("Payments are not configured.", "gateway_off");
  const a = await attemptFor(accountId, orderId);
  if (!a) throw new PaymentError("Payment not found.", "not_found");
  if (["created", "pending"].includes(a.status)) await syncFromGateway(orderId, "status_check").catch(() => null);
  const now = (await attemptFor(accountId, orderId))!;
  const open = ["created", "pending"].includes(now.status);
  const live = open && !!now.expires && new Date(now.expires).getTime() > Date.now() + 60_000;
  return { status: open && !live ? "expired" : now.status, token: live ? now.snap_token : null, redirectUrl: live ? now.checkout_url : null,
    snap: live && now.snap_token ? gw.snap : null };
}

// What the payer sees about an attempt (status page and the Payments table).
export async function attemptState(accountId: string, orderId: string) {
  const a = await attemptFor(accountId, orderId);
  if (!a) return null;
  const expiresMs = a.expires ? new Date(a.expires).getTime() : 0;
  return { status: a.status, cancelResult: a.cancel_result, expiresAt: a.expires, canContinue: ["created", "pending"].includes(a.status) && expiresMs > Date.now() + 60_000,
    canCancel: ["created", "pending"].includes(a.status) || (a.status === "cancelling" && !!a.cancel_requested_at && Date.now() - new Date(a.cancel_requested_at).getTime() >= 90_000) };
}

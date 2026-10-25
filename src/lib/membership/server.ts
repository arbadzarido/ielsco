// Membership checkout and payment verification (server-only). Route handlers in src/app/api/membership/* and
// src/app/api/payments/midtrans/* call these. Orders and entitlements are written with the service role; the decision to
// grant access is made in Postgres by public.apply_membership_payment() (supabase/migrations/20261026000000_*), which
// locks the order row, so concurrent or repeated notifications are safe.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient } from "@/lib/integrations/elco";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkoutState, classify, createSnapTransaction, fetchStatus, keys, newOrderId, ORDER_TTL_MIN, signatureOk, snapJsUrl,
  type MidtransEnv,
} from "@/lib/payments/midtrans";

export class MembershipError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://ielsco.com").replace(/\/+$/, "");
}

export interface PlanRow { code: string; name: string; months: number; price_idr: number; billing_enabled: boolean; sort: number }
export interface OrderRow {
  order_id: string; user_id: string; plan_code: string; months: number; amount_idr: number; environment: MidtransEnv; status: string;
  snap_token: string | null; snap_redirect_url: string | null; expires_at: string | null; paid_at: string | null; created_at: string;
}

function admin(): SupabaseClient {
  const c = adminClient();
  if (!c) throw new MembershipError(503, "server_not_configured", "Checkout isn't available right now.");
  return c;
}

export async function sessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// Public config: is checkout open, which environment, and the Snap client key (public by design). Never server keys.
export function publicCheckoutConfig() {
  const { env, reason } = checkoutState();
  return env
    ? { enabled: true, environment: env, client_key: keys(env).client, snap_js: snapJsUrl(env) }
    : { enabled: false, environment: null, reason };
}

export async function listPlans(): Promise<PlanRow[]> {
  const c = adminClient();
  if (!c) return [];
  const { data } = await c.from("membership_plans").select("code, name, months, price_idr, billing_enabled, sort").eq("is_public", true).order("sort");
  return (data ?? []) as PlanRow[];
}

const orderOut = (o: OrderRow) => ({
  order_id: o.order_id, plan_code: o.plan_code, months: o.months, amount_idr: o.amount_idr, status: o.status,
  environment: o.environment, expires_at: o.expires_at, paid_at: o.paid_at, created_at: o.created_at,
});

export async function createOrder(user: User, planCode: string) {
  const { env } = checkoutState();
  if (!env) throw new MembershipError(503, "payments_unavailable", "Membership checkout isn't open yet.");
  const db = admin();
  const { data: plan } = await db.from("membership_plans").select("code, name, months, price_idr, billing_enabled, is_public").eq("code", planCode).maybeSingle();
  if (!plan || !plan.is_public || !plan.billing_enabled) throw new MembershipError(404, "unknown_plan", "That plan can't be bought right now.");

  // A second click within the payment window reopens the same order instead of creating a duplicate.
  const { data: open } = await db.from("membership_orders").select("*")
    .eq("user_id", user.id).eq("plan_code", plan.code).eq("environment", env).eq("amount_idr", plan.price_idr)
    .in("status", ["created", "pending"]).not("snap_token", "is", null).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(1);
  if (open?.[0]) {
    const o = open[0] as OrderRow;
    return { ...orderOut(o), token: o.snap_token, redirect_url: o.snap_redirect_url, ...publicCheckoutConfig() };
  }

  const orderId = newOrderId();
  const expiresAt = new Date(Date.now() + ORDER_TTL_MIN * 60_000).toISOString();
  const { error: insErr } = await db.from("membership_orders").insert({
    order_id: orderId, user_id: user.id, plan_code: plan.code, months: plan.months, amount_idr: plan.price_idr, environment: env, expires_at: expiresAt,
  });
  if (insErr) throw new MembershipError(500, "order_failed", "Couldn't start the payment. Please try again.");

  const { data: profile } = await db.from("users").select("full_name").eq("id", user.id).maybeSingle();
  try {
    const snap = await createSnapTransaction(env, {
      orderId, amount: plan.price_idr, itemId: plan.code, itemName: plan.name,
      customer: { firstName: profile?.full_name || "IELS member", email: user.email ?? "" },
      finishUrl: `${siteUrl()}/dashboard/membership/return?order_id=${orderId}`,
      notificationUrl: `${siteUrl()}/api/payments/midtrans/notification`,
    });
    const { data: row } = await db.from("membership_orders")
      .update({ snap_token: snap.token, snap_redirect_url: snap.redirect_url, status: "pending", updated_at: new Date().toISOString() })
      .eq("order_id", orderId).select("*").single();
    console.info(`[membership] order created ${orderId} plan=${plan.code} amount=${plan.price_idr} env=${env}`);
    return { ...orderOut(row as OrderRow), token: snap.token, redirect_url: snap.redirect_url, ...publicCheckoutConfig() };
  } catch (e) {
    await db.from("membership_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("order_id", orderId);
    console.warn(`[membership] snap create failed ${orderId}: ${(e as Error).message}`);
    throw new MembershipError(502, "checkout_failed", "Couldn't start the payment. Please try again.");
  }
}

// Re-reads Midtrans's status and applies it through the database function. Returns the function's outcome.
async function applyFromMidtrans(db: SupabaseClient, env: MidtransEnv, orderId: string): Promise<string> {
  const st = await fetchStatus(env, orderId);
  if (!st) return "no_transaction";
  if (String(st.order_id) !== orderId) return "order_mismatch";
  const { data, error } = await db.rpc("apply_membership_payment", {
    p_order_id: orderId, p_result: classify(st as { transaction_status?: string; fraud_status?: string }),
    p_gross_amount: Number(st.gross_amount), p_currency: (st.currency as string) || "IDR",
    p_transaction_id: (st.transaction_id as string) ?? null, p_payment_type: (st.payment_type as string) ?? null,
    p_transaction_status: (st.transaction_status as string) ?? null, p_fraud_status: (st.fraud_status as string) ?? null,
  });
  if (error) throw new Error(`apply_failed: ${error.message}`);
  return data as string;
}

async function logNotification(db: SupabaseClient, n: Record<string, unknown>, valid: boolean, outcome: string) {
  await db.from("membership_payment_notifications").insert({
    order_id: String(n.order_id ?? "").slice(0, 80), transaction_status: (n.transaction_status as string) ?? null,
    fraud_status: (n.fraud_status as string) ?? null, status_code: String(n.status_code ?? "").slice(0, 8), signature_valid: valid, outcome,
  });
}

// Midtrans HTTP notification. 200 = processed (duplicates included), 403 bad signature, 404 unknown order,
// 503 Midtrans unreachable (Midtrans retries).
export async function handleNotification(n: Record<string, unknown>): Promise<{ status: number; outcome: string }> {
  const db = admin();
  const orderId = String(n.order_id ?? "");
  const { data: o } = orderId
    ? await db.from("membership_orders").select("order_id, environment").eq("order_id", orderId).maybeSingle()
    : { data: null };
  if (!o) {
    await logNotification(db, n, false, "unknown_order");
    return { status: 404, outcome: "unknown_order" };
  }
  if (!signatureOk(n, keys(o.environment as MidtransEnv).server)) {
    await logNotification(db, n, false, "bad_signature");
    console.warn(`[membership] notification rejected: bad signature ${orderId}`);
    return { status: 403, outcome: "bad_signature" };
  }
  let outcome: string;
  try {
    outcome = await applyFromMidtrans(db, o.environment as MidtransEnv, orderId);
  } catch (e) {
    console.warn(`[membership] notification ${orderId}: ${(e as Error).message}`);
    return { status: 503, outcome: "status_unavailable" };
  }
  await logNotification(db, n, true, outcome);
  console.info(`[membership] notification ${orderId} status=${n.transaction_status} outcome=${outcome}`);
  return { status: 200, outcome };
}

// The member's own order, optionally re-checked with Midtrans (the return page uses this; a redirect is never trusted).
export async function getOrder(user: User, orderId: string, refresh: boolean) {
  const db = admin();
  const { data } = await db.from("membership_orders").select("*").eq("order_id", orderId).eq("user_id", user.id).maybeSingle();
  if (!data) throw new MembershipError(404, "not_found", "Order not found.");
  let o = data as OrderRow;
  if (refresh && ["created", "pending"].includes(o.status) && checkoutState().env === o.environment) {
    try {
      await applyFromMidtrans(db, o.environment, orderId);
      const { data: again } = await db.from("membership_orders").select("*").eq("order_id", orderId).single();
      o = again as OrderRow;
    } catch (e) {
      console.warn(`[membership] refresh ${orderId}: ${(e as Error).message}`);
    }
  }
  return orderOut(o);
}

// Re-check this member's recent open orders (covers a payment whose notification never arrived). Never throws.
export async function reconcilePending(user: User, limit = 3) {
  const { env } = checkoutState();
  const db = adminClient();
  if (!env || !db) return;
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data } = await db.from("membership_orders").select("order_id").eq("user_id", user.id).eq("environment", env)
    .in("status", ["created", "pending"]).not("snap_token", "is", null).gt("created_at", since).order("created_at", { ascending: false }).limit(limit);
  for (const r of data ?? []) {
    try { await applyFromMidtrans(db, env, r.order_id); } catch { /* Midtrans unreachable: next visit */ }
  }
}

export async function myOrders(user: User) {
  const db = admin();
  const { data } = await db.from("membership_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  return ((data ?? []) as OrderRow[]).map(orderOut);
}

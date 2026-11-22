// IELScourse payment service (server-only): one checkout, one verification path and one reconcile job for Collective,
// Studio and One. Product rules (prices, seats, renewals, instalments) and fulfilment live in Postgres
// (supabase/migrations/20261210000000_ielscourse_payments.sql); this file talks to Midtrans and the database.
// docs/IELSCOURSE-PAYMENTS.md.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminClient } from "@/lib/integrations/elco";
import { classify, signatureOk } from "@/lib/payments/midtrans";
import {
  canonicalSite, COURSE_ORDER_ID_RE, COURSE_ORDER_TTL_MIN, courseGateway, createSnap, fetchCourseStatus, newCourseOrderId, serverKeyFor,
  type CourseEnv, type Gateway,
} from "@/lib/payments/gateway";

export class CourseError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export type Product = "collective" | "studio" | "one";
export type CheckoutInput =
  | { product: "collective" | "studio"; cohort_id: string }
  | { product: "one"; instalment_id: string; agreed: boolean }
  | { product: "one"; package: "starter" | "growth" | "intensive"; option: "full" | "deposit"; agreed: boolean };

export interface OrderRow {
  order_id: string; product: Product; student_id: string; plan_code: string | null; cohort_id: string | null; renewal_of: string | null;
  tutoring_enrolment_id: string | null; tutoring_instalment_id: string | null; item_name: string; amount_idr: number; environment: CourseEnv;
  status: string; invoice_no: string; receipt_no: string | null; snap_token: string | null; snap_redirect_url: string | null;
  expires_at: string | null; payment_type: string | null; paid_at: string | null; created_at: string; needs_review: boolean;
}

function db(): SupabaseClient {
  const c = adminClient();
  if (!c) throw new CourseError(503, "server_not_configured", "Checkout isn't available right now.");
  return c;
}

export function publicCheckoutConfig() {
  const { gateway, reason } = courseGateway();
  // The client key is public by design (Snap.js needs it). The server key never leaves the server.
  return gateway ? { enabled: true, environment: gateway.env, client_key: gateway.clientKey, snap_js: gateway.snapJs } : { enabled: false, environment: null, reason };
}

export const orderOut = (o: OrderRow) => ({
  order_id: o.order_id, product: o.product, item_name: o.item_name, amount_idr: Number(o.amount_idr), status: o.status, environment: o.environment,
  invoice_no: o.invoice_no, receipt_no: o.receipt_no, cohort_id: o.cohort_id, tutoring_enrolment_id: o.tutoring_enrolment_id,
  expires_at: o.expires_at, paid_at: o.paid_at, created_at: o.created_at, payment_type: o.payment_type,
});

// Postgres raises short codes; these are the messages students see.
const MESSAGES: Record<string, [number, string]> = {
  plan_unavailable: [404, "This class can't be bought right now."],
  unknown_cohort: [404, "That class group doesn't exist."],
  cohort_not_open: [409, "That class group isn't open for new students. Join the waiting list and we'll offer you the next one."],
  cohort_closed: [409, "That class group has closed."],
  cohort_full: [409, "That class group is full. Join the waiting list and we'll offer you the next seat or group."],
  member_of_other_cohort: [409, "You're already in another group for this class. Contact the team if you'd like to switch."],
  unknown_instalment: [404, "That payment wasn't found."],
  enrolment_closed: [409, "This package is closed."],
  already_paid: [409, "This payment has already been made."],
  earlier_instalment_outstanding: [409, "Please pay the earlier instalment first."],
  agreement_required: [400, "Please confirm that you agree to the payment schedule."],
  in_progress: [409, "Your payment window is being prepared. Please try again in a few seconds."],
  deposit_not_available: [400, "The deposit option is only for packages of more than 4 sessions."],
  too_many_unpaid: [409, "You already have unpaid packages. Pay or contact the team first."],
  no_mentor: [503, "Private tutoring isn't taking bookings right now."],
  forbidden: [403, "That isn't yours."],
};
function fromDb(message: string): CourseError {
  const code = Object.keys(MESSAGES).find((k) => message.includes(k));
  if (code) return new CourseError(MESSAGES[code][0], code, MESSAGES[code][1]);
  console.error("[ielscourse] db error", message.slice(0, 200));
  return new CourseError(500, "order_failed", "Couldn't start the payment. Please try again.");
}

export async function startCheckout(user: User, input: CheckoutInput) {
  const { gateway: g, reason } = courseGateway();
  if (!g) {
    console.warn(`[ielscourse] checkout closed: ${reason}`);
    throw new CourseError(503, "payments_unavailable", "Online payment isn't open yet. Please contact the team on WhatsApp.");
  }
  const c = db();
  let instalment: string | null = null;
  if (input.product === "one") {
    if ("instalment_id" in input) instalment = input.instalment_id;
    else {
      const { data: enrolment, error } = await c.rpc("course_self_enrol_one", { p_student: user.id, p_package: input.package, p_option: input.option, p_exam_deadline: null });
      if (error) throw fromDb(error.message);
      const { data: first } = await c.from("tutoring_instalments").select("id").eq("enrolment_id", enrolment as string).eq("seq", 1).single();
      instalment = first?.id ?? null;
    }
  }
  const { data, error } = await c.rpc("course_create_order", {
    p_student: user.id, p_product: input.product, p_cohort: input.product === "one" ? null : input.cohort_id, p_instalment: instalment,
    p_order_id: newCourseOrderId(), p_environment: g.env, p_ttl_min: COURSE_ORDER_TTL_MIN, p_agreed: input.product === "one" ? input.agreed : false,
  });
  if (error) throw fromDb(error.message);
  const o = data as OrderRow;
  const checkout = { client_key: g.clientKey, snap_js: g.snapJs, environment: g.env };
  if (o.snap_token) return { order: orderOut(o), token: o.snap_token, redirect_url: o.snap_redirect_url, ...checkout }; // Continue payment

  const { data: profile } = await c.from("users").select("full_name").eq("id", user.id).maybeSingle();
  const site = canonicalSite();
  try {
    const snap = await createSnap(g, {
      orderId: o.order_id, amount: Number(o.amount_idr), itemId: `ielscourse-${o.product}`, itemName: o.item_name, product: o.product,
      customer: { firstName: profile?.full_name || "IELScourse student", email: user.email ?? "" },
      finishUrl: `${site}/dashboard/courses/return?order_id=${o.order_id}`,
      notificationUrl: `${site}/api/payments/midtrans/notification`,
    });
    await c.rpc("course_order_snap", { p_order_id: o.order_id, p_token: snap.token, p_redirect: snap.redirect_url });
    console.info(`[ielscourse] order ${o.order_id} product=${o.product} amount=${o.amount_idr} env=${g.env}`);
    return { order: orderOut({ ...o, status: "pending" }), token: snap.token, redirect_url: snap.redirect_url, ...checkout };
  } catch (e) {
    await c.rpc("course_order_snap", { p_order_id: o.order_id, p_token: null, p_redirect: null });
    console.warn(`[ielscourse] snap create failed ${o.order_id}: ${(e as Error).message}`);
    throw new CourseError(502, "checkout_failed", "Couldn't open the payment window. Please try again.");
  }
}

type Source = "notification" | "return" | "reconcile" | "admin";

async function logEvent(c: SupabaseClient, orderId: string, source: Source, st: Record<string, unknown> | null, valid: boolean | null, outcome: string) {
  const dedupe = source === "notification" && st ? `${orderId}|${st.transaction_id ?? ""}|${st.transaction_status ?? ""}|${st.status_code ?? ""}|${outcome}` : null;
  const row = {
    order_id: orderId.slice(0, 80), source, transaction_status: (st?.transaction_status as string) ?? null, fraud_status: (st?.fraud_status as string) ?? null,
    status_code: st?.status_code != null ? String(st.status_code).slice(0, 8) : null, midtrans_transaction_id: (st?.transaction_id as string) ?? null,
    signature_valid: valid, outcome, dedupe_key: dedupe,
  };
  const { error } = dedupe ? await c.from("course_payment_events").upsert(row, { onConflict: "dedupe_key", ignoreDuplicates: true }) : await c.from("course_payment_events").insert(row);
  if (error) console.warn(`[ielscourse] event log failed ${orderId}: ${error.message}`);
}

// Re-reads Midtrans's status (the authority) and applies it in Postgres. Returns the database outcome.
async function applyFromMidtrans(c: SupabaseClient, g: Gateway, orderId: string, source: Source): Promise<string> {
  const st = await fetchCourseStatus(g, orderId);
  let outcome: string;
  if (!st) outcome = "no_transaction";
  else if (String(st.order_id) !== orderId) outcome = "order_mismatch";
  else {
    const { data, error } = await c.rpc("course_apply_payment", {
      p_order_id: orderId, p_result: classify(st as { transaction_status?: string; fraud_status?: string }),
      p_gross_amount: Number(st.gross_amount), p_currency: (st.currency as string) || "IDR",
      p_transaction_id: (st.transaction_id as string) ?? null, p_payment_type: (st.payment_type as string) ?? null,
      p_transaction_status: (st.transaction_status as string) ?? null, p_fraud_status: (st.fraud_status as string) ?? null,
    });
    if (error) throw new Error(`apply_failed: ${error.message}`);
    outcome = data as string;
  }
  if (source !== "notification") await logEvent(c, orderId, source, st, null, outcome);
  return outcome;
}

// Midtrans HTTP notification for an IELS-C- order. 200 = processed (duplicates included), 403 bad signature,
// 404 unknown order, 503 Midtrans unreachable or this environment isn't configured (Midtrans retries).
export async function handleCourseNotification(n: Record<string, unknown>): Promise<{ status: number; outcome: string }> {
  const c = db();
  const orderId = String(n.order_id ?? "");
  const { data: o } = COURSE_ORDER_ID_RE.test(orderId)
    ? await c.from("course_payment_orders").select("order_id, environment").eq("order_id", orderId).maybeSingle()
    : { data: null };
  if (!o) {
    await logEvent(c, orderId || "-", "notification", n, false, "unknown_order");
    return { status: 404, outcome: "unknown_order" };
  }
  const key = serverKeyFor(o.environment as CourseEnv);
  const g = courseGateway({ ...process.env, IELSCOURSE_CHECKOUT_ENABLED: "true" }).gateway; // verification works even while new checkouts are paused
  if (!key || !g || g.env !== o.environment) return { status: 503, outcome: "gateway_not_configured" };
  if (!signatureOk(n, key)) {
    await logEvent(c, orderId, "notification", n, false, "bad_signature");
    console.warn(`[ielscourse] notification rejected: bad signature ${orderId}`);
    return { status: 403, outcome: "bad_signature" };
  }
  let outcome: string;
  try {
    outcome = await applyFromMidtrans(c, g, orderId, "notification");
  } catch (e) {
    console.warn(`[ielscourse] notification ${orderId}: ${(e as Error).message}`);
    return { status: 503, outcome: "status_unavailable" };
  }
  await logEvent(c, orderId, "notification", n, true, outcome);
  console.info(`[ielscourse] notification ${orderId} status=${n.transaction_status} outcome=${outcome}`);
  return { status: 200, outcome };
}

function verifyGateway(env: CourseEnv): Gateway | null {
  const g = courseGateway({ ...process.env, IELSCOURSE_CHECKOUT_ENABLED: "true" }).gateway;
  return g && g.env === env ? g : null;
}

// The student's own order, re-checked with Midtrans when still open (the return page; a redirect is never proof).
export async function getMyOrder(user: User, orderId: string, refresh: boolean) {
  const c = db();
  const { data } = await c.from("course_payment_orders").select("*").eq("order_id", orderId).eq("student_id", user.id).maybeSingle();
  if (!data) throw new CourseError(404, "not_found", "Order not found.");
  let o = data as OrderRow;
  const g = verifyGateway(o.environment);
  if (refresh && g && ["created", "pending"].includes(o.status) && o.snap_token) {
    try {
      await applyFromMidtrans(c, g, orderId, "return");
      o = (await c.from("course_payment_orders").select("*").eq("order_id", orderId).single()).data as OrderRow;
    } catch (e) {
      console.warn(`[ielscourse] refresh ${orderId}: ${(e as Error).message}`);
    }
  }
  return orderOut(o);
}

// Re-check open orders with Midtrans: covers a payment whose notification never arrived. Never throws.
export async function reconcile(opts: { studentId?: string; limit?: number; source?: Source } = {}) {
  const c = adminClient();
  if (!c) return { checked: 0, changed: 0 };
  const since = new Date(Date.now() - 3 * 864e5).toISOString(), quiet = new Date(Date.now() - 60_000).toISOString();
  let query = c.from("course_payment_orders").select("order_id, environment").in("status", ["created", "pending"]).not("snap_token", "is", null)
    .gt("created_at", since).lt("updated_at", quiet).order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.studentId) query = query.eq("student_id", opts.studentId);
  const { data } = await query;
  let changed = 0;
  for (const r of data ?? []) {
    const g = verifyGateway(r.environment as CourseEnv);
    if (!g) continue;
    try {
      const out = await applyFromMidtrans(c, g, r.order_id, opts.source ?? "reconcile");
      if (!["no_transaction", "pending", "already_paid", "ignored_stale"].includes(out)) changed++;
    } catch { /* Midtrans unreachable: the next run tries again */ }
  }
  return { checked: data?.length ?? 0, changed };
}

// Daily job: reconcile, expire abandoned orders and seat holds, renewal reminders.
export async function dailyJob() {
  const c = db();
  const rec = await reconcile({ limit: 200 });
  const { data: expired } = await c.rpc("course_expire_stale");
  const { data: reminded } = await c.rpc("course_send_renewal_reminders");
  return { ...rec, expired: expired ?? 0, reminded: reminded ?? 0 };
}

export async function isAdmin(user: User): Promise<boolean> {
  const c = adminClient();
  if (!c) return false;
  const { data } = await c.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
  return data?.role === "admin";
}

// Open class groups with the seats still free (public: names, schedules and counts only).
export async function openCohorts() {
  const c = adminClient();
  if (!c) return [];
  const { data } = await c.from("course_cohorts").select("id, product, name, capacity, schedule_text, starts_on, tutor_name").eq("status", "open").order("starts_on", { ascending: true, nullsFirst: false });
  const out = [];
  for (const k of data ?? []) {
    const { data: taken } = await c.rpc("course_seats_taken", { p_cohort: k.id, p_except_student: null });
    out.push({ ...k, seats_left: Math.max(0, k.capacity - Number(taken ?? 0)) });
  }
  return out;
}

export async function coursePlans() {
  const c = adminClient();
  if (!c) return [];
  const { data } = await c.from("course_plans").select("code, product, name, price_idr, period_months, capacity_max, billing_enabled").order("price_idr");
  return data ?? [];
}

// Midtrans Snap for IELSco membership. Server-only (node:crypto; keys from non-public env vars).
// Same rules as Elco's backend/payments.py, which is the reviewed reference implementation:
// - The server decides plan, amount and order id. A browser "success" redirect is never proof of payment.
// - A notification must carry a valid signature: SHA512(order_id + status_code + gross_amount + server key). Its status is
//   then re-read from Midtrans's status API (the authority) before anything changes.
// - Environments: MIDTRANS_ENV=sandbox uses MIDTRANS_SANDBOX_*; production also needs MIDTRANS_PRODUCTION_ENABLED=true.
// - IELSco may share Elco's merchant account. Elco's dashboard notification URL points at the Elco API, so every Snap request
//   here sends X-Override-Notification with IELSco's own endpoint: IELSco notifications never reach Elco and vice versa.
// Pure module (no "@/..." imports) so `node --test` can import it directly.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type MidtransEnv = "sandbox" | "production";
export type PaymentResult = "paid" | "pending" | "failed" | "expired" | "cancelled" | "refunded" | "partially_refunded" | "unknown";

const SNAP_BASE: Record<MidtransEnv, string> = { sandbox: "https://app.sandbox.midtrans.com", production: "https://app.midtrans.com" };
const API_BASE: Record<MidtransEnv, string> = { sandbox: "https://api.sandbox.midtrans.com", production: "https://api.midtrans.com" };
// Older Sandbox accounts issue SB-Mid-…; newer ones issue Mid-… in Sandbox too. Production refuses SB- keys.
const KEY_PREFIX: Record<MidtransEnv, [string[], string[]]> = {
  sandbox: [["SB-Mid-server-", "Mid-server-"], ["SB-Mid-client-", "Mid-client-"]],
  production: [["Mid-server-"], ["Mid-client-"]],
};
export const ORDER_TTL_MIN = 60;

type Env = Record<string, string | undefined>;
const clean = (v?: string) => (v ?? "").trim().replace(/^"|"$/g, "");

// MIDTRANS_TEST_BASE points Sandbox at a local fake Midtrans (tests only). Never applies to production.
function base(which: Record<MidtransEnv, string>, env: MidtransEnv, e: Env = process.env) {
  const test = clean(e.MIDTRANS_TEST_BASE).replace(/\/+$/, "");
  return test && env === "sandbox" ? test : which[env];
}

export function keys(env: MidtransEnv, e: Env = process.env) {
  const p = `MIDTRANS_${env.toUpperCase()}`;
  return { server: clean(e[`${p}_SERVER_KEY`]), client: clean(e[`${p}_CLIENT_KEY`]) };
}

// Which environment checkout may use now, or why it is off. The reason names variables, never values (safe to show).
export function checkoutState(e: Env = process.env): { env: MidtransEnv | null; reason?: string } {
  if (clean(e.MEMBERSHIP_CHECKOUT_ENABLED).toLowerCase() !== "true") return { env: null, reason: "MEMBERSHIP_CHECKOUT_ENABLED is not true" };
  const env = (clean(e.MIDTRANS_ENV) || "sandbox").toLowerCase();
  if (env !== "sandbox" && env !== "production") return { env: null, reason: "MIDTRANS_ENV must be sandbox or production" };
  if (env === "production" && clean(e.MIDTRANS_PRODUCTION_ENABLED).toLowerCase() !== "true") return { env: null, reason: "production payments are disabled" };
  const { server, client } = keys(env, e);
  const name = `MIDTRANS_${env.toUpperCase()}`;
  if (!server || !client) return { env: null, reason: `${name}_SERVER_KEY or ${name}_CLIENT_KEY is not set` };
  const [sp, cp] = KEY_PREFIX[env];
  const looksRight = sp.some((p) => server.startsWith(p)) && cp.some((p) => client.startsWith(p))
    && !(env === "production" && (server.startsWith("SB-") || client.startsWith("SB-")));
  if (!looksRight) return { env: null, reason: `${name}_SERVER_KEY / ${name}_CLIENT_KEY don't look like Midtrans ${env} keys` };
  return { env };
}

export function snapJsUrl(env: MidtransEnv) {
  return `${SNAP_BASE[env]}/snap/snap.js`;
}

export function signatureOk(n: Record<string, unknown>, serverKey: string): boolean {
  if (!serverKey) return false;
  const raw = `${n.order_id ?? ""}${n.status_code ?? ""}${n.gross_amount ?? ""}${serverKey}`;
  const expected = Buffer.from(createHash("sha512").update(raw).digest("hex"));
  const given = Buffer.from(String(n.signature_key ?? ""));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Midtrans transaction status → our order status (docs: settlement or capture+accept = paid; capture+challenge = pending).
export function classify(st: { transaction_status?: string; fraud_status?: string | null }): PaymentResult {
  const ts = st.transaction_status, fs = st.fraud_status;
  if (ts === "settlement" || (ts === "capture" && (!fs || fs === "accept"))) return "paid";
  if (ts === "pending" || (ts === "capture" && fs === "challenge")) return "pending";
  const map: Record<string, PaymentResult> = { deny: "failed", failure: "failed", expire: "expired", cancel: "cancelled", refund: "refunded",
    partial_refund: "partially_refunded", capture: "failed" };
  return (ts && map[ts]) || "unknown";
}

export function newOrderId(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `IELS-M-${d}-${randomBytes(5).toString("hex").toUpperCase()}`;
}
export const ORDER_ID_RE = /^IELS-M-\d{6}-[0-9A-F]{10}$/;

async function call(method: string, env: MidtransEnv, url: string, body?: unknown, extraHeaders: Record<string, string> = {}, e: Env = process.env) {
  const auth = Buffer.from(`${keys(env, e).server}:`).toString("base64");
  return fetch(url, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${auth}`, ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
}

// The transaction's current status from Midtrans, or null when Midtrans has no transaction for this order yet.
export async function fetchStatus(env: MidtransEnv, orderId: string, e: Env = process.env): Promise<Record<string, unknown> | null> {
  const r = await call("GET", env, `${base(API_BASE, env, e)}/v2/${encodeURIComponent(orderId)}/status`, undefined, {}, e);
  if (r.status !== 200) throw new Error(`status_unavailable_${r.status}`);
  const body = (await r.json()) as Record<string, unknown>;
  if (String(body.status_code) === "404") return null;
  return body;
}

export interface SnapRequest {
  orderId: string;
  amount: number;
  itemId: string;
  itemName: string;
  customer: { firstName: string; email: string };
  finishUrl: string;
  notificationUrl: string;
}

export async function createSnapTransaction(env: MidtransEnv, req: SnapRequest, e: Env = process.env): Promise<{ token: string; redirect_url: string }> {
  const body = {
    transaction_details: { order_id: req.orderId, gross_amount: req.amount },
    item_details: [{ id: req.itemId, price: req.amount, quantity: 1, name: req.itemName.slice(0, 50) }],
    customer_details: { first_name: req.customer.firstName.slice(0, 50), email: req.customer.email },
    custom_field1: "product:ielsco_membership",
    credit_card: { secure: true },
    expiry: { unit: "minutes", duration: ORDER_TTL_MIN },
    callbacks: { finish: req.finishUrl },
  };
  const r = await call("POST", env, `${base(SNAP_BASE, env, e)}/snap/v1/transactions`, body, { "X-Override-Notification": req.notificationUrl }, e);
  if (r.status !== 200 && r.status !== 201) throw new Error(`snap_failed_${r.status}`); // no body: it may echo request details
  const snap = (await r.json()) as { token?: string; redirect_url?: string };
  if (!snap.token || !snap.redirect_url) throw new Error("snap_failed_no_token");
  return { token: snap.token, redirect_url: snap.redirect_url };
}

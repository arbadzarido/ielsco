// Midtrans Snap client for GIF. Pure (node:crypto + fetch only) so node --test can import it.
//
// Facts from docs.midtrans.com (checked 20 Nov 2026), see docs/gif/PAYMENTS.md:
// - Midtrans processes IDR only. USD prices are never converted here.
// - Notifications are signed SHA512(order_id + status_code + gross_amount + key). Since 28 Oct 2026 the key is the
//   "Signature Secret Key" (Dashboard → Settings → Access Keys). For existing merchants it equals the Server Key until
//   either is regenerated, so we accept a list (GIF_MIDTRANS_SIGNATURE_KEYS, comma-separated; defaults to the Server Key)
//   which also covers key rotation, when retries may still be signed with the old key.
// - A notification is a hint, not proof: its status is re-read from the Get Status API before anything changes.
// - Refunds: POST /v2/{order_id}/refund with refund_key (idempotent retries within 7 days), optional partial amount.
// - Cancel: POST /v2/{order_id}/cancel voids a pending transaction (VA, e-wallet/QRIS, over-the-counter, cardless credit) or an
//   unsettled card capture. Success = status_code "200" and transaction_status "cancel"; not allowed = status_code "412"
//   ("Merchant cannot modify the status of the transaction"). Settled payments can't be cancelled (refund instead).
// - Expire: POST /v2/{order_id}/expire moves a pending transaction to "expire" (success status_code "407"; 412 when not allowed).
// - A Snap order where no method was chosen yet has no transaction: Get Status answers status_code "404".
import { createHash, timingSafeEqual } from "node:crypto";

export type MidtransEnv = "sandbox" | "production";
export type Normalized = "paid" | "pending" | "failed" | "expired" | "cancelled" | "refunded" | "partially_refunded" | "unknown";

const SNAP: Record<MidtransEnv, string> = { sandbox: "https://app.sandbox.midtrans.com", production: "https://app.midtrans.com" };
const API: Record<MidtransEnv, string> = { sandbox: "https://api.sandbox.midtrans.com", production: "https://api.midtrans.com" };

type Env = Record<string, string | undefined>;
const clean = (v?: string) => (v ?? "").trim().replace(/^"|"$/g, "");

export type MidtransConfig = { env: MidtransEnv; serverKey: string; clientKey: string; signatureKeys: string[]; snapBase: string; apiBase: string };

// Ready config, or why payments are off (names variables, never values).
export function midtransConfig(e: Env = process.env): { config: MidtransConfig | null; reason?: string } {
  if (clean(e.GIF_PAYMENTS_ENABLED).toLowerCase() !== "true") return { config: null, reason: "GIF_PAYMENTS_ENABLED is not true" };
  const env = (clean(e.GIF_MIDTRANS_ENV) || "sandbox").toLowerCase();
  if (env !== "sandbox" && env !== "production") return { config: null, reason: "GIF_MIDTRANS_ENV must be sandbox or production" };
  if (env === "production" && clean(e.GIF_MIDTRANS_PRODUCTION_ENABLED).toLowerCase() !== "true") return { config: null, reason: "production payments are disabled (GIF_MIDTRANS_PRODUCTION_ENABLED)" };
  const serverKey = clean(e.GIF_MIDTRANS_SERVER_KEY), clientKey = clean(e.GIF_MIDTRANS_CLIENT_KEY);
  if (!serverKey || !clientKey) return { config: null, reason: "GIF_MIDTRANS_SERVER_KEY or GIF_MIDTRANS_CLIENT_KEY is not set" };
  if (env === "production" && (serverKey.startsWith("SB-") || clientKey.startsWith("SB-"))) return { config: null, reason: "Sandbox keys cannot be used in production" };
  const signatureKeys = clean(e.GIF_MIDTRANS_SIGNATURE_KEYS).split(",").map((s) => s.trim()).filter(Boolean);
  // A local fake Midtrans for tests only; never honoured in production.
  const test = clean(e.GIF_MIDTRANS_TEST_BASE).replace(/\/+$/, "");
  const useTest = !!test && env === "sandbox" && (e.NODE_ENV !== "production" || clean(e.GIF_ALLOW_TEST_GATEWAY) === "true");
  return {
    config: {
      env, serverKey, clientKey,
      signatureKeys: signatureKeys.length ? signatureKeys : [serverKey],
      snapBase: useTest ? test : SNAP[env],
      apiBase: useTest ? test : API[env],
    },
  };
}

export function signatureFor(n: { order_id?: unknown; status_code?: unknown; gross_amount?: unknown }, key: string): string {
  return createHash("sha512").update(`${n.order_id ?? ""}${n.status_code ?? ""}${n.gross_amount ?? ""}${key}`).digest("hex");
}

export function signatureOk(n: Record<string, unknown>, keys: string[]): boolean {
  const given = Buffer.from(String(n.signature_key ?? ""));
  if (!given.length) return false;
  return keys.some((k) => {
    if (!k) return false;
    const expected = Buffer.from(signatureFor(n, k));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

// Midtrans transaction status → ours. settlement, or capture with fraud accept, is paid; capture+challenge waits for review.
export function classify(st: { transaction_status?: string; fraud_status?: string | null }): Normalized {
  const ts = st.transaction_status, fs = st.fraud_status;
  if (ts === "settlement" || (ts === "capture" && (!fs || fs === "accept"))) return "paid";
  if (ts === "pending" || ts === "authorize" || (ts === "capture" && fs === "challenge")) return "pending";
  const map: Record<string, Normalized> = { deny: "failed", failure: "failed", expire: "expired", cancel: "cancelled", refund: "refunded",
    partial_refund: "partially_refunded", capture: "failed" };
  return (ts && map[ts]) || "unknown";
}

const auth = (key: string) => `Basic ${Buffer.from(`${key}:`).toString("base64")}`;

export type SnapInput = {
  orderId: string; amountIdr: number; itemName: string; itemId: string;
  customer: { name: string; email: string; phone?: string };
  finishUrl: string; notificationUrl: string; expiryMinutes: number;
};

export async function createSnap(c: MidtransConfig, i: SnapInput): Promise<{ token: string; redirectUrl: string }> {
  if (!Number.isInteger(i.amountIdr) || i.amountIdr <= 0) throw new Error("Midtrans amount must be a positive whole IDR amount");
  const res = await fetch(`${c.snapBase}/snap/v1/transactions`, {
    method: "POST",
    headers: { Authorization: auth(c.serverKey), "Content-Type": "application/json", Accept: "application/json",
      // The merchant account may be shared with IELSco/Elco: route this order's notifications to the GIF endpoint only.
      "X-Override-Notification": i.notificationUrl },
    body: JSON.stringify({
      transaction_details: { order_id: i.orderId, gross_amount: i.amountIdr },
      item_details: [{ id: i.itemId.slice(0, 50), price: i.amountIdr, quantity: 1, name: i.itemName.slice(0, 50) }],
      customer_details: { first_name: i.customer.name.slice(0, 255), email: i.customer.email, phone: i.customer.phone?.slice(0, 19) },
      callbacks: { finish: i.finishUrl },
      credit_card: { secure: true },
      expiry: { unit: "minutes", duration: i.expiryMinutes },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; redirect_url?: string; error_messages?: string[] };
  if (!res.ok || !body.token || !body.redirect_url) throw new Error(`Midtrans Snap ${res.status}: ${(body.error_messages ?? []).join("; ").slice(0, 200)}`);
  return { token: body.token, redirectUrl: body.redirect_url };
}

export type MidtransStatus = { order_id?: string; transaction_id?: string; transaction_status?: string; fraud_status?: string; status_code?: string;
  gross_amount?: string; currency?: string; payment_type?: string; [k: string]: unknown };

export async function getStatus(c: MidtransConfig, orderId: string): Promise<MidtransStatus | null> {
  const res = await fetch(`${c.apiBase}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: auth(c.serverKey), Accept: "application/json" }, signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as MidtransStatus;
  if (body.status_code === "404") return null; // never created at Midtrans (e.g. Snap opened but no method chosen)
  if (!res.ok) throw new Error(`Midtrans status ${res.status}`);
  return body;
}

export type ModifyResult = { ok: boolean; statusCode: string | null; transactionStatus: string | null; message: string | null; raw: Record<string, unknown> };

// POST /v2/{order}/cancel or /expire. Never throws on a Midtrans refusal: the caller re-reads the authoritative status anyway.
export async function modifyTransaction(c: MidtransConfig, orderId: string, action: "cancel" | "expire"): Promise<ModifyResult> {
  const res = await fetch(`${c.apiBase}/v2/${encodeURIComponent(orderId)}/${action}`, {
    method: "POST", headers: { Authorization: auth(c.serverKey), Accept: "application/json", "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status_code?: string; transaction_status?: string; status_message?: string; [k: string]: unknown };
  const statusCode = body.status_code != null ? String(body.status_code) : null;
  const ok = action === "cancel" ? statusCode === "200" && body.transaction_status === "cancel" : statusCode === "407" && body.transaction_status === "expire";
  return { ok, statusCode, transactionStatus: body.transaction_status ?? null, message: body.status_message ?? null, raw: body };
}

export async function refund(c: MidtransConfig, orderId: string, refundKey: string, amountIdr: number, reason: string) {
  const res = await fetch(`${c.apiBase}/v2/${encodeURIComponent(orderId)}/refund`, {
    method: "POST",
    headers: { Authorization: auth(c.serverKey), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refund_key: refundKey, amount: amountIdr, reason: reason.slice(0, 255) }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status_code?: string; status_message?: string; [k: string]: unknown };
  // Midtrans answers HTTP 200 with its own status_code: 200 approved; 202 denied by the bank; 4xx/5xx errors.
  return { ok: res.ok && body.status_code === "200", body };
}

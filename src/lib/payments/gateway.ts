// The one Midtrans gateway for IELScourse (Collective, Studio, One). PRODUCTION ONLY: there is no Sandbox path here.
// Pure module (no "@/..." imports) so `node --test` can import it. Server-only by use: keys come from non-public env vars.
//
// Reused from Elco AI (backend/payments.py, live in production) and src/lib/payments/midtrans.ts (its TypeScript port):
//   the same variable names (MIDTRANS_ENV, MIDTRANS_PRODUCTION_ENABLED, MIDTRANS_PRODUCTION_SERVER_KEY/CLIENT_KEY), the same
//   key-prefix checks, SHA-512 signature check, status classification, Snap body and 60-minute order window.
// Added for IELScourse:
//   - checkout needs IELSCOURSE_CHECKOUT_ENABLED=true AND MIDTRANS_ENV=production (Sandbox is refused, never a fallback);
//   - every Snap request sends X-Override-Notification with IELSco's own notification URL on www.ielsco.com, so a shared
//     merchant account never sends IELScourse events to Elco (Elco's dashboard URL) and never the other way round;
//   - order ids IELS-C-YYMMDD-XXXXXXXXXX, distinct from Elco (ELCO-), IELSco membership (IELS-M-) and GIF.
// Local automated tests only: IELSCOURSE_FAKE_MIDTRANS_BASE (http://127.0.0.1:…) runs against a local fake gateway as
// environment "local_test". It is refused on Vercel and for any non-loopback host.

import { randomBytes } from "node:crypto";

export type CourseEnv = "production" | "local_test";
type Env = Record<string, string | undefined>;
const clean = (v?: string) => (v ?? "").trim().replace(/^"|"$/g, "");

export const COURSE_ORDER_TTL_MIN = 60;
export const COURSE_ORDER_ID_RE = /^IELS-C-\d{6}-[0-9A-F]{10}$/;
const PROD = { snap: "https://app.midtrans.com", api: "https://api.midtrans.com" };

export interface Gateway { env: CourseEnv; snapBase: string; apiBase: string; serverKey: string; clientKey: string; snapJs: string }
export type GatewayState = { gateway: Gateway; reason?: undefined } | { gateway: null; reason: string };

export function newCourseOrderId(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `IELS-C-${d}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function fakeBase(e: Env): string | null {
  const raw = clean(e.IELSCOURSE_FAKE_MIDTRANS_BASE).replace(/\/+$/, "");
  if (!raw || e.VERCEL || e.VERCEL_ENV) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost") ? raw : null;
  } catch { return null; }
}

// Is IELScourse checkout open, and on which gateway? The reason names variables only, never values (safe to show).
export function courseGateway(e: Env = process.env): GatewayState {
  if (clean(e.IELSCOURSE_CHECKOUT_ENABLED).toLowerCase() !== "true") return { gateway: null, reason: "IELSCOURSE_CHECKOUT_ENABLED is not true" };
  const server = clean(e.MIDTRANS_PRODUCTION_SERVER_KEY), client = clean(e.MIDTRANS_PRODUCTION_CLIENT_KEY);
  const fake = fakeBase(e);
  if (fake) {
    if (!server || !client) return { gateway: null, reason: "MIDTRANS_PRODUCTION_SERVER_KEY or MIDTRANS_PRODUCTION_CLIENT_KEY is not set" };
    return { gateway: { env: "local_test", snapBase: fake, apiBase: fake, serverKey: server, clientKey: client, snapJs: `${fake}/snap/snap.js` } };
  }
  if (clean(e.MIDTRANS_ENV).toLowerCase() !== "production") return { gateway: null, reason: "MIDTRANS_ENV must be production (IELScourse does not use Sandbox)" };
  if (clean(e.MIDTRANS_PRODUCTION_ENABLED).toLowerCase() !== "true") return { gateway: null, reason: "MIDTRANS_PRODUCTION_ENABLED is not true" };
  if (!server || !client) return { gateway: null, reason: "MIDTRANS_PRODUCTION_SERVER_KEY or MIDTRANS_PRODUCTION_CLIENT_KEY is not set" };
  if (!server.startsWith("Mid-server-") || !client.startsWith("Mid-client-")) {
    return { gateway: null, reason: "MIDTRANS_PRODUCTION_SERVER_KEY / MIDTRANS_PRODUCTION_CLIENT_KEY don't look like Midtrans production keys" };
  }
  return { gateway: { env: "production", snapBase: PROD.snap, apiBase: PROD.api, serverKey: server, clientKey: client, snapJs: `${PROD.snap}/snap/snap.js` } };
}

// The server key for verifying a notification of an order created in `env` (null when it isn't configured any more).
export function serverKeyFor(env: CourseEnv, e: Env = process.env): string | null {
  const g = courseGateway({ ...e, IELSCOURSE_CHECKOUT_ENABLED: "true" }).gateway;
  return g && g.env === env ? g.serverKey : null;
}

// Canonical public origin. Midtrans does not follow redirects on notifications, and ielsco.com (apex) redirects to www.
export function canonicalSite(e: Env = process.env): string {
  const raw = (clean(e.NEXT_PUBLIC_APP_URL) || "https://www.ielsco.com").replace(/\/+$/, "");
  try {
    const u = new URL(raw);
    if (u.hostname === "ielsco.com") u.hostname = "www.ielsco.com";
    if (u.hostname.endsWith("ielsco.com")) u.protocol = "https:";
    return u.origin;
  } catch { return "https://www.ielsco.com"; }
}

async function call(g: Gateway, method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  return fetch(url, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${g.serverKey}:`).toString("base64")}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
}

export interface CourseSnapRequest {
  orderId: string; amount: number; itemId: string; itemName: string; product: string;
  customer: { firstName: string; email: string }; finishUrl: string; notificationUrl: string; ttlMin?: number;
}

export function snapBody(r: CourseSnapRequest) {
  return {
    transaction_details: { order_id: r.orderId, gross_amount: r.amount },
    item_details: [{ id: r.itemId.slice(0, 50), price: r.amount, quantity: 1, name: r.itemName.slice(0, 50) }],
    customer_details: { first_name: (r.customer.firstName || "IELScourse student").slice(0, 50), email: r.customer.email },
    custom_field1: `product:ielscourse_${r.product}`,
    custom_field2: `order:${r.orderId}`,
    credit_card: { secure: true },
    expiry: { unit: "minutes", duration: r.ttlMin ?? COURSE_ORDER_TTL_MIN },
    callbacks: { finish: r.finishUrl },
  };
}

export async function createSnap(g: Gateway, r: CourseSnapRequest): Promise<{ token: string; redirect_url: string }> {
  const res = await call(g, "POST", `${g.snapBase}/snap/v1/transactions`, snapBody(r), { "X-Override-Notification": r.notificationUrl });
  if (res.status !== 200 && res.status !== 201) throw new Error(`snap_failed_${res.status}`); // never log the body: it may echo request details
  const s = (await res.json()) as { token?: string; redirect_url?: string };
  if (!s.token || !s.redirect_url) throw new Error("snap_failed_no_token");
  return { token: s.token, redirect_url: s.redirect_url };
}

// Midtrans's current status for an order (the authority), or null when Midtrans has no transaction for it yet.
export async function fetchCourseStatus(g: Gateway, orderId: string): Promise<Record<string, unknown> | null> {
  const res = await call(g, "GET", `${g.apiBase}/v2/${encodeURIComponent(orderId)}/status`);
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error(`status_unavailable_${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;
  if (String(body.status_code) === "404") return null;
  return body;
}

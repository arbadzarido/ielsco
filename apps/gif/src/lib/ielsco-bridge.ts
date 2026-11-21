// IELSco ⇄ GIF bridge (21 Nov 2026 decision: one IELSco account, one login; GIF is a programme inside IELSco).
//
// IELSco (www.ielsco.com) is the identity provider. Two signed messages cross the boundary, both HMAC-SHA256 with the
// shared secret IELSCO_GIF_SSO_SECRET (32+ characters, same value on both Vercel projects; comma-separate new,old to rotate):
//
// 1. Single sign-on token (browser redirect IELSco → GIF /sso?t=…&next=…):
//      t = "v1." + base64url(JSON {sub, email, iat, exp, nonce}) + "." + base64url(HMAC("gif-sso.v1." + payload))
//    sub = IELSco Supabase Auth user id, email = its *confirmed* email. Valid for 2 minutes, single use (nonce).
// 2. Workspace summary (server-to-server POST IELSco → GIF /api/integrations/ielsco/workspace):
//      header X-IELSco-Signature: "t=<unix seconds>,v1=<hex HMAC('gif-ws.v1.' + t + '.' + rawBody)>", 5-minute window.
//
// The domain prefixes ("gif-sso.v1.", "gif-ws.v1.") stop a value signed for one purpose being replayed as the other.
// Pure module (no server-only / pg) so it is unit-tested directly.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SSO_TTL_SECONDS = 120;
export const WS_WINDOW_SECONDS = 300;

export type IelscoIdentity = { sub: string; email: string };

export function bridgeSecrets(env: Record<string, string | undefined> = process.env): string[] {
  return (env.IELSCO_GIF_SSO_SECRET ?? "").split(",").map((s) => s.trim()).filter((s) => s.length >= 32);
}
export const bridgeConfigured = (env: Record<string, string | undefined> = process.env) => bridgeSecrets(env).length > 0;

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest();
const same = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$/;

// Used by tests and by the IELSco side (which has its own copy of this function).
export function signSsoToken(secret: string, id: IelscoIdentity, now = Date.now(), nonce = randomBytes(18).toString("base64url")): string {
  const iat = Math.floor(now / 1000);
  const payload = b64u(JSON.stringify({ sub: id.sub, email: id.email, iat, exp: iat + SSO_TTL_SECONDS, nonce }));
  return `v1.${payload}.${b64u(hmac(secret, `gif-sso.v1.${payload}`))}`;
}

export type SsoResult = { ok: true; identity: IelscoIdentity; nonce: string; exp: number } | { ok: false; error: "not_configured" | "malformed" | "bad_signature" | "expired" | "invalid_identity" };

export function verifySsoToken(token: string | null | undefined, secrets: string[], now = Date.now()): SsoResult {
  if (!secrets.length) return { ok: false, error: "not_configured" };
  if (typeof token !== "string" || token.length > 2000) return { ok: false, error: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^[\w-]+$/.test(parts[1]) || !/^[\w-]+$/.test(parts[2])) return { ok: false, error: "malformed" };
  const sig = Buffer.from(parts[2], "base64url");
  if (!secrets.some((s) => same(sig, hmac(s, `gif-sso.v1.${parts[1]}`)))) return { ok: false, error: "bad_signature" };
  let p: { sub?: unknown; email?: unknown; iat?: unknown; exp?: unknown; nonce?: unknown };
  try { p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); } catch { return { ok: false, error: "malformed" }; }
  const t = Math.floor(now / 1000);
  if (typeof p.exp !== "number" || typeof p.iat !== "number" || p.exp < t || p.iat > t + 30 || p.exp - p.iat > SSO_TTL_SECONDS) return { ok: false, error: "expired" };
  if (typeof p.sub !== "string" || !UUID.test(p.sub) || typeof p.email !== "string" || !EMAIL.test(p.email.trim().toLowerCase())
    || typeof p.nonce !== "string" || !/^[\w-]{8,100}$/.test(p.nonce)) return { ok: false, error: "invalid_identity" };
  return { ok: true, identity: { sub: p.sub.toLowerCase(), email: p.email.trim().toLowerCase() }, nonce: p.nonce, exp: p.exp };
}

export function signWorkspaceRequest(secret: string, rawBody: string, now = Date.now()): string {
  const t = Math.floor(now / 1000);
  return `t=${t},v1=${hmac(secret, `gif-ws.v1.${t}.${rawBody}`).toString("hex")}`;
}

export function verifyWorkspaceRequest(header: string | null, rawBody: string, secrets: string[], now = Date.now()): { ok: true; identity: IelscoIdentity } | { ok: false; error: string } {
  if (!secrets.length) return { ok: false, error: "not_configured" };
  const m = /^t=(\d{9,11}),v1=([0-9a-f]{64})$/.exec(header ?? "");
  if (!m) return { ok: false, error: "malformed" };
  const t = Number(m[1]);
  if (Math.abs(Math.floor(now / 1000) - t) > WS_WINDOW_SECONDS) return { ok: false, error: "expired" };
  const sig = Buffer.from(m[2], "hex");
  if (!secrets.some((s) => same(sig, hmac(s, `gif-ws.v1.${t}.${rawBody}`)))) return { ok: false, error: "bad_signature" };
  let body: { sub?: unknown; email?: unknown };
  try { body = JSON.parse(rawBody); } catch { return { ok: false, error: "malformed" }; }
  if (typeof body.sub !== "string" || !UUID.test(body.sub) || typeof body.email !== "string" || !EMAIL.test(body.email.trim().toLowerCase())) return { ok: false, error: "invalid_identity" };
  return { ok: true, identity: { sub: body.sub.toLowerCase(), email: body.email.trim().toLowerCase() } };
}

// Where GIF sends people to sign in with IELSco. `next` is a GIF path; IELSco signs them in (if needed) and comes back.
export function ielscoSignInUrl(next: string, env: Record<string, string | undefined> = process.env): string {
  const base = (env.IELSCO_APP_URL || "https://www.ielsco.com").replace(/\/+$/, "");
  return `${base}/api/gif/sso?next=${encodeURIComponent(next)}`;
}

// The participant home: GIF in the IELSco Dashboard (21 Nov 2026: registration, applications and payments start there).
export function ielscoDashboardUrl(pathway?: string | null, env: Record<string, string | undefined> = process.env): string {
  const base = (env.IELSCO_APP_URL || "https://www.ielsco.com").replace(/\/+$/, "");
  return `${base}/dashboard/gif${pathway && /^(fully_funded|mentoring|self_funded)$/.test(pathway) ? `?pathway=${pathway}` : ""}`;
}

// IELSco side of the IELSco ⇄ GIF bridge (21 Nov 2026: GIF Summer 2027 is an IELSco programme; one IELSco account).
// Mirrors apps/gif/src/lib/ielsco-bridge.ts — keep the two in step. Server-only: uses IELSCO_GIF_SSO_SECRET.
//
// - SSO token for the browser hop to gif.ielsco.com/sso (2 minutes, single use, signed "gif-sso.v1." + payload).
// - Signed server-to-server request for the participant's GIF summary (X-IELSco-Signature, "gif-ws.v1." + t + body).
// Only a signed-in IELSco user with a confirmed email gets a token; the identity always comes from the Supabase
// session on the server, never from the request.
import "server-only";
import { createHmac, randomBytes } from "node:crypto";

export type GifIdentity = { sub: string; email: string };

const secret = () => (process.env.IELSCO_GIF_SSO_SECRET ?? "").split(",").map((s) => s.trim()).find((s) => s.length >= 32) ?? null;
export const gifBridgeConfigured = () => !!secret();
export const gifAppUrl = () => (process.env.GIF_APP_URL || "https://gif.ielsco.com").replace(/\/+$/, "");

const hmac = (key: string, data: string) => createHmac("sha256", key).update(data).digest();

export function gifSsoToken(id: GifIdentity, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: id.sub, email: id.email.trim().toLowerCase(), iat, exp: iat + 120, nonce: randomBytes(18).toString("base64url") })).toString("base64url");
  return `v1.${payload}.${hmac(key, `gif-sso.v1.${payload}`).toString("base64url")}`;
}

// Only GIF participant/staff paths may be targets of the hop.
export function safeGifPath(raw: string | null | undefined): string {
  const v = typeof raw === "string" ? raw : "";
  return /^\/(portal|admin|apply)([/?#][\w\-/?=&.%#]*)?$/.test(v) && !v.includes("//") ? v : "/portal";
}

export function gifSsoUrl(id: GifIdentity, next: string): string | null {
  const t = gifSsoToken(id);
  return t ? `${gifAppUrl()}/sso?t=${encodeURIComponent(t)}&next=${encodeURIComponent(safeGifPath(next))}` : null;
}

export async function fetchGifWorkspace(id: GifIdentity): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  const key = secret();
  if (!key) return { ok: false, status: 503, error: "not_configured" };
  const body = JSON.stringify({ sub: id.sub, email: id.email.trim().toLowerCase() });
  const t = Math.floor(Date.now() / 1000);
  try {
    const res = await fetch(`${gifAppUrl()}/api/integrations/ielsco/workspace`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", "X-IELSco-Signature": `t=${t},v1=${hmac(key, `gif-ws.v1.${t}.${body}`).toString("hex")}` },
      body,
    });
    if (!res.ok) return { ok: false, status: res.status, error: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "gif_error" };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, status: 503, error: "unavailable" };
  }
}

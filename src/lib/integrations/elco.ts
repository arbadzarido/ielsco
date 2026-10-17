// IELSco side of the Elco integration (server-only helpers for src/app/api/integrations/elco/*).
// Secrets and the service-role key are read from server env vars only (no NEXT_PUBLIC_ prefix), so they are never
// bundled for the browser; node:crypto also makes this module unusable from client components.

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseSecrets, signedHeaders, verify } from "./signature";
import { isAllowedHost } from "@/lib/safe-redirect";

export const ELCO_SCOPES = ["goals:read", "summary:write"] as const;
export type ElcoScope = (typeof ELCO_SCOPES)[number];
export const MAX_BODY_BYTES = 16 * 1024;

export const newToken = () => randomBytes(32).toString("base64url");

export function elcoAppUrl(): string {
  return (process.env.NEXT_PUBLIC_ELCO_URL || "https://ai.ielsco.com").replace(/\/+$/, "");
}

// Fixed callback on the Elco frontend (docs/INTEGRATION-ARCHITECTURE.md §4). Never taken from the request.
export const elcoCallbackUrl = () => `${elcoAppUrl()}/link/ielsco/callback`;

export const json = (status: number, body: unknown) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (status: number, error: string, message?: string) => json(status, { error, ...(message ? { message } : {}) });

// Service-role client WITHOUT cookies: a request's user session can never replace the service role here.
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Reads the raw body (needed for the signature) with a size cap, then verifies the Elco → IELSco signature.
export async function verifiedElcoRequest(request: Request): Promise<{ body: string } | { response: NextResponse }> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return { response: fail(413, "too_large") };
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return { response: fail(413, "too_large") };
  const url = new URL(request.url);
  const result = verify(parseSecrets(process.env.ELCO_TO_IELSCO_SECRET), request.headers, request.method, `${url.pathname}${url.search}`, body);
  if (!result.ok) {
    if (result.reason === "not_configured") return { response: fail(503, "integration_not_configured") };
    return { response: fail(401, "unauthorized") };
  }
  return { body };
}

export function parseJson<T>(body: string): T | null {
  try {
    const v = JSON.parse(body);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Cookie-session endpoints accept only same-site browser requests (CSRF protection on top of SameSite cookies).
export function isSameSiteRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
    return o.host === host && isAllowedHost(o.host);
  } catch {
    return false;
  }
}

// IELSco → Elco: tell Elco a link was revoked here. Best effort: Elco also learns it on its next call (404).
export async function notifyElcoRevoked(linkId: string): Promise<boolean> {
  const secret = parseSecrets(process.env.IELSCO_TO_ELCO_SECRET)[0];
  const apiUrl = process.env.ELCO_API_URL?.replace(/\/+$/, "");
  if (!secret || !apiUrl) return false;
  const path = "/api/integrations/ielsco/revoke";
  const body = JSON.stringify({ link_id: linkId });
  try {
    const target = new URL(apiUrl + path);
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "IELScoIntegration/1.0", ...signedHeaders(secret, "POST", target.pathname, body) },
      body,
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Server-to-server request signing between IELSco and Elco (docs/INTEGRATION-API.md). Server-only.
// Dependency-free so tests/elco-signature.test.mjs can import it directly. The Elco side implements the same format
// in backend/integration_ielsco.py.
//
//   X-IELS-Timestamp: <unix seconds>
//   X-IELS-Signature: v1=<hex HMAC-SHA256(secret, "v1\n<timestamp>\n<METHOD>\n<path?query>\n<hex SHA-256(body)>")>
//
// - One secret per direction (ELCO_TO_IELSCO_SECRET, IELSCO_TO_ELCO_SECRET), at least 32 characters.
// - Rotation: the env var may hold "new,old"; signing uses the first, verifying accepts any.
// - Requests older or newer than MAX_SKEW_SECONDS are refused. Within that window, replays are harmless because every
//   endpoint is single-use (exchange), idempotent (revoke) or monotonic (summary), and goals is read-only.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const MAX_SKEW_SECONDS = 300;
export const MIN_SECRET_LENGTH = 32;

export function parseSecrets(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter((s) => s.length >= MIN_SECRET_LENGTH);
}

const sha256Hex = (data: string) => createHash("sha256").update(data, "utf8").digest("hex");

export function canonicalString(timestamp: string, method: string, pathWithQuery: string, body: string): string {
  return ["v1", timestamp, method.toUpperCase(), pathWithQuery, sha256Hex(body)].join("\n");
}

export function sign(secret: string, timestamp: string, method: string, pathWithQuery: string, body: string): string {
  return `v1=${createHmac("sha256", secret).update(canonicalString(timestamp, method, pathWithQuery, body), "utf8").digest("hex")}`;
}

export function signedHeaders(secret: string, method: string, pathWithQuery: string, body: string, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000));
  return { "X-IELS-Timestamp": timestamp, "X-IELS-Signature": sign(secret, timestamp, method, pathWithQuery, body) };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "not_configured" | "missing" | "stale" | "bad_signature" };

export function verify(
  secrets: string[],
  headers: { get(name: string): string | null },
  method: string,
  pathWithQuery: string,
  body: string,
  now = Date.now()
): VerifyResult {
  if (secrets.length === 0) return { ok: false, reason: "not_configured" };
  const timestamp = headers.get("x-iels-timestamp");
  const signature = headers.get("x-iels-signature");
  if (!timestamp || !signature || !/^\d{1,12}$/.test(timestamp) || !/^v1=[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: "missing" };
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > MAX_SKEW_SECONDS) return { ok: false, reason: "stale" };
  const given = Buffer.from(signature, "utf8");
  const match = secrets.some((secret) => {
    const expected = Buffer.from(sign(secret, timestamp, method, pathWithQuery, body), "utf8");
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
  return match ? { ok: true } : { ok: false, reason: "bad_signature" };
}

// Codes / states are random 32-byte values, base64url. Only their SHA-256 hex is stored.
export const hashToken = (token: string) => sha256Hex(token);
export const isTokenShape = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(v);

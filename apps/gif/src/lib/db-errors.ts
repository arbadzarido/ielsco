// Pure helpers (no pg / server-only import) so they can be unit-tested.
// A short, secret-free label for a database failure, for /api/health and logs. Never includes the URL or password.
export type DbErrorKind = "env_missing" | "url_invalid" | "dns" | "network" | "timeout" | "auth_failed" | "tenant_or_user"
  | "schema_missing" | "permission" | "tls" | "other";
export function dbErrorKind(e: unknown): DbErrorKind {
  const err = e as { code?: string; message?: string };
  const code = err?.code ?? "";
  const msg = String(err?.message ?? "");
  if (/GIF_DATABASE_URL is not set/.test(msg)) return "env_missing";
  if (/Invalid URL|invalid connection string|URI malformed/i.test(msg)) return "url_invalid";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns";
  if (code === "ECONNREFUSED" || code === "ENETUNREACH" || code === "EHOSTUNREACH" || code === "ECONNRESET") return "network";
  if (/timeout/i.test(msg) || code === "ETIMEDOUT") return "timeout";
  if (code === "28P01" || /password authentication failed/i.test(msg)) return "auth_failed";
  if (/Tenant or user not found/i.test(msg)) return "tenant_or_user";
  if (code === "42P01" || code === "3F000") return "schema_missing";
  if (code === "42501") return "permission";
  if (/SSL|TLS|certificate/i.test(msg)) return "tls";
  return "other";
}

// Logs a database failure to the function logs (Vercel → Logs) with the pg error code, without connection details.
export function logDbError(where: string, e: unknown) {
  const err = e as { code?: string; message?: string };
  const msg = String(err?.message ?? e).replace(/postgres(ql)?:\/\/[^\s]+/gi, "postgres://<redacted>");
  console.error(`[gif:db] ${where}: kind=${dbErrorKind(e)} code=${err?.code ?? "-"} ${msg.slice(0, 300)}`);
}

// The pg / Node error code (e.g. 28P01, ENOTFOUND, SELF_SIGNED_CERT_IN_CHAIN). Codes are not secret; messages may be.
export function dbErrorCode(e: unknown): string | undefined {
  const code = (e as { code?: unknown })?.code;
  return typeof code === "string" && /^[A-Z0-9_]{2,60}$/.test(code) ? code : undefined;
}

// Accepts a multi-line PEM or one with literal "\n" escapes (and stray quotes/CRs from a paste).
export function normalizeCaCert(raw: string | undefined): { pem?: string; problem?: string } {
  const v = (raw ?? "").trim().replace(/^["']|["']$/g, "").replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  if (!v) return {};
  if (!/-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/.test(v)) return { problem: "not a PEM certificate (expected -----BEGIN CERTIFICATE-----)" };
  return { pem: v + "\n" };
}

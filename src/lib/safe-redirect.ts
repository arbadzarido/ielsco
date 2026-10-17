// Redirect-target validation for sign-in flows (/auth/callback, /sign-in, /connect/elco).
// Kept dependency-free so tests/safe-redirect.test.mjs can import it directly with Node.
//
// safeNextPath: only same-site relative paths ("/dashboard", "/connect/elco?state=..."). Rejected: absolute URLs,
//   protocol-relative "//x", "/\x", "@x", control characters, and encoded or dot-segment tricks that only become
//   "//x" after decoding or normalising (e.g. "/%2F%2Fx", "/.//x").
// trustedBaseUrl: the origin to redirect to. Host / X-Forwarded-Host are only used when they are on the explicit
//   allowlist; anything else falls back to the canonical site URL.

const SENTINEL = "http://internal.invalid";
const PROTOCOL_RELATIVE = /^[/\\]{2}/;
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || PROTOCOL_RELATIVE.test(value) || CONTROL_OR_BACKSLASH.test(value)) return fallback;

  // Look at the decoded form too: a later decode (by a router or proxy) must not be able to produce "//host".
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  // Dot segments are never needed in our links, and they are how "/./%2F/x" turns into "//x" after normalising.
  if (PROTOCOL_RELATIVE.test(decoded) || CONTROL_OR_BACKSLASH.test(decoded) || /(^|\/)\.{1,2}(\/|$|[?#])/.test(decoded.split(/[?#]/)[0])) {
    return fallback;
  }

  try {
    const url = new URL(value, SENTINEL);
    if (url.origin !== SENTINEL) return fallback;
    const out = `${url.pathname}${url.search}${url.hash}`;
    // Check the result in raw and decoded form as well: "/.//evil.example" normalises to "//evil.example".
    if (!out.startsWith("/") || PROTOCOL_RELATIVE.test(out) || PROTOCOL_RELATIVE.test(decodeURIComponent(url.pathname))) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

// Production hosts IELSco is served on. Extra hosts (staging, a self-hosted server) come from the server-only
// TRUSTED_HOSTS env var, comma-separated, e.g. "staging.ielsco.com,app.example.org".
const DEFAULT_TRUSTED_HOSTS = ["ielsco.com", "www.ielsco.com", "school.ielsco.com", "circle.ielsco.com"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const CANONICAL_ORIGIN = "https://ielsco.com";

// Strict "host[:port]": no userinfo ("@"), no path, no spaces. Parsing with split(":") alone accepted
// "ielsco.com:443@evil.example", which a browser sends to evil.example.
const HOST_PORT = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)(?::(\d{1,5}))?$/;

function parseHost(host: string | null | undefined): { hostname: string; port: string | null } | null {
  if (!host) return null;
  const m = HOST_PORT.exec(host.trim().toLowerCase());
  return m ? { hostname: m[1], port: m[2] ?? null } : null;
}

function trustedHosts(): string[] {
  const extra = (process.env.TRUSTED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  return [...DEFAULT_TRUSTED_HOSTS, ...extra];
}

const localAllowed = () => process.env.NODE_ENV !== "production";
const isLocalName = (h: string) => LOCAL_HOSTS.includes(h) || h.endsWith(".localhost");

export function isAllowedHost(host: string | null | undefined): boolean {
  const parsed = parseHost(host);
  if (!parsed) return false;
  if (trustedHosts().includes(parsed.hostname)) return true;
  return localAllowed() && isLocalName(parsed.hostname);
}

function canonicalOrigin(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || CANONICAL_ORIGIN);
    if ((url.protocol === "https:" || (localAllowed() && url.protocol === "http:")) && isAllowedHost(url.host)) return url.origin;
  } catch {
    /* fall through */
  }
  return CANONICAL_ORIGIN;
}

// The base URL for redirects from a route handler. Prefers the first X-Forwarded-Host (set by Vercel / a reverse
// proxy), then Host, but only when allowlisted. Production hosts always use https.
export function trustedBaseUrl(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || null;
  const host = forwarded || headers.get("host");
  const parsed = parseHost(host);
  if (!parsed || !isAllowedHost(host)) return canonicalOrigin();
  const local = isLocalName(parsed.hostname);
  const port = parsed.port ? `:${parsed.port}` : "";
  return `${local ? "http" : "https"}://${parsed.hostname}${port}`;
}

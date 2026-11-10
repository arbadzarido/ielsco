// Google API failures, classified into a short code a founder can act on. Pure (no server-only imports) so tests can
// import it. Only allow-listed codes and our own sentences leave this file: never Google's free text, a token, a
// client secret, a file ID or an email address. The Google Cloud project NUMBER may be shown (it is in every OAuth
// client ID) because "enable the API in project N" is the fix.

export type GoogleFailureCode =
  | "invalid_grant"        // refresh token revoked, expired, or issued to another client
  | "invalid_client"       // client ID/secret on the server aren't a valid pair
  | "unauthorized_client"  // the client may not use this grant type
  | "insufficient_scope"   // the token lacks the Drive/Calendar permission
  | "api_disabled"         // the API is switched off in the Google Cloud project that owns the OAuth client
  | "unauthenticated"      // 401: access token rejected
  | "permission_denied"    // 403 for another reason (the account can't open the folder, quota, policy)
  | "not_found"
  | "rate_limited"
  | "cannot_decrypt"       // the stored token can't be unsealed with the server's current key
  | "network"
  | "unknown";

export interface GoogleFailure {
  code: GoogleFailureCode;
  status: number | null;
  /** Google's machine reason (for example accessNotConfigured), only when it matches a plain-word pattern. */
  reason: string | null;
  /** Google Cloud project number named by the error, digits only. */
  project: string | null;
}

const REASON = /^[A-Za-z][A-Za-z0-9_]{2,60}$/;
const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Classify a Google response: its HTTP status and parsed JSON body (either the OAuth {error, error_description} shape
 * or the API {error: {code, message, status, errors[], details[]}} shape). */
export function classifyGoogleResponse(status: number | null, body: unknown): GoogleFailure {
  const b = asRecord(body);
  const err = b.error;
  const oauth = typeof err === "string" ? err : "";                       // OAuth endpoints: "invalid_grant"
  const api = asRecord(err);                                              // API endpoints: { code, message, errors, details }
  const message = `${str(api.message)} ${str(b.error_description)} ${str(b.message)}`;
  const errors = Array.isArray(api.errors) ? api.errors.map(asRecord) : [];
  const details = Array.isArray(api.details) ? api.details.map(asRecord) : [];
  const reasons = [...errors.map((e) => str(e.reason)), ...details.map((d) => str(d.reason)), str(api.status)].filter((r) => REASON.test(r));
  const reason = reasons[0] ?? (REASON.test(oauth) ? oauth : null);
  const projectMatch = (message.match(/project[ s:/]*([0-9]{6,15})/i) ?? [])[1]
    ?? details.map((d) => str(asRecord(d.metadata).consumer ?? asRecord(d.metadata).containerInfo)).map((s) => (s.match(/([0-9]{6,15})/) ?? [])[1]).find(Boolean);
  const out = (code: GoogleFailureCode): GoogleFailure => ({ code, status, reason, project: code === "api_disabled" ? projectMatch ?? null : null });

  if (oauth === "invalid_grant" || /\binvalid_grant\b/.test(message)) return out("invalid_grant");
  if (oauth === "invalid_client" || /\binvalid_client\b/.test(message)) return out("invalid_client");
  if (oauth === "unauthorized_client") return out("unauthorized_client");
  const set = new Set(reasons);
  if (["accessNotConfigured", "SERVICE_DISABLED", "API_KEY_SERVICE_BLOCKED", "serviceDisabled"].some((r) => set.has(r))
    || /has not been used in project|API has not been enabled|is disabled\. Enable it/i.test(message)) return out("api_disabled");
  if (["insufficientPermissions", "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "insufficientScopes"].some((r) => set.has(r))
    || /insufficient (authentication )?scopes?/i.test(message)) return out("insufficient_scope");
  if (["rateLimitExceeded", "userRateLimitExceeded", "RATE_LIMIT_EXCEEDED", "quotaExceeded"].some((r) => set.has(r)) || status === 429) return out("rate_limited");
  if (status === 401) return out("unauthenticated");
  if (status === 403) return out("permission_denied");
  if (status === 404) return out("not_found");
  if (status === null || status === 0) return out("network");
  return out("unknown");
}

/** Classify what a thrown googleapis / google-auth-library (gaxios) error carries. Never reads tokens or headers. */
export function classifyGoogleError(e: unknown): GoogleFailure {
  const x = asRecord(e);
  const res = asRecord(x.response);
  const rawStatus = typeof res.status === "number" ? res.status : typeof x.status === "number" ? x.status : typeof x.code === "number" ? x.code : null;
  const data = res.data ?? undefined;
  if (data !== undefined && data !== null && typeof data === "object") return classifyGoogleResponse(rawStatus, data);
  // No parsed body: the error text itself may be Google's one-word OAuth error ("invalid_grant") or a network code.
  const text = `${str(x.message)} ${typeof x.code === "string" ? x.code : ""}`;
  if (/\binvalid_grant\b/.test(text)) return classifyGoogleResponse(rawStatus, { error: "invalid_grant" });
  if (/\binvalid_client\b/.test(text)) return classifyGoogleResponse(rawStatus, { error: "invalid_client" });
  if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|socket hang up/i.test(text)) return { code: "network", status: null, reason: null, project: null };
  return classifyGoogleResponse(rawStatus, { message: str(x.message) });
}

/** The failure as a founder reads it: the code in brackets, then what it means and what to do, in our own words. */
export function failureText(f: GoogleFailure, what: "Drive" | "Calendar" = "Drive"): string {
  const tag = f.reason && f.reason !== f.code ? `${f.code}, ${f.reason}` : f.code;
  const status = f.status ? `, HTTP ${f.status}` : "";
  const label = `(${tag}${status})`;
  switch (f.code) {
    case "invalid_grant": return `Google rejected the saved permission ${label}: it was revoked, has expired, or was issued to a different OAuth client. Connect again.`;
    case "invalid_client": return `Google doesn't accept the OAuth client ID and secret on the server ${label}. Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (or the OS_ versions) belong together, then connect again.`;
    case "unauthorized_client": return `Google says this OAuth client may not refresh tokens ${label}. Check the client type in Google Cloud Console (it must be a Web application).`;
    case "insufficient_scope": return `The saved permission doesn't include full ${what} access ${label}. Connect again and allow every ${what} permission Google lists.`;
    case "api_disabled": return `The Google ${what} API is switched off in Google Cloud project ${f.project ?? "that owns the OAuth client"} ${label}. In that project open APIs & Services → Library → Google ${what} API → Enable, wait a minute, then check again. The sign-in worked; only API calls are refused.`;
    case "unauthenticated": return `Google didn't accept the access token ${label}. Connect again.`;
    case "permission_denied": return `Google refused the request ${label}: the connected account isn't allowed to do this (folder access, a Workspace policy, or storage).`;
    case "not_found": return `Google couldn't find what was asked for ${label}.`;
    case "rate_limited": return `Google is limiting requests ${label}. Wait a few minutes and check again.`;
    case "cannot_decrypt": return "The saved token can't be decrypted with the server's current sealing key (OS_TOKEN_SEALING_KEY, or SUPABASE_SERVICE_ROLE_KEY when that isn't set, has changed since it was saved). Connect again.";
    case "network": return "The server couldn't reach Google. Try again in a moment.";
    default: return `Google answered with an error that isn't recognised ${label}.`;
  }
}

/** A log line with no secrets: stage, code, HTTP status and Google's reason only. */
export const failureLog = (stage: string, f: GoogleFailure) => `[os google] ${stage} failed: ${f.code}${f.status ? ` http=${f.status}` : ""}${f.reason ? ` reason=${f.reason}` : ""}${f.project ? ` project=${f.project}` : ""}`;

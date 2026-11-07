// Google OAuth settings shared by the Company OS user-consent flows. Pure (no server-only imports) so it can be unit
// tested. Two separate flows use it, each with its own callback, state cookie, scopes and token store:
//   * Drive writer  — one founder connects once; used ONLY to create files (the service account does all reading).
//   * Calendar      — each person connects their own calendar (added with the Calendar module).
// The Drive service account (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY) never goes through OAuth and doesn't use any of this.

export type OAuthPurpose = "drive" | "calendar";

/** The callback route of each flow, on the Company OS host. These exact URLs must be listed under
 *  "Authorized redirect URIs" of the OAuth client in Google Cloud Console. */
export const CALLBACK_PATHS: Record<OAuthPurpose, string> = {
  drive: "/os/api/admin/drive/callback",
  calendar: "/os/api/calendar/callback",
};

/** The production origin. Company OS answers only on os.ielsco.com (see host.ts), so the redirect URI is fixed and
 *  never built from a forwarded header. */
export const OS_ORIGIN = "https://os.ielsco.com";

/** The redirect URI for a request on the OS host, or null for any other host. os.localhost is the local test host. */
export function redirectUriFor(host: string | null | undefined, purpose: OAuthPurpose): string | null {
  const name = (host ?? "").trim().toLowerCase();
  const bare = name.replace(/:\d+$/, "");
  if (bare === "os.ielsco.com") return `${OS_ORIGIN}${CALLBACK_PATHS[purpose]}`;
  if (bare === "os.localhost") return `http://${name}${CALLBACK_PATHS[purpose]}`;
  return null;
}

/** Which OAuth client the server uses. OS_GOOGLE_CLIENT_ID wins; otherwise the project's existing GOOGLE_CLIENT_ID
 *  (the Web client that Supabase's "Continue with Google" sign-in uses). The client ID is public (it appears in every
 *  Google consent URL); the secret is never returned. */
export function oauthClientInfo(env: Record<string, string | undefined> = process.env): { clientId: string | null; source: "OS_GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_ID" | null; hasSecret: boolean } {
  if (env.OS_GOOGLE_CLIENT_ID) return { clientId: env.OS_GOOGLE_CLIENT_ID, source: "OS_GOOGLE_CLIENT_ID", hasSecret: Boolean(env.OS_GOOGLE_CLIENT_SECRET) };
  if (env.GOOGLE_CLIENT_ID) return { clientId: env.GOOGLE_CLIENT_ID, source: "GOOGLE_CLIENT_ID", hasSecret: Boolean(env.GOOGLE_CLIENT_SECRET) };
  return { clientId: null, source: null, hasSecret: false };
}

/** Google's OAuth endpoints. A local stand-in (OS_GOOGLE_OAUTH_BASE) is honoured only outside Vercel, so tests can
 *  run the whole flow; on any Vercel deployment the real Google endpoints are always used. */
export function oauthEndpoints(env: Record<string, string | undefined> = process.env) {
  const base = !env.VERCEL && env.OS_GOOGLE_OAUTH_BASE ? env.OS_GOOGLE_OAUTH_BASE.replace(/\/$/, "") : null;
  return base
    ? { endpoints: { oauth2AuthBaseUrl: `${base}/o/oauth2/v2/auth`, oauth2TokenUrl: `${base}/token`, oauth2RevokeUrl: `${base}/revoke`, tokenInfoUrl: `${base}/tokeninfo` }, apiRoot: `${new URL(base).origin}/` }
    : null;
}

/** Where a callback sends the person back to: always on the Company OS host (the request URL inside the server can
 *  name an internal host). */
export function backTo(redirectUri: string | null, fallback: string, path: string): URL {
  return new URL(path, redirectUri ?? fallback);
}

/** Google's ?error= on the callback, in a short code the Admin page explains. */
export function callbackErrorCode(error: string | null): "cancelled" | "failed" | null {
  if (!error) return null;
  return error === "access_denied" ? "cancelled" : "failed";
}

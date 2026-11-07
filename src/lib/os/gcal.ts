import "server-only";
import { osServiceClient } from "./server";
import { seal, unseal } from "./seal";
import { sealingSecret } from "./drive-oauth";
import { oauthClientInfo, oauthEndpoints } from "./google-oauth";
import type { GoogleEventLike } from "./calendar";

// Google Calendar for Company OS, server side only. Each person connects their OWN calendar (per-user OAuth); this is
// separate from the Drive service account and from the founder's Drive connection: its own consent, callback, state
// cookie, scope and token table (os_calendar_connections). Tokens are sealed before storage, read with the service
// role only for the signed-in person, and never sent to the browser.
//
// Scope: calendar.events (read and write events on calendars the person can access). Nothing broader.

export const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events", "openid", "email"];
export const CALENDAR_SCOPE = CALENDAR_SCOPES[0];

const AUTH_URL = () => oauthEndpoints()?.endpoints.oauth2AuthBaseUrl ?? "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = () => oauthEndpoints()?.endpoints.oauth2TokenUrl ?? "https://oauth2.googleapis.com/token";
const REVOKE_URL = () => oauthEndpoints()?.endpoints.oauth2RevokeUrl ?? "https://oauth2.googleapis.com/revoke";
const TOKENINFO_URL = () => oauthEndpoints()?.endpoints.tokenInfoUrl ?? "https://oauth2.googleapis.com/tokeninfo";
const API = () => `${oauthEndpoints()?.apiRoot ?? "https://www.googleapis.com/"}calendar/v3`;

function clientSecret(): string | undefined { return process.env.OS_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET; }
export function calendarConfigured(): boolean { const c = oauthClientInfo(); return Boolean(c.clientId && clientSecret() && sealingSecret()); }

export function consentUrl(redirectUri: string, state: string): string {
  const u = new URL(AUTH_URL());
  u.searchParams.set("client_id", oauthClientInfo().clientId!);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", CALENDAR_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

async function tokenRequest(body: Record<string, string>) {
  const r = await fetch(TOKEN_URL(), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: oauthClientInfo().clientId!, client_secret: clientSecret()!, ...body }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new CalendarError(j.error === "invalid_grant" ? "expired" : "token", r.status);
  return j as { access_token: string; refresh_token?: string; scope?: string; expires_in?: number };
}

export class CalendarError extends Error {
  constructor(public kind: "expired" | "token" | "not_connected" | "conflict" | "gone" | "denied" | "upstream", public status = 0) { super(kind); }
}

/** Exchange the consent code and store the sealed refresh token for this person. Returns the Google account. */
export async function connectCalendar(personId: string, code: string, redirectUri: string): Promise<string> {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!t.refresh_token || !(t.scope ?? "").split(" ").includes(CALENDAR_SCOPE)) throw new CalendarError("denied");
  const info = await fetch(`${TOKENINFO_URL()}?access_token=${encodeURIComponent(t.access_token)}`).then((r) => r.json()).catch(() => ({}));
  const email = String(info.email ?? "").toLowerCase();
  if (!email) throw new CalendarError("denied");
  // The person's calendar time zone, so new events default to it (Asia/Jakarta when Google doesn't say).
  const settings = await fetch(`${API()}/users/me/settings/timezone`, { headers: { authorization: `Bearer ${t.access_token}` } }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) as { value?: unknown };
  const service = osServiceClient();
  if (!service) throw new CalendarError("upstream");
  const { error } = await service.from("os_calendar_connections").upsert({ person_id: personId, google_email: email, token_sealed: seal(t.refresh_token, sealingSecret()),
    scopes: t.scope ?? CALENDAR_SCOPE, calendar_id: "primary", timezone: typeof settings.value === "string" ? settings.value : null, connected_at: new Date().toISOString(), last_error: null });
  if (error) throw new CalendarError("upstream");
  tokens.delete(personId);
  return email;
}

export interface CalendarConnection { google_email: string; calendar_id: string; timezone: string | null; connected_at: string; last_error: string | null }
export async function calendarConnection(personId: string): Promise<(CalendarConnection & { token_sealed: string }) | null> {
  const service = osServiceClient();
  if (!service) return null;
  const { data } = await service.from("os_calendar_connections").select("google_email, calendar_id, timezone, connected_at, last_error, token_sealed").eq("person_id", personId).maybeSingle();
  return (data as (CalendarConnection & { token_sealed: string }) | null) ?? null;
}

// Access tokens live in memory only, per person, until shortly before they expire.
const tokens = new Map<string, { sealed: string; token: string; until: number }>();
async function accessToken(personId: string): Promise<{ token: string; calendarId: string }> {
  const c = await calendarConnection(personId);
  if (!c) throw new CalendarError("not_connected");
  const hit = tokens.get(personId);
  if (hit && hit.sealed === c.token_sealed && hit.until > Date.now()) return { token: hit.token, calendarId: c.calendar_id };
  try {
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: unseal(c.token_sealed, sealingSecret()) });
    tokens.set(personId, { sealed: c.token_sealed, token: t.access_token, until: Date.now() + Math.max(60, (t.expires_in ?? 3600) - 120) * 1000 });
    return { token: t.access_token, calendarId: c.calendar_id };
  } catch (e) {
    if (e instanceof CalendarError && e.kind === "expired") await osServiceClient()?.from("os_calendar_connections").update({ last_error: "expired" }).eq("person_id", personId);
    throw e;
  }
}

async function api(personId: string, path: string, init: RequestInit & { ifMatch?: string } = {}) {
  const { token, calendarId } = await accessToken(personId);
  const headers: Record<string, string> = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  if (init.ifMatch) headers["if-match"] = init.ifMatch;
  const r = await fetch(`${API()}/calendars/${encodeURIComponent(calendarId)}${path}`, { ...init, headers });
  if (r.status === 412) throw new CalendarError("conflict", 412);
  if (r.status === 404 || r.status === 410) throw new CalendarError("gone", r.status);
  if (r.status === 401 || r.status === 403) throw new CalendarError("denied", r.status);
  if (!r.ok) throw new CalendarError("upstream", r.status);
  return r.status === 204 ? null : r.json();
}

/** The person's own Google events in a window (live; not stored). */
export async function listGoogleEvents(personId: string, timeMin: string, timeMax: string): Promise<GoogleEventLike[]> {
  const q = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250", showDeleted: "false" });
  const j = await api(personId, `/events?${q}`);
  await osServiceClient()?.from("os_calendar_connections").update({ last_used_at: new Date().toISOString(), last_error: null }).eq("person_id", personId);
  return ((j?.items ?? []) as GoogleEventLike[]).filter((e) => e.status !== "cancelled");
}

/** An existing Google event that already carries this OS event's ID (from an earlier push). */
export async function findByOsId(personId: string, osEventId: string): Promise<GoogleEventLike | null> {
  const q = new URLSearchParams({ privateExtendedProperty: `osEventId=${osEventId}`, maxResults: "2", showDeleted: "false" });
  const j = await api(personId, `/events?${q}`);
  return ((j?.items ?? []) as GoogleEventLike[]).find((e) => e.status !== "cancelled") ?? null;
}
export const getGoogleEvent = (personId: string, id: string) => api(personId, `/events/${encodeURIComponent(id)}`) as Promise<GoogleEventLike>;
/** sendUpdates: "all" lets Google email the attendees (only when the event's organiser turned invitations on). */
const q = (sendUpdates?: "all" | "none") => (sendUpdates ? `?sendUpdates=${sendUpdates}` : "");
export const insertGoogleEvent = (personId: string, body: object, sendUpdates?: "all" | "none") => api(personId, `/events${q(sendUpdates)}`, { method: "POST", body: JSON.stringify(body) }) as Promise<GoogleEventLike>;
/** Update only if Google's copy is still the one we last saw (If-Match etag); otherwise a CalendarError("conflict"). */
export const patchGoogleEvent = (personId: string, id: string, body: object, etag?: string, sendUpdates?: "all" | "none") => api(personId, `/events/${encodeURIComponent(id)}${q(sendUpdates)}`, { method: "PATCH", body: JSON.stringify(body), ifMatch: etag }) as Promise<GoogleEventLike>;
export const deleteGoogleEvent = (personId: string, id: string, etag?: string) => api(personId, `/events/${encodeURIComponent(id)}`, { method: "DELETE", ifMatch: etag });

export async function disconnectCalendar(personId: string): Promise<void> {
  const c = await calendarConnection(personId);
  if (!c) return;
  try { await fetch(`${REVOKE_URL()}?token=${encodeURIComponent(unseal(c.token_sealed, sealingSecret()))}`, { method: "POST" }); } catch { /* already revoked */ }
  await osServiceClient()?.from("os_calendar_connections").delete().eq("person_id", personId);
  tokens.delete(personId);
}

export function calendarErrorText(e: unknown): string {
  const k = e instanceof CalendarError ? e.kind : "upstream";
  switch (k) {
    case "not_connected": return "Connect your Google Calendar first.";
    case "expired": return "Your Google Calendar connection has expired or was removed in Google. Connect it again.";
    case "denied": return "Google refused access to your calendar. Connect it again and allow calendar access.";
    case "conflict": return "This event was changed in Google Calendar since it was last synced. Choose which version to keep.";
    case "gone": return "This event no longer exists in Google Calendar.";
    default: return "Google Calendar didn't respond. Try again in a moment.";
  }
}

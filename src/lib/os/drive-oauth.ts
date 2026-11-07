import "server-only";
import { google, type drive_v3 } from "googleapis";
import { osServiceClient } from "./server";
import { seal, unseal } from "./seal";
import { oauthEndpoints } from "./google-oauth";

// The founder-connected Google account Company OS writes new Drive files with. Server only: the refresh token is
// sealed before it is stored, read only with the service role, and never sent to the browser.

export const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive", "openid", "email"];

export function oauthClientId(): string | undefined { return process.env.OS_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID; }
function oauthClientSecret(): string | undefined { return process.env.OS_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET; }
export function oauthConfigured(): boolean { return Boolean(oauthClientId() && oauthClientSecret() && sealingSecret()); }
export function sealingSecret(): string { return process.env.OS_TOKEN_SEALING_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""; }

export function oauthClient(redirectUri?: string) {
  const e = oauthEndpoints();
  return new google.auth.OAuth2({ clientId: oauthClientId(), clientSecret: oauthClientSecret(), redirectUri, ...(e ? { endpoints: e.endpoints } : {}) });
}

export interface DriveConnection { google_email: string; connected_by: string; connected_at: string; scopes: string }

export async function driveConnection(): Promise<(DriveConnection & { token_sealed: string }) | null> {
  const service = osServiceClient();
  if (!service) return null;
  const { data } = await service.from("os_drive_connection").select("google_email, connected_by, connected_at, scopes, token_sealed").eq("id", true).maybeSingle();
  return (data as (DriveConnection & { token_sealed: string }) | null) ?? null;
}

let cached: { sealed: string; drive: drive_v3.Drive } | null = null;
export async function writerDrive(): Promise<drive_v3.Drive | null> {
  if (!oauthConfigured()) return null;
  const c = await driveConnection();
  if (!c) { cached = null; return null; }
  if (cached?.sealed === c.token_sealed) return cached.drive;
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: unseal(c.token_sealed, sealingSecret()) });
  const e = oauthEndpoints();
  cached = { sealed: c.token_sealed, drive: google.drive({ version: "v3", auth, ...(e ? { rootUrl: e.apiRoot } : {}) }) };
  return cached.drive;
}

export async function saveDriveConnection(email: string, refreshToken: string, scopes: string, personId: string): Promise<boolean> {
  const service = osServiceClient();
  if (!service) return false;
  const { error } = await service.from("os_drive_connection").upsert({ id: true, google_email: email, token_sealed: seal(refreshToken, sealingSecret()), scopes, connected_by: personId, connected_at: new Date().toISOString() });
  cached = null;
  return !error;
}

export async function removeDriveConnection(): Promise<void> {
  const c = await driveConnection();
  if (c) {
    try { await oauthClient().revokeToken(unseal(c.token_sealed, sealingSecret())); } catch { /* already revoked or expired */ }
    await osServiceClient()?.from("os_drive_connection").delete().eq("id", true);
  }
  cached = null;
}

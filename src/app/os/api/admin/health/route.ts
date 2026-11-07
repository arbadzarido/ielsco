import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { driveConfigured, driveError, listTemplates } from "@/lib/os/drive";
import { aiConfigured } from "@/lib/os/ai";
import { driveConnection, oauthConfigured, writerDrive } from "@/lib/os/drive-oauth";
import { CALLBACK_PATHS, OS_ORIGIN, oauthClientInfo, redirectUriFor } from "@/lib/os/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Integration health for founders: which server-side integrations are configured and answering. Reports only
// yes/no and a plain message; never a key, an ID or an upstream error text.
export async function GET(req: Request) {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: founder } = await auth.supabase.rpc("os_is_founder");
  if (!founder) return jsonError("Founders only.", 403);

  const checks: { key: string; label: string; ok: boolean; detail: string }[] = [];
  const service = osServiceClient();
  if (service) {
    const { error } = await service.from("os_ai_settings").select("id").limit(1);
    checks.push({ key: "service", label: "Database (server access)", ok: !error, detail: error ? "Configured but not answering." : "Connected." });
  } else checks.push({ key: "service", label: "Database (server access)", ok: false, detail: "SUPABASE_SERVICE_ROLE_KEY isn't set. Document creation, AI and session alerts need it." });

  if (driveConfigured()) {
    try { const t = await listTemplates(); checks.push({ key: "drive", label: "Google Drive: reading", ok: true, detail: `Service account connected. ${t.length} master template${t.length === 1 ? "" : "s"} readable.` }); }
    catch (e) { checks.push({ key: "drive", label: "Google Drive", ok: false, detail: driveError(e) }); }
  } else checks.push({ key: "drive", label: "Google Drive", ok: false, detail: "The service account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) isn't set." });

  // Writing new files uses the founder-connected Google account (the service account has no storage in My Drive).
  let driveWrite: { key: string; label: string; ok: boolean; detail: string } = { key: "drive_write", label: "Google Drive: creating files", ok: false, detail: "" };
  const conn = await driveConnection().catch(() => null);
  if (!oauthConfigured()) driveWrite.detail = "Google sign-in for Drive isn't configured on the server (OAuth client ID and secret).";
  else if (!conn) driveWrite.detail = "Not connected. Creating documents from templates and uploads need a founder to connect Google Drive.";
  else {
    try {
      const w = await writerDrive();
      await w!.about.get({ fields: "user(emailAddress)" });
      driveWrite = { ...driveWrite, ok: true, detail: `Connected as ${conn.google_email}. New files are owned by this account.` };
    } catch { driveWrite.detail = `The connection for ${conn.google_email} no longer works. Connect Google Drive again.`; }
  }
  checks.push(driveWrite);

  checks.push({ key: "ai", label: "AI agents (Gemini)", ok: aiConfigured(), detail: aiConfigured() ? "API key set. Spending is capped in the database." : "GEMINI_API_KEY isn't set; the agents show as unavailable." });
  const mail = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  checks.push({ key: "email", label: "Email alerts", ok: mail, detail: mail ? "New-device alerts can be sent." : "RESEND_API_KEY or EMAIL_FROM isn't set; new-device alerts are skipped." });
  // What a founder needs to register in Google Cloud Console. The client ID is public (it is in every consent URL);
  // the secret is never returned, only whether it is set.
  const client = oauthClientInfo();
  const oauth = { client_id: client.clientId, client_source: client.source, has_secret: client.hasSecret,
    redirect_uris: { drive: redirectUriFor(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), "drive") ?? `${OS_ORIGIN}${CALLBACK_PATHS.drive}` } };
  return NextResponse.json({ checks, at: new Date().toISOString(), oauth, drive: { configured: oauthConfigured(), connected: Boolean(conn), email: conn?.google_email ?? null } });
}

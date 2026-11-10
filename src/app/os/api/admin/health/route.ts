import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { checkFolderAccess, driveConfigured, driveError, listTemplates } from "@/lib/os/drive";
import { aiConfigured } from "@/lib/os/ai";
import { checkWriter, driveConnection, oauthConfigured } from "@/lib/os/drive-oauth";
import { calendarConfigured, checkCalendar } from "@/lib/os/gcal";
import { failureText } from "@/lib/os/google-errors";
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

  // Four separate questions, answered separately: can the service account read, are the master templates there, can the
  // connected Google account write (decrypt → token → Drive call), and do the approved destination folders accept files.
  // "Connected" in the database only means a token was stored; none of these is inferred from it.
  const conn = await driveConnection().catch(() => null);
  const [tpl, writer, cal, routesRes] = await Promise.all([
    driveConfigured() ? listTemplates().then((t) => ({ ok: true as const, n: t.length }), (e: unknown) => ({ ok: false as const, e })) : Promise.resolve(null),
    oauthConfigured() && conn ? checkWriter() : Promise.resolve(null),
    calendarConfigured() ? checkCalendar(auth.personId).catch(() => null) : Promise.resolve(null),
    auth.supabase.from("os_folder_routes").select("drive_folder_id, folder_name, status"),
  ]);

  if (!tpl) checks.push({ key: "drive", label: "Google Drive: reading", ok: false, detail: "The service account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) isn't set." });
  else if (!tpl.ok) checks.push({ key: "drive", label: "Google Drive: reading", ok: false, detail: driveError(tpl.e) });
  else checks.push({ key: "drive", label: "Google Drive: reading", ok: true, detail: "The service account can read the Master Templates folder." });
  if (tpl?.ok) checks.push({ key: "templates", label: "Google Drive: master templates", ok: tpl.n > 0, detail: tpl.n > 0 ? `${tpl.n} master template${tpl.n === 1 ? "" : "s"} readable.` : "The Master Templates folder is empty, or isn't shared with the service account." });

  const driveWrite = { key: "drive_write", label: "Google Drive: creating files", ok: false, detail: "" };
  if (!oauthConfigured()) driveWrite.detail = "Google sign-in for Drive isn't configured on the server (OAuth client ID and secret).";
  else if (!conn || !writer) driveWrite.detail = "Not connected. Creating documents from templates and uploads need a founder to connect Google Drive.";
  else if (!writer.ok) {
    const stage = writer.stage === "unseal" ? "Decrypting the saved token failed." : writer.stage === "token" ? "Google refused to renew the access token." : "The token works, but Google's Drive API refused the call.";
    driveWrite.detail = `Saved for ${conn.google_email}, but not working. ${stage} ${failureText(writer.failure, "Drive")}`;
  } else if (writer.email && writer.email !== conn.google_email.toLowerCase()) {
    driveWrite.detail = "The saved token belongs to a different Google account than the one recorded. Disconnect and connect again with the right account.";
  } else {
    driveWrite.ok = true;
    driveWrite.detail = `Connected as ${conn.google_email}. Token renewal and a Drive call both succeeded just now; new files are owned by this account.`;
  }
  checks.push(driveWrite);

  const routes = (routesRes.data ?? []) as { drive_folder_id: string; folder_name: string; status: string }[];
  const approved = routes.filter((r) => r.status === "approved");
  const folders = { key: "drive_folders", label: "Google Drive: approved destination folders", ok: false, detail: "" };
  if (!approved.length) folders.detail = `No folder route is approved yet (${routes.filter((r) => r.status === "proposed").length} proposed). Documents can't be filed until a founder approves routes in Admin → Drive folder routes.`;
  else if (!driveWrite.ok) folders.detail = `${approved.length} route${approved.length === 1 ? " is" : "s are"} approved, but they can't be checked until creating files works.`;
  else {
    const distinct = Array.from(new Map(approved.map((r) => [r.drive_folder_id, r])).values()).slice(0, 12);
    const results = await Promise.all(distinct.map(async (r) => ({ name: r.folder_name, a: await checkFolderAccess(r.drive_folder_id).catch(() => ({ ok: false } as { ok: boolean })) })));
    const bad = results.filter((x) => !x.a.ok);
    folders.ok = bad.length === 0;
    folders.detail = folders.ok ? `${results.length} approved folder${results.length === 1 ? "" : "s"} accept new files from the connected account.`
      : `${results.length - bad.length} of ${results.length} approved folders accept new files. Not ready: ${bad.slice(0, 4).map((x) => x.name).join(", ")}. Re-check them in Admin → Drive folder routes.`;
  }
  checks.push(folders);

  if (cal) checks.push({ key: "calendar", label: "Google Calendar (your connection)", ok: cal.ok,
    detail: cal.ok ? `Connected as ${cal.email}. Token renewal and a Calendar call both succeeded just now.` : failureText(cal.failure, "Calendar") });

  checks.push({ key: "ai", label: "AI agents (Gemini)", ok: aiConfigured(), detail: aiConfigured() ? "API key set. Spending is capped in the database." : "GEMINI_API_KEY isn't set; the agents show as unavailable." });
  const mail = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  checks.push({ key: "email", label: "Email alerts", ok: mail, detail: mail ? "New-device alerts can be sent." : "RESEND_API_KEY or EMAIL_FROM isn't set; new-device alerts are skipped." });
  // What a founder needs to register in Google Cloud Console. The client ID is public (it is in every consent URL);
  // the secret is never returned, only whether it is set.
  const client = oauthClientInfo();
  const oauth = { client_id: client.clientId, client_source: client.source, has_secret: client.hasSecret,
    redirect_uris: { drive: redirectUriFor(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), "drive") ?? `${OS_ORIGIN}${CALLBACK_PATHS.drive}` } };
  return NextResponse.json({ checks, at: new Date().toISOString(), oauth, drive: { configured: oauthConfigured(), connected: Boolean(conn), email: conn?.google_email ?? null, write_ok: driveWrite.ok,
      ready: Boolean(tpl?.ok && tpl.n > 0 && driveWrite.ok && folders.ok) } });
}

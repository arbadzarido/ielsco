import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { driveConfigured, serviceCanRead } from "@/lib/os/drive";
import { checkWriter, driveConnection, oauthConfigured, writerDrive } from "@/lib/os/drive-oauth";
import { classifyGoogleError, failureText } from "@/lib/os/google-errors";
import { osServiceClient } from "@/lib/os/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Founders only. A real, throwaway write test for the connected Google account: create one empty Google Doc in a TEST
// folder the founder names, confirm who owns it and that it can be read, then delete exactly that file.
//
// Safety: it refuses any folder that is a division folder or a document route (production business folders), and any
// folder whose name doesn't contain "test". It only ever deletes the file it created a moment ago, by its ID, after
// checking the marker it stamped on it. Nothing else in Drive is read, renamed, moved or deleted.

const FOLDER_ID = /^[A-Za-z0-9_-]{20,}$/;
const folderIdFrom = (input: string): string | null => {
  const t = input.trim();
  if (FOLDER_ID.test(t)) return t;
  return (t.match(/\/folders\/([A-Za-z0-9_-]{20,})/) ?? t.match(/[?&]id=([A-Za-z0-9_-]{20,})/) ?? [])[1] ?? null;
};

interface Step { label: string; ok: boolean; detail: string }

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Not allowed.", 403);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: founder } = await auth.supabase.rpc("os_is_founder");
  if (!founder) return jsonError("Founders only.", 403);
  const service = osServiceClient();
  if (!service || !oauthConfigured()) return jsonError("Google Drive writing isn't configured on the server.", 409);
  const body = await req.json().catch(() => ({})) as { folder?: unknown };
  const folderId = typeof body.folder === "string" ? folderIdFrom(body.folder) : null;
  if (!folderId) return jsonError("Paste the test folder's link or ID.");

  const steps: Step[] = [];
  const done = (ok: boolean, extra: Record<string, unknown> = {}) => NextResponse.json({ ok, steps, ...extra });
  const step = (label: string, ok: boolean, detail: string) => { steps.push({ label, ok, detail }); return ok; };

  const conn = await driveConnection();
  if (!conn) { step("Connection", false, "Google Drive isn't connected. Connect it first."); return done(false); }
  const chk = await checkWriter();
  if (!step("Token renewal and Drive call", chk.ok, chk.ok ? "Google accepted the saved permission." : failureText(chk.failure, "Drive"))) return done(false);
  const w = await writerDrive();
  if (!w) { step("Writer", false, "The connected account couldn't be loaded."); return done(false); }

  // Refuse production folders before touching Drive.
  const [{ data: divs }, { data: routes }] = await Promise.all([service.from("os_divisions").select("drive_folder_id"), service.from("os_folder_routes").select("drive_folder_id")]);
  const business = new Set([...(divs ?? []), ...(routes ?? [])].map((r) => (r as { drive_folder_id: string | null }).drive_folder_id).filter(Boolean));
  if (!step("Folder is not a business folder", !business.has(folderId), business.has(folderId) ? "That is a division or document-route folder. Use a separate test folder." : "It isn't a division folder or a document route.")) return done(false);

  let folderName = "";
  try {
    const f = await w.files.get({ fileId: folderId, fields: "id, name, mimeType, trashed, capabilities(canAddChildren)", supportsAllDrives: true });
    folderName = f.data.name ?? "";
    if (f.data.mimeType !== "application/vnd.google-apps.folder" || f.data.trashed) { step("Folder", false, "That ID isn't an active folder."); return done(false); }
    if (!/test/i.test(folderName)) { step("Folder is a test folder", false, `The folder's name must contain "test" so nothing is created in a working folder. Its name is “${folderName}”.`); return done(false); }
    if (!f.data.capabilities?.canAddChildren) { step("Folder", false, `“${folderName}” opens, but the connected account can't add files to it.`); return done(false); }
    step("Folder", true, `“${folderName}” is a test folder the connected account can add files to.`);
  } catch (e) { step("Folder", false, failureText(classifyGoogleError(e), "Drive")); return done(false); }

  // Create one empty Google Doc (no storage quota), stamped with a one-time marker.
  const marker = randomBytes(12).toString("hex");
  let id = "", url = "";
  try {
    const c = await w.files.create({
      requestBody: { name: `Company OS write test ${new Date().toISOString()}`, mimeType: "application/vnd.google-apps.document", parents: [folderId], appProperties: { os_write_test: marker } },
      fields: "id, webViewLink", supportsAllDrives: true,
    });
    id = c.data.id ?? ""; url = c.data.webViewLink ?? "";
    if (!step("Create a file", Boolean(id), id ? "Google created a test document in the test folder." : "Google returned no file.")) return done(false);
  } catch (e) { step("Create a file", false, failureText(classifyGoogleError(e), "Drive")); return done(false); }

  let verified = false;
  try {
    const m = await w.files.get({ fileId: id, fields: "id, name, webViewLink, parents, owners(emailAddress), appProperties", supportsAllDrives: true });
    const owner = (m.data.owners?.[0]?.emailAddress ?? "").toLowerCase();
    const inFolder = (m.data.parents ?? []).includes(folderId);
    const own = owner === conn.google_email.toLowerCase();
    step("Owner is the connected account", own, owner ? (own ? `Owned by ${conn.google_email}.` : "Owned by a different account than the connected one.") : "Google reports no single owner (a shared drive: the drive owns it).");
    step("File is in the test folder", inFolder, inFolder ? "Its parent is the test folder." : "It isn't in the test folder.");
    step("File can be read back", m.data.appProperties?.os_write_test === marker, m.data.appProperties?.os_write_test === marker ? "The connected account reads it back with the marker it wrote." : "The marker didn't match.");
    url = m.data.webViewLink ?? url;
    verified = (own || !owner) && inFolder && m.data.appProperties?.os_write_test === marker;
  } catch (e) { step("File can be read back", false, failureText(classifyGoogleError(e), "Drive")); }
  // Informational: reading by the service account depends on how the test folder is shared.
  step("Service account can read it (informational)", true, (await serviceCanRead(id)) ? "Yes." : "No: the test folder isn't shared with the service account. That is fine for this test.");

  // Clean up only after the checks, and only this file.
  let cleanup: "deleted" | "trashed" | "left" = "left";
  if (verified) {
    try { await w.files.delete({ fileId: id, supportsAllDrives: true }); cleanup = "deleted"; }
    catch {
      try { await w.files.update({ fileId: id, requestBody: { trashed: true }, supportsAllDrives: true }); cleanup = "trashed"; } catch { cleanup = "left"; }
    }
  }
  step("Test file removed", cleanup !== "left", cleanup === "left" ? (verified ? "It couldn't be deleted; remove it by hand from the test folder." : "Left in place because a check failed, so you can inspect it.") : cleanup === "deleted" ? "Deleted from Drive." : "Moved to the Drive trash (deleting wasn't allowed).");

  await service.from("os_audit_log").insert({ actor_person_id: auth.personId, action: "drive.write_test", target_type: "os_drive_connection", target_id: "drive", detail: { google_email: conn.google_email, folder_name: folderName, file_id: id, verified, cleanup } });
  return done(verified && cleanup !== "left", { file: { id, url, cleanup }, driveReading: driveConfigured() });
}

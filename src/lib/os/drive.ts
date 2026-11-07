import "server-only";
import { google, type drive_v3 } from "googleapis";

// Google Drive for Company OS, server side only. Uses the existing service account (GOOGLE_CLIENT_EMAIL /
// GOOGLE_PRIVATE_KEY); the key never reaches the browser.
//
// What this module does: list the Master Templates folder, copy a template into an existing folder, upload a file into
// an existing folder, and READ a file's sharing for the access-drift report.
// What it never does: create, rename, move or delete folders; change any permission or sharing setting.

export const MASTER_TEMPLATES_FOLDER = "1deyBzqGI5e1zj1cl3smndFDfqWPbWcz1"; // 02.1 Master Templates

export class DriveUnavailable extends Error {}

let client: drive_v3.Drive | null = null;
export function driveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}
function drive(): drive_v3.Drive {
  if (!driveConfigured()) throw new DriveUnavailable("Google Drive isn't connected on the server.");
  if (!client) {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    client = google.drive({ version: "v3", auth });
  }
  return client;
}

/** Drive errors in words, without echoing file IDs or Google's internal messages. */
export function driveError(e: unknown): string {
  if (e instanceof DriveUnavailable) return e.message;
  const code = (e as { code?: number })?.code;
  if (code === 404 || code === 403) return "The Company OS service account can't reach that Drive folder or file. A founder needs to share it with the service account.";
  return "Google Drive didn't respond. Try again in a moment.";
}

export interface DriveTemplate { id: string; name: string; mimeType: string; description: string | null; modifiedTime: string | null }

export async function listTemplates(): Promise<DriveTemplate[]> {
  const res = await drive().files.list({
    q: `'${MASTER_TEMPLATES_FOLDER}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: "files(id, name, mimeType, description, modifiedTime)", orderBy: "name", pageSize: 200,
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  return (res.data.files ?? []).map((f) => ({ id: f.id!, name: f.name!, mimeType: f.mimeType!, description: f.description ?? null, modifiedTime: f.modifiedTime ?? null }));
}

export interface DriveFileInfo { id: string; webViewLink: string; mimeType: string; modifiedTime: string | null }

export async function copyTemplate(templateId: string, name: string, folderId: string): Promise<DriveFileInfo> {
  // Only files that really are in the Master Templates folder can be copied.
  const meta = await drive().files.get({ fileId: templateId, fields: "id, parents, trashed", supportsAllDrives: true });
  if (meta.data.trashed || !(meta.data.parents ?? []).includes(MASTER_TEMPLATES_FOLDER)) throw new Error("not-a-template");
  const res = await drive().files.copy({
    fileId: templateId, supportsAllDrives: true, fields: "id, webViewLink, mimeType, modifiedTime",
    requestBody: { name, parents: [folderId] },
  });
  return { id: res.data.id!, webViewLink: res.data.webViewLink!, mimeType: res.data.mimeType!, modifiedTime: res.data.modifiedTime ?? null };
}

export async function uploadFile(name: string, mimeType: string, body: NodeJS.ReadableStream, folderId: string): Promise<DriveFileInfo> {
  const res = await drive().files.create({
    supportsAllDrives: true, fields: "id, webViewLink, mimeType, modifiedTime",
    requestBody: { name, parents: [folderId] }, media: { mimeType, body },
  });
  return { id: res.data.id!, webViewLink: res.data.webViewLink!, mimeType: res.data.mimeType!, modifiedTime: res.data.modifiedTime ?? null };
}

export interface DriftFinding { code: string; message: string; severity: "high" | "medium" | "low" }

/**
 * Reads a file's sharing and location and compares them with what its Company OS sensitivity expects. Reports only;
 * fixing a finding is done by a person in Drive (Company OS never changes Drive sharing).
 */
export async function checkDrift(fileId: string, sensitivity: string, expectedFolder: string | null, knownAccounts: Set<string>): Promise<{ findings: DriftFinding[]; modifiedTime: string | null; parents: string[] }> {
  const meta = await drive().files.get({ fileId, supportsAllDrives: true, fields: "id, parents, trashed, modifiedTime, permissions(id, type, role, domain, emailAddress), writersCanShare" });
  const findings: DriftFinding[] = [];
  const perms = meta.data.permissions ?? [];
  if (meta.data.trashed) findings.push({ code: "trashed", message: "The file is in the Drive trash.", severity: "high" });
  const anyone = perms.filter((p) => p.type === "anyone");
  const domain = perms.filter((p) => p.type === "domain");
  if (anyone.length) {
    const editable = anyone.some((p) => p.role === "writer" || p.role === "fileOrganizer");
    findings.push({
      code: "public_link", severity: sensitivity === "Internal" && !editable ? "medium" : "high",
      message: `Anyone with the link can ${editable ? "edit" : anyone.some((p) => p.role === "commenter") ? "comment on" : "view"} this file.`,
    });
  }
  if (domain.length && sensitivity !== "Internal") findings.push({ code: "domain_shared", severity: "medium", message: `Shared with everyone in ${domain.map((d) => d.domain).join(", ")}.` });
  // People with access who are not on the Company OS registry (the file owner and service accounts aside).
  const unknown = perms.filter((p) => (p.type === "user" || p.type === "group") && p.role !== "owner" && p.emailAddress
    && !knownAccounts.has(p.emailAddress.toLowerCase()) && !/gserviceaccount\.com$/i.test(p.emailAddress));
  if (unknown.length && sensitivity !== "Internal") findings.push({ code: "unregistered_people", severity: sensitivity === "Restricted" ? "high" : "medium", message: `${unknown.length} account(s) that aren't on the Company OS registry can open this ${sensitivity} file.` });
  if (meta.data.writersCanShare && sensitivity !== "Internal") findings.push({ code: "editors_can_share", severity: "low", message: "Editors can re-share this file." });
  if (expectedFolder && !(meta.data.parents ?? []).includes(expectedFolder)) findings.push({ code: "outside_route", severity: "medium", message: "The file isn't in the folder its company, division and sensitivity route to." });
  return { findings, modifiedTime: meta.data.modifiedTime ?? null, parents: meta.data.parents ?? [] };
}

export function driveIdFromUrl(url: string): string | null {
  const m = url.match(/\/d\/([A-Za-z0-9_-]{20,})/) ?? url.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

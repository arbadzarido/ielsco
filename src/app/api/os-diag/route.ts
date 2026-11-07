// THROWAWAY DIAGNOSTIC (branch diag/os-integrations, never merged). Runs only on a Vercel preview deployment and only
// with a token whose SHA-256 matches below. Reports booleans, names, counts and error reasons; never secrets.
import { createHash, createPrivateKey } from "node:crypto";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { systemPrompt, AGENTS } from "@/lib/os/ai-core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const HASH = "dd7e6734b7ed9237bcb8df9e52e43bf60366888095bc6f68cd464ab5e899740e";
const MT = "1deyBzqGI5e1zj1cl3smndFDfqWPbWcz1";
const errInfo = (e: unknown) => { const x = e as { code?: number; errors?: { reason?: string; message?: string }[]; message?: string; status?: number }; return { code: x?.code ?? x?.status ?? null, reason: x?.errors?.[0]?.reason ?? null, message: String(x?.errors?.[0]?.message ?? x?.message ?? e).slice(0, 300) }; };

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (process.env.VERCEL_ENV !== "preview" || createHash("sha256").update(u.searchParams.get("t") ?? "").digest("hex") !== HASH) return new Response("Not found", { status: 404 });
  const part = u.searchParams.get("part") ?? "env";
  const out: Record<string, unknown> = { part, vercel_env: process.env.VERCEL_ENV, sha: process.env.VERCEL_GIT_COMMIT_SHA };
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const key = rawKey.replace(/\\n/g, "\n");
  if (part === "env") {
    out.env = { GOOGLE_CLIENT_EMAIL: Boolean(process.env.GOOGLE_CLIENT_EMAIL), sa_domain: (process.env.GOOGLE_CLIENT_EMAIL ?? "").split("@")[1] ?? null,
      GOOGLE_PRIVATE_KEY: Boolean(rawKey), key_has_literal_backslash_n: rawKey.includes("\\n"), key_has_real_newlines: rawKey.includes("\n"), key_starts_quoted: /^["']/.test(rawKey.trim()),
      key_begin_marker: key.includes("-----BEGIN PRIVATE KEY-----"), GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY), SERVICE_ROLE: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) };
    try { createPrivateKey(key); out.key_parses = true; } catch (e) { out.key_parses = false; out.key_error = String((e as Error).message).slice(0, 120); }
  }
  if (part === "drive" || part === "drive-write") {
    const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: key }, scopes: ["https://www.googleapis.com/auth/drive"] });
    const d = google.drive({ version: "v3", auth });
    try { const t = await auth.getAccessToken(); out.auth = Boolean(t); } catch (e) { out.auth = false; out.auth_error = errInfo(e); return Response.json(out); }
    try { const a = await d.about.get({ fields: "user(emailAddress), storageQuota" }); out.about = { sa: a.data.user?.emailAddress?.split("@")[1], quota: a.data.storageQuota }; } catch (e) { out.about_error = errInfo(e); }
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data: routes, error } = await db.from("os_folder_routes").select("drive_folder_id, folder_name, company_code, sensitivity, status");
    if (error) out.routes_error = error.message;
    const ids = Array.from(new Set([MT, ...(routes ?? []).map((r) => r.drive_folder_id)]));
    out.folders = [];
    for (const id of ids) {
      try {
        const f = await d.files.get({ fileId: id, supportsAllDrives: true, fields: "id, name, mimeType, driveId, trashed, owners(emailAddress), capabilities(canAddChildren, canListChildren, canEdit)" });
        let perms: number | string = "-";
        try { const p = await d.permissions.list({ fileId: id, supportsAllDrives: true, fields: "permissions(type, role)" }); perms = p.data.permissions?.length ?? 0; } catch (e) { perms = "error " + errInfo(e).reason; }
        (out.folders as unknown[]).push({ id: id.slice(0, 6) + "…", name: f.data.name, folder: f.data.mimeType === "application/vnd.google-apps.folder", shared_drive: Boolean(f.data.driveId), owner_domain: f.data.owners?.[0]?.emailAddress?.split("@")[1] ?? null, trashed: f.data.trashed, can_add: f.data.capabilities?.canAddChildren, can_list: f.data.capabilities?.canListChildren, permissions: perms });
      } catch (e) { (out.folders as unknown[]).push({ id: id.slice(0, 6) + "…", error: errInfo(e) }); }
    }
    try {
      const l = await d.files.list({ q: `'${MT}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`, fields: "files(id, name, mimeType)", pageSize: 200, supportsAllDrives: true, includeItemsFromAllDrives: true });
      out.templates = (l.data.files ?? []).map((f) => ({ name: f.name, mime: f.mimeType }));
      if (part === "drive-write") {
        const target = u.searchParams.get("folder") ?? "";
        const created: string[] = [];
        const tpl = l.data.files?.[0];
        if (tpl) {
          try { const c = await d.files.copy({ fileId: tpl.id!, supportsAllDrives: true, fields: "id, owners(emailAddress)", requestBody: { name: "[Company OS integration test] safe to delete", parents: [target] } }); created.push(c.data.id!); out.copy = { ok: true, owner_domain: c.data.owners?.[0]?.emailAddress?.split("@")[1] }; } catch (e) { out.copy = { ok: false, ...errInfo(e) }; }
        }
        try { const c = await d.files.create({ supportsAllDrives: true, fields: "id, owners(emailAddress)", requestBody: { name: "[Company OS integration test] safe to delete.txt", parents: [target] }, media: { mimeType: "text/plain", body: Readable.from(["Company OS upload test. Safe to delete."]) } }); created.push(c.data.id!); out.upload = { ok: true, owner_domain: c.data.owners?.[0]?.emailAddress?.split("@")[1] }; } catch (e) { out.upload = { ok: false, ...errInfo(e) }; }
        out.cleanup = [];
        for (const id of created) { try { await d.files.update({ fileId: id, supportsAllDrives: true, requestBody: { trashed: true } }); (out.cleanup as unknown[]).push("trashed"); } catch (e) { (out.cleanup as unknown[]).push(errInfo(e)); } }
      }
    } catch (e) { out.templates_error = errInfo(e); }
  }
  if (part === "gemini") {
    const g = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    out.calls = [];
    const data = "DATA:\n[tasks] TSK-0001 | Prepare GIF 2027 sponsor list | owner PPL-0001 | due 2026-11-20 | In Progress\n[kpis] KPI-0001 | Weekly active learners | No approved target";
    const qs: Record<string, string> = { assistant: "What is on my plate this month?", operations: "Which tasks are at risk?", partnerships: "Who should we follow up with this week?", growth: "Suggest one campaign idea based on our KPIs." };
    for (const model of ["gemini-3.1-flash-lite", "gemini-3-flash-preview"]) {
      for (const agent of Object.keys(AGENTS) as (keyof typeof AGENTS)[]) {
        if (model === "gemini-3-flash-preview" && agent !== "operations") continue;
        const t0 = Date.now();
        try {
          const m = g.getGenerativeModel({ model, systemInstruction: systemPrompt(agent), generationConfig: { maxOutputTokens: 800, temperature: 0.3 } });
          const r = await m.generateContent({ contents: [{ role: "user", parts: [{ text: data + "\n\nQUESTION: " + qs[agent] }] }] });
          (out.calls as unknown[]).push({ model, agent, ms: Date.now() - t0, finish: r.response.candidates?.[0]?.finishReason, usage: r.response.usageMetadata, reply: r.response.text().slice(0, 400) });
        } catch (e) { (out.calls as unknown[]).push({ model, agent, ms: Date.now() - t0, error: errInfo(e) }); }
      }
    }
  }
  return Response.json(out);
}

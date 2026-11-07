// THROWAWAY DIAGNOSTIC (branch diag/os-integrations, never merged). Read-only profile of the Operations Master for
// the import preview. Reads the sheet with the service account and the production os_* IDs with the service role.
// Writes nothing anywhere.
import { createHash } from "node:crypto";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { normalizePrivateKey } from "@/lib/os/pem";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const HASH = "dd7e6734b7ed9237bcb8df9e52e43bf60366888095bc6f68cd464ab5e899740e";
const SHEET = "1squ61BolAnFuisz1d5y3mKQe8-DYN7Vc_BkEMT-qbUc";
const TABS = ["Projects", "Tasks", "Documents", "Decisions", "Opportunities", "Meetings", "People", "Divisions"];

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (process.env.VERCEL_ENV !== "preview" || createHash("sha256").update(u.searchParams.get("t") ?? "").digest("hex") !== HASH) return new Response("Not found", { status: 404 });
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_CLIENT_EMAIL, private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY) }, scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
  const sheets = google.sheets({ version: "v4", auth });
  const tab = u.searchParams.get("tab");
  const cols = (u.searchParams.get("cols") ?? "").split(",").filter(Boolean);
  try {
    const r = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SHEET, ranges: TABS.map((t) => `${t}!A1:AZ1000`) });
    const data: Record<string, { headers: string[]; rows: Record<string, string>[] }> = {};
    r.data.valueRanges?.forEach((vr, i) => {
      const v = (vr.values ?? []) as string[][];
      const headers = (v[0] ?? []).map((h) => String(h).trim());
      const rows = v.slice(1).filter((row) => row.some((c) => String(c ?? "").trim())).map((row) => Object.fromEntries(headers.map((h, j) => [h, String(row[j] ?? "").trim()])));
      data[TABS[i]] = { headers, rows };
    });
    if (tab) {
      const t = data[tab];
      return Response.json({ tab, rows: t.rows.map((row) => cols.length ? cols.map((c) => (row[c] ?? "").slice(0, 160)) : row) });
    }
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const prod: Record<string, unknown> = {};
    for (const t of ["os_people", "os_divisions", "os_companies"]) {
      const { data: d, error } = await db.from(t).select(t === "os_companies" ? "code" : "id");
      prod[t] = error ? `error: ${error.message}` : (d ?? []).map((x: Record<string, string>) => x.id ?? x.code);
    }
    for (const t of ["os_projects", "os_tasks", "os_documents", "os_decisions", "os_meetings", "os_partnerships"]) {
      const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
      prod[t] = error ? `missing (${error.code ?? error.message})` : count;
    }
    const profile = Object.fromEntries(Object.entries(data).map(([name, t]) => {
      const idCol = t.headers[0];
      const ids = t.rows.map((x) => x[idCol]);
      const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
      const distinct: Record<string, string[]> = {};
      for (const h of t.headers) {
        const vals = Array.from(new Set(t.rows.map((x) => x[h]).filter(Boolean)));
        if (vals.length <= 14 && vals.every((v) => v.length <= 60)) distinct[h] = vals;
      }
      return [name, { rows: t.rows.length, headers: t.headers, idCol, firstId: ids[0], lastId: ids[ids.length - 1], blankIds: ids.filter((x) => !x).length, dupes, distinct }];
    }));
    const sheetIds = new Set(Object.values(data).flatMap((t) => t.rows.map((x) => x[t.headers[0]])));
    const prodPeople = new Set(Array.isArray(prod.os_people) ? (prod.os_people as string[]) : []);
    const refs: Record<string, { missing_everywhere: string[]; people_not_in_prod: string[] }> = {};
    for (const [name, t] of Object.entries(data)) {
      const missing = new Set<string>(); const notProd = new Set<string>();
      for (const row of t.rows) for (const [h, val] of Object.entries(row)) {
        if (h === t.headers[0]) continue;
        for (const m of val.matchAll(/\b(PPL|PRJ|TSK|DOC|DIV|OPP|MTG|OD|DEC)-\d{2,4}\b/g)) {
          if (!sheetIds.has(m[0])) missing.add(`${m[0]} (${h})`);
          if (m[1] === "PPL" && !prodPeople.has(m[0])) notProd.add(m[0]);
        }
      }
      refs[name] = { missing_everywhere: Array.from(missing).slice(0, 40), people_not_in_prod: Array.from(notProd) };
    }
    return Response.json({ prod, profile, refs });
  } catch (e) {
    const x = e as { code?: number; errors?: { reason?: string; message?: string }[]; message?: string };
    return Response.json({ error: { code: x.code ?? null, reason: x.errors?.[0]?.reason ?? null, message: String(x.errors?.[0]?.message ?? x.message).slice(0, 300) } });
  }
}

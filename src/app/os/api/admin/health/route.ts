import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { driveConfigured, driveError, listTemplates } from "@/lib/os/drive";
import { aiConfigured } from "@/lib/os/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Integration health for founders: which server-side integrations are configured and answering. Reports only
// yes/no and a plain message; never a key, an ID or an upstream error text.
export async function GET() {
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
    try { const t = await listTemplates(); checks.push({ key: "drive", label: "Google Drive", ok: true, detail: `Connected. ${t.length} master template${t.length === 1 ? "" : "s"} readable.` }); }
    catch (e) { checks.push({ key: "drive", label: "Google Drive", ok: false, detail: driveError(e) }); }
  } else checks.push({ key: "drive", label: "Google Drive", ok: false, detail: "The service account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) isn't set." });

  checks.push({ key: "ai", label: "AI agents (Gemini)", ok: aiConfigured(), detail: aiConfigured() ? "API key set. Spending is capped in the database." : "GEMINI_API_KEY isn't set; the agents show as unavailable." });
  const mail = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  checks.push({ key: "email", label: "Email alerts", ok: mail, detail: mail ? "New-device alerts can be sent." : "RESEND_API_KEY or EMAIL_FROM isn't set; new-device alerts are skipped." });
  return NextResponse.json({ checks, at: new Date().toISOString() });
}

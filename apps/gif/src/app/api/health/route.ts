import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { paymentsState } from "@/lib/payments/gateway";

// Uptime/monitoring probe. Reports which subsystems are configured; never values.
export const dynamic = "force-dynamic";

export async function GET() {
  let db = false, cohort: string | null = null;
  try { const r = await one<{ id: string }>("select id from gif.cohorts where is_current"); db = true; cohort = r?.id ?? null; } catch { db = false; }
  const pay = paymentsState();
  const body = {
    ok: db && !!cohort,
    db, cohort,
    payments: pay.ready ? { ready: true, env: pay.env } : { ready: false, reason: pay.reason },
    email: !!(process.env.RESEND_API_KEY && process.env.GIF_EMAIL_FROM),
    storage: process.env.GIF_STORAGE_DRIVER === "local" ? "local" : (process.env.GIF_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? "supabase" : "unconfigured",
    cron: !!process.env.CRON_SECRET,
  };
  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

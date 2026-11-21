import { NextResponse } from "next/server";
import { one, dbErrorKind, dbErrorCode, dbTlsMode, logDbError, type DbErrorKind } from "@/lib/db";
import { paymentsState } from "@/lib/payments/gateway";

// Uptime/monitoring probe. Reports which subsystems are configured; never values.
export const dynamic = "force-dynamic";

export async function GET() {
  let db = false, cohort: string | null = null, dbError: DbErrorKind | undefined, dbCode: string | undefined;
  try { const r = await one<{ id: string }>("select id from gif.cohorts where is_current"); db = true; cohort = r?.id ?? null; }
  catch (e) { db = false; dbError = dbErrorKind(e); dbCode = dbErrorCode(e); logDbError("health", e); }
  const pay = paymentsState();
  const body = {
    ok: db && !!cohort,
    db, ...(dbError ? { db_error: dbError, db_error_code: dbCode ?? null } : {}), db_tls: dbTlsMode(), cohort,
    payments: pay.ready ? { ready: true, env: pay.env } : { ready: false, reason: pay.reason },
    email: !!(process.env.RESEND_API_KEY && process.env.GIF_EMAIL_FROM),
    storage: process.env.GIF_STORAGE_DRIVER === "local" ? "local" : (process.env.GIF_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? "supabase" : "unconfigured",
    cron: !!process.env.CRON_SECRET,
  };
  return NextResponse.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

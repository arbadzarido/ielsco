import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dailyJob } from "@/lib/ielscourse/payments";

export const dynamic = "force-dynamic";

// Vercel Cron (vercel.json): reconcile open IELScourse orders with Midtrans, expire abandoned ones, renewal reminders.
// Vercel sends Authorization: Bearer $CRON_SECRET. Without CRON_SECRET set the job refuses to run.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (secret.length < 16 || given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const out = await dailyJob();
    console.info(`[ielscourse] daily job ${JSON.stringify(out)}`);
    return NextResponse.json(out);
  } catch (e) {
    console.error("[ielscourse] daily job", (e as Error).message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

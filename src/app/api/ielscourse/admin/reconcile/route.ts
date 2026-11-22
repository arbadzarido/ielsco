import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/membership/server";
import { dailyJob, isAdmin } from "@/lib/ielscourse/payments";
import { isSameSiteRequest } from "@/lib/integrations/elco";

export const dynamic = "force-dynamic";

// Admin "Re-check pending payments": asks Midtrans for every open order, expires abandoned ones, sends renewal notices.
export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await sessionUser();
  if (!user || !(await isAdmin(user))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await dailyJob(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[ielscourse] admin reconcile", (e as Error).message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireOsPerson } from "@/lib/os/api";
import { calendarConfigured, calendarConnection } from "@/lib/os/gcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in person's own calendar connection: whether it exists and which Google account. Never a token.
export async function GET() {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const c = calendarConfigured() ? await calendarConnection(auth.personId) : null;
  return NextResponse.json({ configured: calendarConfigured(), connected: Boolean(c), email: c?.google_email ?? null, timezone: c?.timezone ?? null, problem: c?.last_error ?? null });
}

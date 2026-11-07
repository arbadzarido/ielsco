import { NextResponse } from "next/server";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { calendarConnection, disconnectCalendar } from "@/lib/os/gcal";
import { osServiceClient } from "@/lib/os/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Revoke and forget the signed-in person's own calendar connection. Events already in Google stay there; OS events
// keep their content and show as no longer syncing.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Not allowed.", 403);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const c = await calendarConnection(auth.personId);
  await disconnectCalendar(auth.personId);
  if (c) await osServiceClient()?.from("os_audit_log").insert({ actor_person_id: auth.personId, action: "calendar.disconnected", target_type: "os_calendar_connections", target_id: auth.personId, detail: { google_email: c.google_email } });
  return NextResponse.json({ ok: true });
}

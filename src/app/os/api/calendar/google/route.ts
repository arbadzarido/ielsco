import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { calendarErrorText, CalendarError, listGoogleEvents } from "@/lib/os/gcal";
import { fromGoogleEvent } from "@/lib/os/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in person's Google events for a window, read live and shown only to them. Events that Company OS pushed
// (they carry an osEventId) are returned as links to the OS event, so the calendar shows each event once.
export async function GET(req: Request) {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const u = new URL(req.url);
  const from = u.searchParams.get("from") ?? "", to = u.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(to) || Date.parse(to) - Date.parse(from) > 70 * 86400000 || Date.parse(to) <= Date.parse(from)) return jsonError("Choose a window of up to 10 weeks.");
  try {
    const items = await listGoogleEvents(auth.personId, new Date(from).toISOString(), new Date(to).toISOString());
    const events = items.map((g) => {
      const m = fromGoogleEvent(g);
      return m && { id: g.id, ...m, html_link: g.htmlLink ?? null, os_event_id: g.extendedProperties?.private?.osEventId ?? null };
    }).filter(Boolean);
    return NextResponse.json({ events });
  } catch (e) {
    const status = e instanceof CalendarError && e.kind === "not_connected" ? 409 : 502;
    return NextResponse.json({ error: calendarErrorText(e), reconnect: e instanceof CalendarError && (e.kind === "expired" || e.kind === "denied") }, { status });
  }
}

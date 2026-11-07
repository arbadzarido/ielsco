import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { calendarErrorText, CalendarError, deleteGoogleEvent, findByOsId, getGoogleEvent, insertGoogleEvent, patchGoogleEvent } from "@/lib/os/gcal";
import { fromGoogleEvent, toGoogleEvent, type GoogleEventLike } from "@/lib/os/calendar";
import { OS_ORIGIN } from "@/lib/os/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sync one OS event with the signed-in person's Google Calendar. Nothing here overwrites a Google event that changed
// in Google since the last sync: every update and delete sends Google's etag (If-Match), and a mismatch stops with a
// conflict for the person to resolve (keep the OS version, keep Google's, or unlink).
//   push         create in Google (or relink the copy an earlier push made), or update it if unchanged in Google
//   keep_os      resolve a conflict by sending the OS version to Google (explicit choice)
//   keep_google  resolve a conflict by copying Google's version into the OS event
//   unlink       stop syncing; the Google event stays as it is
//   delete       delete the OS event; with remove_from_google, also the Google copy (only if unchanged in Google)
const Body = z.object({ event_id: z.string().regex(/^EV-[0-9]{4,}$/), action: z.enum(["push", "keep_os", "keep_google", "unlink", "delete"]), remove_from_google: z.boolean().optional() });
const COLS = "id, company_code, title, description, starts_at, ends_at, all_day, timezone, location, meeting_url, status, google_synced_by, google_event_id, google_etag, sync_state";
type Ev = { id: string; company_code: string; title: string; description: string | null; starts_at: string; ends_at: string; all_day: boolean; timezone: string; location: string | null; meeting_url: string | null; status: string; google_synced_by: string | null; google_event_id: string | null; google_etag: string | null; sync_state: string };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Not allowed.", 403);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Bad request.");
  const { event_id, action } = parsed.data;
  const service = osServiceClient();
  if (!service) return jsonError("Not available on this deployment.", 503);

  // Read and permission-check as the person (RLS), never with the service role.
  const { data: ev } = await auth.supabase.from("os_events").select(COLS).eq("id", event_id).maybeSingle<Ev>();
  if (!ev) return jsonError("Not found.", 404);
  const me = auth.personId;
  const link = (g: GoogleEventLike) => service.from("os_events").update({ google_synced_by: me, google_calendar_id: "primary", google_event_id: g.id, google_etag: g.etag ?? null, google_synced_at: new Date().toISOString(), sync_state: "synced", sync_error: null }).eq("id", ev.id);
  const mark = (state: string, err: string | null) => service.from("os_events").update({ sync_state: state, sync_error: err }).eq("id", ev.id);

  if (action === "delete") {
    const { data: gone } = await auth.supabase.from("os_events").delete().eq("id", ev.id).select("id");
    if (!gone?.length) return jsonError("You can't delete this event.", 403);
    let google: "removed" | "kept" | "changed" | "not_linked" | "failed" = "not_linked";
    if (parsed.data.remove_from_google && ev.google_event_id) {
      if (ev.google_synced_by !== me) google = "kept";
      else try { await deleteGoogleEvent(me, ev.google_event_id, ev.google_etag ?? undefined); google = "removed"; }
      catch (e) { google = e instanceof CalendarError && e.kind === "gone" ? "removed" : e instanceof CalendarError && e.kind === "conflict" ? "changed" : "failed"; }
    } else if (ev.google_event_id) google = "kept";
    return NextResponse.json({ deleted: true, google });
  }

  const { data: canEdit } = await auth.supabase.rpc("os_can_edit_event", { p_id: ev.id });
  if (!canEdit) return jsonError("You can't change this event.", 403);
  if (ev.google_event_id && ev.google_synced_by !== me) return jsonError("This event is synced with another person's Google Calendar. Only they can sync it.", 403);

  try {
    if (action === "unlink") {
      await service.from("os_events").update({ google_synced_by: null, google_calendar_id: null, google_event_id: null, google_etag: null, google_synced_at: null, sync_state: "local", sync_error: null }).eq("id", ev.id);
      return NextResponse.json({ sync_state: "local" });
    }
    const body = toGoogleEvent(ev, `${OS_ORIGIN}/os/calendar?event=${ev.id}`);
    if (action === "push") {
      if (!ev.google_event_id) {
        // A copy from an earlier push (e.g. the link was lost) is reused, never duplicated.
        const existing = await findByOsId(me, ev.id);
        const g = existing ? await patchGoogleEvent(me, existing.id, body, existing.etag) : await insertGoogleEvent(me, body);
        await link(g);
        return NextResponse.json({ sync_state: "synced", google_event_id: g.id, relinked: Boolean(existing) });
      }
      const g = await patchGoogleEvent(me, ev.google_event_id, body, ev.google_etag ?? undefined);
      await link(g);
      return NextResponse.json({ sync_state: "synced" });
    }
    if (!ev.google_event_id) return jsonError("This event isn't in Google Calendar.", 409);
    const current = await getGoogleEvent(me, ev.google_event_id);
    if (action === "keep_os") {
      const g = await patchGoogleEvent(me, ev.google_event_id, body, current.etag);
      await link(g);
      return NextResponse.json({ sync_state: "synced" });
    }
    // keep_google: Google's title, times and place replace the OS ones, as an edit by this person (RLS applies).
    const m = fromGoogleEvent(current, ev.timezone);
    if (!m) return jsonError("Google's version of this event has no usable date.", 409);
    const { error } = await auth.supabase.from("os_events").update({ title: m.title.slice(0, 200), starts_at: m.starts_at, ends_at: m.ends_at, all_day: m.all_day, location: m.location }).eq("id", ev.id);
    if (error) return jsonError("You can't change this event.", 403);
    await link(current);
    return NextResponse.json({ sync_state: "synced" });
  } catch (e) {
    if (e instanceof CalendarError && e.kind === "conflict") {
      await mark("conflict", "Changed in Google Calendar since the last sync.");
      let google = null;
      try { const g = await getGoogleEvent(me, ev.google_event_id!); google = fromGoogleEvent(g, ev.timezone); } catch { /* shown without details */ }
      return NextResponse.json({ sync_state: "conflict", error: calendarErrorText(e), google }, { status: 409 });
    }
    if (e instanceof CalendarError && e.kind === "gone") {
      await mark("deleted_remote", "Deleted in Google Calendar.");
      return NextResponse.json({ sync_state: "deleted_remote", error: "This event was deleted in Google Calendar. Push it again to recreate it, or unlink it." }, { status: 410 });
    }
    await mark("error", calendarErrorText(e).slice(0, 200));
    return NextResponse.json({ sync_state: "error", error: calendarErrorText(e) }, { status: 502 });
  }
}

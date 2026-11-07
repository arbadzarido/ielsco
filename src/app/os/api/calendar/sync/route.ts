import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { calendarErrorText, CalendarError, deleteGoogleEvent, findByOsId, getGoogleEvent, insertGoogleEvent, patchGoogleEvent } from "@/lib/os/gcal";
import { fromGoogleEvent, toGoogleEvent, type GoogleEventLike } from "@/lib/os/calendar";
import { googleInstanceId, googleRecurrence, type ExceptionLike, type Recurrence } from "@/lib/os/recurrence";
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
//
// Recurring events go to Google as ONE recurring event (RRULE, with cancelled occurrences as EXDATE); occurrences
// changed in Company OS are then written to their Google instances, so Google never gets duplicates. Attendees are
// sent only when the event's "Send Google Calendar invitations" is on, as the individual people on the event (their
// registered work Google accounts; groups are already expanded), and Google's answers (RSVP) are read back.
const Body = z.object({ event_id: z.string().regex(/^EV-[0-9]{4,}$/), action: z.enum(["push", "keep_os", "keep_google", "unlink", "delete"]), remove_from_google: z.boolean().optional() });
const COLS = "id, company_code, title, description, starts_at, ends_at, all_day, timezone, location, meeting_url, status, google_synced_by, google_event_id, google_etag, sync_state, recurrence, google_invites";
type Ev = { id: string; company_code: string; title: string; description: string | null; starts_at: string; ends_at: string; all_day: boolean; timezone: string; location: string | null; meeting_url: string | null; status: string; google_synced_by: string | null; google_event_id: string | null; google_etag: string | null; sync_state: string; recurrence: Recurrence | null; google_invites: boolean };

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
    // Exceptions and attendees are read as the person (RLS), like the event.
    const [exq, atq] = await Promise.all([
      ev.recurrence ? auth.supabase.from("os_event_exceptions").select("occurrence_start, cancelled, title, description, starts_at, ends_at, location, meeting_url").eq("event_id", ev.id) : Promise.resolve({ data: [] }),
      ev.google_invites ? auth.supabase.from("os_event_attendees").select("person_id, os_people(google_account)").eq("event_id", ev.id) : Promise.resolve({ data: [] }),
    ]);
    const exceptions = (exq.data ?? []) as ExceptionLike[];
    const invitees = ((atq.data ?? []) as unknown as { person_id: string; os_people: { google_account: string | null } | null }[])
      .map((a) => ({ person_id: a.person_id, email: a.os_people?.google_account?.trim().toLowerCase() || null }));
    const emails = invitees.filter((i) => i.email && /^[^@\s]+@[^@\s]+$/.test(i.email));
    const body = {
      ...toGoogleEvent(ev, `${OS_ORIGIN}/os/calendar?event=${ev.id}`),
      ...(ev.recurrence ? { recurrence: googleRecurrence(ev, exceptions) } : {}),
      ...(ev.google_invites ? { attendees: emails.map((i) => ({ email: i.email })) } : {}),
    };
    const updates = ev.google_invites ? "all" as const : "none" as const;
    // After the master is written: changed occurrences to their instances, and attendees' answers back to the OS.
    const after = async (g: GoogleEventLike) => {
      let instanceErrors = 0;
      for (const x of exceptions.filter((x) => !x.cancelled && (x.starts_at || x.title || x.location || x.description))) {
        const tz = ev.timezone;
        const start = x.starts_at ?? x.occurrence_start, end = x.ends_at ?? new Date(Date.parse(x.occurrence_start) + Date.parse(ev.ends_at) - Date.parse(ev.starts_at)).toISOString();
        const part = toGoogleEvent({ ...ev, title: x.title ?? ev.title, description: x.description ?? ev.description, location: x.location ?? ev.location, meeting_url: x.meeting_url ?? ev.meeting_url, starts_at: start, ends_at: end }, `${OS_ORIGIN}/os/calendar?event=${ev.id}`);
        try { await patchGoogleEvent(me, googleInstanceId(g.id, x.occurrence_start, ev.all_day, tz), { summary: part.summary, description: part.description, location: part.location, start: part.start, end: part.end }, undefined, updates); }
        catch { instanceErrors++; }
      }
      if (ev.google_invites && g.attendees?.length) {
        for (const a of g.attendees) {
          const who = emails.find((i) => i.email === a.email?.toLowerCase());
          if (who && a.responseStatus && ["accepted", "declined", "tentative", "needsAction"].includes(a.responseStatus))
            await service.from("os_event_attendees").update({ response_status: a.responseStatus }).eq("event_id", ev.id).eq("person_id", who.person_id);
        }
      }
      return { instance_errors: instanceErrors, invited: ev.google_invites ? emails.length : 0, without_google_account: ev.google_invites ? invitees.length - emails.length : 0 };
    };
    if (action === "push") {
      if (!ev.google_event_id) {
        // A copy from an earlier push (e.g. the link was lost) is reused, never duplicated.
        const existing = await findByOsId(me, ev.id);
        const g = existing ? await patchGoogleEvent(me, existing.id, body, existing.etag, updates) : await insertGoogleEvent(me, body, updates);
        await link(g);
        return NextResponse.json({ sync_state: "synced", google_event_id: g.id, relinked: Boolean(existing), ...(await after(g)) });
      }
      const g = await patchGoogleEvent(me, ev.google_event_id, body, ev.google_etag ?? undefined, updates);
      await link(g);
      return NextResponse.json({ sync_state: "synced", ...(await after(g)) });
    }
    if (!ev.google_event_id) return jsonError("This event isn't in Google Calendar.", 409);
    const current = await getGoogleEvent(me, ev.google_event_id);
    if (action === "keep_os") {
      const g = await patchGoogleEvent(me, ev.google_event_id, body, current.etag, updates);
      await link(g);
      return NextResponse.json({ sync_state: "synced", ...(await after(g)) });
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

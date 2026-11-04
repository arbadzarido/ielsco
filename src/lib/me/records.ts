// The signed-in member's own records across IELSco, read with their own session (owner-only RLS / auth.uid() RPCs).
// One loader feeds Home, Events (My upcoming events), the Notifications Center and the Elco-Pass journey, so the
// same facts are shown everywhere. Every source is optional: a missing table or a failed query drops that source and
// is reported in `gaps`, never replaced with invented data.

import type { SupabaseClient } from "@supabase/supabase-js";
import { eventsData } from "@/data/events";
import { CIRCLE_ACTIVITIES, CIRCLE_COHORT } from "@/data/dashboard/circle";
import { connectApi, circlesApi, isUnavailable } from "@/lib/connect/api";
import { isMissingRelation } from "@/lib/dashboard/profile";
import { generateSlug } from "@/utils/slug";

export type ActivityKind = "ielsco_event" | "circle_cohort" | "circle_session" | "room" | "member_session";
export type ActivityStatus = "registered" | "attended" | "hosting" | "checked_in";

export interface MyActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  start: Date;
  /** Official events have a date but no time in the data: shown as all-day, never with an invented time. */
  allDay: boolean;
  timeZone: string;
  href: string;
  status: ActivityStatus;
  past: boolean;
  /** Official events only: the registration can be cancelled (not attended, not past). */
  cancellable?: boolean;
  eventId?: string;
}

export const KIND_LABEL: Record<ActivityKind, string> = {
  ielsco_event: "IELSco event",
  circle_cohort: "IELS Circle cohort",
  circle_session: "IELS Circle session",
  room: "Community event",
  member_session: "Member session",
};

export interface TrackedOpportunity {
  opportunity_id: string;
  status: string;
  personal_deadline: string | null;
  updated_at: string;
  created_at: string;
  opportunity: { slug: string; title: string; organizer: string; category: string; deadline: string | null } | null;
}

export interface ElcoSnapshot {
  linked: boolean;
  linked_at: string | null;
  level_estimate: string | null;
  focus_skills: string[];
  practice_count_30d: number;
  last_active_at: string | null;
  generated_at: string | null;
}

export interface MyRecords {
  activities: MyActivity[];
  tracked: TrackedOpportunity[];
  elco: ElcoSnapshot | null;
  circlesJoined: { id: string; name: string }[];
  connections: number;
  incomingIntros: number;
  unread: number;
  roomsHosted: number;
  bookmarks: number;
  gaps: string[];
}

// YYYY-M-D (not always zero-padded), no time: an all-day date.
export function parseEventDay(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, day || 1));
}
export const officialEventHref = (title: string) => `/events/${generateSlug(title)}`;

async function settle<T>(label: string, gaps: string[], fn: () => PromiseLike<T> | T, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // "Not switched on yet" (migration pending) is not an error worth showing; anything else is.
    if (!isUnavailable(e)) gaps.push(`${label}: ${(e as Error).message}`);
    return fallback;
  }
}

// A Supabase query result as a value, treating "table not there yet" as empty.
function rows<T>(label: string, res: { data: T[] | null; error: { code?: string; message: string } | null }): T[] {
  if (res.error && isMissingRelation(res.error)) return [];
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

export async function loadMyRecords(supabase: SupabaseClient, userId: string, now = new Date()): Promise<MyRecords> {
  const gaps: string[] = [];
  const today = parseEventDay(now.toISOString().slice(0, 10));

  const [regs, checkins, joinedRooms, hostedRooms, sessions, tracked, elco, circles, summary, bookmarks] = await Promise.all([
    settle("Event registrations", gaps, async () =>
      rows("event_registrations", await supabase.from("event_registrations").select("event_id, attended, created_at").eq("user_id", userId)), [] as { event_id: string; attended: boolean; created_at: string }[]),
    settle("Circle check-ins", gaps, async () =>
      rows("circle_session_checkins", await supabase.from("circle_session_checkins").select("session_start").order("session_start", { ascending: false }).limit(200)), [] as { session_start: string }[]),
    settle("Community events", gaps, () => connectApi.rooms(supabase, "joined", { past: true, limit: 50 }), []),
    settle("Hosted events", gaps, () => connectApi.rooms(supabase, "hosting", { past: true, limit: 50 }), []),
    settle("Member sessions", gaps, async () => {
      const { data, error } = await supabase.rpc("list_member_sessions", { p_limit: 50 });
      if (error && isMissingRelation(error)) return [];
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; title: string; starts_at: string; registered: boolean }[];
    }, []),
    // Two plain reads (rows, then their opportunities), the same as the tracker page.
    settle("Opportunity tracker", gaps, async () => {
      const tracked = rows("opportunity_tracker", await supabase.from("opportunity_tracker")
        .select("opportunity_id, status, personal_deadline, updated_at, created_at").order("updated_at", { ascending: false })) as Omit<TrackedOpportunity, "opportunity">[];
      if (!tracked.length) return [] as TrackedOpportunity[];
      const opps = rows("opportunities", await supabase.from("opportunities").select("id, slug, title, organizer, category, deadline")
        .in("id", tracked.map((t) => t.opportunity_id))) as ({ id: string } & NonNullable<TrackedOpportunity["opportunity"]>)[];
      const byId = new Map(opps.map((o) => [o.id, o]));
      return tracked.map((t) => {
        const o = byId.get(t.opportunity_id);
        return { ...t, opportunity: o ? { slug: o.slug, title: o.title, organizer: o.organizer, category: o.category, deadline: o.deadline } : null };
      });
    }, [] as TrackedOpportunity[]),
    settle("Elco AI", gaps, async () => {
      const [link, sum] = await Promise.all([
        supabase.from("elco_account_links").select("id, created_at").is("revoked_at", null).limit(1),
        supabase.from("elco_learning_summaries").select("level_estimate, focus_skills, practice_count_30d, last_active_at, generated_at").maybeSingle(),
      ]);
      if (link.error && isMissingRelation(link.error)) return null;
      if (link.error) throw new Error(link.error.message);
      const linked = (link.data ?? []).length > 0;
      const s = sum.error ? null : sum.data;
      return { linked, linked_at: link.data?.[0]?.created_at ?? null, level_estimate: s?.level_estimate ?? null, focus_skills: s?.focus_skills ?? [], practice_count_30d: s?.practice_count_30d ?? 0,
        last_active_at: s?.last_active_at ?? null, generated_at: s?.generated_at ?? null } as ElcoSnapshot;
    }, null),
    settle("Circle groups", gaps, () => circlesApi.list(supabase), []),
    settle("Connections", gaps, () => connectApi.summary(supabase), null),
    settle("Saved items", gaps, async () => {
      const { count, error } = await supabase.from("member_bookmarks").select("item_id", { count: "exact", head: true }).eq("user_id", userId);
      if (error && isMissingRelation(error)) return 0;
      if (error) throw new Error(error.message);
      return count ?? 0;
    }, 0),
  ]);

  const activities: MyActivity[] = [];
  for (const r of regs) {
    if (r.event_id === CIRCLE_COHORT.eventId) {
      const first = CIRCLE_ACTIVITIES[0], last = CIRCLE_ACTIVITIES[CIRCLE_ACTIVITIES.length - 1];
      activities.push({ id: `cohort-${r.event_id}`, kind: "circle_cohort", title: CIRCLE_COHORT.name, start: parseEventDay(first.start),
        allDay: true, timeZone: "UTC", href: "/dashboard/circle", status: r.attended ? "attended" : "registered", past: parseEventDay(last.end) < today, eventId: r.event_id });
      continue;
    }
    const e = eventsData.find((x) => x.id === r.event_id);
    if (!e) continue;
    const start = parseEventDay(e.startDate);
    const past = start < today;
    activities.push({ id: `event-${e.id}`, kind: "ielsco_event", title: e.title, start, allDay: true, timeZone: "UTC", href: officialEventHref(e.title),
      status: r.attended ? "attended" : "registered", past, cancellable: !past && !r.attended, eventId: e.id });
  }
  for (const c of checkins) {
    const start = new Date(c.session_start);
    activities.push({ id: `circle-${start.toISOString()}`, kind: "circle_session", title: "IELS Circle weekly session", start, allDay: false, timeZone: "Asia/Jakarta",
      href: "/dashboard/circle", status: "checked_in", past: start < now });
  }
  const seenRooms = new Set<string>();
  for (const room of [...hostedRooms, ...joinedRooms]) {
    if (seenRooms.has(room.id) || room.status === "cancelled") continue;
    seenRooms.add(room.id);
    activities.push({ id: `room-${room.id}`, kind: "room", title: room.title, start: new Date(room.starts_at), allDay: false, timeZone: room.timezone,
      href: `/dashboard/connect/rooms/${room.id}`, status: room.is_host ? "hosting" : "registered", past: new Date(room.ends_at) < now });
  }
  for (const s of sessions.filter((x) => x.registered)) {
    activities.push({ id: `session-${s.id}`, kind: "member_session", title: s.title, start: new Date(s.starts_at), allDay: false, timeZone: "Asia/Jakarta",
      href: "/dashboard/membership", status: "registered", past: new Date(s.starts_at) < now });
  }
  activities.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    activities,
    tracked,
    elco,
    circlesJoined: circles.filter((c) => c.is_member).map((c) => ({ id: c.id, name: c.name })),
    connections: summary?.connections ?? 0,
    incomingIntros: summary?.incoming ?? 0,
    unread: summary?.unread ?? 0,
    roomsHosted: hostedRooms.filter((r) => r.status !== "cancelled").length,
    bookmarks,
    gaps,
  };
}

// The cohort spans weeks; its weekly sessions are the dated items, so it's left out of "upcoming".
export const upcoming = (r: MyRecords) => r.activities.filter((a) => !a.past && a.kind !== "circle_cohort");
export const pastActivities = (r: MyRecords) => r.activities.filter((a) => a.past).reverse();

export function formatActivityWhen(a: MyActivity, locale = "en-GB") {
  if (a.allDay) return new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(a.start);
  const tz = a.timeZone === "Asia/Jakarta" ? " WIB" : "";
  return `${new Intl.DateTimeFormat(locale, { timeZone: a.timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(a.start)}${tz}`;
}

// Google Calendar link. All-day for official events (no time in the data); timed for everything else.
export function calendarHref(a: MyActivity, durationMin = 60) {
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dates = a.allDay ? `${ymd(a.start)}/${ymd(new Date(a.start.getTime() + 86_400_000))}` : `${stamp(a.start)}/${stamp(new Date(a.start.getTime() + durationMin * 60_000))}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.title)}&dates=${dates}&details=${encodeURIComponent(`IELSco: https://www.ielsco.com${a.href}`)}`;
}

// Elco-Pass "My Learning Journey": a dated, newest-first timeline built only from records that carry a date.
export interface JourneyEntry { id: string; at: Date; title: string; detail: string; href?: string; kind: "account" | "event" | "circle" | "opportunity" | "elco" | "community" }

const TRACKER_VERB: Record<string, string> = {
  saved: "Marked as interested", preparing: "Started applying", applied: "Applied", accepted: "Accepted", not_selected: "Not selected", withdrawn: "Withdrew",
};

export function buildJourney(r: MyRecords, account: { joinedAt?: string | null; goalsSetAt?: string | null }, now = new Date()): JourneyEntry[] {
  const out: JourneyEntry[] = [];
  if (account.joinedAt) out.push({ id: "joined", at: new Date(account.joinedAt), title: "Joined IELSco", detail: "Your Elco-Pass starts here.", kind: "account" });
  if (account.goalsSetAt) out.push({ id: "goals", at: new Date(account.goalsSetAt), title: "Set your goals", detail: "Direction, destination and interests.", href: "/dashboard/my-goals", kind: "account" });
  for (const a of r.activities) {
    if (a.start > now) continue;
    const circle = a.kind === "circle_session" || a.kind === "circle_cohort";
    const verb = a.status === "attended" ? "Attended" : a.status === "hosting" ? "Hosted" : a.status === "checked_in" ? "Checked in to" : "Registered for";
    out.push({ id: a.id, at: a.start, title: `${verb} ${a.title}`, detail: KIND_LABEL[a.kind], href: a.href, kind: circle ? "circle" : "event" });
  }
  for (const t of r.tracked) {
    out.push({ id: `tracker-${t.opportunity_id}`, at: new Date(t.updated_at), title: `${TRACKER_VERB[t.status] ?? "Tracked"}: ${t.opportunity?.title ?? "an opportunity"}`,
      detail: t.opportunity?.organizer ?? "Opportunity tracker", href: "/dashboard/opportunities", kind: "opportunity" });
  }
  if (r.elco?.linked_at) out.push({ id: "elco-linked", at: new Date(r.elco.linked_at), title: "Linked Elco AI", detail: "Practice progress now appears in your Elco-Pass.", href: "/dashboard/connect/elco", kind: "elco" });
  return out.filter((e) => !Number.isNaN(e.at.getTime())).sort((a, b) => b.at.getTime() - a.at.getTime());
}

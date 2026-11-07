"use client";

// Calendar: time scheduling. Shows Company OS events (one-off and recurring), tasks someone deliberately scheduled
// or pinned to the calendar, and, as optional layers, timeline milestones, my task deadlines, content publish dates,
// campaign periods and the person's own Google Calendar. Task deadlines and milestones are read from their own
// tables and never copied into events. Everything except Google is read with the person's own session (RLS decides).
//
// Workspaces narrow the same data: All, My calendar, a Project, Marketing (campaigns and content) and a Company.
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, Link2, Unlink } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory } from "@/components/os/data";
import { useChoice } from "@/components/os/dialogs";
import { EventSheet, EVENT_COLUMNS, askScope, syncEvent, type EventDefaults, type EventRow, type GoogleStatus, type OccurrenceRef } from "@/components/os/EventSheet";
import { Agenda, MonthGrid, TimeGrid, type Drop, type Item } from "@/components/os/calendar-views";
import { MarketingBoard } from "@/components/os/marketing-board";
import { ErrorLine, PageTitle, Select, btn, btnGhost, btnPrimary, muted, panel, ring } from "@/components/os/ui";
import { WORKSPACES } from "@/lib/os/meta";
import { CATEGORIES, CATEGORY_STYLE, DEFAULT_TZ, addDays, daysBetween, itemDays, minutesToTime, monthWeeks, weekday, zonedInstant, zonedParts } from "@/lib/os/calendar";
import { expandSeries, type ExceptionLike } from "@/lib/os/recurrence";
import { busyBlocks, findConflicts, linkWarnings, rescheduleReasons, type BusyRow } from "@/lib/os/conflicts";
import { moveEvent, type MoveScope } from "@/lib/os/event-moves";
import { cn } from "@/lib/utils";

const VIEWS = [{ key: "month", label: "Month" }, { key: "week", label: "Week" }, { key: "day", label: "Day" }, { key: "upcoming", label: "Upcoming" }] as const;
type View = (typeof VIEWS)[number]["key"];
const SPACES = [{ key: "all", label: "All" }, { key: "my", label: "My calendar" }, { key: "project", label: "Project" }, { key: "marketing", label: "Marketing" }, { key: "company", label: "Company" }] as const;
type Space = (typeof SPACES)[number]["key"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type TaskRow = { id: string; title: string; status: string; company_code: string; division_id: string | null; project_id: string | null; owner_person_id: string | null; due_date: string | null; scheduled_start: string | null; scheduled_end: string | null; on_calendar: boolean };
type MilestoneRow = { id: string; title: string; due_date: string; status: string; company_code: string; lead_division_id: string | null; is_major: boolean; workstream_name: string | null; project_id: string | null };
type ContentRow = { id: string; title: string; status: string; company_code: string; division_id: string | null; campaign_id: string | null; channel: string | null; publish_at: string | null; planned_publish_date: string | null; owner_person_id: string | null; creator_person_id: string | null; reviewer_person_id: string | null; related_project_id: string | null };
type CampaignRow = { id: string; name: string; status: string; company_code: string; division_id: string | null; start_date: string | null; end_date: string | null; project_id: string | null; owner_person_id: string | null };

export default function CalendarPage() { return <Suspense fallback={null}><Calendar /></Suspense>; }

function Calendar() {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const router = useRouter();
  const params = useSearchParams();
  const ask = useChoice();
  const today = zonedParts(new Date(), DEFAULT_TZ).date;
  const view: View = VIEWS.find((v) => v.key === params.get("view"))?.key ?? "month";
  const space: Space = SPACES.find((s) => s.key === params.get("ws"))?.key ?? "all";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.get("d") ?? "") ? params.get("d")! : today;
  const project = params.get("p") ?? "";
  const myCompanies = WORKSPACES.filter((w) => me.isAdmin || me.companies.includes(w.code) || w.code === "HQ");
  const company = params.get("c") ?? (space === "company" ? (me.companies[0] ?? "HQ") : "");
  const [division, setDivision] = useState("");
  const [category, setCategory] = useState("");
  const [layers, setLayers] = useState({ milestones: true, deadlines: false, google: true, content: true });
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gErr, setGErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [google, setGoogle] = useState<GoogleStatus>(null);
  const [sheet, setSheet] = useState<{ open: boolean; event: EventRow | null; occ?: OccurrenceRef | null; defaults?: EventDefaults }>({ open: false, event: null });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [tick, setTick] = useState(0);

  const nav = useCallback((patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) q.set(k, v); else q.delete(k); }
    q.delete("event");
    router.replace(`/os/calendar?${q.toString()}`, { scroll: false });
  }, [params, router]);
  const go = useCallback((v: View, d: string) => nav({ view: v, d }), [nav]);
  const [y, m] = anchor.split("-").map(Number);

  const range = useMemo(() => {
    if (view === "month") { const w = monthWeeks(y, m); return { from: w[0][0], to: w.at(-1)![6] }; }
    if (view === "week") { const s = addDays(anchor, -weekday(anchor)); return { from: s, to: addDays(s, 6) }; }
    if (view === "day") return { from: anchor, to: anchor };
    return { from: today, to: addDays(today, 41) };
  }, [view, anchor, y, m, today]);

  useEffect(() => {
    fetch("/os/api/calendar/status").then((r) => r.json()).then(setGoogle).catch(() => setGoogle({ configured: false, connected: false, email: null, timezone: null }));
    supabase.from("os_projects").select("id, name").not("status", "in", "(Completed,Cancelled)").order("name").limit(300).then(({ data }) => setProjects((data ?? []) as { id: string; name: string }[]));
  }, [supabase, tick]);

  useEffect(() => {
    let live = true;
    const from = zonedInstant(range.from, "00:00"), to = zonedInstant(addDays(range.to, 1), "00:00");
    const myId = me.person.id;
    const none = Promise.resolve({ data: [] as never[], error: null });
    (async () => {
      setErr(null);
      const [one, series, tk, dl, ml, ct, cp, mine] = await Promise.all([
        supabase.from("os_events").select(EVENT_COLUMNS).is("recurrence", null).lt("starts_at", to).gte("ends_at", from).order("starts_at").limit(800),
        supabase.from("os_events").select(EVENT_COLUMNS).not("recurrence", "is", null).lt("starts_at", to).or(`series_ends_at.is.null,series_ends_at.gt.${from}`).limit(300),
        supabase.from("os_tasks").select("id, title, status, company_code, division_id, project_id, owner_person_id, due_date, scheduled_start, scheduled_end, on_calendar")
          .or(`and(scheduled_start.lt.${to},scheduled_end.gt.${from}),and(on_calendar.eq.true,due_date.gte.${range.from},due_date.lte.${range.to})`).neq("status", "Cancelled").limit(500),
        layers.deadlines ? supabase.from("os_tasks").select("id, title, status, company_code, division_id, project_id, owner_person_id, due_date, scheduled_start, scheduled_end, on_calendar")
          .gte("due_date", range.from).lte("due_date", range.to).not("status", "in", "(Done,Cancelled)").limit(500) : none,
        layers.milestones ? supabase.from("os_timeline_items").select("id, title, due_date, status, company_code, lead_division_id, is_major, workstream_name, project_id").gte("due_date", range.from).lte("due_date", range.to).neq("status", "Cancelled").limit(300) : none,
        layers.content ? supabase.from("os_campaign_items").select("id, title, status, company_code, division_id, campaign_id, channel, publish_at, planned_publish_date, owner_person_id, creator_person_id, reviewer_person_id, related_project_id")
          .gte("planned_publish_date", range.from).lte("planned_publish_date", range.to).neq("status", "Cancelled").limit(500) : none,
        supabase.from("os_campaigns").select("id, name, status, company_code, division_id, start_date, end_date, project_id, owner_person_id").not("status", "in", "(Cancelled)").limit(300),
        Promise.all([supabase.from("os_event_attendees").select("event_id").eq("person_id", myId), supabase.from("os_task_assignees").select("task_id").eq("person_id", myId)]),
      ]);
      if (!live) return;
      if (one.error || series.error) { setErr("The calendar couldn't be loaded. Try again."); setItems([]); return; }
      const seriesRows = (series.data ?? []) as EventRow[];
      const ex = seriesRows.length ? await supabase.from("os_event_exceptions").select("event_id, occurrence_start, cancelled, title, description, starts_at, ends_at, location, meeting_url").in("event_id", seriesRows.map((s) => s.id)) : { data: [] };
      if (!live) return;
      const exBy = new Map<string, ExceptionLike[]>();
      for (const x of (ex.data ?? []) as (ExceptionLike & { event_id: string })[]) exBy.set(x.event_id, [...(exBy.get(x.event_id) ?? []), x]);
      const attending = new Set((mine[0].data ?? []).map((r) => r.event_id as string));
      const assigned = new Set((mine[1].data ?? []).map((r) => r.task_id as string));
      const cps = (cp.data ?? []) as CampaignRow[];
      setCampaigns(cps);
      const campProject = new Map(cps.map((c) => [c.id, c.project_id]));
      const out: Item[] = [];
      const osIds = new Set<string>();
      const pushEvent = (e: EventRow, occ: OccurrenceRef | null) => {
        const s = occ?.starts_at ?? e.starts_at, en = occ?.ends_at ?? e.ends_at;
        const d = itemDays(s, en, e.all_day, DEFAULT_TZ);
        const endP = zonedParts(en, DEFAULT_TZ);
        const t = occ?.exception?.title ?? e.title;
        const canMove = e.status !== "Cancelled";
        out.push({ key: occ ? `${e.id}@${occ.occurrence_start}` : e.id, title: e.status === "Cancelled" ? `Cancelled: ${t}` : t, first: d.first, last: d.last, allDay: e.all_day, startTime: d.startTime,
          endTime: !e.all_day && d.first === d.last ? (endP.date > d.first ? "24:00" : endP.time) : undefined, kind: e.category, source: "event", style: e.category, label: e.recurrence ? `${e.category}, repeats` : e.category,
          company: e.company_code, division: e.division_id, project: e.project_id ?? (e.campaign_id ? campProject.get(e.campaign_id) ?? null : null), campaign: e.campaign_id,
          mine: e.created_by === myId || attending.has(e.id), event: e, occ, starts_at: s, ends_at: en, movable: canMove, resizable: canMove && !e.all_day, recurring: Boolean(e.recurrence),
          sub: [occ?.exception?.location ?? e.location, e.google_event_id ? "In Google Calendar" : null].filter(Boolean).join(" · ") || undefined });
      };
      for (const e of (one.data ?? []) as EventRow[]) { osIds.add(e.id); pushEvent(e, null); }
      for (const e of seriesRows) {
        osIds.add(e.id);
        for (const o of expandSeries(e, exBy.get(e.id) ?? [], from, to)) pushEvent(e, { occurrence_start: o.occurrence_start, starts_at: o.starts_at, ends_at: o.ends_at, index: o.index, exception: o.exception });
      }
      const seenTask = new Set<string>();
      for (const t of (tk.data ?? []) as TaskRow[]) {
        const mineT = t.owner_person_id === myId || assigned.has(t.id);
        if (t.scheduled_start && t.scheduled_end && Date.parse(t.scheduled_start) < Date.parse(to) && Date.parse(t.scheduled_end) > Date.parse(from)) {
          const d = itemDays(t.scheduled_start, t.scheduled_end, false, DEFAULT_TZ);
          out.push({ key: `t:${t.id}`, title: `${t.status === "Done" ? "✓ " : ""}${t.title}`, first: d.first, last: d.last, allDay: false, startTime: d.startTime, endTime: d.first === d.last ? zonedParts(t.scheduled_end, DEFAULT_TZ).time : undefined,
            kind: "Scheduled task", source: "task", style: "Scheduled task", label: "Task, scheduled work", company: t.company_code, division: t.division_id, project: t.project_id, mine: mineT, href: `/os/tasks/${t.id}`,
            sub: `${t.id}${t.due_date ? ` · due ${t.due_date}` : ""}`, starts_at: t.scheduled_start, ends_at: t.scheduled_end, movable: t.status !== "Done", resizable: t.status !== "Done" });
        }
        if (t.on_calendar && t.due_date && t.due_date >= range.from && t.due_date <= range.to) { seenTask.add(t.id); out.push(deadline(t, mineT)); }
      }
      for (const t of (dl.data ?? []) as TaskRow[]) {
        const mineT = t.owner_person_id === myId || assigned.has(t.id);
        if (mineT && !seenTask.has(t.id)) out.push(deadline(t, true));
      }
      for (const t of (ml.data ?? []) as MilestoneRow[]) {
        out.push({ key: `m:${t.id}`, title: `${t.is_major ? "◆ " : "◇ "}${t.title}`, first: t.due_date, last: t.due_date, allDay: true, kind: "Milestone", source: "milestone", style: "Milestone", label: t.is_major ? "Major milestone (Timeline)" : "Milestone (Timeline)",
          company: t.company_code, division: t.lead_division_id, project: t.project_id, mine: false, href: `/os/timeline/${t.id}`, sub: [t.id, t.workstream_name].filter(Boolean).join(" · "), movable: false, resizable: false });
      }
      for (const c of (ct.data ?? []) as ContentRow[]) {
        const date = c.publish_at ? zonedParts(c.publish_at, DEFAULT_TZ).date : c.planned_publish_date!;
        out.push({ key: `c:${c.id}`, title: `${c.status === "Published" ? "✓ " : ""}${c.title}`, first: date, last: date, allDay: !c.publish_at, startTime: c.publish_at ? zonedParts(c.publish_at, DEFAULT_TZ).time : undefined,
          kind: "Content", source: "content", style: "Content", label: `Content${c.channel ? ` for ${c.channel}` : ""}, ${c.status}`, company: c.company_code, division: c.division_id, campaign: c.campaign_id,
          project: c.related_project_id ?? (c.campaign_id ? campProject.get(c.campaign_id) ?? null : null), mine: [c.owner_person_id, c.creator_person_id, c.reviewer_person_id].includes(myId),
          href: `/os/campaigns?open=${c.id}`, sub: c.id, movable: false, resizable: false });
      }
      for (const c of cps) {
        if (!c.start_date || c.start_date > range.to || (c.end_date ?? c.start_date) < range.from) continue;
        out.push({ key: `p:${c.id}`, title: c.name, first: c.start_date, last: c.end_date ?? c.start_date, allDay: true, kind: "Campaign span", source: "campaign", style: "Campaign span", label: `Campaign period, ${c.status}`,
          company: c.company_code, division: c.division_id, project: c.project_id, campaign: c.id, mine: c.owner_person_id === myId, href: `/os/campaigns/${c.id}`, sub: c.id, movable: false, resizable: false });
      }
      setItems(out);
      setGErr(null);
      if (layers.google && google?.connected) {
        const r = await fetch(`/os/api/calendar/google?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        const j = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok) { setGErr(j.error ?? "Your Google Calendar couldn't be read."); return; }
        const g: Item[] = (j.events ?? []).filter((x: { os_event_id: string | null }) => !x.os_event_id || !osIds.has(x.os_event_id)).map((x: { id: string; title: string; starts_at: string; ends_at: string; all_day: boolean; html_link: string | null; location: string | null }) => {
          const d = itemDays(x.starts_at, x.ends_at, x.all_day, DEFAULT_TZ);
          return { key: `g:${x.id}`, title: x.title, first: d.first, last: d.last, allDay: x.all_day, startTime: d.startTime, endTime: !x.all_day && d.first === d.last ? zonedParts(x.ends_at, DEFAULT_TZ).time : undefined,
            kind: "Google", source: "google", style: "Google", label: "My Google Calendar", company: null, division: null, project: null, mine: true, external: x.html_link ?? undefined,
            sub: [x.location, "Google Calendar"].filter(Boolean).join(" · "), movable: false, resizable: false } satisfies Item;
        });
        setItems((cur) => (cur ? [...cur.filter((i) => i.source !== "google"), ...g] : g));
      }
    })();
    return () => { live = false; };
  }, [supabase, range, layers, google?.connected, me.person.id, tick]);

  const visible = useMemo(() => (items ?? []).filter((i) => {
    if (i.source === "google") return (space === "all" || space === "my") && !company && !division && !category;
    if (space === "my" && !i.mine) return false;
    if (space === "project" && (!project || i.project !== project)) return false;
    if (space === "marketing" && !(i.source === "content" || i.source === "campaign" || i.campaign || (i.source === "event" && i.style === "Campaign"))) return false;
    if (space !== "marketing" && space !== "project" && i.source === "campaign") return false;
    if (company && i.company !== company) return false;
    if (division && i.division !== division) return false;
    if (category && i.style !== category && !(category === "Task" && (i.source === "task" || i.source === "deadline"))) return false;
    return true;
  }), [items, space, project, company, division, category]);

  const open = useCallback((i: Item) => {
    if (i.event) return setSheet({ open: true, event: i.event, occ: i.event.recurrence ? i.occ ?? null : null });
    if (i.external) return void window.open(i.external, "_blank", "noopener");
    if (i.href) router.push(i.href);
  }, [router]);
  const newEvent = (date: string, startTime?: string) => {
    const endTime = startTime ? minutesToTime(Math.min(23 * 60 + 45, Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) + 60)) : undefined;
    setSheet({ open: true, event: null, defaults: { date, startTime, endTime, project_id: space === "project" ? project || null : null, company_code: company || undefined, category: space === "marketing" ? "Campaign" : undefined } });
  };

  // ── Drag and drop rescheduling ──────────────────────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (d: Drop) => {
    const i = d.item;
    if (!i.movable || !i.starts_at || !i.ends_at) { setNotice(i.source === "milestone" ? "Milestones move on the Timeline, not here." : i.source === "google" ? "Change Google-only events in Google Calendar." : null); return; }
    const tz = i.event?.timezone ?? DEFAULT_TZ;
    const s0 = Date.parse(i.starts_at), e0 = Date.parse(i.ends_at), dur = e0 - s0;
    let start = s0, end = e0;
    if (d.mode === "resize" && d.minutes !== null) {
      end = Math.max(s0 + 15 * 60000, Date.parse(zonedInstant(d.day, minutesToTime(d.minutes), tz)));
    } else if (d.minutes !== null && !i.allDay) {
      start = Date.parse(zonedInstant(d.day, minutesToTime(d.minutes - d.grabOffset), tz)); end = start + dur;
    } else {
      const delta = daysBetween(i.first, d.day);
      if (!delta) return;
      const sp = zonedParts(i.starts_at, tz), ep = zonedParts(i.ends_at, tz);
      start = Date.parse(zonedInstant(addDays(sp.date, delta), sp.time, tz));
      end = i.allDay ? Date.parse(zonedInstant(addDays(ep.date, delta), ep.time, tz)) : start + dur;
    }
    if (start === s0 && end === e0) return;
    const when = { starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() };
    setNotice(null);

    if (i.source === "task") {
      const id = i.key.slice(2);
      const r = await supabase.from("os_tasks").update({ scheduled_start: when.starts_at, scheduled_end: when.ends_at }).eq("id", id).select("id").maybeSingle();
      setNotice(r.error || !r.data ? "You can't reschedule this task." : `Moved the work block for ${id}. Its deadline didn't change.`);
      setTick((t) => t + 1);
      return;
    }
    const ev = i.event!;
    let sc: MoveScope = "all";
    if (ev.recurrence && i.occ) { const s = await askScope(ask, "move", i.occ.index === 0); if (!s) return; sc = s; }
    // Why this move might need a second look.
    const [att, ms, tl] = await Promise.all([
      supabase.from("os_event_attendees").select("person_id").eq("event_id", ev.id),
      ev.timeline_item_id ? supabase.from("os_timeline_items").select("id, title, due_date, is_major, status").eq("id", ev.timeline_item_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("os_event_tasks").select("task_id, os_tasks(id, title, due_date)").eq("event_id", ev.id),
    ]);
    const people = Array.from(new Set([...(att.data ?? []).map((a) => a.person_id as string), me.person.id]));
    let conflicts = 0;
    if (!ev.all_day) {
      const { data } = await supabase.rpc("os_busy", { p_people: people, p_from: when.starts_at, p_to: when.ends_at });
      conflicts = findConflicts({ ...when, all_day: false, ignore: ev.id }, busyBlocks((data ?? []) as BusyRow[], when.starts_at, when.ends_at), new Map()).length;
    }
    const taskDue = ((tl.data ?? []) as unknown as { os_tasks: { id: string; title: string; due_date: string | null } | null }[]).map((r) => r.os_tasks).filter(Boolean) as { id: string; title: string; due_date: string | null }[];
    const warnings = linkWarnings(zonedParts(when.starts_at, tz).date, { milestone: ms.data as never, taskDue });
    const inGoogle = Boolean(ev.google_event_id);
    const reasons = rescheduleReasons({ attendees: att.data?.length ?? 0, inGoogle, majorMilestone: Boolean((ms.data as { is_major?: boolean } | null)?.is_major), conflicts, warnings: warnings.length, recurring: Boolean(ev.recurrence) });
    if (reasons.length) {
      const fmt = (iso: string) => { const p = zonedParts(iso, tz); return `${new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}${ev.all_day ? "" : ` ${p.time}`}`; };
      const ok = await ask({ title: `Move “${i.title}” to ${fmt(when.starts_at)}?`, body: <><ul className="list-disc space-y-1 pl-5">{reasons.map((r) => <li key={r}>{r}</li>)}{warnings.map((w) => <li key={w}>{w}</li>)}</ul><p className="mt-2">Linked tasks and milestones are not changed.</p></>, options: [{ key: "go", label: "Move it", primary: true }] });
      if (!ok) return;
    }
    const res = await moveEvent(supabase, ev, i.occ ? { occurrence_start: i.occ.occurrence_start, starts_at: i.starts_at, ends_at: i.ends_at } : null, sc, when);
    if (!res.ok) { setNotice(res.error ?? "You can't change this event."); return; }
    let gnote = "";
    if (inGoogle && ev.google_synced_by === me.person.id) {
      for (const id of res.changed) { const s = await syncEvent(id, "push"); if (!s.ok) gnote = ` Google Calendar wasn't updated: ${s.error ?? "try Send to Google from the event."}`; }
    } else if (inGoogle) gnote = " It's in another person's Google Calendar, which updates when they sync it.";
    setNotice(`Moved “${i.title}”.${gnote}`);
    setTick((t) => t + 1);
  }, [supabase, ask, me.person.id]);

  const step = (dirn: -1 | 1) => {
    if (view === "month") { const d = new Date(Date.UTC(y, m - 1 + dirn, 1)); return go(view, d.toISOString().slice(0, 10)); }
    go(view, addDays(anchor, dirn * (view === "week" ? 7 : view === "day" ? 1 : 42)));
  };
  // Opening a link to one event (?event=EV-0001), e.g. from Google Calendar, a notification or the assistant.
  useEffect(() => {
    const id = params.get("event");
    if (!id || !/^EV-\d{4,}$/.test(id)) return;
    supabase.from("os_events").select(EVENT_COLUMNS).eq("id", id).maybeSingle().then(({ data }) => { if (data) setSheet({ open: true, event: data as EventRow, occ: null }); });
  }, [params, supabase]);
  const note = params.get("google");

  const title = view === "month" ? `${MONTHS[m - 1]} ${y}` : view === "day" ? new Date(`${anchor}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : view === "week" ? `${fmt(range.from)} – ${fmt(range.to)}` : "Next six weeks";
  const weekDays = Array.from({ length: 7 }, (_, k) => addDays(range.from, k));

  return (
    <div>
      <PageTitle title="Calendar" description="Meetings, activities and scheduled work. Deadlines stay on tasks and strategic milestones on the Timeline; turn them on as layers when you need them."
        actions={<button type="button" className={btnPrimary} onClick={() => newEvent(view === "day" ? anchor : today)} data-testid="os-event-new"><CalendarPlus size={15} aria-hidden="true" />New event</button>} />
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-lg bg-[#F0F2F5] p-1 text-sm" role="tablist" aria-label="Calendar workspace" data-testid="os-cal-spaces">
        {SPACES.map((s) => <button key={s.key} type="button" role="tab" aria-selected={space === s.key} onClick={() => nav({ ws: s.key === "all" ? null : s.key, c: null })} className={cn("min-h-9 shrink-0 rounded-md px-3 font-medium", ring, space === s.key ? "bg-white shadow-sm" : "text-[#3A4B60]")}>{s.label}</button>)}
      </div>
      {space !== "project" && space !== "company" && space !== "marketing" && <GoogleBar google={google} note={note} error={gErr} onChange={() => setTick((t) => t + 1)} />}
      <ErrorLine message={err} />
      {notice && <p role="status" className="mb-3 rounded-lg border border-[#D9E2EA] bg-[#F7F9FB] px-3 py-2 text-sm" data-testid="os-cal-notice">{notice}</p>}
      {space === "marketing" && <MarketingBoard campaigns={campaigns} tick={tick} />}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => go(view, today)}>Today</button>
          <button type="button" className={btnGhost} onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className={btnGhost} onClick={() => step(1)} aria-label="Next"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-[#1F2D3D]" data-testid="os-cal-title">{title}</h2>
        {view === "month" && (
          <div className="flex gap-1">
            <Select ariaLabel="Month" value={String(m)} onChange={(v) => go("month", `${y}-${String(v).padStart(2, "0")}-01`)} options={MONTHS.map((n, k) => ({ value: String(k + 1), label: n }))} className="w-36" />
            <Select ariaLabel="Year" value={String(y)} onChange={(v) => go("month", `${v}-${String(m).padStart(2, "0")}-01`)} options={Array.from({ length: 7 }, (_, k) => String(Number(today.slice(0, 4)) - 2 + k))} className="w-28" />
          </div>
        )}
        <div className="flex rounded-lg bg-[#F0F2F5] p-1 text-sm" role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => <button key={v.key} type="button" role="tab" aria-selected={view === v.key} onClick={() => go(v.key, anchor)} className={cn("min-h-8 rounded-md px-2.5 font-medium", ring, view === v.key ? "bg-white shadow-sm" : "text-[#3A4B60]")}>{v.label}</button>)}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" data-testid="os-cal-filters">
        {space === "project" && <Select ariaLabel="Project" value={project} onChange={(v) => nav({ p: v || null })} placeholder="Choose a project" options={projects.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} className="col-span-2 sm:w-64" />}
        <Select ariaLabel="Company" value={company} onChange={(v) => nav({ c: v || null })} placeholder="All companies" options={myCompanies.map((w) => ({ value: w.code, label: w.name }))} className="sm:w-40" />
        <Select ariaLabel="Division" value={division} onChange={setDivision} placeholder="All divisions" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} className="sm:w-44" />
        <Select ariaLabel="Category" value={category} onChange={setCategory} placeholder="All kinds" options={[...CATEGORIES, { value: "Task", label: "Tasks" }, "Milestone", "Content"]} className="sm:w-40" />
        <div className="col-span-2 flex flex-wrap items-center gap-x-3 text-xs text-[#3A4B60]" role="group" aria-label="Layers">
          {([["milestones", "Timeline milestones"], ["deadlines", "My task deadlines"], ["content", "Content publish dates"], ...(google?.connected && (space === "all" || space === "my") ? [["google", "My Google Calendar"]] : [])] as [keyof typeof layers, string][]).map(([k, l]) => (
            <label key={k} className="flex min-h-9 items-center gap-1.5"><input type="checkbox" className="h-4 w-4" checked={layers[k]} onChange={(e) => setLayers((s) => ({ ...s, [k]: e.target.checked }))} data-testid={`os-cal-layer-${k}`} />{l}</label>
          ))}
        </div>
      </div>
      {space === "project" && !project ? <p className={cn(panel, "px-4 py-8 text-center text-sm", muted)}>Choose a project to see its meetings, scheduled work, milestones and campaigns.</p>
        : !items ? <p role="status" className={cn("py-8 text-center text-sm", muted)}>Loading…</p>
        : view === "month" ? <MonthGrid y={y} m={m} today={today} items={visible} onOpen={open} onDay={(d) => go("day", d)} onDrop={onDrop} />
        : view === "week" ? <TimeGrid testId="os-cal-week" days={weekDays} today={today} items={visible} onOpen={open} onDay={(d) => go("day", d)} onDrop={onDrop} onSlot={newEvent} />
        : view === "day" ? <TimeGrid testId="os-cal-day" days={[anchor]} today={today} items={visible} onOpen={open} onDay={() => {}} onDrop={onDrop} onSlot={newEvent} />
        : <Agenda days={Array.from({ length: 42 }, (_, k) => addDays(today, k))} today={today} items={visible} onOpen={open} skipEmpty empty="Nothing scheduled in the next six weeks." />}
      <p className={cn("mt-2 text-xs", muted)}>Drag an event or a scheduled task to move it (on a phone, press and hold first). Drag the bottom edge to change its length. Nothing linked to it changes.</p>
      <Legend />
      <EventSheet open={sheet.open} event={sheet.event} occurrence={sheet.occ ?? null} defaults={sheet.defaults} google={google} onClose={() => setSheet({ open: false, event: null })}
        onSaved={() => { setSheet({ open: false, event: null }); setTick((t) => t + 1); }} />
    </div>
  );
}

function deadline(t: TaskRow, mine: boolean): Item {
  return { key: `d:${t.id}`, title: `${t.status === "Done" ? "✓ " : ""}${t.title}`, first: t.due_date!, last: t.due_date!, allDay: true, kind: "Task deadline", source: "deadline", style: "Task deadline", label: t.on_calendar ? "Task deadline (pinned)" : "Task deadline",
    company: t.company_code, division: t.division_id, project: t.project_id, mine, href: `/os/tasks/${t.id}`, sub: `${t.id} · due`, movable: false, resizable: false };
}

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function GoogleBar({ google, note, error, onChange }: { google: GoogleStatus; note: string | null; error: string | null; onChange: () => void }) {
  const words: Record<string, string> = { connected: "Your Google Calendar is connected.", cancelled: "Connecting Google Calendar was cancelled.", expired: "The Google sign-in took too long or came from another session. Try again.", scope: "Google didn't grant calendar access. Try again and allow it.", failed: "Connecting Google Calendar didn't work. Try again." };
  if (!google) return null;
  const disconnect = async () => {
    if (!window.confirm("Disconnect your Google Calendar? Events already in Google stay there. Company OS stops reading and updating your calendar.")) return;
    await fetch("/os/api/calendar/disconnect", { method: "POST" }); onChange();
  };
  return (
    <div className={cn(panel, "mb-4 flex flex-wrap items-center gap-2 px-3 py-2 text-sm")} data-testid="os-cal-google">
      <span className="min-w-0 flex-1 basis-60">
        {google.connected ? <>Google Calendar: <span className="font-medium">{google.email}</span>. Your Google events show here only for you.</>
          : google.configured ? "Connect your own Google Calendar to see your Google events here and add Company OS events to it."
          : "Google Calendar isn't set up on the server yet. Company OS events work without it."}
        {note && words[note] && <span className={cn("block text-xs", muted)} role="status">{words[note]}</span>}
        {error && <span className="block text-xs text-[#A12D2F]" role="alert">{error}</span>}
      </span>
      {google.connected
        ? <button type="button" className={btnGhost} onClick={disconnect}><Unlink size={14} aria-hidden="true" />Disconnect</button>
        // A full navigation to Google's consent screen.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        : google.configured && <a className={btn} href="/os/api/calendar/connect" data-testid="os-cal-connect"><Link2 size={14} aria-hidden="true" />Connect Google Calendar</a>}
    </div>
  );
}

function Legend() {
  const keys = [...CATEGORIES, "Scheduled task", "Task deadline", "Milestone", "Content", "Campaign span", "Google"] as const;
  const names: Record<string, string> = { "Scheduled task": "Scheduled task work", "Campaign span": "Campaign period", Google: "My Google Calendar", Milestone: "Timeline milestone (◆ major)" };
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#3A4B60]" aria-label="Legend">
      {keys.map((c) => <li key={c} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", CATEGORY_STYLE[c].dot)} aria-hidden="true" />{names[c] ?? c}</li>)}
      <li><Link href="/os/timeline" className="underline">Strategic milestones are planned on the Timeline</Link></li>
    </ul>
  );
}

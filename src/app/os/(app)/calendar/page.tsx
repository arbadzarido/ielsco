"use client";

// Calendar: day-to-day scheduling. Shows OS events, task deadlines (read from tasks, never copied), timeline milestones
// and, for a person who connected it, their own Google Calendar events. Everything except Google is read with the
// person's own session, so RLS decides what appears; Google events are fetched live by the server for that person only.
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, Link2, Unlink } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useMyScope } from "@/components/os/data";
import { EventSheet, EVENT_COLUMNS, type EventRow, type GoogleStatus } from "@/components/os/EventSheet";
import { ErrorLine, PageTitle, Select, btn, btnGhost, btnPrimary, muted, panel, ring } from "@/components/os/ui";
import { WORKSPACES } from "@/lib/os/meta";
import { CATEGORIES, CATEGORY_STYLE, DEFAULT_TZ, addDays, itemDays, itemsOnDay, layoutWeek, monthWeeks, weekday, zonedInstant, zonedParts, type CalItem } from "@/lib/os/calendar";
import { cn } from "@/lib/utils";

const VIEWS = [{ key: "month", label: "Month" }, { key: "week", label: "Week" }, { key: "day", label: "Day" }, { key: "upcoming", label: "Upcoming" }] as const;
type View = (typeof VIEWS)[number]["key"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Item = CalItem & {
  source: "event" | "task" | "milestone" | "google"; category: string; company: string | null; division: string | null; project: string | null;
  mine: boolean; href?: string; event?: EventRow; external?: string; sub?: string;
};

export default function CalendarPage() { return <Suspense fallback={null}><Calendar /></Suspense>; }

function Calendar() {
  const { supabase, me } = useOsMe();
  const scope = useMyScope();
  const dir = useDirectory();
  const router = useRouter();
  const params = useSearchParams();
  const today = zonedParts(new Date(), DEFAULT_TZ).date;
  const view: View = (VIEWS.find((v) => v.key === params.get("view"))?.key ?? "month");
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.get("d") ?? "") ? params.get("d")! : today;
  const [company, setCompany] = useState("");
  const [division, setDivision] = useState("");
  const [category, setCategory] = useState("");
  const [who, setWho] = useState<"all" | "mine" | "team">("all");
  const [project, setProject] = useState("");
  const [show, setShow] = useState({ tasks: true, milestones: true, google: true });
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [gErr, setGErr] = useState<string | null>(null);
  const [google, setGoogle] = useState<GoogleStatus>(null);
  const [sheet, setSheet] = useState<{ open: boolean; event: EventRow | null; date?: string }>({ open: false, event: null });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tick, setTick] = useState(0);

  const go = useCallback((v: View, d: string) => router.replace(`/os/calendar?view=${v}&d=${d}`, { scroll: false }), [router]);
  const [y, m] = anchor.split("-").map(Number);

  // The visible window, as civil dates (inclusive), then as instants for the queries.
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
    (async () => {
      setErr(null);
      const [ev, tk, ml, mine] = await Promise.all([
        supabase.from("os_events").select(EVENT_COLUMNS).lt("starts_at", to).gte("ends_at", from).order("starts_at").limit(500),
        show.tasks ? supabase.from("os_tasks").select("id, title, due_date, status, company_code, division_id, project_id, owner_person_id").gte("due_date", range.from).lte("due_date", range.to).neq("status", "Cancelled").limit(500) : Promise.resolve({ data: [], error: null }),
        show.milestones ? supabase.from("os_timeline_items").select("id, title, due_date, status, company_code, lead_division_id, is_major, workstream_name").gte("due_date", range.from).lte("due_date", range.to).neq("status", "Cancelled").limit(300) : Promise.resolve({ data: [], error: null }),
        Promise.all([supabase.from("os_event_attendees").select("event_id").eq("person_id", myId), supabase.from("os_task_assignees").select("task_id").eq("person_id", myId)]),
      ]);
      if (!live) return;
      if (ev.error) { setErr("The calendar couldn't be loaded. Try again."); setItems([]); return; }
      const attending = new Set((mine[0].data ?? []).map((r) => r.event_id as string));
      const assigned = new Set((mine[1].data ?? []).map((r) => r.task_id as string));
      const out: Item[] = [];
      const osIds = new Set<string>();
      for (const e of (ev.data ?? []) as EventRow[]) {
        osIds.add(e.id);
        const d = itemDays(e.starts_at, e.ends_at, e.all_day, DEFAULT_TZ);
        out.push({ key: e.id, title: e.status === "Cancelled" ? `Cancelled: ${e.title}` : e.title, first: d.first, last: d.last, allDay: e.all_day, startTime: d.startTime, kind: e.category,
          source: "event", category: e.category, company: e.company_code, division: e.division_id, project: e.project_id, mine: e.created_by === myId || attending.has(e.id), event: e,
          sub: [e.location, e.google_event_id ? "In Google Calendar" : null].filter(Boolean).join(" · ") || undefined });
      }
      for (const t of (tk.data ?? []) as { id: string; title: string; due_date: string; status: string; company_code: string; division_id: string | null; project_id: string | null; owner_person_id: string | null }[]) {
        out.push({ key: t.id, title: `${t.status === "Done" ? "✓ " : ""}${t.title}`, first: t.due_date, last: t.due_date, allDay: true, kind: "Task deadline", source: "task", category: "Task deadline",
          company: t.company_code, division: t.division_id, project: t.project_id, mine: t.owner_person_id === myId || assigned.has(t.id), href: `/os/tasks/${t.id}`, sub: `${t.id} · due` });
      }
      for (const t of (ml.data ?? []) as { id: string; title: string; due_date: string; company_code: string; lead_division_id: string | null; is_major: boolean; workstream_name: string }[]) {
        out.push({ key: t.id, title: t.title, first: t.due_date, last: t.due_date, allDay: true, kind: "Milestone", source: "milestone", category: "Milestone", company: t.company_code, division: t.lead_division_id,
          project: null, mine: false, href: `/os/timeline?focus=${t.id}`, sub: `${t.id} · ${t.workstream_name}` });
      }
      setItems(out);
      // Google: the person's own calendar, live. Events Company OS pushed are already shown as OS events.
      setGErr(null);
      if (show.google && google?.connected) {
        const r = await fetch(`/os/api/calendar/google?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        const j = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok) { setGErr(j.error ?? "Your Google Calendar couldn't be read."); return; }
        const g: Item[] = (j.events ?? []).filter((x: { os_event_id: string | null }) => !x.os_event_id || !osIds.has(x.os_event_id)).map((x: { id: string; title: string; starts_at: string; ends_at: string; all_day: boolean; html_link: string | null; location: string | null }) => {
          const d = itemDays(x.starts_at, x.ends_at, x.all_day, DEFAULT_TZ);
          return { key: `g:${x.id}`, title: x.title, first: d.first, last: d.last, allDay: x.all_day, startTime: d.startTime, kind: "Google", source: "google", category: "Google", company: null, division: null, project: null, mine: true, external: x.html_link ?? undefined, sub: [x.location, "Google Calendar"].filter(Boolean).join(" · ") };
        });
        setItems((cur) => (cur ? [...cur.filter((i) => i.source !== "google"), ...g] : g));
      }
    })();
    return () => { live = false; };
  }, [supabase, range, show, google?.connected, me.person.id, tick]);

  const visible = useMemo(() => (items ?? []).filter((i) => {
    if (i.source === "google") return !company && !division && !project && (!category || category === "Google") && who !== "team";
    if (company && i.company !== company && !(company === "HQ" && i.company === null)) return false;
    if (division && i.division !== division) return false;
    if (project && i.project !== project) return false;
    if (category && i.category !== category) return false;
    if (who === "mine" && !i.mine) return false;
    if (who === "team" && !(i.division && scope.member.has(i.division))) return false;
    return true;
  }), [items, company, division, project, category, who, scope.member]);

  const open = (i: Item) => {
    if (i.event) return setSheet({ open: true, event: i.event });
    if (i.external) return window.open(i.external, "_blank", "noopener");
    if (i.href) router.push(i.href);
  };
  const step = (dir: -1 | 1) => {
    if (view === "month") { const d = new Date(Date.UTC(y, m - 1 + dir, 1)); return go(view, d.toISOString().slice(0, 10)); }
    go(view, addDays(anchor, dir * (view === "week" ? 7 : view === "day" ? 1 : 42)));
  };
  // Opening a link to one event (?event=EV-0001), e.g. from Google Calendar or the assistant.
  useEffect(() => {
    const id = params.get("event");
    if (!id || !/^EV-\d{4,}$/.test(id)) return;
    supabase.from("os_events").select(EVENT_COLUMNS).eq("id", id).maybeSingle().then(({ data }) => { if (data) setSheet({ open: true, event: data as EventRow }); });
  }, [params, supabase]);
  const note = params.get("google");

  const title = view === "month" ? `${MONTHS[m - 1]} ${y}` : view === "day" ? new Date(`${anchor}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : view === "week" ? `${fmt(range.from)} – ${fmt(range.to)}` : "Next six weeks";

  return (
    <div>
      <PageTitle title="Calendar" description="Meetings, activities and deadlines across the companies you work in. The Timeline keeps the strategic milestones."
        actions={<button type="button" className={btnPrimary} onClick={() => setSheet({ open: true, event: null, date: view === "day" ? anchor : today })} data-testid="os-event-new"><CalendarPlus size={15} aria-hidden="true" />New event</button>} />
      <GoogleBar google={google} note={note} error={gErr} onChange={() => setTick((t) => t + 1)} />
      <ErrorLine message={err} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => go(view, today)}>Today</button>
          <button type="button" className={btnGhost} onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className={btnGhost} onClick={() => step(1)} aria-label="Next"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-[#1F2D3D]" data-testid="os-cal-title">{title}</h2>
        {view === "month" && (
          <div className="flex gap-1">
            <Select ariaLabel="Month" value={String(m)} onChange={(v) => go("month", `${y}-${String(v).padStart(2, "0")}-01`)} options={MONTHS.map((n, i) => ({ value: String(i + 1), label: n }))} className="w-36" />
            <Select ariaLabel="Year" value={String(y)} onChange={(v) => go("month", `${v}-${String(m).padStart(2, "0")}-01`)} options={Array.from({ length: 7 }, (_, i) => String(Number(today.slice(0, 4)) - 2 + i))} className="w-28" />
          </div>
        )}
        <div className="flex rounded-lg bg-[#F0F2F5] p-1 text-sm" role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => <button key={v.key} type="button" role="tab" aria-selected={view === v.key} onClick={() => go(v.key, anchor)} className={cn("min-h-8 rounded-md px-2.5 font-medium", ring, view === v.key ? "bg-white shadow-sm" : "text-[#3A4B60]")}>{v.label}</button>)}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" data-testid="os-cal-filters">
        <Select ariaLabel="Company" value={company} onChange={setCompany} placeholder="All companies" options={WORKSPACES.filter((w) => me.isAdmin || me.companies.includes(w.code) || w.code === "HQ").map((w) => ({ value: w.code, label: w.name }))} className="sm:w-40" />
        <Select ariaLabel="Division" value={division} onChange={setDivision} placeholder="All divisions" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} className="sm:w-44" />
        <Select ariaLabel="Category" value={category} onChange={setCategory} placeholder="All categories" options={[...CATEGORIES, "Task deadline", "Milestone", "Google"]} className="sm:w-44" />
        <Select ariaLabel="Whose" value={who} onChange={(v) => setWho(v as typeof who)} options={[{ value: "all", label: "Everything I can see" }, { value: "mine", label: "My events and tasks" }, { value: "team", label: "My divisions" }]} className="sm:w-48" />
        <Select ariaLabel="Project" value={project} onChange={setProject} placeholder="All projects" options={projects.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} className="col-span-2 sm:w-56" />
        <div className="col-span-2 flex flex-wrap items-center gap-x-3 text-xs text-[#3A4B60]">
          {([["tasks", "Task deadlines"], ["milestones", "Milestones"], ...(google?.connected ? [["google", "My Google Calendar"]] : [])] as [keyof typeof show, string][]).map(([k, l]) => (
            <label key={k} className="flex min-h-9 items-center gap-1.5"><input type="checkbox" className="h-4 w-4" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} />{l}</label>
          ))}
        </div>
      </div>
      {!items ? <p role="status" className={cn("py-8 text-center text-sm", muted)}>Loading…</p>
        : view === "month" ? <MonthGrid y={y} m={m} today={today} items={visible} onOpen={open} onDay={(d) => go("day", d)} />
        : view === "week" ? <WeekView from={range.from} today={today} items={visible} onOpen={open} onDay={(d) => go("day", d)} />
        : view === "day" ? <Agenda days={[anchor]} today={today} items={visible} onOpen={open} empty="Nothing on this day." />
        : <Agenda days={Array.from({ length: 42 }, (_, i) => addDays(today, i))} today={today} items={visible} onOpen={open} skipEmpty empty="Nothing scheduled in the next six weeks." />}
      <Legend />
      <EventSheet open={sheet.open} event={sheet.event} defaults={{ date: sheet.date }} google={google} onClose={() => setSheet({ open: false, event: null })}
        onSaved={() => { setSheet({ open: false, event: null }); setTick((t) => t + 1); }} />
    </div>
  );
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
      <span className="min-w-0 flex-1">
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

function Chip({ i, onOpen, compact }: { i: Item; onOpen: (i: Item) => void; compact?: boolean }) {
  const st = CATEGORY_STYLE[i.category as keyof typeof CATEGORY_STYLE] ?? CATEGORY_STYLE.Other;
  return (
    <button type="button" onClick={() => onOpen(i)} title={i.title} data-testid="os-cal-item" data-source={i.source}
      className={cn("block w-full truncate rounded px-1.5 text-left text-[11px] font-medium leading-5", ring, st.bar, compact && "text-[10px]")}>
      {!i.allDay && i.startTime ? <span className="mr-1 opacity-80">{i.startTime}</span> : null}{i.title}
    </button>
  );
}

function MonthGrid({ y, m, today, items, onOpen, onDay }: { y: number; m: number; today: string; items: Item[]; onOpen: (i: Item) => void; onDay: (d: string) => void }) {
  const weeks = monthWeeks(y, m);
  const month = `${y}-${String(m).padStart(2, "0")}`;
  return (
    <div className={cn(panel, "overflow-hidden")} data-testid="os-cal-month">
      <div className="grid grid-cols-7 border-b border-[#E6E9EE] bg-[#F7F9FB]">
        {DAY_NAMES.map((d) => <div key={d} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[#3A4B60] sm:text-xs"><span className="sm:hidden">{d.slice(0, 3)}</span><span className="hidden sm:inline">{d}</span></div>)}
      </div>
      {weeks.map((week) => {
        const { placed, hidden, lanes } = layoutWeek(week, items, 3);
        return (
          <div key={week[0]} className="relative border-b border-[#E6E9EE] last:border-b-0">
            <div className="grid grid-cols-7">
              {week.map((d) => {
                const isToday = d === today, other = !d.startsWith(month), past = d < today;
                return (
                  <div key={d} className={cn("min-h-[92px] border-r border-[#E6E9EE] last:border-r-0 sm:min-h-[112px]", (other || past) && "bg-[#F6F7F9]")}>
                    <button type="button" onClick={() => onDay(d)} aria-label={`Open ${d}`} aria-current={isToday ? "date" : undefined}
                      className={cn("flex h-6 w-full items-center px-1.5 text-xs font-semibold", ring, isToday ? "bg-[#2E7D4F] text-white" : other ? "bg-[#7B8796] text-white" : "bg-[#2F4157] text-white")}>
                      {Number(d.slice(8))}{isToday && <span className="ml-1 hidden font-normal sm:inline">Today</span>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 gap-y-0.5 px-0.5" style={{ gridTemplateRows: `repeat(${Math.max(lanes, 1)}, 20px)` }}>
              {placed.map((p) => (
                <div key={`${p.item.key}-${week[0]}`} className="pointer-events-auto px-0.5" style={{ gridColumn: `${p.col + 1} / span ${p.span}`, gridRow: p.lane + 1 }}>
                  <Chip i={p.item} onOpen={onOpen} />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 grid grid-cols-7">
              {hidden.map((n, c) => <div key={c} className="px-1">{n > 0 && <button type="button" className={cn("pointer-events-auto text-[11px] font-medium text-[#2F4157] hover:underline", ring)} onClick={() => onDay(week[c])}>+{n} more</button>}</div>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ from, today, items, onOpen, onDay }: { from: string; today: string; items: Item[]; onOpen: (i: Item) => void; onDay: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <div className="grid gap-2 md:grid-cols-7" data-testid="os-cal-week">
      {days.map((d) => {
        const list = itemsOnDay(d, items);
        return (
          <section key={d} className={cn(panel, "min-h-[120px] overflow-hidden")} aria-label={d}>
            <button type="button" onClick={() => onDay(d)} className={cn("flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-white", ring, d === today ? "bg-[#2E7D4F]" : "bg-[#2F4157]")}>
              <span>{DAY_NAMES[weekday(d)].slice(0, 3)} {Number(d.slice(8))}</span>{d === today && <span className="font-normal">Today</span>}
            </button>
            <div className="space-y-1 p-1.5">{list.map((i) => <Chip key={i.key} i={i} onOpen={onOpen} />)}{!list.length && <p className={cn("px-1 text-xs", muted)}>—</p>}</div>
          </section>
        );
      })}
    </div>
  );
}

function Agenda({ days, today, items, onOpen, skipEmpty, empty }: { days: string[]; today: string; items: Item[]; onOpen: (i: Item) => void; skipEmpty?: boolean; empty: string }) {
  const groups = days.map((d) => ({ d, list: itemsOnDay(d, items) })).filter((g) => !skipEmpty || g.list.length);
  if (!groups.some((g) => g.list.length)) return <p className={cn(panel, "px-4 py-8 text-center text-sm", muted)} data-testid="os-cal-agenda">{empty}</p>;
  return (
    <div className="space-y-3" data-testid="os-cal-agenda">
      {groups.map(({ d, list }) => (
        <section key={d} className={cn(panel, "overflow-hidden")}>
          <h3 className={cn("px-3 py-1.5 text-xs font-semibold text-white", d === today ? "bg-[#2E7D4F]" : "bg-[#2F4157]")}>
            {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}{d === today && " · Today"}
          </h3>
          <ul className="divide-y divide-[#F0F2F5]">
            {list.map((i) => {
              const st = CATEGORY_STYLE[i.category as keyof typeof CATEGORY_STYLE] ?? CATEGORY_STYLE.Other;
              return (
                <li key={i.key}>
                  <button type="button" onClick={() => onOpen(i)} className={cn("flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-[#F7F9FB]", ring)} data-testid="os-cal-item" data-source={i.source}>
                    <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", st.dot)} aria-hidden="true" />
                    <span className="w-16 shrink-0 text-xs text-[#3A4B60]">{i.allDay ? "All day" : i.first < d ? "Cont." : i.startTime}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium text-[#1F2D3D]">{i.title}</span><span className={cn("block truncate text-xs", muted)}>{i.category}{i.sub ? ` · ${i.sub}` : ""}</span></span>
                  </button>
                </li>
              );
            })}
            {!list.length && <li className={cn("px-3 py-2 text-xs", muted)}>Nothing scheduled.</li>}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#3A4B60]" aria-label="Legend">
      {[...CATEGORIES, "Task deadline", "Milestone", "Google"].map((c) => <li key={c} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", CATEGORY_STYLE[c as keyof typeof CATEGORY_STYLE].dot)} aria-hidden="true" />{c === "Google" ? "My Google Calendar" : c}</li>)}
      <li><Link href="/os/timeline" className="underline">Strategic milestones are on the Timeline</Link></li>
    </ul>
  );
}

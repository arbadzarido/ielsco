"use client";

// A stream workspace: HQ (central management) or one of the business streams IELSco, Elco AI and GIF. It shows the
// records that belong to the stream; a record in several streams shows in each, without being copied. Everyone on the
// team can open every stream: what each person sees inside it is still decided by the database (sensitivity, division,
// workspace roles and grants), never by which stream or division they are in. HQ also lists records that are not
// assigned to a stream yet, so nothing is hidden from every workspace.
import Link from "next/link";
import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, CalendarDays, FilePlus2, FolderPlus, Globe2, ListPlus } from "lucide-react";
import { usePublishAssistantContext } from "@/components/os/assistant/page-context";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useMyScope, useQuery } from "@/components/os/data";
import { DOC_COLUMNS, type DocRow } from "@/components/os/doc-forms";
import { Announcements, Decisions, Meetings, ProductItems } from "@/components/os/records";
import { StreamBadges, StreamLogo } from "@/components/os/streams";
import { StreamReviews } from "@/components/os/stream-reviews";
import { PROJECT_COLUMNS, TASK_COLUMNS, type ProjectRow, type TaskRow } from "@/components/os/work-forms";
import { Avatar, Empty, ErrorLine, Loading, Progress, RowList, Section, Stat, StatusBadge, Tabs, btn, linkCls, muted, panel } from "@/components/os/ui";
import { addDays, fmtDate, fmtDateTime, isOpenTask, personLabel, relativeDue, todayJakarta } from "@/lib/os/meta";
import { STREAMS, streamBySlug, streamHref, streamOrFilter, type StreamCode } from "@/lib/os/streams";
import { cn } from "@/lib/utils";

type Activity = { id: number; at: string; entity_type: string; entity_id: string; actor_person_id: string | null; action: string; summary: string | null };
type TimelineRow = { id: string; title: string; workstream_code: string | null; workstream_name: string | null; due_date: string | null; status: string; owner_name: string | null; is_major: boolean; streams: string[] };
type KpiRow = { id: string; name: string; level: string | null; reporting_period: string | null; target_status: string | null; sheet_latest_value: string | null; values_restricted: boolean; division_id: string | null; streams: string[] };
type EventRow = { id: string; title: string; category: string; starts_at: string; all_day: boolean; location: string | null; status: string; streams: string[] };
type OppRow = { id: string; organisation: string; stage: string; owner_person_id: string | null; follow_up_date: string | null; next_action: string | null; streams: string[] };
type ObjRow = { id: string; title: string; period: string; status: string; owner_person_id: string | null; streams: string[] };
type Summary = { stream_code: StreamCode; active_projects: number; open_tasks: number; overdue_tasks: number; blocked_tasks: number; events_next_30: number; open_partnerships: number; documents: number; open_reviews: number };

const ENTITY_HREF: Record<string, (id: string) => string> = { project: (id) => `/os/projects/${id}`, task: (id) => `/os/tasks/${id}`, document: (id) => `/os/documents/${id}`, kpi: (id) => `/os/kpis/${id}` };

export default function StreamWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const ws = streamBySlug(slug);
  const search = useSearchParams();
  const { me } = useOsMe();
  const scope = useMyScope();
  usePublishAssistantContext({ filters: { stream: ws?.code ?? null } });
  if (!ws) return <Empty title="Workspace not found" body="Choose HQ, IELSco, Elco AI or GIF from the switcher." action={<Link href="/os" className={btn}>Home</Link>} />;
  const code = ws.code;
  const canReview = me.isAdmin || me.person.org_role === "founder" || me.person.org_role === "manager";

  const tabs = [
    { key: "overview", label: "Overview" },
    ...(code === "HQ" ? [{ key: "streams", label: "Streams" }] : []),
    { key: "projects", label: "Projects" },
    { key: "tasks", label: "Tasks" },
    { key: "calendar", label: "Calendar" },
    { key: "timeline", label: "Timeline" },
    { key: "documents", label: "Documents" },
    { key: "partnerships", label: "Partnerships" },
    { key: "metrics", label: "Metrics" },
    { key: "decisions", label: "Decisions" },
    { key: "meetings", label: "Meetings" },
    ...(code === "ELC" ? [{ key: "product", label: "Product" }] : []),
    ...(code === "GIF" ? [{ key: "programmes", label: "Programmes" }] : []),
    { key: "team", label: "Team" },
    ...(code === "HQ" ? [{ key: "review", label: "Stream review" }] : []),
  ];
  const tab = tabs.some((t) => t.key === search.get("tab")) ? search.get("tab")! : "overview";

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <StreamLogo code={code} size={40} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#1F2D3D]">{code === "GIF" ? "GIF (Global Impact Fellowship)" : ws.name}</h1>
          <p className={cn("truncate text-sm", muted)}>{ws.description}</p>
        </div>
      </header>
      <Tabs label={`${ws.name} sections`} tabs={tabs} current={tab} hrefFor={(k) => streamHref(code, k)} />
      {tab === "overview" && <Overview code={code} canPost={me.isAdmin || scope.isManager} />}
      {tab === "streams" && <StreamsAtAGlance />}
      {tab === "projects" && <Projects code={code} />}
      {tab === "tasks" && <Tasks code={code} />}
      {tab === "calendar" && <Calendar code={code} />}
      {tab === "timeline" && <Timeline code={code} />}
      {tab === "documents" && <Documents code={code} />}
      {tab === "partnerships" && <Partnerships code={code} />}
      {tab === "metrics" && <Metrics code={code} />}
      {tab === "decisions" && <Decisions stream={code} />}
      {tab === "meetings" && <Meetings stream={code} />}
      {tab === "product" && <ProductItems stream={code} />}
      {tab === "programmes" && <Programmes />}
      {tab === "team" && <Team code={code} />}
      {tab === "review" && <StreamReviews canResolve={canReview} />}
    </div>
  );
}

const sq = (code: StreamCode) => `stream=${code}`;

function Overview({ code, canPost }: { code: StreamCode; canPost: boolean }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const today = todayJakarta();
  const horizon = addDays(today, 30);
  const projects = useQuery<ProjectRow[]>((s) => s.from("os_projects").select(PROJECT_COLUMNS).or(streamOrFilter(code)).not("status", "in", "(Completed,Cancelled)"), [code]);
  const tasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).or(streamOrFilter(code)).not("status", "in", "(Done,Cancelled)").limit(1000), [code]);
  const timeline = useQuery<TimelineRow[]>((s) => s.from("os_timeline_items").select("id, title, workstream_code, workstream_name, due_date, status, owner_name, is_major, streams").or(streamOrFilter(code)).gte("due_date", today).lte("due_date", horizon).not("status", "in", "(Done,Cancelled)").order("due_date"), [code]);
  const events = useQuery<EventRow[]>((s) => s.from("os_events").select("id, title, category, starts_at, all_day, location, status, streams").or(streamOrFilter(code)).neq("status", "Cancelled").gte("starts_at", new Date().toISOString()).lte("starts_at", `${horizon}T23:59:59+07:00`).order("starts_at").limit(8), [code]);
  const activity = useQuery<Activity[]>((s) => s.from("os_activity").select("id, at, entity_type, entity_id, actor_person_id, action, summary").or(streamOrFilter(code)).order("at", { ascending: false }).limit(12), [code]);
  const docs = useQuery<DocRow[]>((s) => s.from("os_documents").select(DOC_COLUMNS).or(streamOrFilter(code)).neq("status", "Archived").order("updated_at", { ascending: false }).limit(6), [code]);
  const kpis = useQuery<KpiRow[]>((s) => s.from("os_kpis").select("id, name, level, reporting_period, target_status, sheet_latest_value, values_restricted, division_id, streams").or(streamOrFilter(code)).eq("level", "Company").order("id").limit(8), [code]);
  const t = useMemo(() => tasks.data ?? [], [tasks.data]);
  const overdue = t.filter((x) => relativeDue(x.due_date)?.overdue).length;
  const blocked = t.filter((x) => x.status === "Blocked").length;
  const deadlines = useMemo(() => {
    const rows: { key: string; date: string; label: string; href: string; kind: string }[] = [];
    t.filter((x) => x.due_date && x.due_date <= horizon).forEach((x) => rows.push({ key: `t${x.id}`, date: x.due_date!, label: x.title, href: `/os/tasks/${x.id}`, kind: "Task" }));
    (projects.data ?? []).filter((p) => p.due_date && p.due_date <= horizon).forEach((p) => rows.push({ key: `p${p.id}`, date: p.due_date!, label: p.name, href: `/os/projects/${p.id}`, kind: "Project" }));
    (timeline.data ?? []).forEach((x) => rows.push({ key: `l${x.id}`, date: x.due_date!, label: x.title, href: `/os/timeline/${x.id}`, kind: x.workstream_code ?? "Timeline" }));
    return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  }, [t, projects.data, timeline.data, horizon]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Active projects" value={projects.data?.length ?? "…"} href={`/os/projects?${sq(code)}`} />
          <Stat label="Open tasks" value={tasks.data ? t.length : "…"} href={`/os/tasks?view=list&${sq(code)}`} />
          <Stat label="Overdue" value={tasks.data ? overdue : "…"} tone={overdue ? "red" : undefined} href={`/os/tasks?view=list&${sq(code)}`} />
          <Stat label="Blocked" value={tasks.data ? blocked : "…"} tone={blocked ? "amber" : undefined} href={`/os/tasks?view=board&${sq(code)}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/os/projects?${sq(code)}&new=1`} className={btn}><FolderPlus size={15} aria-hidden="true" />New project</Link>
          <Link href={`/os/tasks?${sq(code)}&new=1`} className={btn}><ListPlus size={15} aria-hidden="true" />New task</Link>
          <Link href={`/os/documents?${sq(code)}&new=1`} className={btn}><FilePlus2 size={15} aria-hidden="true" />New document</Link>
          <Link href={`/os/calendar?${sq(code)}`} className={btn}><CalendarDays size={15} aria-hidden="true" />Calendar</Link>
          <Link href={`/os/timeline?${sq(code)}`} className={btn}><CalendarClock size={15} aria-hidden="true" />Timeline</Link>
          {code === "GIF" && <Link href="/os/gif" className={btn}><Globe2 size={15} aria-hidden="true" />GIF Summer 2027 workspace</Link>}
        </div>
        <Section title="Deadlines in the next 30 days">
          {deadlines.length ? (
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
              {deadlines.map((d) => { const r = relativeDue(d.date); return (
                <li key={d.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className={cn("w-20 shrink-0 text-xs", r?.overdue ? "font-medium text-[#A12D2F]" : muted)}>{r?.overdue ? r.label : fmtDate(d.date)}</span>
                  <Link href={d.href} className="min-w-0 flex-1 truncate hover:underline">{d.label}</Link>
                  <span className={cn("hidden text-xs sm:inline", muted)}>{d.kind}</span>
                </li>); })}
            </ul>
          ) : <p className={cn("text-sm", muted)}>Nothing due in the next 30 days.</p>}
        </Section>
        <Section title="Active projects" action={<Link href={`/os/projects?${sq(code)}`} className={linkCls}>All</Link>}>
          <RowList rows={(projects.data ?? []).slice(0, 8)} rowKey={(p) => p.id} rowHref={(p) => `/os/projects/${p.id}`}
            empty={<Empty compact title="No active projects" body="Create a project to start tracking work here." />}
            columns={[
              { key: "n", label: "Project", primary: true, className: "w-[40%]", render: (p) => <span className="truncate">{p.name}</span> },
              { key: "st", label: "Streams", className: "w-28", hideOnMobile: true, render: (p) => <StreamBadges streams={p.streams} /> },
              { key: "s", label: "Status", className: "w-28", render: (p) => <StatusBadge value={p.status} /> },
              { key: "o", label: "Owner", className: "w-32", render: (p) => personLabel(people, p.owner_person_id) },
              { key: "d", label: "Deadline", className: "w-28", render: (p) => <span className="text-xs">{fmtDate(p.due_date)}</span> },
            ]} />
        </Section>
        {!!kpis.data?.length && (
          <Section title="Stream KPIs" action={<Link href={`/os/kpis?${sq(code)}`} className={linkCls}>All KPIs</Link>}>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
              {kpis.data.map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Link href={`/os/kpis/${k.id}`} className="min-w-0 flex-1 truncate hover:underline">{k.name}</Link>
                  <span className={cn("text-xs", muted)}>{k.values_restricted ? "Restricted (Finance)" : k.sheet_latest_value ? `Sheet: ${k.sheet_latest_value}` : "No value yet"}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
      <aside className="space-y-6">
        <Announcements stream={code} canPost={canPost} />
        <Section title="Coming up" action={<Link href={`/os/calendar?${sq(code)}`} className={linkCls}>Calendar</Link>}>
          {events.data?.length ? (
            <ul className="space-y-1.5 text-sm">{events.data.map((e) => <li key={e.id} className="flex gap-2"><span className={cn("w-16 shrink-0 text-xs", muted)}>{fmtDate(e.starts_at, { year: false })}</span><Link href={`/os/calendar?event=${e.id}`} className="min-w-0 flex-1 truncate hover:underline">{e.title}</Link></li>)}</ul>
          ) : <p className={cn("text-sm", muted)}>No events in the next 30 days.</p>}
        </Section>
        <Section title="Recent documents" action={<Link href={`/os/documents?${sq(code)}`} className={linkCls}>All</Link>}>
          {docs.data?.length ? (
            <ul className="space-y-1.5 text-sm">{docs.data.map((d) => <li key={d.id} className="truncate"><Link href={`/os/documents/${d.id}`} className="hover:underline">{d.title}</Link></li>)}</ul>
          ) : <p className={cn("text-sm", muted)}>No documents in this stream yet.</p>}
        </Section>
        <Section title="Recent activity">
          <ErrorLine message={activity.error} />
          {activity.data?.length ? (
            <ol className="space-y-2 text-sm">
              {activity.data.map((a) => (
                <li key={a.id} className="min-w-0">
                  <p className="truncate"><span className="font-medium">{personLabel(people, a.actor_person_id, "Someone")}</span> {a.summary ?? a.action}{" "}
                    {ENTITY_HREF[a.entity_type] ? <Link href={ENTITY_HREF[a.entity_type](a.entity_id)} className={linkCls}>{a.entity_id}</Link> : a.entity_id}</p>
                  <p className={cn("text-xs", muted)}>{fmtDateTime(a.at)}</p>
                </li>
              ))}
            </ol>
          ) : <p className={cn("text-sm", muted)}>No activity yet. Changes to projects, tasks and documents show up here.</p>}
        </Section>
      </aside>
    </div>
  );
}

/** HQ: every stream side by side, counted from what the viewer can see. */
function StreamsAtAGlance() {
  const sum = useQuery<Summary[]>((s) => s.rpc("os_stream_summary"), []);
  if (sum.loading && !sum.data) return <Loading />;
  return (
    <Section title="Streams at a glance">
      <ErrorLine message={sum.error} />
      <div className="overflow-x-auto">
        <table className={cn(panel, "w-full min-w-[640px] text-sm")}>
          <thead><tr className="text-left text-xs text-[#66768A]"><th className="px-3 py-2 font-medium">Stream</th><th className="px-3 py-2 font-medium">Active projects</th>
            <th className="px-3 py-2 font-medium">Open tasks</th><th className="px-3 py-2 font-medium">Overdue</th><th className="px-3 py-2 font-medium">Blocked</th>
            <th className="px-3 py-2 font-medium">Events (30 days)</th><th className="px-3 py-2 font-medium">Open partnerships</th><th className="px-3 py-2 font-medium">To review</th></tr></thead>
          <tbody className="divide-y divide-[#F0F2F5]">
            {(sum.data ?? []).map((r) => { const s = STREAMS.find((x) => x.code === r.stream_code)!; return (
              <tr key={r.stream_code}>
                <td className="px-3 py-2"><Link href={streamHref(s.code)} className="flex items-center gap-2 font-medium hover:underline"><StreamLogo code={s.code} size={18} />{s.name}</Link></td>
                <td className="px-3 py-2"><Link href={`/os/projects?${sq(s.code)}`} className="hover:underline">{r.active_projects}</Link></td>
                <td className="px-3 py-2"><Link href={`/os/tasks?view=list&${sq(s.code)}`} className="hover:underline">{r.open_tasks}</Link></td>
                <td className={cn("px-3 py-2", r.overdue_tasks && "font-medium text-[#A12D2F]")}>{r.overdue_tasks}</td>
                <td className={cn("px-3 py-2", r.blocked_tasks && "font-medium text-[#8A5A00]")}>{r.blocked_tasks}</td>
                <td className="px-3 py-2">{r.events_next_30}</td>
                <td className="px-3 py-2">{r.open_partnerships}</td>
                <td className="px-3 py-2">{r.open_reviews ? <Link href={streamHref("HQ", "review")} className={linkCls}>{r.open_reviews}</Link> : 0}</td>
              </tr>); })}
          </tbody>
        </table>
      </div>
      <p className={cn("mt-2 text-xs", muted)}>A record in two streams counts in both. HQ also counts records not assigned to a stream yet.</p>
    </Section>
  );
}

function Projects({ code }: { code: StreamCode }) {
  const dir = useDirectory();
  const projects = useQuery<ProjectRow[]>((s) => s.from("os_projects").select(PROJECT_COLUMNS).or(streamOrFilter(code)).order("due_date", { nullsFirst: false }), [code]);
  const ids = (projects.data ?? []).map((p) => p.id);
  const tasks = useQuery<{ project_id: string; status: string }[]>((s) => s.from("os_tasks").select("project_id, status").in("project_id", ids.length ? ids : ["-"]), [ids.join(",")]);
  const counts = new Map<string, { done: number; total: number }>();
  (tasks.data ?? []).forEach((x) => { if (x.status === "Cancelled") return; const c = counts.get(x.project_id) ?? { done: 0, total: 0 }; c.total++; if (x.status === "Done") c.done++; counts.set(x.project_id, c); });
  return (
    <Section title="Projects" action={<Link href={`/os/projects?${sq(code)}&new=1`} className={btn}>New project</Link>}>
      <ErrorLine message={projects.error} />
      <RowList rows={projects.data ?? []} rowKey={(p) => p.id} rowHref={(p) => `/os/projects/${p.id}`}
        empty={<Empty compact title="No projects in this stream" />}
        columns={[
          { key: "n", label: "Project", primary: true, className: "w-[34%]", render: (p) => <span className="truncate">{p.name}</span> },
          { key: "st", label: "Streams", className: "w-28", hideOnMobile: true, render: (p) => <StreamBadges streams={p.streams} /> },
          { key: "s", label: "Status", className: "w-28", render: (p) => <StatusBadge value={p.status} /> },
          { key: "o", label: "Owner", className: "w-32", render: (p) => personLabel(dir?.peopleById ?? new Map(), p.owner_person_id) },
          { key: "p", label: "Progress", className: "w-32", render: (p) => <Progress {...(counts.get(p.id) ?? { done: 0, total: 0 })} /> },
          { key: "d", label: "Deadline", className: "w-28", render: (p) => <span className="text-xs">{fmtDate(p.due_date)}</span> },
        ]} />
    </Section>
  );
}

function Tasks({ code }: { code: StreamCode }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const tasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).or(streamOrFilter(code)).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(500), [code]);
  return (
    <Section title="Open tasks" action={<div className="flex gap-2"><Link href={`/os/tasks?view=board&${sq(code)}`} className={btn}>Board</Link><Link href={`/os/tasks?${sq(code)}&new=1`} className={btn}>New task</Link></div>}>
      <ErrorLine message={tasks.error} />
      <RowList rows={(tasks.data ?? []).filter((t) => isOpenTask(t.status))} rowKey={(t) => t.id} rowHref={(t) => `/os/tasks/${t.id}`}
        empty={<Empty compact title="No open tasks in this stream" />}
        columns={[
          { key: "t", label: "Task", primary: true, className: "w-[38%]", render: (t) => <span className="truncate">{t.title}</span> },
          { key: "st", label: "Streams", className: "w-28", hideOnMobile: true, render: (t) => <StreamBadges streams={t.streams} /> },
          { key: "s", label: "Status", className: "w-28", render: (t) => <StatusBadge value={t.status} /> },
          { key: "o", label: "Owner", className: "w-32", render: (t) => personLabel(people, t.owner_person_id) },
          { key: "dv", label: "Owner's division", className: "w-36", hideOnMobile: true, render: (t) => <span className="truncate text-xs text-[#66768A]">{t.division_id ? dir?.divisionById.get(t.division_id)?.name ?? t.division_id : "—"}</span> },
          { key: "d", label: "Due", className: "w-28", render: (t) => { const r = relativeDue(t.due_date); return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{r ? r.label : "—"}</span>; } },
        ]} />
    </Section>
  );
}

function Calendar({ code }: { code: StreamCode }) {
  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 60 * 86_400_000).toISOString();
  const events = useQuery<EventRow[]>((s) => s.from("os_events").select("id, title, category, starts_at, all_day, location, status, streams").or(streamOrFilter(code)).neq("status", "Cancelled").gte("starts_at", from).lte("starts_at", to).order("starts_at").limit(200), [code]);
  return (
    <Section title="Next 60 days" action={<Link href={`/os/calendar?${sq(code)}`} className={btn}>Open calendar</Link>}>
      <ErrorLine message={events.error} />
      <p className={cn("mb-2 text-xs", muted)}>One-off events. Recurring series show in the full calendar.</p>
      <RowList rows={events.data ?? []} rowKey={(e) => e.id} rowHref={(e) => `/os/calendar?event=${e.id}`}
        empty={<Empty compact title="Nothing scheduled" body="Events linked to this stream's projects take its streams automatically." />}
        columns={[
          { key: "w", label: "When", className: "w-32", render: (e) => <span className="text-xs">{e.all_day ? fmtDate(e.starts_at) : fmtDateTime(e.starts_at)}</span> },
          { key: "t", label: "Event", primary: true, className: "w-[40%]", render: (e) => <span className="truncate">{e.title}</span> },
          { key: "c", label: "Type", className: "w-28", render: (e) => e.category },
          { key: "st", label: "Streams", className: "w-28", hideOnMobile: true, render: (e) => <StreamBadges streams={e.streams} /> },
        ]} />
    </Section>
  );
}

function Timeline({ code }: { code: StreamCode }) {
  const items = useQuery<TimelineRow[]>((s) => s.from("os_timeline_items").select("id, title, workstream_code, workstream_name, due_date, status, owner_name, is_major, streams").or(streamOrFilter(code)).order("due_date", { nullsFirst: false }).limit(500), [code]);
  return (
    <Section title="Milestones" action={<Link href={`/os/timeline?${sq(code)}`} className={btn}>Open timeline</Link>}>
      <ErrorLine message={items.error} />
      <RowList rows={items.data ?? []} rowKey={(x) => x.id} rowHref={(x) => `/os/timeline/${x.id}`}
        empty={<Empty compact title="No milestones in this stream" />}
        columns={[
          { key: "t", label: "Milestone", primary: true, className: "w-[40%]", render: (x) => <span className="truncate">{x.is_major ? "★ " : ""}{x.title}</span> },
          { key: "w", label: "Workstream", className: "w-40", hideOnMobile: true, render: (x) => <span className="truncate text-xs text-[#66768A]">{x.workstream_code} {x.workstream_name}</span> },
          { key: "s", label: "Status", className: "w-28", render: (x) => <StatusBadge value={x.status} /> },
          { key: "d", label: "Due", className: "w-28", render: (x) => <span className="text-xs">{fmtDate(x.due_date)}</span> },
        ]} />
    </Section>
  );
}

function Documents({ code }: { code: StreamCode }) {
  const dir = useDirectory();
  const docs = useQuery<DocRow[]>((s) => s.from("os_documents").select(DOC_COLUMNS).or(streamOrFilter(code)).neq("status", "Archived").order("title"), [code]);
  return (
    <Section title="Documents" action={<Link href={`/os/documents?${sq(code)}&new=1`} className={btn}>New document</Link>}>
      <RowList rows={docs.data ?? []} rowKey={(d) => d.id} rowHref={(d) => `/os/documents/${d.id}`}
        empty={<Empty compact title="No documents in this stream" body="Create from a template, upload, or register an existing Drive file in the Documents hub." />}
        columns={[
          { key: "t", label: "Document", primary: true, className: "w-[40%]", render: (d) => <span className="truncate">{d.title}</span> },
          { key: "n", label: "Number", className: "w-36", render: (d) => <span className="text-xs text-[#66768A]">{d.reference_number ?? d.id}</span> },
          { key: "s", label: "Status", className: "w-28", render: (d) => <StatusBadge value={d.status} /> },
          { key: "dv", label: "Division", className: "w-36", render: (d) => d.division_id ? dir?.divisionById.get(d.division_id)?.name ?? d.division_id : "Company-wide" },
        ]} />
    </Section>
  );
}

function Partnerships({ code }: { code: StreamCode }) {
  const dir = useDirectory();
  const opps = useQuery<OppRow[]>((s) => s.from("os_partnerships").select("id, organisation, stage, owner_person_id, follow_up_date, next_action, streams").or(streamOrFilter(code)).order("follow_up_date", { nullsFirst: false }), [code]);
  return (
    <Section title="Partnerships and sponsors" action={<Link href={`/os/partnerships?${sq(code)}`} className={btn}>Pipeline</Link>}>
      <ErrorLine message={opps.error} />
      <RowList rows={opps.data ?? []} rowKey={(o) => o.id} rowHref={() => `/os/partnerships?${sq(code)}`}
        empty={<Empty compact title="No partnerships you can see in this stream" body="Partnerships are Confidential to the Partnerships division by default." />}
        columns={[
          { key: "o", label: "Organisation", primary: true, className: "w-[36%]", render: (o) => <span className="truncate">{o.organisation}</span> },
          { key: "s", label: "Stage", className: "w-40", render: (o) => <span className="text-xs">{o.stage}</span> },
          { key: "w", label: "Owner", className: "w-32", render: (o) => personLabel(dir?.peopleById ?? new Map(), o.owner_person_id) },
          { key: "f", label: "Follow up", className: "w-28", render: (o) => <span className="text-xs">{fmtDate(o.follow_up_date)}</span> },
        ]} />
    </Section>
  );
}

function Metrics({ code }: { code: StreamCode }) {
  const kpis = useQuery<KpiRow[]>((s) => s.from("os_kpis").select("id, name, level, reporting_period, target_status, sheet_latest_value, values_restricted, division_id, streams").or(streamOrFilter(code)).order("id"), [code]);
  const objs = useQuery<ObjRow[]>((s) => s.from("os_objectives").select("id, title, period, status, owner_person_id, streams").or(streamOrFilter(code)).order("period", { ascending: false }), [code]);
  const dir = useDirectory();
  return (
    <div className="space-y-6">
      <Section title="KPIs" action={<Link href={`/os/kpis?${sq(code)}`} className={linkCls}>All KPIs</Link>}>
        <ErrorLine message={kpis.error} />
        <RowList rows={kpis.data ?? []} rowKey={(k) => k.id} rowHref={(k) => `/os/kpis/${k.id}`}
          empty={<Empty compact title="No KPIs in this stream" />}
          columns={[
            { key: "n", label: "KPI", primary: true, className: "w-[45%]", render: (k) => <span className="truncate">{k.name}</span> },
            { key: "l", label: "Level", className: "w-24", render: (k) => k.level ?? "—" },
            { key: "p", label: "Period", className: "w-28", render: (k) => k.reporting_period ?? "—" },
            { key: "v", label: "Latest", className: "w-36", render: (k) => <span className="text-xs">{k.values_restricted ? "Restricted (Finance)" : k.sheet_latest_value ?? "No value yet"}</span> },
          ]} />
      </Section>
      <Section title="Objectives" action={<Link href={`/os/okrs?${sq(code)}`} className={linkCls}>OKRs</Link>}>
        <RowList rows={objs.data ?? []} rowKey={(o) => o.id} rowHref={() => `/os/okrs?${sq(code)}`}
          empty={<Empty compact title="No objectives in this stream" />}
          columns={[
            { key: "t", label: "Objective", primary: true, className: "w-[50%]", render: (o) => <span className="truncate">{o.title}</span> },
            { key: "p", label: "Period", className: "w-24", render: (o) => o.period },
            { key: "s", label: "Status", className: "w-28", render: (o) => <StatusBadge value={o.status} /> },
            { key: "o", label: "Owner", className: "w-32", render: (o) => personLabel(dir?.peopleById ?? new Map(), o.owner_person_id) },
          ]} />
      </Section>
    </div>
  );
}

function Programmes() {
  return (
    <Section title="GIF programmes">
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className={cn(panel, "p-4")}>
          <h2 className="font-semibold">GIF Summer 2027</h2>
          <p className={cn("mt-1 text-sm", muted)}>Programme workspace: plan, decisions, partners, budget, run sheet and outputs.</p>
          <Link href="/os/gif" className={cn(btn, "mt-3")}>Open</Link>
        </li>
        <li className={cn(panel, "p-4")}>
          <h2 className="font-semibold">Other GIF programmes</h2>
          <p className={cn("mt-1 text-sm", muted)}>GIF Winter, delegations and partner programmes: create a project with the GIF stream and it appears across this workspace.</p>
          <Link href={`/os/projects?${sq("GIF")}&new=1`} className={cn(btn, "mt-3")}>New GIF project</Link>
        </li>
      </ul>
    </Section>
  );
}

/** Who is working on this stream right now: owners and assignees of its open work, whatever their division. */
function Team({ code }: { code: StreamCode }) {
  const dir = useDirectory();
  const tasks = useQuery<{ id: string; owner_person_id: string | null }[]>((s) => s.from("os_tasks").select("id, owner_person_id").or(streamOrFilter(code)).not("status", "in", "(Done,Cancelled)").limit(2000), [code]);
  const projects = useQuery<{ owner_person_id: string | null }[]>((s) => s.from("os_projects").select("owner_person_id").or(streamOrFilter(code)).not("status", "in", "(Completed,Cancelled)"), [code]);
  const ids = (tasks.data ?? []).map((t) => t.id);
  const assigns = useQuery<{ task_id: string; person_id: string }[]>((s) => s.from("os_task_assignees").select("task_id, person_id").in("task_id", ids.length ? ids.slice(0, 500) : ["-"]), [ids.slice(0, 500).join(",")]);
  const links = useQuery<{ person_id: string; division_id: string; is_manager: boolean }[]>((s) => s.from("os_person_divisions").select("person_id, division_id, is_manager"), []);
  if (!dir || !tasks.data) return <Loading />;
  const load = new Map<string, number>();
  const add = (id: string | null) => { if (id) load.set(id, (load.get(id) ?? 0) + 1); };
  tasks.data.forEach((t) => add(t.owner_person_id));
  (assigns.data ?? []).forEach((a) => add(a.person_id));
  (projects.data ?? []).forEach((p) => add(p.owner_person_id));
  const rows = [...load.entries()].map(([id, n]) => ({ p: dir.peopleById.get(id), n })).filter((r) => r.p && ["active", "onboarding"].includes(r.p.status))
    .sort((a, b) => b.n - a.n) as { p: NonNullable<ReturnType<typeof dir.peopleById.get>>; n: number }[];
  return (
    <Section title="Working on this stream">
      <p className={cn("mb-3 text-sm", muted)}>Everyone on the team can work on every stream. This lists the people who own or are assigned open work here, with their own divisions.</p>
      <RowList rows={rows} rowKey={(r) => r.p.id} rowHref={(r) => `/os/people/${r.p.id}`}
        empty={<Empty compact title="No one has open work in this stream yet" />}
        columns={[
          { key: "n", label: "Name", primary: true, className: "w-[35%]", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.p.full_name} size={22} /><span className="truncate">{r.p.full_name}</span></span> },
          { key: "d", label: "Divisions", className: "w-[40%]", render: (r) => <span className="truncate text-xs text-[#66768A]">{(links.data ?? []).filter((l) => l.person_id === r.p.id).map((l) => `${dir.divisionById.get(l.division_id)?.name ?? l.division_id}${l.is_manager ? " (manager)" : ""}`).join(", ") || "—"}</span> },
          { key: "w", label: "Open items", className: "w-24", render: (r) => r.n },
        ]} />
    </Section>
  );
}

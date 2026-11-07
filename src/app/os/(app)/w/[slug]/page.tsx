"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, FilePlus2, FolderPlus, ListPlus } from "lucide-react";
import { CompanyLogo } from "@/components/os/OsShell";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useMyScope, useQuery } from "@/components/os/data";
import { DOC_COLUMNS, type DocRow } from "@/components/os/doc-forms";
import { Announcements, Decisions, Meetings, ProductItems } from "@/components/os/records";
import { PROJECT_COLUMNS, TASK_COLUMNS, type ProjectRow, type TaskRow } from "@/components/os/work-forms";
import { Avatar, Empty, ErrorLine, Loading, Progress, RowList, Section, Stat, StatusBadge, Tabs, btn, linkCls, muted, panel } from "@/components/os/ui";
import { addDays, fmtDate, fmtDateTime, personLabel, relativeDue, todayJakarta, workspaceBySlug } from "@/lib/os/meta";
import { ROLE_LABEL } from "@/lib/os/types";
import { cn } from "@/lib/utils";

type Activity = { id: number; at: string; entity_type: string; entity_id: string; actor_person_id: string | null; action: string; summary: string | null };
type TimelineRow = { id: string; title: string; workstream_code: string | null; due_date: string | null; status: string; owner_name: string | null; is_major: boolean };
type KpiRow = { id: string; name: string; reporting_period: string | null; target_status: string | null; sheet_latest_value: string | null; values_restricted: boolean; division_id: string | null };

const ENTITY_HREF: Record<string, (id: string) => string> = { project: (id) => `/os/projects/${id}`, task: (id) => `/os/tasks/${id}`, document: (id) => `/os/documents/${id}`, kpi: (id) => `/os/kpis/${id}` };

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const ws = workspaceBySlug(slug);
  const search = useSearchParams();
  const { me } = useOsMe();
  const scope = useMyScope();
  if (!ws) return <Empty title="Workspace not found" body="Choose HQ, IELSco or Elco AI from the switcher." action={<Link href="/os" className={btn}>Home</Link>} />;
  const inCompany = ws.code === "HQ" || me.isAdmin || me.companies.includes(ws.code);
  if (!inCompany) return <Empty title="You're not in this workspace" body={`You don't work in ${ws.name}. A founder can add you in Admin → People.`} />;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "divisions", label: "Divisions" },
    { key: "projects", label: "Projects" },
    { key: "documents", label: "Documents" },
    { key: "team", label: "Team" },
    ...(ws.code === "HQ" ? [{ key: "decisions", label: "Decisions" }, { key: "meetings", label: "Meetings" }] : []),
    ...(ws.code === "ELC" ? [{ key: "product", label: "Product" }] : []),
  ];
  const tab = tabs.some((t) => t.key === search.get("tab")) ? search.get("tab")! : "overview";

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <CompanyLogo code={ws.code} size={40} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#1F2D3D]">{ws.name}</h1>
          <p className={cn("truncate text-sm", muted)}>{ws.legal}</p>
        </div>
      </header>
      <Tabs label={`${ws.name} sections`} tabs={tabs} current={tab} hrefFor={(k) => `/os/w/${ws.slug}${k === "overview" ? "" : `?tab=${k}`}`} />
      {tab === "overview" && <Overview code={ws.code} canPost={me.isAdmin || scope.isManager} />}
      {tab === "divisions" && <Divisions code={ws.code} />}
      {tab === "projects" && <Projects code={ws.code} />}
      {tab === "documents" && <Documents code={ws.code} />}
      {tab === "team" && <Team code={ws.code} />}
      {tab === "decisions" && <Decisions company={ws.code} />}
      {tab === "meetings" && <Meetings company={ws.code} />}
      {tab === "product" && <ProductItems company={ws.code} />}
    </div>
  );
}

function Overview({ code, canPost }: { code: string; canPost: boolean }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const today = todayJakarta();
  const horizon = addDays(today, 30);
  const projects = useQuery<ProjectRow[]>((s) => s.from("os_projects").select(PROJECT_COLUMNS).eq("company_code", code).not("status", "in", "(Completed,Cancelled)"), [code]);
  const tasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).eq("company_code", code).not("status", "in", "(Done,Cancelled)"), [code]);
  const timeline = useQuery<TimelineRow[]>((s) => s.from("os_timeline_items").select("id, title, workstream_code, due_date, status, owner_name, is_major").eq("company_code", code).gte("due_date", today).lte("due_date", horizon).not("status", "in", "(Done,Cancelled)").order("due_date"), [code]);
  const activity = useQuery<Activity[]>((s) => s.from("os_activity").select("id, at, entity_type, entity_id, actor_person_id, action, summary").eq("company_code", code).order("at", { ascending: false }).limit(12), [code]);
  const docs = useQuery<DocRow[]>((s) => s.from("os_documents").select(DOC_COLUMNS).eq("company_code", code).neq("status", "Archived").order("updated_at", { ascending: false }).limit(6), [code]);
  const kpis = useQuery<KpiRow[]>((s) => s.from("os_kpis").select("id, name, reporting_period, target_status, sheet_latest_value, values_restricted, division_id").eq("company_code", code).eq("level", "Company").order("id").limit(8), [code]);
  const t = useMemo(() => tasks.data ?? [], [tasks.data]);
  const overdue = t.filter((x) => relativeDue(x.due_date)?.overdue).length;
  const blocked = t.filter((x) => x.status === "Blocked").length;
  const deadlines = useMemo(() => {
    const rows: { key: string; date: string; label: string; href: string; kind: string }[] = [];
    t.filter((x) => x.due_date && x.due_date <= horizon).forEach((x) => rows.push({ key: `t${x.id}`, date: x.due_date!, label: x.title, href: `/os/tasks/${x.id}`, kind: "Task" }));
    (projects.data ?? []).filter((p) => p.due_date && p.due_date <= horizon).forEach((p) => rows.push({ key: `p${p.id}`, date: p.due_date!, label: p.name, href: `/os/projects/${p.id}`, kind: "Project" }));
    (timeline.data ?? []).forEach((x) => rows.push({ key: `l${x.id}`, date: x.due_date!, label: x.title, href: `/os/timeline?focus=${x.id}`, kind: x.workstream_code ?? "Timeline" }));
    return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  }, [t, projects.data, timeline.data, horizon]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Active projects" value={projects.data?.length ?? "…"} href={`/os/projects?company=${code}`} />
          <Stat label="Open tasks" value={tasks.data ? t.length : "…"} href={`/os/tasks?view=list&company=${code}`} />
          <Stat label="Overdue" value={tasks.data ? overdue : "…"} tone={overdue ? "red" : undefined} href={`/os/tasks?view=list&company=${code}`} />
          <Stat label="Blocked" value={tasks.data ? blocked : "…"} tone={blocked ? "amber" : undefined} href={`/os/tasks?view=board&company=${code}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/os/projects?company=${code}&new=1`} className={btn}><FolderPlus size={15} aria-hidden="true" />New project</Link>
          <Link href={`/os/tasks?company=${code}&new=1`} className={btn}><ListPlus size={15} aria-hidden="true" />New task</Link>
          <Link href={`/os/documents?company=${code}&new=1`} className={btn}><FilePlus2 size={15} aria-hidden="true" />New document</Link>
          <Link href="/os/timeline" className={btn}><CalendarClock size={15} aria-hidden="true" />Timeline</Link>
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
        <Section title="Active projects" action={<Link href={`/os/projects?company=${code}`} className={linkCls}>All</Link>}>
          <RowList rows={(projects.data ?? []).slice(0, 8)} rowKey={(p) => p.id} rowHref={(p) => `/os/projects/${p.id}`}
            empty={<Empty compact title="No active projects" body="Create a project to start tracking work here." />}
            columns={[
              { key: "n", label: "Project", primary: true, className: "w-[45%]", render: (p) => <span className="truncate">{p.name}</span> },
              { key: "s", label: "Status", className: "w-28", render: (p) => <StatusBadge value={p.status} /> },
              { key: "o", label: "Owner", className: "w-32", render: (p) => personLabel(people, p.owner_person_id) },
              { key: "d", label: "Deadline", className: "w-28", render: (p) => <span className="text-xs">{fmtDate(p.due_date)}</span> },
            ]} />
        </Section>
        {!!kpis.data?.length && (
          <Section title="Company KPIs" action={<Link href={`/os/kpis?company=${code}`} className={linkCls}>All KPIs</Link>}>
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
        <Announcements company={code} canPost={canPost} />
        <Section title="Recent documents" action={<Link href={`/os/documents?company=${code}`} className={linkCls}>All</Link>}>
          {docs.data?.length ? (
            <ul className="space-y-1.5 text-sm">{docs.data.map((d) => <li key={d.id} className="truncate"><Link href={`/os/documents/${d.id}`} className="hover:underline">{d.title}</Link></li>)}</ul>
          ) : <p className={cn("text-sm", muted)}>No documents registered for this workspace yet.</p>}
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

function Divisions({ code }: { code: string }) {
  const dir = useDirectory();
  const links = useQuery<{ person_id: string; division_id: string; is_manager: boolean }[]>((s) => s.from("os_person_divisions").select("person_id, division_id, is_manager"), []);
  const companyPeople = useQuery<{ person_id: string }[]>((s) => s.from("os_person_companies").select("person_id").eq("company_code", code), [code]);
  const projects = useQuery<{ division_id: string | null }[]>((s) => s.from("os_projects").select("division_id").eq("company_code", code).not("status", "in", "(Completed,Cancelled)"), [code]);
  if (!dir || !links.data) return <Loading />;
  const inCo = new Set((companyPeople.data ?? []).map((p) => p.person_id));
  const people = dir.peopleById;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {dir.divisions.map((d) => {
        const members = links.data!.filter((l) => l.division_id === d.id && (code === "HQ" || inCo.has(l.person_id)));
        const active = (projects.data ?? []).filter((p) => p.division_id === d.id).length;
        return (
          <section key={d.id} className={cn(panel, "p-4")}>
            <div className="flex items-baseline justify-between gap-2"><h2 className="font-semibold">{d.name}</h2><span className={cn("text-xs", muted)}>{d.code} · {d.id}</span></div>
            <p className={cn("mt-1 text-sm", muted)}>Lead: {personLabel(people, d.owner_person_id, "Not set")}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {members.map((m) => <li key={m.person_id} className="flex items-center gap-1 rounded-full bg-[#F0F2F5] py-0.5 pl-0.5 pr-2 text-xs"><Avatar name={personLabel(people, m.person_id)} size={18} />{personLabel(people, m.person_id)}{m.is_manager && " · manager"}</li>)}
              {!members.length && <li className={cn("text-xs", muted)}>No members in this workspace yet.</li>}
            </ul>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={`/os/projects?company=${code}&division=${d.id}`} className={linkCls}>{active} active project{active === 1 ? "" : "s"}</Link>
              <Link href={`/os/documents?company=${code}&division=${d.id}`} className={linkCls}>Documents</Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Projects({ code }: { code: string }) {
  const dir = useDirectory();
  const projects = useQuery<ProjectRow[]>((s) => s.from("os_projects").select(PROJECT_COLUMNS).eq("company_code", code).order("due_date", { nullsFirst: false }), [code]);
  const tasks = useQuery<{ project_id: string; status: string }[]>((s) => s.from("os_tasks").select("project_id, status").eq("company_code", code).not("project_id", "is", null), [code]);
  const counts = new Map<string, { done: number; total: number }>();
  (tasks.data ?? []).forEach((x) => { if (x.status === "Cancelled") return; const c = counts.get(x.project_id) ?? { done: 0, total: 0 }; c.total++; if (x.status === "Done") c.done++; counts.set(x.project_id, c); });
  return (
    <Section title="Projects" action={<Link href={`/os/projects?company=${code}&new=1`} className={btn}>New project</Link>}>
      <ErrorLine message={projects.error} />
      <RowList rows={projects.data ?? []} rowKey={(p) => p.id} rowHref={(p) => `/os/projects/${p.id}`}
        empty={<Empty compact title="No projects in this workspace" />}
        columns={[
          { key: "n", label: "Project", primary: true, className: "w-[38%]", render: (p) => <span className="truncate">{p.name}</span> },
          { key: "s", label: "Status", className: "w-28", render: (p) => <StatusBadge value={p.status} /> },
          { key: "o", label: "Owner", className: "w-32", render: (p) => personLabel(dir?.peopleById ?? new Map(), p.owner_person_id) },
          { key: "p", label: "Progress", className: "w-32", render: (p) => <Progress {...(counts.get(p.id) ?? { done: 0, total: 0 })} /> },
          { key: "d", label: "Deadline", className: "w-28", render: (p) => <span className="text-xs">{fmtDate(p.due_date)}</span> },
        ]} />
    </Section>
  );
}

function Documents({ code }: { code: string }) {
  const dir = useDirectory();
  const docs = useQuery<DocRow[]>((s) => s.from("os_documents").select(DOC_COLUMNS).eq("company_code", code).neq("status", "Archived").order("title"), [code]);
  return (
    <Section title="Documents" action={<Link href={`/os/documents?company=${code}&new=1`} className={btn}>New document</Link>}>
      <RowList rows={docs.data ?? []} rowKey={(d) => d.id} rowHref={(d) => `/os/documents/${d.id}`}
        empty={<Empty compact title="No documents registered" body="Create from a template, upload, or register an existing Drive file in the Documents hub." />}
        columns={[
          { key: "t", label: "Document", primary: true, className: "w-[45%]", render: (d) => <span className="truncate">{d.title}</span> },
          { key: "n", label: "Number", className: "w-36", render: (d) => <span className="text-xs text-[#66768A]">{d.reference_number ?? d.id}</span> },
          { key: "s", label: "Status", className: "w-28", render: (d) => <StatusBadge value={d.status} /> },
          { key: "dv", label: "Division", className: "w-36", render: (d) => d.division_id ? dir?.divisionById.get(d.division_id)?.name ?? d.division_id : "Company-wide" },
        ]} />
    </Section>
  );
}

function Team({ code }: { code: string }) {
  const dir = useDirectory();
  const members = useQuery<{ person_id: string }[]>((s) => code === "HQ" ? s.from("os_people").select("person_id:id").in("status", ["active", "onboarding"]) : s.from("os_person_companies").select("person_id").eq("company_code", code), [code]);
  const links = useQuery<{ person_id: string; division_id: string; is_manager: boolean }[]>((s) => s.from("os_person_divisions").select("person_id, division_id, is_manager"), []);
  if (!dir || !members.data) return <Loading />;
  const rows = members.data.map((m) => dir.peopleById.get(m.person_id)).filter((p) => p && ["active", "onboarding"].includes(p.status)) as NonNullable<ReturnType<typeof dir.peopleById.get>>[];
  return (
    <RowList rows={rows} rowKey={(p) => p.id} rowHref={(p) => `/os/people/${p.id}`}
      empty={<Empty compact title="No one listed in this workspace" body="Founders add people and their companies in Admin → People." />}
      columns={[
        { key: "n", label: "Name", primary: true, className: "w-[35%]", render: (p) => <span className="flex items-center gap-2"><Avatar name={p.full_name} size={22} /><span className="truncate">{p.full_name}</span></span> },
        { key: "r", label: "Role", className: "w-28", render: (p) => ROLE_LABEL[p.org_role as keyof typeof ROLE_LABEL] ?? p.org_role },
        { key: "d", label: "Divisions", className: "w-[35%]", render: (p) => <span className="truncate text-xs text-[#66768A]">{(links.data ?? []).filter((l) => l.person_id === p.id).map((l) => `${dir.divisionById.get(l.division_id)?.name ?? l.division_id}${l.is_manager ? " (manager)" : ""}`).join(", ") || "—"}</span> },
        { key: "s", label: "Status", className: "w-24", render: (p) => <StatusBadge value={p.status === "onboarding" ? "Onboarding" : "Active"} /> },
      ]} />
  );
}

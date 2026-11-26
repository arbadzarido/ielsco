"use client";

import Link from "next/link";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useDirectory } from "@/components/os/data";
import { HandbookLink, HandbookList } from "@/components/os/handbook";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { DivisionTable, ListBox, LiveNumbers, Milestones, ProjectTeam, UpcomingDeadlines, accentOf, portfolioByKey, taskStats, usePortfolioProjects, useProjectTasks } from "@/components/os/portfolio";
import { TaskGrid } from "@/components/os/task-grid";
import { Empty, Loading, PageTitle, Section, Stat, StatusBadge, Tabs, btn, linkCls, muted, panel } from "@/components/os/ui";
import { fmtDate, personLabel } from "@/lib/os/meta";
import type { PortfolioKey } from "@/lib/os/org";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" }, { key: "tasks", label: "Tasks" }, { key: "timeline", label: "Timeline" },
  { key: "team", label: "Team and divisions" }, { key: "risks", label: "Risks and dependencies" }, { key: "docs", label: "Documents" },
];

export default function PortfolioProjectPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const pj = portfolioByKey(key);
  const search = useSearchParams();
  const projects = usePortfolioProjects();
  const row = (projects.data ?? []).find((p) => p.portfolio_key === key);
  const tasks = useProjectTasks(row?.id);
  const dir = useDirectory();
  if (!pj) return <Empty title="Project not found" action={<Link href="/os/portfolio" className={btn}>Project dashboards</Link>} />;
  if (projects.loading && !projects.data) return <Loading />;
  const tab = TABS.some((t) => t.key === search.get("tab")) ? search.get("tab")! : "overview";
  const st = taskStats(tasks.data ?? []);
  const k = pj.key as PortfolioKey;

  return (
    <div data-testid="os-portfolio-project">
      <PageTitle crumbs={[{ label: "Project dashboards", href: "/os/portfolio" }]}
        title={<span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: accentOf(k) }} />{pj.name}</span>}
        description={pj.one_liner}
        actions={row ? <Link href={`/os/projects/${row.id}`} className={btn}>Project record {row.id}</Link> : undefined} />
      {!row && <p className="mb-4 rounded-lg bg-[#FDF6CC] px-3 py-2 text-sm text-[#6B5200]">This project has no Company OS project yet. It is created when the 26 Nov release migration is applied.</p>}
      <Tabs label={`${pj.name} sections`} tabs={TABS} current={tab} hrefFor={(t) => `/os/portfolio/${k}${t === "overview" ? "" : `?tab=${t}`}`} />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <div className={cn(panel, "col-span-2 p-3")}>
              <p className="text-xs font-medium text-[#66768A]">Status</p>
              <div className="mt-1 flex items-center gap-2">{row ? <StatusBadge value={row.status} /> : "—"}<span className="text-xs text-[#66768A]">Priority #{pj.rank} of 4</span></div>
              <p className="mt-1 text-xs text-[#3A4B60]">Owner: {row ? personLabel(dir?.peopleById ?? new Map(), row.owner_person_id) : "TBC"}{row?.start_date ? ` · since ${fmtDate(row.start_date)}` : ""}</p>
            </div>
            <Stat label="Open tasks" value={st.open} href={`/os/portfolio/${k}?tab=tasks`} />
            <Stat label="Overdue" value={st.overdue} tone={st.overdue ? "red" : undefined} href={`/os/portfolio/${k}?tab=tasks`} />
            <Stat label="Blocked" value={st.blocked} tone={st.blocked ? "amber" : undefined} />
            <Stat label="Due in 14 days" value={st.soon} />
          </div>
          <Section title={k === "gif" ? "Registrants, delegates and payments (live)" : k === "course" ? "Students and enrolments (live)" : k === "circle" ? "Members and participation (live)" : "Users (live)"}><LiveNumbers k={k} /></Section>
          {k === "gif" && row && (
            <div className={cn(panel, "p-4 text-sm")}>
              <p className="mb-2 font-semibold">GIF programme register</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {[["Decisions", "decisions"], ["Programme facts", "facts"], ["Risks", "risks"], ["Budget", "budget"], ["Countries", "countries"], ["Local support", "partners"], ["Run sheet", "onsite"], ["Checklists", "checklists"], ["People", "people"], ["Outputs", "outputs"]].map(([l, t]) => (
                  <Link key={t} href={`/os/gif?tab=${t}`} className={linkCls}>{l}</Link>
                ))}
              </div>
              <p className={cn("mt-2 text-xs", muted)}>The register holds the metadata of the 121 GIF tasks, gates G0–G5, risks, budget lines (founders and approvers), country plans and the run sheet.</p>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Where it stands"><p className={cn(panel, "p-3 text-sm")}>{pj.status}</p>{row?.next_action && <p className="mt-2 text-sm"><span className="font-medium">Next action:</span> {row.next_action}</p>}</Section>
            <ListBox title="Objectives and what we run" items={pj.what} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Upcoming deadlines (30 days)"><UpcomingDeadlines tasks={tasks.data ?? []} /></Section>
            <ListBox title="Immediate priorities" items={pj.next} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ListBox title="KPIs and targets" items={pj.kpis} />
            <ListBox title="Operational workstreams" items={pj.ops} />
          </div>
          <Section title="Budget and financial tracking">
            <p className={cn(panel, "p-3 text-sm")}>{k === "gif" ? <>Budget lines and paid totals are in the GIF register (<Link href="/os/gif?tab=budget" className={linkCls}>Budget</Link>), visible to founders and programme approvers.</> : "No budget is recorded for this project. To be confirmed by the founders; finance figures stay in the Finance workspace."}</p>
          </Section>
          <ListBox title="To be confirmed" items={pj.tbc} tone="warn" />
        </div>
      )}
      {tab === "tasks" && (row ? <TaskGrid view="all" fixed={{ project: row.id }} initialGroup="division" testId="os-portfolio-tasks" /> : <Empty title="No project record yet" />)}
      {tab === "timeline" && (
        <div className="space-y-4">
          <p className={cn("text-sm", muted)}>December 2026 – August 2027. Items with a TL number show their live Master Timeline status; change dates and status in <Link href="/os/timeline" className={linkCls}>Timeline</Link>.</p>
          <Milestones pj={pj} />
        </div>
      )}
      {tab === "team" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Division responsibilities"><DivisionTable pj={pj} /></Section>
          <Section title="Project team and PICs">{row ? <ProjectTeam projectId={row.id} tasks={tasks.data ?? []} /> : <p className="text-sm">TBC</p>}</Section>
        </div>
      )}
      {tab === "risks" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ListBox title="Risks and issues" items={pj.risks} />
          <ListBox title="Dependencies" items={pj.dependencies} />
          {k === "gif" && <p className="text-sm lg:col-span-2">The full GIF risk register (likelihood, impact, prevention, mitigation, owner) is in <Link href="/os/gif?tab=risks" className={linkCls}>GIF → Risks</Link>.</p>}
        </div>
      )}
      {tab === "docs" && (
        <div className="space-y-6">
          <Section title="Learning deck and guides">
            <div className={cn(panel, "mb-2 p-3")}><HandbookLink label={`${pj.name}: Project Overview and Team Learning (PowerPoint)`} href={`/os/api/files/learning-${k}`} /></div>
            <HandbookList filter={(d) => d.project === k || d.slug === "hq-leaders-meeting-01"} />
          </Section>
          {row && <Section title="Linked Drive documents"><LinkedDocuments type="project" id={row.id} /></Section>}
        </div>
      )}
    </div>
  );
}

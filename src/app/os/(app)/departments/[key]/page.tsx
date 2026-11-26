"use client";

import Link from "next/link";
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useDirectory, useQuery } from "@/components/os/data";
import { HandbookDocument, HandbookList } from "@/components/os/handbook";
import { PORTFOLIO } from "@/components/os/portfolio";
import { TaskGrid } from "@/components/os/task-grid";
import { Badge, Empty, ErrorLine, Loading, PageTitle, Section, Stat, StatusBadge, Tabs, btn, linkCls, muted, panel } from "@/components/os/ui";
import { HANDBOOK } from "@/content/os/handbook";
import portfolio from "@/content/os/portfolio.json";
import { fmtDate, personLabel, todayJakarta } from "@/lib/os/meta";
import { departmentByKey, divisionByCode, type DepartmentKey } from "@/lib/os/org";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" }, { key: "projects", label: "Projects" }, { key: "work", label: "Active work" },
  { key: "guides", label: "Guides and SOPs" }, { key: "meetings", label: "Meetings and decisions" }, { key: "kpis", label: "KPIs" },
];
type Div = { purpose: string; kpis: string[]; manager: string; name: string };

export default function DepartmentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const dept = departmentByKey(key);
  const search = useSearchParams();
  const dir = useDirectory();
  const divIds = (dept?.divisions ?? []).map((c) => divisionByCode(c)!.id);
  const tasks = useQuery<{ id: string; status: string; due_date: string | null; division_id: string | null; department: string | null }[]>(
    (s) => s.from("os_tasks").select("id, status, due_date, division_id, department").not("status", "in", "(Done,Cancelled)").limit(3000), []);
  const meetings = useQuery<{ id: string; title: string; held_on: string | null; status: string | null; division_id: string | null }[]>(
    (s) => s.from("os_meetings").select("id, title, held_on, status, division_id").in("division_id", divIds.length ? divIds : ["-"]).order("held_on", { ascending: false }).limit(30), [divIds.join()]);
  const decisions = useQuery<{ id: string; decision: string; status: string; decided_on: string | null; division_id: string | null }[]>(
    (s) => s.from("os_decisions").select("id, decision, status, decided_on, division_id").in("division_id", divIds.length ? divIds : ["-"]).order("decided_on", { ascending: false, nullsFirst: true }).limit(30), [divIds.join()]);
  if (!dept) return <Empty title="Department not found" action={<Link href="/os/departments" className={btn}>Departments</Link>} />;
  if (!dir) return <Loading />;
  const tab = TABS.some((t) => t.key === search.get("tab")) ? search.get("tab")! : "overview";
  const today = todayJakarta();
  const mine = (tasks.data ?? []).filter((t) => (t.department ?? "") === dept.key || (t.division_id && divIds.includes(t.division_id)));
  const guide = HANDBOOK.find((d) => d.kind === "Department guide" && d.department === dept.key);
  const facts = portfolio.divisions as Record<string, Div>;

  return (
    <div data-testid={`os-department-${dept.key}`}>
      <PageTitle crumbs={[{ label: "Departments", href: "/os/departments" }]} title={dept.name} description={`${dept.purpose} Led by ${dept.lead} (${dept.leadTitle}).`} />
      <Tabs label={`${dept.name} sections`} tabs={TABS} current={tab} hrefFor={(t) => `/os/departments/${dept.key}${t === "overview" ? "" : `?tab=${t}`}`} />
      <ErrorLine message={tasks.error} />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Open tasks" value={mine.length} href={`/os/departments/${dept.key}?tab=work`} />
            <Stat label="Overdue" value={mine.filter((t) => t.due_date && t.due_date < today).length} tone={mine.some((t) => t.due_date && t.due_date < today) ? "red" : undefined} />
            <Stat label="Blocked" value={mine.filter((t) => t.status === "Blocked").length} />
            <Stat label="Divisions" value={dept.divisions.length} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {dept.divisions.map((code) => {
              const d = divisionByCode(code)!;
              const row = dir.divisionById.get(d.id);
              const open = mine.filter((t) => t.division_id === d.id);
              return (
                <section key={code} className={cn(panel, "flex flex-col p-4")} data-testid={`os-dept-division-${code}`}>
                  <h2 className="text-base font-semibold">{d.name}{d.previously && <span className={cn("ml-1 text-xs font-normal", muted)}>(formerly {d.previously})</span>}</h2>
                  <p className="text-sm text-[#3A4B60]">Manager: {personLabel(dir.peopleById, row?.owner_person_id, facts[code]?.manager ?? "TBC")}</p>
                  <p className={cn("mt-2 flex-1 text-sm", muted)}>{facts[code]?.purpose ?? d.purpose}</p>
                  <p className="mt-2 text-xs tabular-nums">{open.length} open · {open.filter((t) => t.due_date && t.due_date < today).length} overdue</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/os/d/${code.toLowerCase()}?tab=workflow`} className={btn}>Workflow</Link>
                    <Link href={`/os/d/${code.toLowerCase()}?tab=guide`} className={btn}>Guide and job description</Link>
                  </div>
                </section>
              );
            })}
          </div>
          {guide && <HandbookDocument doc={guide} />}
        </div>
      )}

      {tab === "projects" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-[#E6E9EE] bg-white">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead><tr><th className="border-b bg-[#F7F8FA] px-3 py-1.5 text-left text-xs">Project</th>{dept.divisions.map((c) => <th key={c} className="border-b bg-[#F7F8FA] px-3 py-1.5 text-left text-xs">{divisionByCode(c)!.name}</th>)}</tr></thead>
              <tbody>
                {PORTFOLIO.map((pj) => (
                  <tr key={pj.key} className="align-top">
                    <td className="border-b border-[#EEF1F5] px-3 py-2 font-medium"><Link href={`/os/portfolio/${pj.key}`} className={linkCls}>#{pj.rank} {pj.name}</Link></td>
                    {dept.divisions.map((c) => { const v = (pj.divisions as Record<string, { role: string; contribution: string }>)[c]; return (
                      <td key={c} className="border-b border-[#EEF1F5] px-3 py-2">{v ? <><Badge tone={v.role.startsWith("Lead") ? "amber" : "neutral"}>{v.role}</Badge><p className="mt-1 text-xs">{v.contribution}</p></> : "—"}</td>
                    ); })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn("text-xs", muted)}>Proposed lines, confirmed at HQ Leaders Meeting #1 (26 Nov 2026). Timeline: December 2026 – August 2027.</p>
        </div>
      )}

      {tab === "work" && <TaskGrid view="all" fixed={{ department: dept.key as DepartmentKey }} initialGroup="division" testId="os-dept-tasks" />}

      {tab === "guides" && (
        <div className="space-y-5">
          <Section title="Department and division guides"><HandbookList filter={(d) => d.department === dept.key && (d.kind === "Department guide" || d.kind === "Division guide")} /></Section>
          <Section title="SOPs and workflows"><HandbookList filter={(d) => d.department === dept.key && (d.kind === "SOP" || d.kind === "Guide")} /></Section>
          <Section title="Company-wide"><HandbookList filter={(d) => !d.department && d.kind !== "Project guide"} /></Section>
          <Section title="Templates"><p className={cn(panel, "p-3 text-sm")}>Create documents from the Drive master templates in <Link href="/os/documents" className={linkCls}>Documents → New document</Link>: SOP Template (TPL-D02), Project Brief (TPL-D03), Meeting Minutes (TPL-D04), Operational Report (TPL-D05), Content Brief (TPL-D23), Division Weekly Status Report, Weekly Operating Review, Monthly Management Review, Partnership Proposal (TPL-D18), Onboarding and Offboarding Checklist (TPL-D22).</p></Section>
        </div>
      )}

      {tab === "meetings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Meetings">
            {(meetings.data ?? []).length ? (
              <ul className={cn(panel, "divide-y divide-[#EEF1F5]")}>{(meetings.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm"><span className="w-24 tabular-nums">{fmtDate(m.held_on)}</span><Link href={`/os/meetings/${m.id}`} className={cn(linkCls, "min-w-0 flex-1 truncate font-normal")}>{m.title}</Link>{m.status && <StatusBadge value={m.status} />}</li>
              ))}</ul>
            ) : <p className={cn("text-sm", muted)}>No division meetings recorded yet. Record them in each division workspace → Meetings. HQ Leaders meetings are in <Link href="/os/w/hq?tab=meetings" className={linkCls}>HQ → Meetings</Link>.</p>}
          </Section>
          <Section title="Decisions">
            {(decisions.data ?? []).length ? (
              <ul className={cn(panel, "divide-y divide-[#EEF1F5]")}>{(decisions.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm"><span className="w-24 tabular-nums">{fmtDate(d.decided_on)}</span><span className="min-w-0 flex-1 truncate">{d.decision}</span><StatusBadge value={d.status} /></li>
              ))}</ul>
            ) : <p className={cn("text-sm", muted)}>No decisions recorded for these divisions yet. Founders log them in <Link href="/os/w/hq?tab=decisions" className={linkCls}>HQ → Decisions</Link>.</p>}
          </Section>
        </div>
      )}

      {tab === "kpis" && (
        <div className="space-y-4">
          <p className={cn("text-sm", muted)}>KPIs from the job agreements and the KPI Dictionary. They are reporting measures: no numerical target applies until a founder sets one in writing. Log values in <Link href="/os/kpis" className={linkCls}>KPIs</Link>.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {dept.divisions.map((c) => (
              <section key={c} className={cn(panel, "p-4")}>
                <h2 className="mb-2 text-sm font-semibold">{divisionByCode(c)!.name}</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm">{(facts[c]?.kpis ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
              </section>
            ))}
          </div>
          <p className="text-sm">Every division also reports: {(portfolio.commonKpis as string[]).join(" · ")}.</p>
        </div>
      )}
    </div>
  );
}

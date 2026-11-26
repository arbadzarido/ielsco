"use client";

import Link from "next/link";
import { useDirectory, useQuery } from "@/components/os/data";
import { HandbookLink } from "@/components/os/handbook";
import { ErrorLine, Loading, PageTitle, muted, panel, ring } from "@/components/os/ui";
import { personLabel, todayJakarta } from "@/lib/os/meta";
import { DEPARTMENTS, divisionByCode } from "@/lib/os/org";
import { cn } from "@/lib/utils";

// The HQ structure: two departments, six divisions, with each division's manager (from the directory) and live
// task counts. Membership itself is managed in Admin; this page only reads it.
export default function DepartmentsPage() {
  const dir = useDirectory();
  const tasks = useQuery<{ division_id: string | null; status: string; due_date: string | null }[]>((s) => s.from("os_tasks").select("division_id, status, due_date").not("status", "in", "(Done,Cancelled)").limit(3000), []);
  const today = todayJakarta();
  if (!dir) return <Loading />;
  return (
    <div>
      <PageTitle title="Departments" description="HQ structure from 26 November 2026. Every division works on the four projects: IELS Circle, GIF, Elco AI and IELS Course." />
      <div className={cn(panel, "mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-sm")}>
        <span className="font-semibold">HQ</span><span>Arba · Co-Founder &amp; CEO</span><span>Farrel · Co-Founder &amp; COO</span>
        <span className={cn("ml-auto text-xs", muted)}>Community and Courses &amp; Learning are no longer separate divisions. Partnership is now Business.</span>
      </div>
      <ErrorLine message={tasks.error} />
      <div className="grid gap-5 lg:grid-cols-2" data-testid="os-departments">
        {DEPARTMENTS.map((d) => (
          <section key={d.key} className={cn(panel, "overflow-hidden")}>
            <Link href={`/os/departments/${d.key}`} className={cn("block bg-[#2F4157] px-4 py-3 text-white hover:bg-[#3B5270]", ring)} data-testid={`os-dept-${d.key}`}>
              <h2 className="text-base font-semibold">{d.name}</h2>
              <p className="text-xs text-[#D5DEE6]">with {d.lead} ({d.leadTitle}) · {d.purpose}</p>
            </Link>
            <ul className="divide-y divide-[#EEF1F5]">
              {d.divisions.map((code) => {
                const div = divisionByCode(code)!;
                const row = dir.divisionById.get(div.id);
                const open = (tasks.data ?? []).filter((t) => t.division_id === div.id);
                const overdue = open.filter((t) => t.due_date && t.due_date < today).length;
                return (
                  <li key={code} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/os/d/${code.toLowerCase()}`} className="font-medium text-[#1F2D3D] hover:underline">{div.name}</Link>
                      {div.previously && <span className={cn("ml-1.5 text-xs", muted)}>(formerly {div.previously})</span>}
                      <p className={cn("text-xs", muted)}>{div.purpose}</p>
                    </div>
                    <span className="w-24 text-sm">{personLabel(dir.peopleById, row?.owner_person_id, "Manager TBC")}</span>
                    <span className="w-28 text-right text-xs tabular-nums">{open.length} open{overdue ? <span className="font-medium text-[#A12D2F]"> · {overdue} overdue</span> : null}</span>
                    <Link href={`/os/d/${code.toLowerCase()}?tab=workflow`} className="text-xs font-medium text-[#2F4157] hover:underline">Workflow</Link>
                    <Link href={`/os/d/${code.toLowerCase()}?tab=guide`} className="text-xs font-medium text-[#2F4157] hover:underline">Guide</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className={cn(panel, "mt-5 p-4")}>
        <h2 className="mb-2 text-sm font-semibold">Start here</h2>
        <ul className="grid gap-1.5 md:grid-cols-2">
          <li><HandbookLink label="HQ Leaders Meeting #1 pack" href="/os/handbook/hq-leaders-meeting-01" /></li>
          <li><HandbookLink label="Project dashboards" href="/os/portfolio" /></li>
          <li><HandbookLink label="Guide: Task management in Company OS" href="/os/handbook/guide-task-management" /></li>
          <li><HandbookLink label="Handbook: all guides and SOPs" href="/os/handbook" /></li>
        </ul>
      </div>
    </div>
  );
}

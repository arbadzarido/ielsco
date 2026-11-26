"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@/components/os/data";
import { PORTFOLIO, accentOf, taskStats, usePortfolioProjects } from "@/components/os/portfolio";
import { Badge, ErrorLine, Loading, PageTitle, StatusBadge, muted, panel, ring } from "@/components/os/ui";
import { cn } from "@/lib/utils";

// The four HQ projects in priority order, December 2026 – August 2027.
export default function PortfolioPage() {
  const projects = usePortfolioProjects();
  const tasks = useQuery<{ id: string; status: string; due_date: string | null; owner_person_id: string | null; division_id: string | null; project_id: string | null; title: string }[]>(
    (s) => s.from("os_tasks").select("id, title, status, due_date, owner_person_id, division_id, project_id").not("project_id", "is", null).limit(3000), []);
  const byKey = useMemo(() => new Map((projects.data ?? []).map((p) => [p.portfolio_key, p])), [projects.data]);
  if (projects.loading && !projects.data) return <Loading />;
  return (
    <div>
      <PageTitle title="Project dashboards" description="The four HQ priorities, in order. Priority guides where time goes when work clashes; it never means a project waits. Operating timeline: December 2026 – August 2027." />
      <ErrorLine message={projects.error ?? tasks.error} />
      <div className="grid gap-4 md:grid-cols-2" data-testid="os-portfolio">
        {PORTFOLIO.map((pj) => {
          const row = byKey.get(pj.key);
          const st = taskStats((tasks.data ?? []).filter((t) => row && t.project_id === row.id));
          const lead = Object.entries(pj.divisions as Record<string, { role: string }>).filter(([, v]) => v.role.startsWith("Lead")).map(([k]) => ({ OPS: "Operations", PAR: "Business", PPL: "People", GRO: "Growth", MKT: "Marketing", CRE: "Creative" } as Record<string, string>)[k]);
          return (
            <Link key={pj.key} href={`/os/portfolio/${pj.key}`} className={cn(panel, "block overflow-hidden hover:border-[#C9D1DB]", ring)} data-testid={`os-portfolio-card-${pj.key}`}>
              <div className="h-1.5" style={{ backgroundColor: accentOf(pj.key) }} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: accentOf(pj.key) }}>Priority #{pj.rank}</p>
                    <h2 className="text-lg font-semibold text-[#1F2D3D]">{pj.name}</h2>
                  </div>
                  {row ? <StatusBadge value={row.status} /> : <Badge tone="amber">No project yet</Badge>}
                </div>
                <p className={cn("mt-1 text-sm", muted)}>{pj.one_liner}</p>
                <p className="mt-2 text-xs text-[#3A4B60]">Lead: {lead.join(" + ")}</p>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[["Open", st.open], ["Overdue", st.overdue], ["Due 14 d", st.soon], ["Done", st.done]].map(([l, v]) => (
                    <div key={l as string} className="rounded-lg bg-[#F5F7FA] py-1.5"><p className={cn("text-base font-semibold tabular-nums", l === "Overdue" && Number(v) > 0 && "text-[#A12D2F]")}>{v}</p><p className={cn("text-[11px]", muted)}>{l}</p></div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

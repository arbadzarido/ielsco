"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { PROJECT_COLUMNS, ProjectSheet, type ProjectRow } from "@/components/os/work-forms";
import { Empty, Loading, Progress, PageTitle, RowList, Select, StatusBadge, ErrorLine, btnPrimary, input } from "@/components/os/ui";
import { PROJECT_STATUSES, WORKSPACES, companyName, fmtDate, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const dir = useDirectory();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [division, setDivision] = useState(params.get("division") ?? "");
  const [showClosed, setShowClosed] = useState(false);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const projects = useQuery<ProjectRow[]>((s) => s.from("os_projects").select(PROJECT_COLUMNS).order("due_date", { nullsFirst: false }), []);
  const tasks = useQuery<{ project_id: string; status: string }[]>((s) => s.from("os_tasks").select("project_id, status").not("project_id", "is", null), []);
  const counts = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>();
    (tasks.data ?? []).forEach((t) => {
      if (t.status === "Cancelled") return;
      const c = m.get(t.project_id) ?? { done: 0, total: 0 };
      c.total++; if (t.status === "Done") c.done++;
      m.set(t.project_id, c);
    });
    return m;
  }, [tasks.data]);
  const rows = (projects.data ?? []).filter((p) =>
    (showClosed || !["Completed", "Cancelled"].includes(p.status)) && (!status || p.status === status) && (!company || p.company_code === company)
    && (!division || p.division_id === division) && (!q || `${p.id} ${p.name} ${p.description ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageTitle title="Projects" description="Projects and initiatives across HQ, IELSco and Elco AI that you can see."
        actions={<button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-new-project"><Plus size={16} aria-hidden="true" />New project</button>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search projects</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className={cn(input, "pl-8")} />
        </label>
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={PROJECT_STATUSES} placeholder="Any status" className="md:w-40" />
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-40" />
        <Select ariaLabel="Division" value={division} onChange={setDivision} options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} placeholder="All divisions" className="col-span-2 md:w-48" />
        <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />Show completed and cancelled</label>
      </div>
      <ErrorLine message={projects.error} />
      {projects.loading && !projects.data ? <Loading /> : (
        <RowList testId="os-project-list" rows={rows} rowKey={(p) => p.id} rowHref={(p) => `/os/projects/${p.id}`}
          empty={<Empty title={projects.data?.length ? "No projects match" : "No projects yet"} body={projects.data?.length ? "Clear the filters to see more." : "Create the first project for your division. Tasks, documents and decisions can then be linked to it."}
            action={<button type="button" className={btnPrimary} onClick={() => setCreating(true)}>New project</button>} />}
          columns={[
            { key: "name", label: "Project", primary: true, className: "w-[34%]", render: (p) => <span className="truncate">{p.name}</span> },
            { key: "status", label: "Status", className: "w-28", render: (p) => <StatusBadge value={p.status} /> },
            { key: "owner", label: "Owner", className: "w-32", render: (p) => <span className="truncate">{personLabel(dir?.peopleById ?? new Map(), p.owner_person_id)}</span> },
            { key: "where", label: "Company", className: "w-36", render: (p) => <span className="truncate text-xs text-[#66768A]">{companyName(p.company_code)}{p.division_id ? ` · ${dir?.divisionById.get(p.division_id)?.name ?? ""}` : ""}</span> },
            { key: "progress", label: "Progress", className: "w-32", render: (p) => <Progress {...(counts.get(p.id) ?? { done: 0, total: 0 })} /> },
            { key: "due", label: "Deadline", className: "w-32", render: (p) => { const r = !["Completed", "Cancelled"].includes(p.status) ? relativeDue(p.due_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{p.due_date ? (r?.overdue ? r.label : fmtDate(p.due_date)) : "—"}</span>; } },
          ]} />
      )}
      <ProjectSheet open={creating} defaults={{ company_code: company || undefined, division_id: division || undefined }} onClose={() => setCreating(false)} onSaved={(id) => router.push(`/os/projects/${id}`)} />
    </div>
  );
}

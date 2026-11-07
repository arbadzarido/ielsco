"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { TASK_COLUMNS, TaskSheet, type TaskRow } from "@/components/os/work-forms";
import { Avatar, Badge, Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, Tabs, btnPrimary, input, panel, ring } from "@/components/os/ui";
import { BOARD_COLUMNS, PRIORITIES, TASK_STATUSES, WORKSPACES, companyName, isOpenTask, personLabel, relativeDue, todayJakarta, addDays } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

// Tasks: My tasks, Team tasks, a list of everything visible, a Kanban board and upcoming deadlines. All views read the
// same RLS-filtered rows; the view only changes how they are filtered and arranged.
const VIEWS = [
  { key: "mine", label: "My tasks" },
  { key: "team", label: "Team tasks" },
  { key: "list", label: "All tasks" },
  { key: "board", label: "Board" },
  { key: "upcoming", label: "Upcoming deadlines" },
];

export default function TasksPage() {
  const params = useSearchParams();
  const router = useRouter();
  const view = VIEWS.some((v) => v.key === params.get("view")) ? params.get("view")! : "mine";
  const { me, supabase } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [showDone, setShowDone] = useState(false);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [err, setErr] = useState<string | null>(null);

  const tasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).is("parent_task_id", null).order("due_date", { ascending: true, nullsFirst: false }).limit(1000), []);
  const assigns = useQuery<{ task_id: string; person_id: string }[]>((s) => s.from("os_task_assignees").select("task_id, person_id"), []);
  const projects = useQuery<{ id: string; name: string }[]>((s) => s.from("os_projects").select("id, name"), []);
  const projectName = useMemo(() => new Map((projects.data ?? []).map((p) => [p.id, p.name])), [projects.data]);
  const assignees = useMemo(() => {
    const m = new Map<string, string[]>();
    (assigns.data ?? []).forEach((a) => m.set(a.task_id, [...(m.get(a.task_id) ?? []), a.person_id]));
    return m;
  }, [assigns.data]);

  const myDivisions = new Set(me.divisions.map((d) => d.division_id));
  const today = todayJakarta();
  const mine = (t: TaskRow) => t.owner_person_id === me.person.id || (assignees.get(t.id) ?? []).includes(me.person.id) || t.reviewer_person_id === me.person.id;

  const filtered = (tasks.data ?? []).filter((t) => {
    if (view === "mine" && !mine(t)) return false;
    if (view === "team" && !(t.division_id && myDivisions.has(t.division_id))) return false;
    if (view === "upcoming" && (!t.due_date || !isOpenTask(t.status) || t.due_date > addDays(today, 14))) return false;
    if (view !== "board" && !showDone && !isOpenTask(t.status) && view !== "upcoming") return false;
    if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (company && t.company_code !== company) return false;
    if (q && !`${t.id} ${t.title} ${t.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function move(t: TaskRow, next: string) {
    setErr(null);
    const { data, error } = await supabase.from("os_tasks").update({ status: next }).eq("id", t.id).select("id").maybeSingle();
    if (error || !data) setErr(error ? friendlyError(error.message) : "You can't move this task.");
    tasks.reload();
  }

  const ownerCell = (t: TaskRow) => (
    <span className="flex min-w-0 items-center gap-1.5">
      <Avatar name={personLabel(people, t.owner_person_id)} size={20} />
      <span className="truncate">{personLabel(people, t.owner_person_id)}</span>
      {(assignees.get(t.id)?.length ?? 0) > 0 && <span className="text-xs text-[#66768A]">+{assignees.get(t.id)!.length}</span>}
    </span>
  );
  const dueCell = (t: TaskRow) => {
    const r = isOpenTask(t.status) ? relativeDue(t.due_date, today) : null;
    if (!t.due_date) return <span className="text-[#8593A3]">No date</span>;
    return <span className={cn(r?.overdue && "font-medium text-[#A12D2F]", r?.soon && "text-[#865400]")}>{r ? r.label : t.due_date}</span>;
  };

  return (
    <div>
      <PageTitle title="Tasks" description="Everything assigned to you and your teams, filtered by what you're allowed to see."
        actions={<button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-new-task"><Plus size={16} aria-hidden="true" />New task</button>} />
      <Tabs label="Task views" tabs={VIEWS} current={view} hrefFor={(k) => `/os/tasks?view=${k}`} />

      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search tasks</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className={cn(input, "pl-8")} data-testid="os-task-search" />
        </label>
        {view !== "board" && <Select ariaLabel="Status" value={status} onChange={setStatus} options={TASK_STATUSES} placeholder="Any status" className="md:w-40" />}
        <Select ariaLabel="Priority" value={priority} onChange={setPriority} options={PRIORITIES} placeholder="Any priority" className="md:w-40" />
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-40" />
        {view !== "board" && view !== "upcoming" && (
          <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-4 w-4" /> Show done and cancelled
          </label>
        )}
      </div>
      <ErrorLine message={err ?? tasks.error} />

      {tasks.loading && !tasks.data ? <Loading /> : view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" data-testid="os-task-board">
          <div className="grid min-w-[960px] grid-cols-6 gap-3">
            {BOARD_COLUMNS.map((col) => {
              const items = filtered.filter((t) => t.status === col);
              return (
                <section key={col} aria-label={col} className="flex min-h-40 flex-col rounded-xl bg-[#EEF1F5] p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); const t = filtered.find((x) => x.id === id); if (t && t.status !== col) move(t, col); }}>
                  <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-[#3A4B60]">{col}<span className="text-[#8593A3]">{items.length}</span></h2>
                  <ul className="space-y-2">
                    {items.map((t) => (
                      <li key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} className={cn(panel, "p-2.5 text-sm")}>
                        <Link href={`/os/tasks/${t.id}`} className={cn("block font-medium text-[#1F2D3D] hover:underline", ring, "rounded")}>{t.title}</Link>
                        <p className="mt-1 truncate text-xs text-[#66768A]">{t.id}{t.project_id ? ` · ${projectName.get(t.project_id) ?? t.project_id}` : ""}</p>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs">{ownerCell(t)}{t.due_date && <span className="shrink-0">{dueCell(t)}</span>}</div>
                        <label className="mt-2 block">
                          <span className="sr-only">Move {t.title} to</span>
                          <Select ariaLabel={`Move ${t.id}`} value={t.status} onChange={(v) => move(t, v)} options={TASK_STATUSES} className="min-h-8 py-1 text-xs" />
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <RowList testId="os-task-list" rows={filtered} rowKey={(t) => t.id} rowHref={(t) => `/os/tasks/${t.id}`}
          empty={<Empty title={view === "mine" ? "Nothing assigned to you" : view === "upcoming" ? "No deadlines in the next 14 days" : "No tasks match"}
            body={view === "mine" ? "Tasks you own, are assigned to, or review show up here." : "Try clearing the filters, or create the first task."}
            action={<button type="button" className={btnPrimary} onClick={() => setCreating(true)}>New task</button>} />}
          columns={[
            { key: "title", label: "Task", primary: true, className: "w-[40%]", render: (t) => <span className="truncate">{t.title}</span> },
            { key: "status", label: "Status", className: "w-28", render: (t) => <StatusBadge value={t.status} /> },
            { key: "priority", label: "Priority", className: "w-28", render: (t) => t.priority === "P3 Normal" || t.priority === "P4 Low" ? <span className="text-xs text-[#66768A]">{t.priority.slice(3)}</span> : <StatusBadge value={t.priority} /> },
            { key: "owner", label: "Owner", className: "w-36", render: ownerCell },
            { key: "due", label: "Due", className: "w-32", render: dueCell },
            { key: "where", label: "Project", className: "w-40", hideOnMobile: true, render: (t) => <span className="truncate text-xs text-[#66768A]">{t.project_id ? projectName.get(t.project_id) ?? t.project_id : companyName(t.company_code)}</span> },
          ]} />
      )}
      {view === "team" && !me.divisions.length && <p className="mt-3 text-sm text-[#66768A]">You aren&apos;t in a division yet, so there is no team list. <Badge>Ask a founder to add you to one</Badge></p>}

      <TaskSheet open={creating} defaults={company ? { company_code: company } : undefined} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); router.push(`/os/tasks/${id}`); }} />
    </div>
  );
}

"use client";

// Spreadsheet-style task table: one row per task, every field edited in the row (status, PIC, department, division,
// project, deadline, priority). Writes go straight to os_tasks as the signed-in person, so RLS and the task triggers
// decide what is allowed; a refused edit puts the row back and says why. Used by /os/tasks, division workspaces and
// project dashboards (with fixed filters).
import Link from "next/link";
import { Fragment, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { announceDataChanged, friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { useDefaultCompany } from "@/components/os/pickers";
import { ErrorLine, Loading, Select, btn, input, muted, ring } from "@/components/os/ui";
import { PRIORITIES, TASK_STATUSES, addDays, personLabel, todayJakarta } from "@/lib/os/meta";
import {
  DEPARTMENTS, DIVISIONS, GROUPS, PRIORITY_COLOURS, RETIRED_DIVISIONS, STATUS_COLOURS, departmentOfDivision,
  divisionById, filterTasks, groupTasks, monthKey, monthLabel, type GridTask, type GroupKey, type TaskFilter,
} from "@/lib/os/org";
import { cn } from "@/lib/utils";

const COLS = "id, title, status, priority, owner_person_id, due_date, division_id, department, project_id, company_code, parent_task_id";
type Row = GridTask & { parent_task_id: string | null };

export interface GridPreset { view?: string; group?: GroupKey; filter?: TaskFilter }
export const TASK_VIEWS: { key: string; label: string; preset: GridPreset }[] = [
  { key: "all", label: "All tasks", preset: { group: "none" } },
  { key: "mine", label: "My tasks", preset: { group: "month" } },
  { key: "project", label: "By project", preset: { group: "project" } },
  { key: "department", label: "By department", preset: { group: "department" } },
  { key: "month", label: "By month", preset: { group: "month" } },
  { key: "overdue", label: "Overdue", preset: { group: "owner" } },
  { key: "upcoming", label: "Upcoming deadlines", preset: { group: "month" } },
  { key: "stale", label: "Needs cleanup", preset: { group: "project" } },
];

const cell = "border-b border-[#EEF1F5] px-2 py-1 align-middle";
const head = "sticky top-0 z-10 border-b border-[#DDE2E8] bg-[#F7F8FA] px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#66768A]";
const inlineSel = `w-full min-w-0 cursor-pointer truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] hover:border-[#DDE2E8] focus:border-[#577E90] disabled:cursor-default disabled:hover:border-transparent ${ring}`;

/** The task table. `fixed` filters are applied and their controls hidden (for a project or division page). */
export function TaskGrid({ view = "all", fixed = {}, initialGroup, compact = false, testId = "os-task-grid", showViewHint = true }: {
  view?: string; fixed?: TaskFilter; initialGroup?: GroupKey; compact?: boolean; testId?: string; showViewHint?: boolean;
}) {
  const { me, supabase } = useOsMe();
  const dir = useDirectory();
  const defCompany = useDefaultCompany();
  const people = dir?.peopleById ?? new Map();
  const staff = useMemo(() => (dir?.people ?? []).filter((p) => p.status === "active" || p.status === "onboarding").filter((p) => p.org_role !== "guest"), [dir]);
  const preset = TASK_VIEWS.find((v) => v.key === view)?.preset ?? {};
  const [group, setGroup] = useState<GroupKey>(initialGroup ?? preset.group ?? "none");
  const [f, setF] = useState<TaskFilter>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const [patches, setPatches] = useState<Record<string, Partial<Row>>>({});
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const newRef = useRef<HTMLInputElement>(null);

  const tasks = useQuery<Row[]>((s) => s.from("os_tasks").select(COLS).is("parent_task_id", null).order("due_date", { ascending: true, nullsFirst: false }).order("id").limit(2000), []);
  const assigns = useQuery<{ task_id: string; person_id: string }[]>((s) => s.from("os_task_assignees").select("task_id, person_id"), []);
  const projects = useQuery<{ id: string; name: string; status: string; portfolio_key: string | null }[]>((s) => s.from("os_projects").select("id, name, status, portfolio_key").order("portfolio_rank", { ascending: true, nullsFirst: false }).order("name"), []);
  const projectName = useMemo(() => new Map((projects.data ?? []).map((p) => [p.id, p.name])), [projects.data]);
  const assignees = useMemo(() => {
    const m = new Map<string, string[]>();
    (assigns.data ?? []).forEach((a) => m.set(a.task_id, [...(m.get(a.task_id) ?? []), a.person_id]));
    return m;
  }, [assigns.data]);

  const today = todayJakarta();
  const merged = useMemo(() => (tasks.data ?? []).map((t) => ({ ...t, ...(patches[t.id] ?? {}) })), [tasks.data, patches]);
  const filter: TaskFilter = { ...f, ...fixed };
  const rows = filterTasks(merged, filter, view, { me: me.person.id, assignees, today, soon: addDays(today, 14) });
  const months = useMemo(() => [...new Set(merged.map((t) => monthKey(t.due_date)))].sort((a, b) => (a === "none" ? 1 : b === "none" ? -1 : a.localeCompare(b))), [merged]);

  const label = (key: string): string => {
    if (key === "none") return group === "owner" ? "No PIC" : group === "project" ? "No project" : group === "department" ? "No department" : group === "division" ? "No division" : "None";
    switch (group) {
      case "project": return projectName.get(key) ?? key;
      case "department": return DEPARTMENTS.find((d) => d.key === key)?.name ?? key;
      case "division": return divisionById(key)?.name ?? RETIRED_DIVISIONS[key] ?? key;
      case "month": return monthLabel(key);
      case "owner": return personLabel(people, key);
      default: return key;
    }
  };
  const groups = groupTasks(rows, group, label);

  async function save(t: Row, patch: Partial<Row>) {
    setErr(null);
    setRowErr((e) => { const n = { ...e }; delete n[t.id]; return n; });
    setPatches((p) => ({ ...p, [t.id]: { ...(p[t.id] ?? {}), ...patch } }));
    const { data, error } = await supabase.from("os_tasks").update(patch).eq("id", t.id).select(COLS).maybeSingle();
    if (error || !data) {
      setRowErr((e) => ({ ...e, [t.id]: error ? friendlyError(error.message) : "You can't edit this task." }));
      setPatches((p) => { const n = { ...p }; delete n[t.id]; return n; });
      return;
    }
    // The database may have adjusted other fields (department from division, division cleared): keep its answer.
    setPatches((p) => ({ ...p, [t.id]: data as Row }));
    announceDataChanged();
  }

  async function add() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true); setErr(null);
    const project = fixed.project && fixed.project !== "none" ? fixed.project : f.project && f.project !== "none" ? f.project : null;
    const division = fixed.division && fixed.division !== "none" ? fixed.division : f.division && f.division !== "none" ? f.division : null;
    const department = fixed.department ?? f.department ?? (division ? departmentOfDivision(division) : null);
    const { error } = await supabase.from("os_tasks").insert({
      title, company_code: defCompany, project_id: project, division_id: division, department: department && department !== "none" ? department : null,
      owner_person_id: me.person.id, status: "Backlog", priority: "P3 Normal",
    });
    setAdding(false);
    if (error) { setErr(friendlyError(error.message)); return; }
    setNewTitle(""); tasks.reload(); announceDataChanged(); newRef.current?.focus();
  }

  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const show = (k: keyof TaskFilter) => !(k in fixed);
  const divisionOptions = (dept: string | null) => DIVISIONS.filter((d) => !dept || d.department === dept);

  if (tasks.loading && !tasks.data) return <Loading />;
  return (
    <div data-testid={testId}>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative w-full sm:w-56">
            <span className="sr-only">Search tasks</span>
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
            <input value={f.q ?? ""} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search tasks" className={cn(input, "pl-8")} data-testid="os-task-search" />
          </label>
          {show("project") && <Select ariaLabel="Project" value={f.project ?? ""} onChange={(v) => setF({ ...f, project: v || undefined })} placeholder="All projects" className="w-auto min-w-36"
            options={[...(projects.data ?? []).filter((p) => !["Completed", "Cancelled"].includes(p.status)).map((p) => ({ value: p.id, label: p.name })), { value: "none", label: "No project" }]} />}
          {show("department") && <Select ariaLabel="Department" value={f.department ?? ""} onChange={(v) => setF({ ...f, department: v || undefined, division: undefined })} placeholder="All departments" className="w-auto min-w-36"
            options={[...DEPARTMENTS.map((d) => ({ value: d.key, label: d.short })), { value: "none", label: "No department" }]} />}
          {show("division") && <Select ariaLabel="Division" value={f.division ?? ""} onChange={(v) => setF({ ...f, division: v || undefined })} placeholder="All divisions" className="w-auto min-w-32"
            options={[...divisionOptions(f.department && f.department !== "none" ? f.department : null).map((d) => ({ value: d.id, label: d.name })), { value: "none", label: "No division" }]} />}
          <Select ariaLabel="Month" value={f.month ?? ""} onChange={(v) => setF({ ...f, month: v || undefined })} placeholder="Any month" className="w-auto min-w-32" options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
          <Select ariaLabel="Status" value={f.status ?? ""} onChange={(v) => setF({ ...f, status: v || undefined })} placeholder="Open statuses" className="w-auto min-w-32" options={TASK_STATUSES} />
          {show("owner") && view !== "mine" && <Select ariaLabel="PIC" value={f.owner ?? ""} onChange={(v) => setF({ ...f, owner: v || undefined })} placeholder="Any PIC" className="w-auto min-w-28"
            options={[...staff.map((p) => ({ value: p.id, label: p.short_name || p.full_name })), { value: "none", label: "No PIC" }]} />}
          <Select ariaLabel="Group by" value={group} onChange={(v) => setGroup(v as GroupKey)} options={GROUPS.map((g) => ({ value: g.key, label: `Group: ${g.label}` }))} className="w-auto min-w-36" />
          <label className="flex min-h-9 items-center gap-1.5 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={!!f.showDone} onChange={(e) => setF({ ...f, showDone: e.target.checked })} />Done &amp; cancelled</label>
          {(Object.keys(f).length > 0) && <button type="button" className={cn(btn, "min-h-9")} onClick={() => setF({})}>Clear</button>}
        </div>
      )}
      {showViewHint && view === "stale" && (
        <p className={cn("mb-3 rounded-lg bg-[#FDF6CC] px-3 py-2 text-sm text-[#6B5200]")} data-testid="os-task-stale-hint">
          Backlog tasks whose deadline has passed. Nothing here is deleted: for each one, set a new deadline, move it on, or set it to Cancelled with a reason in the task. Cancelled tasks stay searchable with “Done &amp; cancelled”.
        </p>
      )}
      <ErrorLine message={err ?? tasks.error} />
      <div className="overflow-x-auto rounded-xl border border-[#E6E9EE] bg-white">
        <table className="w-full min-w-[980px] border-collapse text-[13px]" data-testid={`${testId}-table`}>
          <colgroup>
            <col className="w-[30%]" /><col className="w-[118px]" /><col className="w-[120px]" /><col className="w-[110px]" /><col className="w-[118px]" />
            <col className="w-[170px]" /><col className="w-[132px]" /><col className="w-[104px]" />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(head, "sticky left-0 z-20")}>Task</th><th className={head}>Status</th><th className={head}>PIC</th><th className={head}>Department</th>
              <th className={head}>Division</th><th className={head}>Project</th><th className={head}>Deadline</th><th className={head}>Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#FBFCFD]">
              <td className={cn(cell, "sticky left-0 bg-[#FBFCFD]")} colSpan={8}>
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
                  <Plus size={14} className="shrink-0 text-[#8593A3]" aria-hidden="true" />
                  <input ref={newRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={adding} placeholder="Add a task and press Enter (you are the PIC; change it in the row)"
                    aria-label="New task title" className="min-h-8 w-full bg-transparent text-[13px] placeholder:text-[#8593A3] focus:outline-none" data-testid="os-task-quick-add" />
                </form>
              </td>
            </tr>
            {groups.map((g) => (
              <Fragment key={g.key}>
                {group !== "none" && (
                  <tr className="bg-[#F3F5F8]">
                    <td colSpan={8} className="border-b border-[#E6E9EE] px-2 py-1">
                      <button type="button" onClick={() => toggle(g.key)} className={cn("flex items-center gap-1.5 text-[12px] font-semibold text-[#1F2D3D]", ring, "rounded")} aria-expanded={!collapsed.has(g.key)}>
                        {collapsed.has(g.key) ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                        {g.label}<span className="font-normal text-[#66768A]">{g.rows.length}</span>
                      </button>
                    </td>
                  </tr>
                )}
                {!collapsed.has(g.key) && g.rows.map((t) => {
                  const overdue = !!t.due_date && t.due_date < today && !["Done", "Cancelled"].includes(t.status);
                  const sc = STATUS_COLOURS[t.status] ?? STATUS_COLOURS.Backlog;
                  const pc = PRIORITY_COLOURS[t.priority] ?? PRIORITY_COLOURS["P3 Normal"];
                  const dept = t.department ?? departmentOfDivision(t.division_id);
                  const retired = t.division_id && !divisionById(t.division_id);
                  return (
                    <Fragment key={t.id}>
                      <tr className="group hover:bg-[#FAFBFC]" data-testid="os-task-row" data-task={t.id}>
                        <td className={cn(cell, "sticky left-0 bg-white group-hover:bg-[#FAFBFC]")}>
                          <div className="flex min-w-0 items-center gap-2">
                            <Link href={`/os/tasks/${t.id}`} className={cn("truncate font-medium text-[#1F2D3D] hover:underline", ring, "rounded")} title={t.title}>{t.title}</Link>
                            <span className="shrink-0 text-[11px] text-[#8593A3]">{t.id}</span>
                          </div>
                        </td>
                        <td className={cell}>
                          <select aria-label={`Status of ${t.id}`} value={t.status} onChange={(e) => save(t, { status: e.target.value })} data-testid="os-cell-status"
                            className={cn(inlineSel, "font-medium")} style={{ backgroundColor: sc.bg, color: sc.fg }}>
                            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className={cell}>
                          <select aria-label={`PIC of ${t.id}`} value={t.owner_person_id ?? ""} onChange={(e) => save(t, { owner_person_id: e.target.value || null })} className={inlineSel} data-testid="os-cell-owner">
                            <option value="">No PIC</option>
                            {staff.map((p) => <option key={p.id} value={p.id}>{p.short_name || p.full_name}</option>)}
                            {t.owner_person_id && !staff.some((p) => p.id === t.owner_person_id) && <option value={t.owner_person_id}>{personLabel(people, t.owner_person_id)}</option>}
                          </select>
                        </td>
                        <td className={cell}>
                          <select aria-label={`Department of ${t.id}`} value={dept ?? ""} onChange={(e) => save(t, { department: e.target.value || null })} className={inlineSel} data-testid="os-cell-department">
                            <option value="">—</option>
                            {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.short}</option>)}
                          </select>
                        </td>
                        <td className={cell}>
                          <select aria-label={`Division of ${t.id}`} value={t.division_id ?? ""} onChange={(e) => save(t, { division_id: e.target.value || null })} className={inlineSel} data-testid="os-cell-division">
                            <option value="">—</option>
                            {divisionOptions(dept).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            {retired && <option value={t.division_id!}>{RETIRED_DIVISIONS[t.division_id!] ?? t.division_id}</option>}
                          </select>
                        </td>
                        <td className={cell}>
                          <select aria-label={`Project of ${t.id}`} value={t.project_id ?? ""} onChange={(e) => save(t, { project_id: e.target.value || null })} className={inlineSel} data-testid="os-cell-project">
                            <option value="">—</option>
                            {(projects.data ?? []).filter((p) => p.id === t.project_id || !["Completed", "Cancelled"].includes(p.status)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className={cell}>
                          <input type="date" aria-label={`Deadline of ${t.id}`} value={t.due_date ?? ""} onChange={(e) => save(t, { due_date: e.target.value || null })} data-testid="os-cell-due"
                            className={cn(inlineSel, "tabular-nums", overdue && "font-semibold text-[#A12D2F]")} title={overdue ? "Overdue" : undefined} />
                        </td>
                        <td className={cell}>
                          <select aria-label={`Priority of ${t.id}`} value={t.priority} onChange={(e) => save(t, { priority: e.target.value })} className={cn(inlineSel, "font-medium")}
                            style={{ backgroundColor: pc.bg, color: pc.fg }} data-testid="os-cell-priority">
                            {PRIORITIES.map((p) => <option key={p} value={p}>{p.slice(3)}</option>)}
                          </select>
                        </td>
                      </tr>
                      {rowErr[t.id] && <tr><td colSpan={8} className="border-b border-[#F1C9CA] bg-[#FDF2F2] px-3 py-1 text-xs text-[#A12D2F]" role="alert">{t.id}: {rowErr[t.id]}</td></tr>}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
            {!rows.length && <tr><td colSpan={8} className={cn("px-3 py-8 text-center text-sm", muted)}>No tasks match. Clear the filters or add one above.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className={cn("mt-2 text-xs", muted)} data-testid={`${testId}-count`}>
        {rows.length} task{rows.length === 1 ? "" : "s"}{rows.length !== merged.length ? ` of ${merged.length} you can see` : ""}. Department follows the division; changing the department clears a division from the other department.
      </p>
    </div>
  );
}

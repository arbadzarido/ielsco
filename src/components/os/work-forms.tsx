"use client";

// Create and edit forms for projects and tasks, shown in a side sheet. The database decides what is allowed
// (os_can_create / os_can_edit_*); a refusal is shown in plain words and nothing is saved.
import { useEffect, useState } from "react";
import { friendlyError, useQuery } from "./data";
import { useOsMe } from "./OsProvider";
import { CompanySelect, DivisionSelect, PersonSelect, useDefaultCompany } from "./pickers";
import { ErrorLine, Field, Select, Sheet, btn, btnPrimary, input } from "./ui";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES, SENSITIVITIES, TASK_STATUSES } from "@/lib/os/meta";

export interface ProjectRow {
  id: string; company_code: string; division_id: string | null; name: string; project_type: string | null; description: string | null;
  definition_of_done: string | null; success_metric: string | null; owner_person_id: string | null; status: string; priority: string;
  start_date: string | null; due_date: string | null; sensitivity: string; next_action: string | null; created_at: string; updated_at: string;
}
export const PROJECT_COLUMNS = "id, company_code, division_id, name, project_type, description, definition_of_done, success_metric, owner_person_id, status, priority, start_date, due_date, sensitivity, next_action, created_at, updated_at";

export interface TaskRow {
  id: string; project_id: string | null; parent_task_id: string | null; company_code: string; division_id: string | null; title: string;
  description: string | null; definition_of_done: string | null; owner_person_id: string | null; reviewer_person_id: string | null;
  status: string; priority: string; due_date: string | null; blocker: string | null; sensitivity: string; completed_at: string | null;
  created_at: string; updated_at: string; sort_order: number;
}
export const TASK_COLUMNS = "id, project_id, parent_task_id, company_code, division_id, title, description, definition_of_done, owner_person_id, reviewer_person_id, status, priority, due_date, blocker, sensitivity, completed_at, created_at, updated_at, sort_order";

const blank = (v: string) => (v.trim() === "" ? null : v.trim());

export function ProjectSheet({ open, onClose, onSaved, project, defaults }: {
  open: boolean; onClose: () => void; onSaved: (id: string) => void; project?: ProjectRow | null; defaults?: { company_code?: string; division_id?: string };
}) {
  const { supabase, me } = useOsMe();
  const defCompany = useDefaultCompany();
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF({
      company_code: project?.company_code ?? defaults?.company_code ?? defCompany, division_id: project?.division_id ?? defaults?.division_id ?? me.divisions[0]?.division_id ?? "",
      name: project?.name ?? "", project_type: project?.project_type ?? "", description: project?.description ?? "",
      definition_of_done: project?.definition_of_done ?? "", success_metric: project?.success_metric ?? "",
      owner_person_id: project?.owner_person_id ?? me.person.id, status: project?.status ?? "Proposed", priority: project?.priority ?? "P3 Normal",
      start_date: project?.start_date ?? "", due_date: project?.due_date ?? "", sensitivity: project?.sensitivity ?? "Internal", next_action: project?.next_action ?? "",
    });
  }, [open, project, defaults?.company_code, defaults?.division_id, defCompany, me]);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    if (!f.name?.trim()) return setErr("Give the project a name.");
    if (f.start_date && f.due_date && f.due_date < f.start_date) return setErr("The deadline is before the start date.");
    setBusy(true); setErr(null);
    const row: Record<string, unknown> = {
      division_id: blank(f.division_id), name: f.name.trim(), project_type: blank(f.project_type), description: blank(f.description),
      definition_of_done: blank(f.definition_of_done), success_metric: blank(f.success_metric), owner_person_id: blank(f.owner_person_id),
      status: f.status, priority: f.priority, start_date: blank(f.start_date), due_date: blank(f.due_date), sensitivity: f.sensitivity, next_action: blank(f.next_action),
    };
    const res = project
      ? await supabase.from("os_projects").update(row).eq("id", project.id).select("id").maybeSingle()
      : await supabase.from("os_projects").insert({ ...row, company_code: f.company_code }).select("id").single();
    setBusy(false);
    if (res.error || !res.data) return setErr(res.error ? friendlyError(res.error.message) : "You don't have permission to change this project.");
    onSaved(res.data.id);
  }

  return (
    <Sheet open={open} onClose={onClose} title={project ? `Edit ${project.id}` : "New project"} wide
      footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="os-project-save">{busy ? "Saving…" : "Save project"}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">{(id) => <input id={id} className={input} value={f.name ?? ""} onChange={(e) => set("name")(e.target.value)} maxLength={200} data-testid="os-project-name" />}</Field>
        {!project && <Field label="Company">{(id) => <CompanySelect id={id} value={f.company_code ?? ""} onChange={set("company_code")} />}</Field>}
        <Field label="Division">{(id) => <DivisionSelect id={id} value={f.division_id ?? ""} onChange={set("division_id")} />}</Field>
        <Field label="Owner">{(id) => <PersonSelect id={id} value={f.owner_person_id ?? ""} onChange={set("owner_person_id")} />}</Field>
        <Field label="Type">{(id) => <Select id={id} value={f.project_type ?? ""} onChange={set("project_type")} options={PROJECT_TYPES} placeholder="—" />}</Field>
        <Field label="Status">{(id) => <Select id={id} value={f.status ?? ""} onChange={set("status")} options={PROJECT_STATUSES} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} value={f.priority ?? ""} onChange={set("priority")} options={PRIORITIES} />}</Field>
        <Field label="Start date">{(id) => <input id={id} type="date" className={input} value={f.start_date ?? ""} onChange={(e) => set("start_date")(e.target.value)} />}</Field>
        <Field label="Deadline">{(id) => <input id={id} type="date" className={input} value={f.due_date ?? ""} onChange={(e) => set("due_date")(e.target.value)} />}</Field>
        <Field label="Sensitivity" hint="Confidential: your division only. Restricted: founders only.">{(id) => <Select id={id} value={f.sensitivity ?? ""} onChange={set("sensitivity")} options={SENSITIVITIES} />}</Field>
        <Field label="Description" className="sm:col-span-2">{(id) => <textarea id={id} rows={3} className={input} value={f.description ?? ""} onChange={(e) => set("description")(e.target.value)} />}</Field>
        <Field label="Definition of done" className="sm:col-span-2">{(id) => <textarea id={id} rows={2} className={input} value={f.definition_of_done ?? ""} onChange={(e) => set("definition_of_done")(e.target.value)} />}</Field>
        <Field label="Success metric">{(id) => <input id={id} className={input} value={f.success_metric ?? ""} onChange={(e) => set("success_metric")(e.target.value)} />}</Field>
        <Field label="Next action">{(id) => <input id={id} className={input} value={f.next_action ?? ""} onChange={(e) => set("next_action")(e.target.value)} />}</Field>
      </div>
      <div className="mt-4"><ErrorLine message={err} /></div>
    </Sheet>
  );
}

export function TaskSheet({ open, onClose, onSaved, task, defaults }: {
  open: boolean; onClose: () => void; onSaved: (id: string) => void; task?: TaskRow | null;
  defaults?: { project_id?: string; parent_task_id?: string; company_code?: string; division_id?: string; owner_person_id?: string };
}) {
  const { supabase, me } = useOsMe();
  const defCompany = useDefaultCompany();
  const projects = useQuery<{ id: string; name: string; company_code: string }[]>(
    (s) => s.from("os_projects").select("id, name, company_code").not("status", "in", "(Completed,Cancelled)").order("name"), [open]);
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF({
      title: task?.title ?? "", project_id: task?.project_id ?? defaults?.project_id ?? "", company_code: task?.company_code ?? defaults?.company_code ?? defCompany,
      division_id: task?.division_id ?? defaults?.division_id ?? "", owner_person_id: task?.owner_person_id ?? defaults?.owner_person_id ?? me.person.id,
      reviewer_person_id: task?.reviewer_person_id ?? "", status: task?.status ?? "Backlog", priority: task?.priority ?? "P3 Normal",
      due_date: task?.due_date ?? "", description: task?.description ?? "", definition_of_done: task?.definition_of_done ?? "",
      blocker: task?.blocker ?? "", sensitivity: task?.sensitivity ?? "Internal",
    });
  }, [open, task, defaults?.project_id, defaults?.company_code, defaults?.division_id, defaults?.owner_person_id, defCompany, me]);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const isSub = Boolean(task?.parent_task_id ?? defaults?.parent_task_id);

  async function save() {
    if (!f.title?.trim()) return setErr("Give the task a title.");
    setBusy(true); setErr(null);
    const row: Record<string, unknown> = {
      title: f.title.trim(), owner_person_id: blank(f.owner_person_id), reviewer_person_id: blank(f.reviewer_person_id), status: f.status,
      priority: f.priority, due_date: blank(f.due_date), description: blank(f.description), definition_of_done: blank(f.definition_of_done),
      blocker: blank(f.blocker), sensitivity: f.sensitivity, division_id: blank(f.division_id),
    };
    if (!isSub) row.project_id = blank(f.project_id);
    const res = task
      ? await supabase.from("os_tasks").update(row).eq("id", task.id).select("id").maybeSingle()
      : await supabase.from("os_tasks").insert({ ...row, company_code: f.company_code, parent_task_id: defaults?.parent_task_id ?? null }).select("id").single();
    setBusy(false);
    if (res.error || !res.data) return setErr(res.error ? friendlyError(res.error.message) : "You don't have permission to change this task.");
    onSaved(res.data.id);
  }

  return (
    <Sheet open={open} onClose={onClose} title={task ? `Edit ${task.id}` : isSub ? "New subtask" : "New task"}
      footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="os-task-save">{busy ? "Saving…" : "Save task"}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">{(id) => <input id={id} className={input} value={f.title ?? ""} onChange={(e) => set("title")(e.target.value)} maxLength={300} data-testid="os-task-title" />}</Field>
        {!isSub && <Field label="Project" className="sm:col-span-2" hint="A task in a project takes the project's company and access.">{(id) =>
          <Select id={id} value={f.project_id ?? ""} onChange={set("project_id")} placeholder="No project" options={(projects.data ?? []).map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} />}</Field>}
        {!isSub && !f.project_id && !task && <Field label="Company">{(id) => <CompanySelect id={id} value={f.company_code ?? ""} onChange={set("company_code")} />}</Field>}
        {!isSub && !f.project_id && <Field label="Division">{(id) => <DivisionSelect id={id} value={f.division_id ?? ""} onChange={set("division_id")} />}</Field>}
        <Field label="Owner">{(id) => <PersonSelect id={id} value={f.owner_person_id ?? ""} onChange={set("owner_person_id")} />}</Field>
        <Field label="Reviewer">{(id) => <PersonSelect id={id} value={f.reviewer_person_id ?? ""} onChange={set("reviewer_person_id")} placeholder="None" />}</Field>
        <Field label="Status">{(id) => <Select id={id} value={f.status ?? ""} onChange={set("status")} options={TASK_STATUSES} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} value={f.priority ?? ""} onChange={set("priority")} options={PRIORITIES} />}</Field>
        <Field label="Due date">{(id) => <input id={id} type="date" className={input} value={f.due_date ?? ""} onChange={(e) => set("due_date")(e.target.value)} />}</Field>
        <Field label="Sensitivity">{(id) => <Select id={id} value={f.sensitivity ?? ""} onChange={set("sensitivity")} options={SENSITIVITIES} />}</Field>
        <Field label="Description" className="sm:col-span-2">{(id) => <textarea id={id} rows={3} className={input} value={f.description ?? ""} onChange={(e) => set("description")(e.target.value)} />}</Field>
        <Field label="Definition of done" className="sm:col-span-2">{(id) => <textarea id={id} rows={2} className={input} value={f.definition_of_done ?? ""} onChange={(e) => set("definition_of_done")(e.target.value)} />}</Field>
        {f.status === "Blocked" && <Field label="What is blocking it?" className="sm:col-span-2">{(id) => <input id={id} className={input} value={f.blocker ?? ""} onChange={(e) => set("blocker")(e.target.value)} />}</Field>}
      </div>
      <div className="mt-4"><ErrorLine message={err} /></div>
    </Sheet>
  );
}

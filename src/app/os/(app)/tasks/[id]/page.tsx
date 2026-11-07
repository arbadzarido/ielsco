"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { LinkedEvents } from "@/components/os/linked-events";
import { PersonSelect } from "@/components/os/pickers";
import { TaskPlanning } from "@/components/os/task-planning";
import { TASK_COLUMNS, TaskSheet, type TaskRow } from "@/components/os/work-forms";
import { Avatar, Empty, ErrorLine, KeyValue, Loading, PageTitle, Section, Select, StatusBadge, btn, btnDanger, btnGhost, panel, ring } from "@/components/os/ui";
import { TASK_STATUSES, companyName, fmtDate, fmtDateTime, isOpenTask, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase, me } = useOsMe();
  const router = useRouter();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const task = useQuery<TaskRow | null>((s) => s.from("os_tasks").select(TASK_COLUMNS).eq("id", id).maybeSingle(), [id]);
  const subs = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).eq("parent_task_id", id).order("created_at"), [id]);
  const assignees = useQuery<{ person_id: string; added_by: string | null; added_at: string | null }[]>((s) => s.from("os_task_assignees").select("person_id, added_by, added_at").eq("task_id", id), [id]);
  const project = useQuery<{ id: string; name: string } | null>((s) => task.data?.project_id ? s.from("os_projects").select("id, name").eq("id", task.data.project_id).maybeSingle() : Promise.resolve({ data: null, error: null }), [task.data?.project_id]);
  const [editing, setEditing] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [addPerson, setAddPerson] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (task.loading && !task.data) return <Loading />;
  const t = task.data;
  if (!t) return <Empty title="Task not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/tasks" className={btn}>Back to tasks</Link>} />;
  const due = isOpenTask(t.status) ? relativeDue(t.due_date) : null;

  async function update(patch: Record<string, unknown>) {
    setErr(null);
    const { data, error } = await supabase.from("os_tasks").update(patch).eq("id", id).select("id").maybeSingle();
    if (error || !data) setErr(error ? friendlyError(error.message) : "You can't change this task.");
    task.reload(); subs.reload();
  }
  async function assign() {
    if (!addPerson) return;
    const { error } = await supabase.from("os_task_assignees").insert({ task_id: id, person_id: addPerson });
    if (error) setErr(friendlyError(error.message)); else { setAddPerson(""); assignees.reload(); }
  }
  async function unassign(pid: string) {
    const { error } = await supabase.from("os_task_assignees").delete().eq("task_id", id).eq("person_id", pid);
    if (error) setErr(friendlyError(error.message)); else assignees.reload();
  }
  async function remove() {
    if (!confirm("Delete this task and its subtasks? This can't be undone.")) return;
    const { data, error } = await supabase.from("os_tasks").delete().eq("id", id).select("id");
    if (error || !data?.length) return setErr(error ? friendlyError(error.message) : "Only the person who created a task, or a founder, can delete it.");
    router.push("/os/tasks");
  }

  return (
    <div>
      <PageTitle title={t.title}
        crumbs={[{ href: "/os/tasks", label: "Tasks" }, ...(project.data ? [{ href: `/os/projects/${project.data.id}`, label: project.data.name }] : []), ...(t.parent_task_id ? [{ href: `/os/tasks/${t.parent_task_id}`, label: t.parent_task_id }] : [])]}
        description={<span className="flex flex-wrap items-center gap-2">{t.id} · {companyName(t.company_code)}{due && <span className={cn(due.overdue ? "font-medium text-[#A12D2F]" : "")} data-testid="os-task-due">{due.label}</span>}</span>}
        actions={<>
          <Select ariaLabel="Status" value={t.status} onChange={(v) => update({ status: v })} options={TASK_STATUSES} className="w-40" />
          <button type="button" className={btn} onClick={() => setEditing(true)}>Edit</button>
          <button type="button" className={btnDanger} onClick={remove}>Delete</button>
        </>} />
      <ErrorLine message={err} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          {(t.description || t.definition_of_done || t.blocker) && (
            <section className={cn(panel, "space-y-3 p-4 text-sm")}>
              {t.description && <div><h2 className="text-xs font-medium text-[#66768A]">Description</h2><p className="mt-1 whitespace-pre-wrap">{t.description}</p></div>}
              {t.definition_of_done && <div><h2 className="text-xs font-medium text-[#66768A]">Definition of done</h2><p className="mt-1 whitespace-pre-wrap">{t.definition_of_done}</p></div>}
              {t.blocker && <div><h2 className="text-xs font-medium text-[#A12D2F]">Blocked by</h2><p className="mt-1">{t.blocker}</p></div>}
            </section>
          )}
          {!t.parent_task_id && (
            <Section title={`Subtasks${subs.data?.length ? ` (${subs.data.filter((s) => s.status === "Done").length}/${subs.data.length})` : ""}`}
              action={<button type="button" className={btnGhost} onClick={() => setSubOpen(true)}><Plus size={14} aria-hidden="true" />Add</button>}>
              {subs.data?.length ? (
                <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
                  {subs.data.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <input type="checkbox" className="h-4 w-4" checked={s.status === "Done"} aria-label={`Mark ${s.title} done`}
                        onChange={async (e) => { const { error } = await supabase.from("os_tasks").update({ status: e.target.checked ? "Done" : "Ready" }).eq("id", s.id); if (error) setErr(friendlyError(error.message)); subs.reload(); }} />
                      <Link href={`/os/tasks/${s.id}`} className={cn("min-w-0 flex-1 truncate hover:underline", s.status === "Done" && "text-[#8593A3] line-through", ring, "rounded")}>{s.title}</Link>
                      <span className="text-xs text-[#66768A]">{personLabel(people, s.owner_person_id)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[#66768A]">No subtasks.</p>}
            </Section>
          )}
          <TaskPlanning id={t.id} onChanged={() => task.reload()} />
          <Section title="Events"><LinkedEvents type="task" id={t.id} company={t.company_code} /></Section>
          <Section title="Documents and attachments"><LinkedDocuments type="task" id={t.id} /></Section>
          <EntityFeed type="task" id={t.id} />
        </div>

        <aside className="space-y-4">
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Owner", value: <span className="flex items-center gap-1.5"><Avatar name={personLabel(people, t.owner_person_id)} size={20} />{personLabel(people, t.owner_person_id)}</span> },
              { label: "Reviewer", value: t.reviewer_person_id ? personLabel(people, t.reviewer_person_id) : "—" },
              { label: "Priority", value: <StatusBadge value={t.priority} /> },
              { label: "Due", value: fmtDate(t.due_date) },
              { label: "Sensitivity", value: <StatusBadge value={t.sensitivity} /> },
              { label: "Division", value: t.division_id ? dir?.divisionById.get(t.division_id)?.name ?? t.division_id : "Company-wide" },
              { label: "Created", value: fmtDateTime(t.created_at) },
              { label: "Completed", value: t.completed_at ? fmtDateTime(t.completed_at) : "—" },
            ]} />
          </section>
          <section className={cn(panel, "p-4")}>
            <h2 className="mb-2 text-sm font-semibold">Assignees</h2>
            <ul className="space-y-1.5" data-testid="os-assignees">
              {(assignees.data ?? []).map((a) => (
                <li key={a.person_id} className="flex items-center gap-2 text-sm">
                  <Avatar name={personLabel(people, a.person_id)} size={20} /><span className="flex-1">{personLabel(people, a.person_id)}{a.added_by && a.added_by !== a.person_id && <span className="block text-[11px] text-[#66768A]">assigned by {personLabel(people, a.added_by)}{a.added_at ? `, ${fmtDate(a.added_at.slice(0, 10))}` : ""}</span>}</span>
                  <button type="button" className={btnGhost} onClick={() => unassign(a.person_id)} aria-label={`Remove ${personLabel(people, a.person_id)}`}><X size={14} aria-hidden="true" /></button>
                </li>
              ))}
              {assignees.data && !assignees.data.length && <li className="text-sm text-[#66768A]">Only the owner.</li>}
            </ul>
            <div className="mt-2 flex gap-2"><PersonSelect ariaLabel="Add assignee" value={addPerson} onChange={setAddPerson} placeholder="Add someone…" /><button type="button" className={btn} onClick={assign} disabled={!addPerson}>Add</button></div>
          </section>
          {me.person.id === t.owner_person_id && isOpenTask(t.status) && t.status !== "In Review" && t.reviewer_person_id && (
            <button type="button" className={cn(btn, "w-full")} onClick={() => update({ status: "In Review" })}>Send for review</button>
          )}
        </aside>
      </div>

      <TaskSheet open={editing} task={t} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); task.reload(); }} />
      <TaskSheet open={subOpen} defaults={{ parent_task_id: t.id, company_code: t.company_code }} onClose={() => setSubOpen(false)} onSaved={() => { setSubOpen(false); subs.reload(); }} />
    </div>
  );
}

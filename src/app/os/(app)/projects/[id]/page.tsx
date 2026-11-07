"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Plus, X } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { LinkedEvents } from "@/components/os/linked-events";
import { PersonSelect } from "@/components/os/pickers";
import { PROJECT_COLUMNS, ProjectSheet, TASK_COLUMNS, TaskSheet, type ProjectRow, type TaskRow } from "@/components/os/work-forms";
import { Avatar, Progress, Empty, ErrorLine, KeyValue, Loading, PageTitle, RowList, Section, StatusBadge, btn, btnGhost, btnPrimary, panel } from "@/components/os/ui";
import { companyName, fmtDate, isOpenTask, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const project = useQuery<ProjectRow | null>((s) => s.from("os_projects").select(PROJECT_COLUMNS).eq("id", id).maybeSingle(), [id]);
  const tasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).eq("project_id", id).is("parent_task_id", null).order("due_date", { nullsFirst: false }), [id]);
  const members = useQuery<{ person_id: string; role: string }[]>((s) => s.from("os_project_members").select("person_id, role").eq("project_id", id), [id]);
  const milestones = useQuery<{ id: string; title: string; due_date: string | null; status: string; is_major: boolean }[]>((s) => s.from("os_timeline_items").select("id, title, due_date, status, is_major").eq("project_id", id).order("due_date", { nullsFirst: false }), [id]);
  const campaigns = useQuery<{ id: string; name: string; status: string; start_date: string | null }[]>((s) => s.from("os_campaigns").select("id, name, status, start_date").eq("project_id", id).order("start_date", { nullsFirst: false }), [id]);
  const decisions = useQuery<{ id: string; decision: string; status: string; decided_on: string | null }[]>((s) => s.from("os_decisions").select("id, decision, status, decided_on").eq("project_id", id).order("decided_on", { ascending: false }), [id]);
  const [editing, setEditing] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [addPerson, setAddPerson] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (project.loading && !project.data) return <Loading />;
  const p = project.data;
  if (!p) return <Empty title="Project not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/projects" className={btn}>Back to projects</Link>} />;
  const live = (tasks.data ?? []).filter((t) => t.status !== "Cancelled");
  const done = live.filter((t) => t.status === "Done").length;
  const overdue = live.filter((t) => isOpenTask(t.status) && relativeDue(t.due_date)?.overdue).length;

  async function addMember() {
    if (!addPerson) return;
    const { error } = await supabase.from("os_project_members").insert({ project_id: id, person_id: addPerson });
    if (error) setErr(friendlyError(error.message)); else { setAddPerson(""); members.reload(); }
  }
  async function removeMember(pid: string) {
    const { error } = await supabase.from("os_project_members").delete().eq("project_id", id).eq("person_id", pid);
    if (error) setErr(friendlyError(error.message)); else members.reload();
  }

  return (
    <div>
      <PageTitle title={p.name} crumbs={[{ href: "/os/projects", label: "Projects" }]}
        description={`${p.id} · ${companyName(p.company_code)}${p.division_id ? ` · ${dir?.divisionById.get(p.division_id)?.name ?? p.division_id}` : ""}`}
        actions={<><button type="button" className={btn} onClick={() => setEditing(true)}>Edit</button><button type="button" className={btnPrimary} onClick={() => setNewTask(true)}><Plus size={16} aria-hidden="true" />Task</button></>} />
      <ErrorLine message={err} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className={cn(panel, "grid grid-cols-2 gap-4 p-4 sm:grid-cols-4")} aria-label="Project overview">
            <div><p className="text-xs text-[#66768A]">Status</p><div className="mt-1"><StatusBadge value={p.status} /></div></div>
            <div><p className="text-xs text-[#66768A]">Progress</p><div className="mt-1.5"><Progress done={done} total={live.length} /></div></div>
            <div><p className="text-xs text-[#66768A]">Overdue tasks</p><p className={cn("mt-0.5 text-lg font-semibold", overdue && "text-[#A12D2F]")}>{overdue}</p></div>
            <div><p className="text-xs text-[#66768A]">Deadline</p><p className="mt-0.5 text-sm">{fmtDate(p.due_date)}</p></div>
          </section>
          {(p.description || p.definition_of_done || p.next_action) && (
            <section className={cn(panel, "space-y-3 p-4 text-sm")}>
              {p.description && <div><h2 className="text-xs font-medium text-[#66768A]">Description</h2><p className="mt-1 whitespace-pre-wrap">{p.description}</p></div>}
              {p.definition_of_done && <div><h2 className="text-xs font-medium text-[#66768A]">Definition of done</h2><p className="mt-1 whitespace-pre-wrap">{p.definition_of_done}</p></div>}
              {p.next_action && <div><h2 className="text-xs font-medium text-[#66768A]">Next action</h2><p className="mt-1">{p.next_action}</p></div>}
            </section>
          )}
          <Section title={`Tasks (${live.length})`}>
            <RowList rows={tasks.data ?? []} rowKey={(t) => t.id} rowHref={(t) => `/os/tasks/${t.id}`}
              empty={<Empty compact title="No tasks yet" body="Break the project into tasks with owners and due dates." action={<button type="button" className={btnPrimary} onClick={() => setNewTask(true)}>Add the first task</button>} />}
              columns={[
                { key: "t", label: "Task", primary: true, className: "w-[45%]", render: (t) => <span className="truncate">{t.title}</span> },
                { key: "s", label: "Status", className: "w-28", render: (t) => <StatusBadge value={t.status} /> },
                { key: "o", label: "Owner", className: "w-32", render: (t) => personLabel(people, t.owner_person_id) },
                { key: "d", label: "Due", className: "w-32", render: (t) => { const r = isOpenTask(t.status) ? relativeDue(t.due_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{r?.label ?? fmtDate(t.due_date)}</span>; } },
              ]} />
          </Section>
          {!!decisions.data?.length && (
            <Section title="Decisions">
              <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
                {decisions.data.map((d) => <li key={d.id} className="flex items-start gap-2 px-3 py-2"><span className="text-xs text-[#66768A]">{d.id}</span><span className="flex-1">{d.decision}</span><StatusBadge value={d.status} /></li>)}
              </ul>
            </Section>
          )}
          <Section title="Milestones" action={<Link href={`/os/timeline?p=${p.id}`} className={btnGhost}>On the Timeline</Link>}>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")} data-testid="os-project-milestones">
              {(milestones.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                  <Link href={`/os/timeline/${m.id}`} className="min-w-0 flex-1 truncate hover:underline">{m.is_major ? "◆ " : "◇ "}{m.title}</Link>
                  <span className="text-xs text-[#66768A]">{fmtDate(m.due_date)}</span><StatusBadge value={m.status} />
                </li>
              ))}
              {milestones.data && !milestones.data.length && <li className="px-3 py-2 text-xs text-[#66768A]">No timeline milestones are linked to this project.</li>}
            </ul>
          </Section>
          {!!campaigns.data?.length && (
            <Section title="Campaigns">
              <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>{campaigns.data.map((c) => <li key={c.id} className="flex items-center gap-2 px-3 py-2"><Link href={`/os/campaigns/${c.id}`} className="min-w-0 flex-1 truncate hover:underline">{c.name}</Link><span className="text-xs text-[#66768A]">{fmtDate(c.start_date)}</span><StatusBadge value={c.status} /></li>)}</ul>
            </Section>
          )}
          <Section title="Events and calendar"><LinkedEvents type="project" id={p.id} company={p.company_code} /></Section>
          <Section title="Documents"><LinkedDocuments type="project" id={p.id} /></Section>
          <EntityFeed type="project" id={p.id} />
        </div>
        <aside className="space-y-4">
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Owner", value: <span className="flex items-center gap-1.5"><Avatar name={personLabel(people, p.owner_person_id)} size={20} />{personLabel(people, p.owner_person_id)}</span> },
              { label: "Priority", value: <StatusBadge value={p.priority} /> },
              { label: "Type", value: p.project_type ?? "—" },
              { label: "Start", value: fmtDate(p.start_date) },
              { label: "Sensitivity", value: <StatusBadge value={p.sensitivity} /> },
              { label: "Success metric", value: p.success_metric ?? "—" },
            ]} />
          </section>
          <section className={cn(panel, "p-4")}>
            <h2 className="mb-2 text-sm font-semibold">Team</h2>
            <ul className="space-y-1.5" data-testid="os-project-team">
              {(members.data ?? []).map((m) => (
                <li key={m.person_id} className="flex items-center gap-2 text-sm">
                  <Avatar name={personLabel(people, m.person_id)} size={20} /><span className="flex-1">{personLabel(people, m.person_id)}</span>
                  <button type="button" className={btnGhost} onClick={() => removeMember(m.person_id)} aria-label={`Remove ${personLabel(people, m.person_id)}`}><X size={14} aria-hidden="true" /></button>
                </li>
              ))}
              {members.data && !members.data.length && <li className="text-sm text-[#66768A]">No team members added. The owner and the division can already see it.</li>}
            </ul>
            <div className="mt-2 flex gap-2"><PersonSelect ariaLabel="Add team member" value={addPerson} onChange={setAddPerson} placeholder="Add someone…" /><button type="button" className={btn} onClick={addMember} disabled={!addPerson}>Add</button></div>
          </section>
        </aside>
      </div>
      <ProjectSheet open={editing} project={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); project.reload(); }} />
      <TaskSheet open={newTask} defaults={{ project_id: p.id }} onClose={() => setNewTask(false)} onSaved={() => { setNewTask(false); tasks.reload(); }} />
    </div>
  );
}

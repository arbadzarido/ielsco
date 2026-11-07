"use client";

// One timeline milestone: the strategic view of it. Its dates and status, what it depends on and what depends on it,
// and the work linked to it: tasks, events, campaigns, documents. A milestone is not a calendar event: scheduling a
// meeting for it links the meeting here without changing the milestone's date.
import Link from "next/link";
import { use, useState } from "react";
import { X } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { LinkedEvents } from "@/components/os/linked-events";
import { Empty, ErrorLine, KeyValue, Loading, PageTitle, RowList, Section, Select, StatusBadge, btn, btnGhost, muted, panel } from "@/components/os/ui";
import { companyName, fmtDate, isOpenTask, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Milestone = { id: string; company_code: string; workstream_code: string | null; workstream_name: string | null; title: string; description: string | null; deliverable: string | null; owner_person_id: string | null;
  owner_name: string | null; lead_division_id: string | null; planned_start: string | null; due_date: string | null; status: string; is_major: boolean; priority: string | null; project_id: string | null;
  decision_gate: string | null; risk: string | null; evidence: string | null; planning_label: string | null; dependencies: string | null };
const COLS = "id, company_code, workstream_code, workstream_name, title, description, deliverable, owner_person_id, owner_name, lead_division_id, planned_start, due_date, status, is_major, priority, project_id, decision_gate, risk, evidence, planning_label, dependencies";
type Mini = { id: string; title: string; due_date: string | null; status: string; is_major: boolean };

export default function MilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const m = useQuery<Milestone | null>((s) => s.from("os_timeline_items").select(COLS).eq("id", id).maybeSingle(), [id]);
  const deps = useQuery<{ before: Mini[]; after: Mini[] }>(async (s) => {
    const [a, b] = await Promise.all([
      s.from("os_timeline_dependencies").select("depends_on_id, os_timeline_items!os_timeline_dependencies_depends_on_id_fkey(id, title, due_date, status, is_major)").eq("item_id", id),
      s.from("os_timeline_dependencies").select("item_id, os_timeline_items!os_timeline_dependencies_item_id_fkey(id, title, due_date, status, is_major)").eq("depends_on_id", id),
    ]);
    const pick = (rows: unknown[] | null) => (rows ?? []).map((r) => (r as { os_timeline_items: Mini | null }).os_timeline_items).filter(Boolean) as Mini[];
    return { data: { before: pick(a.data), after: pick(b.data) }, error: a.error ?? b.error };
  }, [id]);
  const tasks = useQuery<{ id: string; title: string; status: string; owner_person_id: string | null; due_date: string | null }[]>((s) => s.from("os_tasks").select("id, title, status, owner_person_id, due_date").eq("timeline_item_id", id).order("due_date", { nullsFirst: false }), [id]);
  const campaigns = useQuery<{ id: string; name: string; status: string; start_date: string | null }[]>((s) => s.from("os_campaigns").select("id, name, status, start_date").eq("timeline_item_id", id), [id]);
  const others = useQuery<Mini[]>((s) => s.from("os_timeline_items").select("id, title, due_date, status, is_major").neq("id", id).order("due_date", { nullsFirst: false }).limit(400), [id]);
  const [pick, setPick] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (m.loading && !m.data) return <Loading />;
  const t = m.data;
  if (!t) return <Empty title="Milestone not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/timeline" className={btn}>Back to the timeline</Link>} />;
  const before = deps.data?.before ?? [], after = deps.data?.after ?? [];
  const lateDeps = before.filter((d) => d.due_date && t.due_date && d.due_date > t.due_date && d.status !== "Done");

  async function addDep() {
    if (!pick) return;
    const { error } = await supabase.from("os_timeline_dependencies").insert({ item_id: id, depends_on_id: pick });
    if (error) setErr(error.message.includes("cycle") ? "That would make the milestones depend on each other in a loop." : friendlyError(error.message)); else { setPick(""); setErr(null); deps.reload(); }
  }
  async function dropDep(dep: string) {
    const { error } = await supabase.from("os_timeline_dependencies").delete().eq("item_id", id).eq("depends_on_id", dep);
    if (error) setErr(friendlyError(error.message)); else deps.reload();
  }
  const mini = (d: Mini, remove?: () => void) => (
    <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
      <Link href={`/os/timeline/${d.id}`} className="min-w-0 flex-1 truncate hover:underline">{d.is_major ? "◆ " : ""}{d.title}</Link>
      <span className={cn("text-xs", muted)}>{fmtDate(d.due_date)}</span><StatusBadge value={d.status} />
      {remove && <button type="button" className={btnGhost} onClick={remove} aria-label={`Remove dependency on ${d.id}`}><X size={14} aria-hidden="true" /></button>}
    </li>
  );

  return (
    <div data-testid="os-milestone-detail">
      <PageTitle title={`${t.is_major ? "◆ " : ""}${t.title}`} crumbs={[{ href: "/os/timeline", label: "Timeline" }]}
        description={`${t.id} · ${companyName(t.company_code)}${t.workstream_name ? ` · ${t.workstream_code ?? ""} ${t.workstream_name}` : ""}`}
        actions={<Link href={`/os/timeline?focus=${t.id}`} className={btn}>Update status</Link>} />
      <ErrorLine message={err} />
      {t.planning_label && <p className="mb-4 rounded-lg bg-[#FFF7E6] px-3 py-2 text-xs text-[#865400]">{t.planning_label}</p>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className={cn(panel, "grid grid-cols-2 gap-4 p-4 sm:grid-cols-4")} aria-label="Milestone overview">
            <div><p className="text-xs text-[#66768A]">Status</p><div className="mt-1"><StatusBadge value={t.status} /></div></div>
            <div><p className="text-xs text-[#66768A]">Due</p><p className="mt-0.5 text-sm">{fmtDate(t.due_date)}</p></div>
            <div><p className="text-xs text-[#66768A]">Open tasks</p><p className="mt-0.5 text-lg font-semibold">{(tasks.data ?? []).filter((x) => isOpenTask(x.status)).length}</p></div>
            <div><p className="text-xs text-[#66768A]">Kind</p><p className="mt-0.5 text-sm">{t.is_major ? "Major milestone" : "Milestone"}</p></div>
          </section>
          {(t.description || t.deliverable) && (
            <section className={cn(panel, "space-y-3 p-4 text-sm")}>
              {t.description && <div><h2 className="text-xs font-medium text-[#66768A]">Description</h2><p className="mt-1 whitespace-pre-wrap">{t.description}</p></div>}
              {t.deliverable && <div><h2 className="text-xs font-medium text-[#66768A]">Deliverable</h2><p className="mt-1 whitespace-pre-wrap">{t.deliverable}</p></div>}
            </section>
          )}
          <Section title="Depends on">
            {lateDeps.length > 0 && <p className="mb-2 rounded-lg border border-[#F1D5A6] bg-[#FDF8EE] px-3 py-2 text-sm" role="status">{lateDeps.length} prerequisite{lateDeps.length === 1 ? " is" : "s are"} due after this milestone.</p>}
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-milestone-deps">
              {before.map((d) => mini(d, () => dropDep(d.id)))}
              {!before.length && <li className={cn("px-3 py-2 text-xs", muted)}>No prerequisites recorded.{t.dependencies ? ` From the Operations Master: ${t.dependencies}` : ""}</li>}
            </ul>
            <div className="mt-2 flex gap-2">
              <Select ariaLabel="Add a prerequisite" value={pick} onChange={setPick} placeholder="Add a prerequisite…" options={(others.data ?? []).filter((o) => !before.some((b) => b.id === o.id)).map((o) => ({ value: o.id, label: `${o.id} · ${o.title}` }))} />
              <button type="button" className={btn} onClick={addDep} disabled={!pick}>Add</button>
            </div>
          </Section>
          {after.length > 0 && <Section title="Needed for"><ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>{after.map((d) => mini(d))}</ul></Section>}
          <Section title="Tasks">
            <RowList rows={tasks.data ?? []} rowKey={(x) => x.id} rowHref={(x) => `/os/tasks/${x.id}`}
              empty={<Empty compact title="No tasks linked" body="Link a task to this milestone from the task's page." />}
              columns={[
                { key: "t", label: "Task", primary: true, className: "w-[50%]", render: (x) => <span className="truncate">{x.title}</span> },
                { key: "s", label: "Status", className: "w-28", render: (x) => <StatusBadge value={x.status} /> },
                { key: "o", label: "Owner", className: "w-28", render: (x) => personLabel(people, x.owner_person_id) },
                { key: "d", label: "Due", className: "w-28", render: (x) => { const r = isOpenTask(x.status) ? relativeDue(x.due_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{r?.label ?? fmtDate(x.due_date)}</span>; } },
              ]} />
          </Section>
          <Section title="Events"><LinkedEvents type="timeline" id={t.id} company={t.company_code} defaults={{ project_id: t.project_id }} /></Section>
          {!!campaigns.data?.length && (
            <Section title="Campaigns">
              <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>{campaigns.data.map((c) => <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm"><Link href={`/os/campaigns/${c.id}`} className="flex-1 truncate hover:underline">{c.name}</Link><span className={cn("text-xs", muted)}>{fmtDate(c.start_date)}</span><StatusBadge value={c.status} /></li>)}</ul>
            </Section>
          )}
          <Section title="Documents"><LinkedDocuments type="timeline" id={t.id} /></Section>
          <EntityFeed type="timeline" id={t.id} />
        </div>
        <aside className="space-y-4">
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Owner", value: t.owner_person_id ? personLabel(people, t.owner_person_id) : t.owner_name ?? "—" },
              { label: "Lead division", value: t.lead_division_id ? dir?.divisionById.get(t.lead_division_id)?.name ?? t.lead_division_id : "—" },
              { label: "Project", value: t.project_id ? <Link className="underline" href={`/os/projects/${t.project_id}`}>{t.project_id}</Link> : "—" },
              { label: "Planned start", value: fmtDate(t.planned_start) },
              { label: "Priority", value: t.priority ?? "—" },
              { label: "Decision gate", value: t.decision_gate ?? "—" },
              { label: "Risk", value: t.risk ?? "—" },
              { label: "Evidence", value: t.evidence ?? "—" },
            ]} />
          </section>
        </aside>
      </div>
    </div>
  );
}

"use client";

// GIF Summer 2027: the programme workspace inside Company OS. One project (PRJ-0033) with its decision queue, tasks,
// canonical facts, milestones, research, risks, budget model, country plans, people, local partners, outputs,
// change log, on-site run sheet, checklists and data-quality findings. Tabs live in the URL (?tab=...).
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, RowList, Section, Select, Sheet, Stat, Tabs, btn, btnGhost, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import {
  CATEGORY, CHECK_STATUSES, COUNTRIES, DECISION_COLS, FACT_STATUSES, MatchSheet, OPEN_DECISION, OUTPUT_STATUSES, PARTNER_STATUSES, PHASE, PLAN_STATUSES,
  RESEARCH_STATUSES, StatusPicker, TASK_PROGRAMME_STATUSES, ToneBadge, factNumber, idr, programmeError, rankDecisions, useProgramme, useProgrammeRights,
  type Decision, type Fact, type ProgTask, type Programme,
} from "@/components/os/programme";
import { fmtDate, fmtDateTime, personLabel, relativeDue, todayJakarta } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" }, { key: "decisions", label: "Decisions" }, { key: "tasks", label: "Tasks" }, { key: "facts", label: "Programme facts" },
  { key: "timeline", label: "Timeline" }, { key: "research", label: "Research" }, { key: "risks", label: "Risks" }, { key: "budget", label: "Budget" },
  { key: "countries", label: "Countries" }, { key: "people", label: "People" }, { key: "partners", label: "Local support" }, { key: "outputs", label: "Outputs" },
  { key: "changes", label: "Changes" }, { key: "onsite", label: "Run sheet" }, { key: "checklists", label: "Checklists" }, { key: "findings", label: "Findings" },
];
type Ctx = { p: Programme; edit: boolean; approve: boolean };

export default function GifWorkspacePage() {
  const params = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "overview";
  const prog = useProgramme();
  const rights = useProgrammeRights(prog.data?.project_id);
  if (prog.loading && !prog.data) return <Loading />;
  if (!prog.data) return <Empty title="GIF Summer 2027 isn't available to you" body={prog.error ?? "The programme workspace is visible to IELSco staff once it is set up. Ask a founder if you need access."} />;
  const p = prog.data;
  const ctx: Ctx = { p, ...rights };
  return (
    <div>
      <PageTitle title={p.name} crumbs={[{ href: `/os/projects/${p.project_id}`, label: `Project ${p.project_id}` }]}
        description={<>27 July – 3 August 2027 · {p.countries.join(" → ")} · Facts and decisions show their status: only items marked Decided or Confirmed are settled.{rights.approve ? " You can answer decisions." : rights.edit ? " You can edit the registers; Arba and Farrel answer decisions." : ""}</>} />
      <Tabs label="GIF workspace" current={tab} hrefFor={(k) => `/os/gif${k === "overview" ? "" : `?tab=${k}`}`} tabs={TABS} />
      {tab === "overview" && <Overview {...ctx} />}
      {tab === "decisions" && <Decisions {...ctx} />}
      {tab === "tasks" && <TasksTab {...ctx} />}
      {tab === "facts" && <Facts {...ctx} />}
      {tab === "timeline" && <Timeline {...ctx} />}
      {tab === "research" && <Research {...ctx} />}
      {tab === "risks" && <Risks {...ctx} />}
      {tab === "budget" && <Budget {...ctx} />}
      {tab === "countries" && <Countries {...ctx} />}
      {tab === "people" && <People {...ctx} />}
      {tab === "partners" && <Partners {...ctx} />}
      {tab === "outputs" && <Outputs {...ctx} />}
      {tab === "changes" && <Changes {...ctx} />}
      {tab === "onsite" && <RunSheet {...ctx} />}
      {tab === "checklists" && <Checklists {...ctx} />}
      {tab === "findings" && <Findings {...ctx} />}
    </div>
  );
}

function usePeople() { return useDirectory()?.peopleById ?? new Map(); }
const Due = ({ d, open = true }: { d: string | null; open?: boolean }) => {
  const r = open ? relativeDue(d) : null;
  return <span className={cn("text-xs tabular-nums", r?.overdue && "font-medium text-[#A12D2F]")}>{r?.overdue ? r.label : fmtDate(d)}</span>;
};
const Filters = ({ children }: { children: React.ReactNode }) => <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">{children}</div>;
function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="relative col-span-2 md:w-64">
      <span className="sr-only">{label}</span>
      <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} className={cn(input, "pl-8")} />
    </label>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────────────────────────────────────────────
function Overview({ p }: Ctx) {
  const people = usePeople();
  const today = todayJakarta();
  const decs = useQuery<Decision[]>((s) => s.from("os_programme_decisions").select(DECISION_COLS).eq("project_id", p.project_id), [p.project_id]);
  const tasks = useQuery<ProgTask[]>((s) => s.from("os_programme_tasks").select("*").eq("project_id", p.project_id), [p.project_id]);
  const counts = useQuery<{ research: number; risks: number; outputs: number; changes: number; findings: number; checks: [number, number] }>(async (s) => {
    const [r, k, o, c, f, ch] = await Promise.all([
      s.from("os_programme_research").select("code", { count: "exact", head: true }).eq("project_id", p.project_id).not("status", "in", "(Verified,Not applicable)"),
      s.from("os_programme_risks").select("code", { count: "exact", head: true }).eq("project_id", p.project_id).eq("status", "Open").gte("rating", 15),
      s.from("os_programme_outputs").select("code", { count: "exact", head: true }).eq("project_id", p.project_id).in("approval_status", ["Needs revision", "Outdated"]),
      s.from("os_programme_changes").select("code", { count: "exact", head: true }).eq("project_id", p.project_id).neq("status", "Closed"),
      s.from("os_programme_findings").select("code", { count: "exact", head: true }).eq("project_id", p.project_id).eq("status", "Open").eq("severity", "High"),
      s.from("os_programme_checklist_items").select("status").eq("project_id", p.project_id).eq("checklist", "Pre-event readiness"),
    ]);
    const rows = (ch.data ?? []) as { status: string }[];
    return { data: { research: r.count ?? 0, risks: k.count ?? 0, outputs: o.count ?? 0, changes: c.count ?? 0, findings: f.count ?? 0,
      checks: [rows.filter((x) => x.status === "Done").length, rows.length] }, error: r.error };
  }, [p.project_id]);
  const live = useQuery<Record<string, unknown> | null>((s) => s.rpc("os_programme_live_stats", { p_project: p.project_id }), [p.project_id]);
  const miles = useQuery<{ id: string; title: string; due_date: string | null; status: string; planning_label: string | null; decision_gate: string | null }[]>((s) =>
    s.from("os_timeline_items").select("id, title, due_date, status, planning_label, decision_gate").eq("project_id", p.project_id).eq("workstream_code", "WS10").gte("due_date", today).order("due_date").limit(5), [p.project_id, today]);

  const open = (decs.data ?? []).filter((d) => OPEN_DECISION(d.status)).sort(rankDecisions);
  const crit = open.filter((d) => d.priority === "Critical");
  const lateDec = open.filter((d) => d.suggested_deadline && d.suggested_deadline < today);
  const t = tasks.data ?? [];
  const live_ = (live.data ?? {}) as { available?: boolean; applications_by_pathway_status?: Record<string, number>; participants?: number; seats_confirmed?: number; paid_by_currency?: Record<string, number>; as_of?: string };
  const c = counts.data;

  return (
    <div className="space-y-6">
      <ErrorLine message={decs.error ?? tasks.error} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open decisions" value={open.length} hint={`${crit.length} Critical`} href="/os/gif?tab=decisions" tone={crit.length ? "amber" : undefined} />
        <Stat label="Decisions past their suggested deadline" value={lateDec.length} href="/os/gif?tab=decisions" tone={lateDec.length ? "red" : undefined} />
        <Stat label="Tasks overdue" value={t.filter((x) => x.overdue).length} hint={`${t.filter((x) => !["Completed", "Cancelled"].includes(x.programme_status)).length} open`} href="/os/gif?tab=tasks" tone={t.some((x) => x.overdue) ? "red" : undefined} />
        <Stat label="Tasks waiting for a decision" value={t.filter((x) => x.programme_status === "Waiting for Decision").length} href="/os/gif?tab=tasks&status=Waiting+for+Decision" />
        <Stat label="Research not yet verified" value={c?.research ?? "…"} href="/os/gif?tab=research" />
        <Stat label="High risks (rating 15+)" value={c?.risks ?? "…"} href="/os/gif?tab=risks" tone={c?.risks ? "amber" : undefined} />
        <Stat label="Outputs to revise or retire" value={c?.outputs ?? "…"} href="/os/gif?tab=outputs" tone={c?.outputs ? "amber" : undefined} />
        <Stat label="Pre-event readiness" value={c ? `${c.checks[0]}/${c.checks[1]}` : "…"} hint="items done" href="/os/gif?tab=checklists" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Decide next" action={<Link href="/os/gif?tab=decisions" className={cn(linkCls, "text-xs")}>All decisions</Link>}>
          <ol className={cn(panel, "divide-y divide-[#F0F2F5]")}>
            {open.slice(0, 10).map((d, i) => (
              <li key={d.code}>
                <Link href={`/os/gif/decisions/${d.code}`} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[#FAFBFC]">
                  <span className="mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums text-[#8593A3]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[#1F2D3D]">{d.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#66768A]">
                      <ToneBadge value={d.priority} /><ToneBadge value={d.status} /><span>{d.code}</span>
                      <span>Suggested by <Due d={d.suggested_deadline} /></span><span>{personLabel(people, d.owner_person_id)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {!open.length && <li className={cn("px-3 py-4 text-sm", muted)}>No open decisions.</li>}
          </ol>
        </Section>
        <div className="space-y-6">
          <Section title="Recruitment (live from the GIF engine)">
            <div className={cn(panel, "p-3 text-sm")}>
              {!live_.available ? <p className={muted}>Live numbers aren&apos;t available here.</p> : (
                <>
                  <KeyValue items={[
                    { label: "Participants registered", value: String(live_.participants ?? 0) },
                    { label: "Seats confirmed", value: String(live_.seats_confirmed ?? 0) },
                    ...Object.entries(live_.applications_by_pathway_status ?? {}).map(([k, n]) => ({ label: k.replace("_", " ").replace(":", " · ").replace("_", " "), value: String(n) })),
                    ...(live_.paid_by_currency ? Object.entries(live_.paid_by_currency).map(([cur, n]) => ({ label: `Paid (${cur})`, value: Number(n).toLocaleString("en-US") })) : []),
                  ]} />
                  <p className={cn("mt-2 text-xs", muted)}>Counts only, no personal data. As of {fmtDateTime(live_.as_of)}.</p>
                </>
              )}
            </div>
          </Section>
          <Section title="Next milestones" action={<Link href="/os/gif?tab=timeline" className={cn(linkCls, "text-xs")}>Timeline</Link>}>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
              {(miles.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <Link href={`/os/timeline/${m.id}`} className="min-w-0 truncate hover:underline">{m.decision_gate && !m.title.startsWith(m.decision_gate) ? `${m.decision_gate} · ` : ""}{m.title}</Link>
                  <span className="flex shrink-0 items-center gap-2"><ToneBadge value={m.planning_label === "Decided date" ? "Decided" : "Proposed"} /><Due d={m.due_date} /></span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Needs attention">
            <ul className="space-y-1 text-sm">
              <li><Link className={linkCls} href="/os/gif?tab=findings">{c?.findings ?? "…"} high-severity data findings open</Link></li>
              <li><Link className={linkCls} href="/os/gif?tab=changes">{c?.changes ?? "…"} changes with revisions pending</Link></li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Decisions ──────────────────────────────────────────────────────────────────────────────────────────────────────
function Decisions({ p }: Ctx) {
  const people = usePeople();
  const decs = useQuery<Decision[]>((s) => s.from("os_programme_decisions").select(DECISION_COLS).eq("project_id", p.project_id), [p.project_id]);
  const [view, setView] = useState("open");
  const [prio, setPrio] = useState("");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const rows = (decs.data ?? []).filter((d) => (view === "all" || (view === "open" ? OPEN_DECISION(d.status) : !OPEN_DECISION(d.status)))
    && (!prio || d.priority === prio) && (!owner || d.owner_person_id === owner) && (!q || `${d.code} ${d.title} ${d.question}`.toLowerCase().includes(q.toLowerCase()))).sort(rankDecisions);
  const owners = [...new Set((decs.data ?? []).map((d) => d.owner_person_id).filter(Boolean))] as string[];
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Ranked by priority, then suggested deadline. Open one to approve the recommendation, choose another option, write your own answer, ask for research, defer or reject an option. An answer updates the facts it settles, releases waiting tasks and flags dependent outputs for revision. Nothing is published automatically.</p>
      <Filters>
        <SearchBox value={q} onChange={setQ} label="Search decisions" />
        <Select ariaLabel="Show" value={view} onChange={setView} options={[{ value: "open", label: "Open" }, { value: "closed", label: "Decided or not applicable" }, { value: "all", label: "All" }]} className="md:w-52" />
        <Select ariaLabel="Priority" value={prio} onChange={setPrio} options={["Critical", "High", "Medium", "Low"]} placeholder="Any priority" className="md:w-36" />
        <Select ariaLabel="Owner" value={owner} onChange={setOwner} options={owners.map((o) => ({ value: o, label: personLabel(people, o) }))} placeholder="Any owner" className="md:w-36" />
      </Filters>
      <ErrorLine message={decs.error} />
      {decs.loading && !decs.data ? <Loading /> : (
        <RowList rows={rows} rowKey={(d) => d.code} rowHref={(d) => `/os/gif/decisions/${d.code}`} testId="gif-decisions"
          empty={<Empty title="No decisions match" compact />}
          columns={[
            { key: "t", label: "Decision", primary: true, className: "w-[40%]", render: (d) => d.title },
            { key: "c", label: "ID", className: "w-28", hideOnMobile: true, render: (d) => <span className="text-xs text-[#66768A]">{d.code}</span> },
            { key: "p", label: "Priority", className: "w-24", render: (d) => <ToneBadge value={d.priority} /> },
            { key: "s", label: "Status", className: "w-44", render: (d) => <ToneBadge value={d.status} /> },
            { key: "d", label: "Suggested by", className: "w-28", render: (d) => OPEN_DECISION(d.status) ? <Due d={d.suggested_deadline} /> : <span className="text-xs">{fmtDate(d.decided_on)}</span> },
            { key: "o", label: "Owner", className: "w-24", render: (d) => <span className="text-xs">{personLabel(people, d.owner_person_id)}</span> },
          ]} />
      )}
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function TasksTab({ p }: Ctx) {
  const params = useSearchParams();
  const people = usePeople();
  const tasks = useQuery<ProgTask[]>((s) => s.from("os_programme_tasks").select("*").eq("project_id", p.project_id).order("due_date", { nullsFirst: false }), [p.project_id]);
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState(params.get("owner") ?? "");
  const [cat, setCat] = useState("");
  const [phase, setPhase] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [critical, setCritical] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const all = tasks.data ?? [];
  const rows = all.filter((t) => (showDone || !["Completed", "Cancelled"].includes(t.programme_status)) && (!owner || t.owner_person_id === owner) && (!cat || t.category === cat)
    && (!phase || String(t.phase) === phase) && (!country || t.country === country) && (!status || t.programme_status === status) && (!critical || t.critical_path)
    && (!q || `${t.code} ${t.title} ${t.deliverable ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const owners = [...new Set(all.map((t) => t.owner_person_id).filter(Boolean))] as string[];
  return (
    <div>
      <Filters>
        <SearchBox value={q} onChange={setQ} label="Search tasks" />
        <Select ariaLabel="Owner" value={owner} onChange={setOwner} options={owners.map((o) => ({ value: o, label: personLabel(people, o) }))} placeholder="Any owner" className="md:w-36" />
        <Select ariaLabel="Category" value={cat} onChange={setCat} options={Object.entries(CATEGORY).map(([k, v]) => ({ value: k, label: `${k} · ${v}` }))} placeholder="Any category" className="md:w-56" />
        <Select ariaLabel="Phase" value={phase} onChange={setPhase} options={Object.entries(PHASE).map(([k, v]) => ({ value: k, label: `${k}. ${v}` }))} placeholder="Any phase" className="md:w-52" />
        <Select ariaLabel="Country" value={country} onChange={setCountry} options={COUNTRIES} placeholder="Any country" className="md:w-36" />
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={TASK_PROGRAMME_STATUSES} placeholder="Any status" className="md:w-52" />
        <label className="flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={critical} onChange={(e) => setCritical(e.target.checked)} />Critical path</label>
        <label className="flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Show completed</label>
      </Filters>
      <p className={cn("mb-2 text-xs", muted)}>{rows.length} of {all.length} tasks. Each task has one accountable owner; open a task to edit it, comment or change its status in the normal task view.</p>
      <ErrorLine message={tasks.error} />
      {tasks.loading && !tasks.data ? <Loading /> : (
        <RowList rows={rows} rowKey={(t) => t.task_id} rowHref={(t) => `/os/tasks/${t.task_id}`} testId="gif-tasks"
          columns={[
            { key: "t", label: "Task", primary: true, className: "w-[38%]", render: (t) => t.title },
            { key: "c", label: "Area", className: "w-24", hideOnMobile: true, render: (t) => <span className="text-xs text-[#66768A]" title={`${CATEGORY[t.category] ?? t.category} · phase ${t.phase} ${PHASE[t.phase] ?? ""}`}>{t.code} · {t.category}{t.phase}</span> },
            { key: "o", label: "Owner", className: "w-24", render: (t) => <span className="text-xs">{personLabel(people, t.owner_person_id)}</span> },
            { key: "s", label: "Status", className: "w-48", render: (t) => <span className="flex flex-wrap gap-1"><ToneBadge value={t.programme_status} />{t.critical_path && <ToneBadge tone="red">Critical path</ToneBadge>}</span> },
            { key: "d", label: "Due", className: "w-28", render: (t) => <Due d={t.due_date} open={!["Completed", "Cancelled"].includes(t.programme_status)} /> },
            { key: "h", label: "Effort", className: "w-16", hideOnMobile: true, render: (t) => <span className="text-xs tabular-nums">{t.effort_hours ? `${t.effort_hours} h` : "—"}</span> },
          ]} />
      )}
    </div>
  );
}

// ── Facts ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function Facts({ p, edit, approve }: Ctx) {
  const { supabase } = useOsMe();
  const facts = useQuery<Fact[]>((s) => s.from("os_programme_facts").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  const [cat, setCat] = useState("");
  const [onlyPublic, setOnlyPublic] = useState(false);
  const [editing, setEditing] = useState<Fact | null>(null);
  const [form, setForm] = useState({ value: "", status: "", reason: "", source: "" });
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const all = facts.data ?? [];
  const cats = [...new Set(all.map((f) => f.category))];
  const rows = all.filter((f) => (!cat || f.category === cat) && (!onlyPublic || f.public_facing));
  async function save() {
    if (!editing) return;
    setErr(null);
    const { data, error } = await supabase.rpc("os_programme_set_fact", { p_project: p.project_id, p_key: editing.key, p_value: form.value, p_status: form.status, p_reason: form.reason, p_source: form.source || null });
    if (error) return setErr(programmeError(error.message));
    const r = data as { change: string | null };
    setDone(r.change ? `Saved. Change ${r.change} lists what to revise.` : "Saved.");
    setEditing(null); facts.reload();
  }
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>The single source for programme information. Website pages, the dashboard, emails, documents and the budget take their values from here. Changing a value records a change, flags every output that uses it and creates a revision task for each; nothing is republished automatically.</p>
      {done && <p role="status" className="mb-3 rounded-lg bg-[#E7F4EC] px-3 py-2 text-sm text-[#22663F]">{done} <Link href="/os/gif?tab=changes" className={linkCls}>Open changes</Link></p>}
      <Filters>
        <Select ariaLabel="Category" value={cat} onChange={setCat} options={cats} placeholder="All categories" className="md:w-48" />
        <label className="flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={onlyPublic} onChange={(e) => setOnlyPublic(e.target.checked)} />Public-facing only</label>
      </Filters>
      <ErrorLine message={facts.error} />
      <RowList rows={rows} rowKey={(f) => f.key} testId="gif-facts"
        columns={[
          { key: "l", label: "Fact", primary: true, className: "w-[24%]", render: (f) => <span title={f.key}>{f.label}</span> },
          { key: "v", label: "Value", className: "w-[34%]", render: (f) => <span className="whitespace-normal break-words text-sm">{f.value}{f.unit && !/date/.test(f.unit) ? ` ${f.unit}` : ""}</span> },
          { key: "s", label: "Status", className: "w-28", render: (f) => <span className="flex flex-wrap gap-1"><ToneBadge value={f.status} />{f.public_facing && <ToneBadge tone="teal">Public</ToneBadge>}</span> },
          { key: "src", label: "Source", className: "w-[22%]", hideOnMobile: true, render: (f) => <span className="block whitespace-normal break-words text-xs text-[#66768A]">{f.source_decision ? <Link className={linkCls} href={`/os/gif/decisions/${f.source_decision}`}>{f.source_decision}</Link> : null} {f.source ?? ""} · v{f.version}</span> },
          { key: "e", label: "", className: "w-16", render: (f) => edit ? <button type="button" className={btnGhost} onClick={() => { setEditing(f); setErr(null); setForm({ value: f.value, status: f.status, reason: "", source: "" }); }}>Change</button> : null },
        ]} />
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? `Change: ${editing.label}` : ""}
        footer={<><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={form.reason.trim().length < 3} onClick={save}>Save and record change</button></>}>
        <div className="space-y-4">
          <ErrorLine message={err} />
          {editing?.notes && <p className={cn("text-sm", muted)}>{editing.notes}</p>}
          <Field label="Value">{(id) => <textarea id={id} rows={3} className={input} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />}</Field>
          <Field label="Status" hint={approve ? undefined : "Only Arba and Farrel can mark a fact Decided; answer the decision instead."}>{(id) => <Select id={id} value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={FACT_STATUSES.filter((s) => approve || s !== "Decided" || editing?.status === "Decided")} />}</Field>
          <Field label="Reason for the change">{(id) => <input id={id} className={input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />}</Field>
          <Field label="Source (optional)" hint="Where this comes from: a quote, an email, an official website.">{(id) => <input id={id} className={input} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />}</Field>
        </div>
      </Sheet>
    </div>
  );
}

// ── Timeline (milestones on the Master Timeline, workstream WS10) ─────────────────────────────────────────────────
function Timeline({ p }: Ctx) {
  const people = usePeople();
  const items = useQuery<{ id: string; title: string; planned_start: string | null; due_date: string | null; status: string; owner_person_id: string | null; decision_gate: string | null; planning_label: string | null; is_major: boolean; dependencies: string | null }[]>((s) =>
    s.from("os_timeline_items").select("id, title, planned_start, due_date, status, owner_person_id, decision_gate, planning_label, is_major, dependencies").eq("project_id", p.project_id).eq("workstream_code", "WS10").order("due_date"), [p.project_id]);
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Worked back from 27 July 2027. Dates from founder decisions are marked Decided; the rest are proposals until a founder approves them (GIF-DEC-040). These milestones are also on the company <Link href="/os/timeline" className={linkCls}>Master Timeline</Link>. The older GIF rows planned for 5–11 July are still there, unchanged: see finding GIF-FND-001.</p>
      <ErrorLine message={items.error} />
      <RowList rows={items.data ?? []} rowKey={(m) => m.id} rowHref={(m) => `/os/timeline/${m.id}`}
        columns={[
          { key: "t", label: "Milestone", primary: true, className: "w-[38%]", render: (m) => <>{m.decision_gate && !m.title.startsWith(m.decision_gate) ? `${m.decision_gate} · ` : ""}{m.title}</> },
          { key: "d", label: "Dates", className: "w-44", render: (m) => <span className="text-xs tabular-nums">{m.planned_start && m.planned_start !== m.due_date ? `${fmtDate(m.planned_start)} – ` : ""}{fmtDate(m.due_date)}</span> },
          { key: "l", label: "Basis", className: "w-24", render: (m) => <ToneBadge value={m.planning_label === "Decided date" ? "Decided" : "Proposed"} /> },
          { key: "s", label: "Status", className: "w-28", render: (m) => <ToneBadge value={m.status} /> },
          { key: "o", label: "Owner", className: "w-24", render: (m) => <span className="text-xs">{personLabel(people, m.owner_person_id)}</span> },
          { key: "c", label: "", className: "w-24", hideOnMobile: true, render: (m) => m.is_major ? <ToneBadge tone="red">Critical path</ToneBadge> : null },
        ]} />
    </div>
  );
}

// ── Research ───────────────────────────────────────────────────────────────────────────────────────────────────────
type ResearchRow = { code: string; question: string; why_it_matters: string | null; country: string; info_required: string | null; source_type: string | null; owner_person_id: string | null; status: string; findings: string | null; source_links: string | null; verified_on: string | null; reverify_on: string | null; due_date: string | null };
function Research({ p, edit }: Ctx) {
  const people = usePeople();
  const rows = useQuery<ResearchRow[]>((s) => s.from("os_programme_research").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  const links = useQuery<{ from_ref: string; to_ref: string }[]>((s) => s.from("os_programme_links").select("from_ref, to_ref").eq("project_id", p.project_id).eq("from_kind", "research").eq("to_kind", "decision"), [p.project_id]);
  const [country, setCountry] = useState("");
  const [open, setOpen] = useState<ResearchRow | null>(null);
  const [creating, setCreating] = useState(false);
  const decFor = (code: string) => (links.data ?? []).filter((l) => l.from_ref === code).map((l) => l.to_ref);
  const list = (rows.data ?? []).filter((r) => !country || r.country === country);
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Questions that need checking with official or primary sources before a decision or booking. A finding counts only with its source link and the date it was verified; anything that changes (entry rules, prices) gets a re-verify date.</p>
      <Filters>
        <Select ariaLabel="Country" value={country} onChange={setCountry} options={COUNTRIES} placeholder="Any country" className="md:w-40" />
        {edit && <button type="button" className={btnPrimary} onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Research item</button>}
      </Filters>
      <ErrorLine message={rows.error} />
      <RowList rows={list} rowKey={(r) => r.code}
        columns={[
          { key: "q", label: "Question", primary: true, className: "w-[44%]", render: (r) => <button type="button" className="whitespace-normal text-left font-medium hover:underline" onClick={() => setOpen(r)}>{r.question}</button> },
          { key: "c", label: "Country", className: "w-24", render: (r) => <span className="text-xs">{r.country}</span> },
          { key: "s", label: "Status", className: "w-40", render: (r) => <StatusPicker label="Research status" table="os_programme_research" match={{ code: r.code }} value={r.status} options={RESEARCH_STATUSES} canEdit={edit} onSaved={rows.reload} /> },
          { key: "o", label: "Owner", className: "w-24", render: (r) => <span className="text-xs">{personLabel(people, r.owner_person_id)}</span> },
          { key: "d", label: "Due", className: "w-24", render: (r) => <Due d={r.due_date} open={!["Verified", "Not applicable"].includes(r.status)} /> },
          { key: "x", label: "For", className: "w-28", hideOnMobile: true, render: (r) => <span className="text-xs">{decFor(r.code).map((c) => <Link key={c} href={`/os/gif/decisions/${c}`} className={cn(linkCls, "mr-1")}>{c.replace("GIF-", "")}</Link>)}</span> },
        ]} />
      <RecordSheet open={creating || !!open} title={open ? `${open.code}` : "New research item"} table="os_programme_research" idColumn="code" record={open as unknown as Record<string, unknown>}
        defaults={{ project_id: p.project_id, country: "All", status: "To research" }}
        fields={[
          { key: "question", label: "Question", required: true }, { key: "why_it_matters", label: "Why it matters", kind: "textarea" },
          { key: "country", label: "Country", kind: "select", options: COUNTRIES, required: true }, { key: "info_required", label: "Information needed" },
          { key: "source_type", label: "Source type" }, { key: "owner_person_id", label: "Owner", kind: "person" },
          { key: "status", label: "Status", kind: "select", options: RESEARCH_STATUSES, required: true }, { key: "due_date", label: "Due", kind: "date" },
          { key: "findings", label: "Findings", kind: "textarea" }, { key: "source_links", label: "Source links", kind: "textarea" },
          { key: "verified_on", label: "Verified on", kind: "date" }, { key: "reverify_on", label: "Re-verify on", kind: "date" },
        ]}
        onClose={() => { setOpen(null); setCreating(false); }} onSaved={() => { setOpen(null); setCreating(false); rows.reload(); }} />
    </div>
  );
}

// ── Risks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
type RiskRow = { code: string; title: string; description: string | null; category: string; country: string; likelihood: number; impact: number; rating: number; prevention: string | null; mitigation: string | null; contingency: string | null; escalation: string | null; owner_person_id: string | null; review_on: string | null; status: string; decide_before: string | null };
function Risks({ p, edit }: Ctx) {
  const people = usePeople();
  const rows = useQuery<RiskRow[]>((s) => s.from("os_programme_risks").select("*").eq("project_id", p.project_id).order("rating", { ascending: false }), [p.project_id]);
  const [open, setOpen] = useState<RiskRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [gate, setGate] = useState("");
  const list = (rows.data ?? []).filter((r) => !gate || r.decide_before === gate);
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Rating = likelihood × impact (1–5 each). &quot;Resolve before&quot; marks risks that must be handled before recruitment, payments, bookings or travel go further.</p>
      <Filters>
        <Select ariaLabel="Resolve before" value={gate} onChange={setGate} options={["Recruitment", "Payments", "Bookings", "Travel"]} placeholder="Any stage" className="md:w-44" />
        {edit && <button type="button" className={btnPrimary} onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Risk</button>}
      </Filters>
      <ErrorLine message={rows.error} />
      <RowList rows={list} rowKey={(r) => r.code}
        columns={[
          { key: "t", label: "Risk", primary: true, className: "w-[38%]", render: (r) => <button type="button" className="whitespace-normal text-left font-medium hover:underline" onClick={() => setOpen(r)}>{r.title}</button> },
          { key: "r", label: "Rating", className: "w-24", render: (r) => <ToneBadge tone={r.rating >= 15 ? "red" : r.rating >= 8 ? "amber" : "neutral"}>{r.rating} ({r.likelihood}×{r.impact})</ToneBadge> },
          { key: "b", label: "Resolve before", className: "w-28", render: (r) => <span className="text-xs">{r.decide_before ?? "—"}</span> },
          { key: "o", label: "Owner", className: "w-24", render: (r) => <span className="text-xs">{personLabel(people, r.owner_person_id)}</span> },
          { key: "s", label: "Status", className: "w-32", render: (r) => <StatusPicker label="Risk status" table="os_programme_risks" match={{ code: r.code }} value={r.status} options={["Open", "Monitoring", "Closed"]} canEdit={edit} onSaved={rows.reload} /> },
          { key: "d", label: "Review", className: "w-24", hideOnMobile: true, render: (r) => <Due d={r.review_on} open={r.status !== "Closed"} /> },
        ]} />
      <RecordSheet open={creating || !!open} title={open ? `${open.code} ${open.title}` : "New risk"} table="os_programme_risks" idColumn="code" record={open as unknown as Record<string, unknown>}
        defaults={{ project_id: p.project_id, country: "All", status: "Open", likelihood: "3", impact: "3" }}
        fields={[
          { key: "title", label: "Risk", required: true }, { key: "category", label: "Category", required: true },
          { key: "country", label: "Country", kind: "select", options: COUNTRIES, required: true },
          { key: "likelihood", label: "Likelihood (1–5)", kind: "select", options: ["1", "2", "3", "4", "5"], required: true },
          { key: "impact", label: "Impact (1–5)", kind: "select", options: ["1", "2", "3", "4", "5"], required: true },
          { key: "decide_before", label: "Resolve before", kind: "select", options: ["Recruitment", "Payments", "Bookings", "Travel"] },
          { key: "prevention", label: "Prevention", kind: "textarea" }, { key: "mitigation", label: "Mitigation", kind: "textarea" },
          { key: "contingency", label: "Contingency", kind: "textarea" }, { key: "escalation", label: "Escalation" },
          { key: "owner_person_id", label: "Owner", kind: "person" }, { key: "review_on", label: "Review on", kind: "date" },
        ]}
        onClose={() => { setOpen(null); setCreating(false); }} onSaved={() => { setOpen(null); setCreating(false); rows.reload(); }} />
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type BudgetRow = { code: string; section: string; category: string; country: string; activity: string | null; description: string; basis: string; currency: string; unit_amount: number | null; quantity: number | null; unit_fact: string | null; quantity_fact: string | null; amount_idr: number | null; owner_person_id: string | null; approval: string; notes: string | null };
const SCEN: Record<string, string> = { low: "scenario.low.self_funded", base: "scenario.base.self_funded", high: "scenario.high.self_funded" };
function Budget({ p, edit }: Ctx) {
  const people = usePeople();
  const lines = useQuery<BudgetRow[]>((s) => s.from("os_programme_budget_lines").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  const facts = useQuery<Fact[]>((s) => s.from("os_programme_facts").select("*").eq("project_id", p.project_id), [p.project_id]);
  const [scen, setScen] = useState("base");
  const [open, setOpen] = useState<BudgetRow | null>(null);
  const fm = useMemo(() => new Map((facts.data ?? []).map((f) => [f.key, f])), [facts.data]);
  const amount = (l: BudgetRow): number | null => {
    if (l.basis !== "Formula") return l.amount_idr;
    const qf = l.quantity_fact === SCEN.base ? SCEN[scen] : l.quantity_fact;
    const u = l.unit_amount ?? factNumber(fm, l.unit_fact);
    const q = l.quantity ?? factNumber(fm, qf);
    return u !== null && q !== null && l.currency === "IDR" ? u * q : null;
  };
  const all = lines.data ?? [];
  if (!lines.loading && !all.length) return <Empty title="The GIF budget is confidential" body="It is visible to the Operations division, project members and founders." />;
  const sum = (sec: string) => all.filter((l) => l.section === sec).reduce((a, l) => a + (amount(l) ?? 0), 0);
  const notEst = all.filter((l) => l.section !== "Revenue" && amount(l) === null).length;
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Revenue lines multiply decided prices by planning scenarios (assumptions, not targets). No cost has been estimated yet: cost lines stay &quot;Not estimated&quot; until a quote or an approved estimate is entered with its basis. Elco Pro (PT Elco revenue) is not counted here.</p>
      <Filters>
        <Select ariaLabel="Scenario" value={scen} onChange={setScen} options={[{ value: "low", label: "Low scenario" }, { value: "base", label: "Base scenario" }, { value: "high", label: "High scenario" }]} className="md:w-44" />
      </Filters>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue (formula lines)" value={idr(sum("Revenue"))} hint={`Self-Funded: ${fm.get(SCEN[scen])?.value ?? "?"} participants (estimate)`} />
        <Stat label="Costs estimated so far" value={idr(sum("Cost"))} hint="Formula lines only (cashback)" />
        <Stat label="Lines not yet estimated" value={notEst} tone={notEst ? "amber" : undefined} hint="Need quotes" />
        <Stat label="Break-even" value="Unknown" hint="Needs cost quotes (GIF-DEC-005, GIF-DEC-014)" />
      </div>
      <ErrorLine message={lines.error} />
      {["Revenue", "Cost", "Reserve"].map((sec) => (
        <Section key={sec} title={sec} className="mb-6">
          <RowList rows={all.filter((l) => l.section === sec)} rowKey={(l) => l.code}
            columns={[
              { key: "d", label: "Line", primary: true, className: "w-[36%]", render: (l) => <button type="button" disabled={!edit} className="whitespace-normal text-left font-medium enabled:hover:underline" onClick={() => setOpen(l)}>{l.description}</button> },
              { key: "c", label: "Country", className: "w-24", hideOnMobile: true, render: (l) => <span className="text-xs">{l.country}</span> },
              { key: "b", label: "Basis", className: "w-32", render: (l) => <ToneBadge value={l.basis} /> },
              { key: "a", label: "Amount", className: "w-40", render: (l) => { const a = amount(l); return <span className="text-xs tabular-nums">{a === null ? "—" : idr(a)}</span>; } },
              { key: "o", label: "Owner", className: "w-24", render: (l) => <span className="text-xs">{personLabel(people, l.owner_person_id)}</span> },
              { key: "n", label: "Notes", className: "w-[20%]", hideOnMobile: true, render: (l) => <span className="block whitespace-normal text-xs text-[#66768A]">{l.notes}</span> },
            ]} />
        </Section>
      ))}
      <RecordSheet open={!!open} title={open ? `${open.code} ${open.description}` : ""} table="os_programme_budget_lines" idColumn="code" record={open as unknown as Record<string, unknown>}
        fields={[
          { key: "description", label: "Line", required: true },
          { key: "basis", label: "Basis", kind: "select", options: ["Not estimated", "Placeholder estimate", "Formula", "Quote", "Contracted", "Actual"], required: true, hint: "Use Quote, Contracted or Actual only with a document to back it." },
          { key: "currency", label: "Currency", kind: "select", options: ["IDR", "USD", "SGD", "MYR", "THB"], required: true },
          { key: "amount_idr", label: "Amount in IDR", hint: "For non-formula lines. Convert foreign quotes at a dated rate and say which in the notes." },
          { key: "owner_person_id", label: "Owner", kind: "person" }, { key: "notes", label: "Notes and source", kind: "textarea" },
        ]}
        onClose={() => setOpen(null)} onSaved={() => { setOpen(null); lines.reload(); }} />
    </div>
  );
}

// ── Countries ──────────────────────────────────────────────────────────────────────────────────────────────────────
type PlanRow = { country: string; section: string; status: string; known: string | null; open_items: string | null; local_support: string | null; lead_person_id: string | null; sort: number };
function Countries({ p, edit }: Ctx) {
  const params = useSearchParams();
  const people = usePeople();
  const country = p.countries.includes(params.get("country") ?? "") ? params.get("country")! : p.countries[0];
  const plans = useQuery<PlanRow[]>((s) => s.from("os_programme_country_plans").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  const [open, setOpen] = useState<PlanRow | null>(null);
  const rows = (plans.data ?? []).filter((r) => r.country === country);
  return (
    <div>
      <nav aria-label="Country" className="mb-4 flex flex-wrap gap-2">
        {p.countries.map((c) => <Link key={c} href={`/os/gif?tab=countries&country=${c}`} scroll={false} className={cn(c === country ? btnPrimary : btn)}>{c}</Link>)}
      </nav>
      <p className={cn("mb-4 text-sm", muted)}>Country lead: {personLabel(people, rows[0]?.lead_person_id)}. Sections stay Unknown until researched; nothing here is confirmed without written evidence.</p>
      <ErrorLine message={plans.error} />
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <article key={r.section} className={cn(panel, "p-3")}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1F2D3D]">{r.section}</h3>
              <span className="flex items-center gap-1"><ToneBadge value={r.status} />{edit && <button type="button" className={btnGhost} onClick={() => setOpen(r)}>Edit</button>}</span>
            </div>
            {r.known && <p className="mt-2 text-sm">{r.known}</p>}
            {r.open_items && <p className={cn("mt-2 text-sm", muted)}><span className="font-medium text-[#3A4B60]">Open: </span>{r.open_items}</p>}
            {r.local_support && <p className={cn("mt-2 text-xs", muted)}>Local support: {r.local_support}</p>}
          </article>
        ))}
      </div>
      <MatchSheet open={!!open} title={open ? `${open.country}: ${open.section}` : ""} table="os_programme_country_plans" match={open ? { project_id: p.project_id, country: open.country, section: open.section } : {}}
        record={open as unknown as Record<string, unknown>}
        fields={[{ key: "status", label: "Status", kind: "select", options: PLAN_STATUSES }, { key: "known", label: "What we know (with sources)", kind: "textarea" },
          { key: "open_items", label: "Open items", kind: "textarea" }, { key: "local_support", label: "Local support", kind: "textarea" }]}
        onClose={() => setOpen(null)} onSaved={() => { setOpen(null); plans.reload(); }} />
    </div>
  );
}

// ── People: proposed allocation, workstreams, workload ─────────────────────────────────────────────────────────────
type TeamRow = { person_id: string; programme_role: string; accountable_for: string[]; supports: string[]; approves: string | null; escalates_to: string | null; country_lead: string | null; on_site_role: string | null; capacity_note: string | null; basis: string | null; status: string };
type WsRow = { letter: string; name: string; accountable_person_id: string | null; support_person_ids: string[]; local_support: string | null; status: string };
function People({ p, approve }: Ctx) {
  const { supabase } = useOsMe();
  const people = usePeople();
  const team = useQuery<TeamRow[]>((s) => s.from("os_programme_team").select("*").eq("project_id", p.project_id), [p.project_id]);
  const ws = useQuery<WsRow[]>((s) => s.from("os_programme_workstreams").select("*").eq("project_id", p.project_id).order("letter"), [p.project_id]);
  const tasks = useQuery<ProgTask[]>((s) => s.from("os_programme_tasks").select("*").eq("project_id", p.project_id), [p.project_id]);
  const [err, setErr] = useState<string | null>(null);
  const load = useMemo(() => {
    const m = new Map<string, { open: number; hours: number; overdue: number; next90: number }>();
    const today = todayJakarta();
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    (tasks.data ?? []).forEach((t) => {
      if (!t.owner_person_id || ["Completed", "Cancelled"].includes(t.programme_status)) return;
      const x = m.get(t.owner_person_id) ?? { open: 0, hours: 0, overdue: 0, next90: 0 };
      x.open++; x.hours += Number(t.effort_hours ?? 0); if (t.overdue) x.overdue++;
      if (t.due_date && t.due_date >= today && t.due_date <= in90) x.next90 += Number(t.effort_hours ?? 0);
      m.set(t.owner_person_id, x);
    });
    return m;
  }, [tasks.data]);
  const wsName = (l: string) => (ws.data ?? []).find((w) => w.letter === l)?.name ?? l;
  async function approveAll() {
    setErr(null);
    const a = await supabase.from("os_programme_team").update({ status: "Approved" }).eq("project_id", p.project_id).select("person_id");
    const b = await supabase.from("os_programme_workstreams").update({ status: "Approved" }).eq("project_id", p.project_id).select("letter");
    if (a.error || b.error) setErr(programmeError((a.error ?? b.error)!.message));
    team.reload(); ws.reload();
  }
  const allApproved = (team.data ?? []).length > 0 && (team.data ?? []).every((t) => t.status === "Approved");
  return (
    <div className="space-y-6">
      <p className={cn("max-w-3xl text-sm", muted)}>Proposed from each person&apos;s title in Company OS, the decision rights in DOC-0053 and the manager agreements (each manager works remotely before travel, at most 2 hours a day and 10 hours a week). It becomes the plan when Arba or Farrel approves it (GIF-DEC-011). Effort hours are estimates.</p>
      <ErrorLine message={err ?? team.error} />
      {approve && !allApproved && <button type="button" className={btnPrimary} onClick={approveAll}>Approve the allocation as shown</button>}
      <div className="grid gap-3 md:grid-cols-2">
        {(team.data ?? []).map((t) => {
          const l = load.get(t.person_id);
          return (
            <article key={t.person_id} className={cn(panel, "p-3")}>
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="text-sm font-semibold">{personLabel(people, t.person_id)}</h3><p className={cn("text-xs", muted)}>{t.programme_role}</p></div>
                <ToneBadge value={t.status} />
              </div>
              <dl className="mt-2 space-y-1 text-sm">
                <div><dt className="inline font-medium">Accountable: </dt><dd className="inline">{t.accountable_for.length ? t.accountable_for.map((x) => `${x} ${wsName(x)}`).join("; ") : "No workstream (supports others)"}</dd></div>
                <div><dt className="inline font-medium">Supports: </dt><dd className="inline">{t.supports.join(", ") || "—"}</dd></div>
                {t.country_lead && <div><dt className="inline font-medium">Country lead: </dt><dd className="inline">{t.country_lead}</dd></div>}
                <div><dt className="inline font-medium">Approves: </dt><dd className="inline">{t.approves}</dd></div>
                <div><dt className="inline font-medium">On site: </dt><dd className="inline">{t.on_site_role}</dd></div>
                <div><dt className="inline font-medium">Workload: </dt><dd className="inline">{l ? `${l.open} open tasks, ${l.hours} h estimated; ${l.next90} h due in the next 90 days${l.overdue ? `; ${l.overdue} overdue` : ""}` : "No open tasks"}</dd></div>
              </dl>
              <p className={cn("mt-2 text-xs", muted)}>{t.capacity_note} Basis: {t.basis}</p>
              <Link href={`/os/gif?tab=tasks&owner=${t.person_id}`} className={cn(linkCls, "mt-2 inline-block text-xs")}>Their GIF tasks</Link>
            </article>
          );
        })}
      </div>
      <Section title="Workstreams">
        <RowList rows={ws.data ?? []} rowKey={(w) => w.letter}
          columns={[
            { key: "n", label: "Workstream", primary: true, className: "w-[30%]", render: (w) => `${w.letter}. ${w.name}` },
            { key: "a", label: "Accountable", className: "w-28", render: (w) => personLabel(people, w.accountable_person_id) },
            { key: "s", label: "Support", className: "w-40", render: (w) => <span className="text-xs">{w.support_person_ids.map((x) => personLabel(people, x)).join(", ")}</span> },
            { key: "l", label: "Local support", className: "w-[30%]", hideOnMobile: true, render: (w) => <span className="block whitespace-normal text-xs text-[#66768A]">{w.local_support}</span> },
            { key: "st", label: "Status", className: "w-24", render: (w) => <ToneBadge value={w.status} /> },
          ]} />
      </Section>
    </div>
  );
}

// ── Local support (partners) ───────────────────────────────────────────────────────────────────────────────────────
type PartnerRow = { partnership_id: string; code: string; country: string; city: string | null; party_kind: string; support_types: string[]; status: string; supervisor_person_id: string | null; os_partnerships: { organisation: string; notes: string | null; next_action: string | null } | null };
function Partners({ p, edit }: Ctx) {
  const people = usePeople();
  const rows = useQuery<PartnerRow[]>((s) => s.from("os_programme_partner_meta").select("partnership_id, code, country, city, party_kind, support_types, status, supervisor_person_id, os_partnerships(organisation, notes, next_action)").eq("project_id", p.project_id).order("code") as unknown as PromiseLike<{ data: PartnerRow[] | null; error: { message: string } | null }>, [p.project_id]);
  const [country, setCountry] = useState("");
  const list = (rows.data ?? []).filter((r) => !country || r.country === country);
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Universities, Indonesian student associations, student organisations, paid local coordinators and vendors. No one has been contacted for GIF 2027 yet, so every entry is Identified or To research. Volunteers never handle money, medical information, minors alone or institutional commitments; each country has a core-team supervisor. Full records are in <Link href="/os/partnerships" className={linkCls}>Partnerships</Link>.</p>
      <Filters><Select ariaLabel="Country" value={country} onChange={setCountry} options={["Singapore", "Malaysia", "Thailand", "Regional"]} placeholder="Any country" className="md:w-40" /></Filters>
      <ErrorLine message={rows.error} />
      <RowList rows={list} rowKey={(r) => r.code}
        columns={[
          { key: "o", label: "Organisation", primary: true, className: "w-[34%]", render: (r) => <Link href={`/os/partnerships?open=${r.partnership_id}`} className="whitespace-normal hover:underline">{r.os_partnerships?.organisation ?? r.code}</Link> },
          { key: "k", label: "Type", className: "w-36", render: (r) => <span className="text-xs">{r.party_kind}</span> },
          { key: "c", label: "Where", className: "w-28", render: (r) => <span className="text-xs">{r.city ? `${r.city}, ` : ""}{r.country}</span> },
          { key: "t", label: "Support", className: "w-[24%]", hideOnMobile: true, render: (r) => <span className="block whitespace-normal text-xs text-[#66768A]">{r.support_types.join(", ")}</span> },
          { key: "s", label: "Status", className: "w-36", render: (r) => <StatusPicker label="Partner status" table="os_programme_partner_meta" match={{ partnership_id: r.partnership_id }} value={r.status} options={PARTNER_STATUSES} canEdit={edit} onSaved={rows.reload} /> },
          { key: "v", label: "Supervisor", className: "w-24", hideOnMobile: true, render: (r) => <span className="text-xs">{personLabel(people, r.supervisor_person_id)}</span> },
        ]} />
    </div>
  );
}

// ── Outputs ────────────────────────────────────────────────────────────────────────────────────────────────────────
type OutputRow = { code: string; title: string; output_type: string; audience: string; location: string | null; os_document_id: string | null; owner_person_id: string | null; version: string; approval_status: string; needs_revision: boolean; last_updated: string | null; change_summary: string | null; notes: string | null };
function Outputs({ p, edit }: Ctx) {
  const people = usePeople();
  const rows = useQuery<OutputRow[]>((s) => s.from("os_programme_outputs").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  const [type, setType] = useState("");
  const [rev, setRev] = useState(false);
  const [open, setOpen] = useState<OutputRow | null>(null);
  const all = rows.data ?? [];
  const list = all.filter((o) => (!type || o.output_type === type) && (!rev || o.needs_revision || ["Needs revision", "Outdated"].includes(o.approval_status)));
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>Every document, website page, dashboard screen, email, agreement, plan and report GIF depends on, with its owner, version and approval. When a fact or decision changes, the outputs that use it are flagged here and their owners get a revision task.</p>
      <Filters>
        <Select ariaLabel="Type" value={type} onChange={setType} options={[...new Set(all.map((o) => o.output_type))]} placeholder="Any type" className="md:w-44" />
        <label className="flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={rev} onChange={(e) => setRev(e.target.checked)} />Needs revision or outdated</label>
      </Filters>
      <ErrorLine message={rows.error} />
      <RowList rows={list} rowKey={(o) => o.code}
        columns={[
          { key: "t", label: "Output", primary: true, className: "w-[36%]", render: (o) => <button type="button" disabled={!edit} className="whitespace-normal text-left font-medium enabled:hover:underline" onClick={() => setOpen(o)}>{o.title}</button> },
          { key: "y", label: "Type", className: "w-32", hideOnMobile: true, render: (o) => <span className="text-xs">{o.output_type} · {o.audience}</span> },
          { key: "s", label: "Status", className: "w-36", render: (o) => <span className="flex flex-wrap gap-1"><ToneBadge value={o.approval_status} />{o.needs_revision && o.approval_status !== "Needs revision" && <ToneBadge tone="red">Revise</ToneBadge>}</span> },
          { key: "v", label: "Version", className: "w-20", hideOnMobile: true, render: (o) => <span className="text-xs">{o.version}</span> },
          { key: "o", label: "Owner", className: "w-24", render: (o) => <span className="text-xs">{personLabel(people, o.owner_person_id)}</span> },
          { key: "l", label: "Where", className: "w-20", render: (o) => o.location ? <a href={o.location.startsWith("/") || o.location.startsWith("http") ? o.location : undefined} target={o.location.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cn(linkCls, "text-xs")}>Open</a> : <span className="text-xs text-[#8593A3]">—</span> },
        ]} />
      <RecordSheet open={!!open} title={open ? `${open.code} ${open.title}` : ""} table="os_programme_outputs" idColumn="code" record={open as unknown as Record<string, unknown>}
        fields={[
          { key: "title", label: "Title", required: true }, { key: "location", label: "Link or location" },
          { key: "owner_person_id", label: "Owner", kind: "person" }, { key: "version", label: "Version", required: true },
          { key: "approval_status", label: "Approval", kind: "select", options: OUTPUT_STATUSES, required: true, hint: "Published means it is live; only mark it once an approver signed it off." },
          { key: "needs_revision", label: "Needs revision", kind: "checkbox" }, { key: "last_updated", label: "Last updated", kind: "date" },
          { key: "change_summary", label: "What changed in this version", kind: "textarea" }, { key: "notes", label: "Notes", kind: "textarea" },
        ]}
        onClose={() => setOpen(null)} onSaved={() => { setOpen(null); rows.reload(); }} />
    </div>
  );
}

// ── Changes (impact log) ───────────────────────────────────────────────────────────────────────────────────────────
type ChangeRow = { code: string; trigger_kind: string; trigger_ref: string; summary: string; old_value: string | null; new_value: string | null; reason: string | null; status: string; created_by: string | null; created_at: string; os_programme_change_items: { kind: string; ref: string; title: string | null; depth: number; action: string; revision_task_id: string | null; status: string }[] };
function Changes({ p, edit, approve }: Ctx) {
  const { supabase } = useOsMe();
  const people = usePeople();
  const rows = useQuery<ChangeRow[]>(async (s) => {
    const c = await s.from("os_programme_changes").select("*").eq("project_id", p.project_id).order("created_at", { ascending: false });
    const codes = ((c.data ?? []) as ChangeRow[]).map((x) => x.code);
    const i = codes.length ? await s.from("os_programme_change_items").select("change_code, kind, ref, title, depth, action, revision_task_id, status").in("change_code", codes) : { data: [], error: null };
    const items = (i.data ?? []) as (ChangeRow["os_programme_change_items"][number] & { change_code: string })[];
    return { data: ((c.data ?? []) as ChangeRow[]).map((x) => ({ ...x, os_programme_change_items: items.filter((y) => y.change_code === x.code) })), error: c.error ?? i.error };
  }, [p.project_id]);
  const [err, setErr] = useState<string | null>(null);
  const hrefFor = (kind: string, ref: string) => ({ decision: `/os/gif/decisions/${ref}`, fact: "/os/gif?tab=facts", output: "/os/gif?tab=outputs", budget: "/os/gif?tab=budget", milestone: `/os/timeline/${ref}`, risk: "/os/gif?tab=risks", research: "/os/gif?tab=research", country_plan: `/os/gif?tab=countries&country=${ref.split(":")[0]}` } as Record<string, string>)[kind] ?? null;
  async function close(code: string) {
    setErr(null);
    const { error } = await supabase.from("os_programme_changes").update({ status: "Closed", closed_at: new Date().toISOString() }).eq("code", code);
    if (error) setErr(programmeError(error.message)); else rows.reload();
  }
  return (
    <div className="space-y-4">
      <p className={cn("max-w-3xl text-sm", muted)}>Every change to a fact or a decision, and everything that depends on it. Outputs get a revision task each; tasks, milestones and budget lines are listed for review. Approvers close a change once its revisions are approved.</p>
      <ErrorLine message={err ?? rows.error} />
      {!(rows.data ?? []).length && !rows.loading && <Empty title="No changes recorded yet" body="Changes appear when a fact is changed or a decision is answered." />}
      {(rows.data ?? []).map((c) => (
        <article key={c.code} className={cn(panel, "p-3")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{c.code}: {c.summary}</p>
              <p className={cn("text-xs", muted)}>{fmtDateTime(c.created_at)} · {personLabel(people, c.created_by, "System")}{c.reason ? ` · Reason: ${c.reason}` : ""}</p>
            </div>
            <span className="flex items-center gap-2"><ToneBadge value={c.status} />{approve && c.status !== "Closed" && <button type="button" className={btn} onClick={() => close(c.code)}>Close</button>}</span>
          </div>
          <ul className="mt-2 divide-y divide-[#F0F2F5] text-sm">
            {c.os_programme_change_items.sort((a, b) => a.depth - b.depth).map((i) => {
              const h = hrefFor(i.kind, i.ref);
              return (
                <li key={`${i.kind}:${i.ref}`} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0"><ToneBadge tone={i.action === "Revise" ? "red" : "neutral"}>{i.action}</ToneBadge> <span className="text-xs text-[#66768A]">{i.kind}</span> {h ? <Link href={h} className="hover:underline">{i.title ?? i.ref}</Link> : (i.title ?? i.ref)}</span>
                  <span className="flex items-center gap-2">
                    {i.revision_task_id && <Link href={`/os/tasks/${i.revision_task_id}`} className={cn(linkCls, "text-xs")}>Revision task</Link>}
                    <StatusPicker label="Item status" table="os_programme_change_items" match={{ change_code: c.code, kind: i.kind, ref: i.ref }} value={i.status} options={["Pending", "Done", "Not needed"]} canEdit={edit} onSaved={rows.reload} />
                  </span>
                </li>
              );
            })}
            {!c.os_programme_change_items.length && <li className={cn("py-1.5 text-xs", muted)}>Nothing depends on this.</li>}
          </ul>
        </article>
      ))}
    </div>
  );
}

// ── Run sheet ──────────────────────────────────────────────────────────────────────────────────────────────────────
type RunRow = { code: string; day: string; country: string; starts: string | null; ends: string | null; activity: string; location: string | null; lead_person_id: string | null; local_support: string | null; status: string; notes: string | null; sort: number };
function RunSheet({ p, edit }: Ctx) {
  const people = usePeople();
  const rows = useQuery<RunRow[]>((s) => s.from("os_programme_run_sheet").select("*").eq("project_id", p.project_id).order("day").order("starts", { nullsFirst: false }).order("sort"), [p.project_id]);
  const [open, setOpen] = useState<RunRow | null>(null);
  const [creating, setCreating] = useState(false);
  const days = [...new Set((rows.data ?? []).map((r) => r.day))];
  return (
    <div>
      <p className={cn("mb-4 max-w-3xl text-sm", muted)}>A skeleton for 27 July – 3 August. Which country each day is in waits for GIF-DEC-004; sessions come from the approved itinerary. Daily on-site checks are in Checklists.</p>
      {edit && <button type="button" className={cn(btnPrimary, "mb-4")} onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Run sheet item</button>}
      <ErrorLine message={rows.error} />
      <div className="space-y-4">
        {days.map((d, i) => (
          <Section key={d} title={`Day ${i + 1} · ${fmtDate(d)}`}>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
              {(rows.data ?? []).filter((r) => r.day === d).map((r) => (
                <li key={r.code} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0"><span className="mr-2 text-xs tabular-nums text-[#66768A]">{r.starts ? r.starts.slice(0, 5) : "—"}{r.ends ? `–${r.ends.slice(0, 5)}` : ""}</span>
                    {edit ? <button type="button" className="text-left hover:underline" onClick={() => setOpen(r)}>{r.activity}</button> : r.activity}</span>
                  <span className="flex items-center gap-2 text-xs"><ToneBadge value={r.country} /><ToneBadge value={r.status} />{personLabel(people, r.lead_person_id)}</span>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
      <RecordSheet open={creating || !!open} title={open ? `${open.code}` : "New run sheet item"} table="os_programme_run_sheet" idColumn="code" record={open as unknown as Record<string, unknown>}
        defaults={{ project_id: p.project_id, country: "TBD", status: "Proposed", day: p.starts_on }}
        fields={[
          { key: "day", label: "Day", kind: "date", required: true }, { key: "country", label: "Country", kind: "select", options: ["TBD", "Singapore", "Malaysia", "Thailand", "In transit"], required: true },
          { key: "starts", label: "Starts (HH:MM)" }, { key: "ends", label: "Ends (HH:MM)" }, { key: "activity", label: "Activity", required: true },
          { key: "location", label: "Location" }, { key: "lead_person_id", label: "Lead", kind: "person" }, { key: "local_support", label: "Local support" },
          { key: "status", label: "Status", kind: "select", options: ["Skeleton", "Proposed", "Confirmed", "Cancelled"], required: true }, { key: "notes", label: "Notes", kind: "textarea" },
        ]}
        onClose={() => { setOpen(null); setCreating(false); }} onSaved={() => { setOpen(null); setCreating(false); rows.reload(); }} />
    </div>
  );
}

// ── Checklists (pre-event, daily, post-event, participant journey) ────────────────────────────────────────────────
type CheckRow = { code: string; checklist: string; item: string; owner_person_id: string | null; due_date: string | null; timing: string | null; status: string; sort: number };
function Checklists({ p, edit }: Ctx) {
  const people = usePeople();
  const rows = useQuery<CheckRow[]>((s) => s.from("os_programme_checklist_items").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  const lists = [...new Set((rows.data ?? []).map((r) => r.checklist))];
  return (
    <div className="space-y-6">
      <ErrorLine message={rows.error} />
      {lists.map((l) => {
        const items = (rows.data ?? []).filter((r) => r.checklist === l);
        return (
          <Section key={l} title={`${l} (${items.filter((i) => i.status === "Done").length}/${items.length})`}>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
              {items.map((i) => (
                <li key={i.code} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0">{i.item}</span>
                  <span className="flex items-center gap-2 text-xs">{personLabel(people, i.owner_person_id)} · {i.timing ?? <Due d={i.due_date} open={i.status !== "Done"} />}
                    <StatusPicker label="Checklist status" table="os_programme_checklist_items" match={{ code: i.code }} value={i.status} options={CHECK_STATUSES} canEdit={edit} onSaved={rows.reload} /></span>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}

// ── Findings ───────────────────────────────────────────────────────────────────────────────────────────────────────
type FindingRow = { code: string; title: string; detail: string; evidence: string | null; severity: string; proposed_action: string | null; decision_code: string | null; status: string };
function Findings({ p, edit }: Ctx) {
  const rows = useQuery<FindingRow[]>((s) => s.from("os_programme_findings").select("*").eq("project_id", p.project_id).order("sort"), [p.project_id]);
  return (
    <div className="space-y-3">
      <p className={cn("max-w-3xl text-sm", muted)}>Duplicated, conflicting, outdated or incomplete information found while setting up the workspace. Nothing listed here was changed: each needs a founder decision or an owner&apos;s fix.</p>
      <ErrorLine message={rows.error} />
      {(rows.data ?? []).map((f) => (
        <article key={f.code} className={cn(panel, "p-3")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-semibold">{f.code}: {f.title}</h3>
            <span className="flex items-center gap-2"><ToneBadge tone={f.severity === "High" ? "red" : f.severity === "Medium" ? "amber" : "neutral"}>{f.severity}</ToneBadge>
              <StatusPicker label="Finding status" table="os_programme_findings" match={{ code: f.code }} value={f.status} options={["Open", "Resolved", "Accepted as is"]} canEdit={edit} onSaved={rows.reload} /></span>
          </div>
          <p className="mt-1 text-sm">{f.detail}</p>
          {f.evidence && <p className={cn("mt-1 text-xs", muted)}>Evidence: {f.evidence}</p>}
          {f.proposed_action && <p className="mt-1 text-sm"><span className="font-medium">Proposed: </span>{f.proposed_action} {f.decision_code && <Link href={`/os/gif/decisions/${f.decision_code}`} className={linkCls}>{f.decision_code}</Link>}</p>}
        </article>
      ))}
    </div>
  );
}

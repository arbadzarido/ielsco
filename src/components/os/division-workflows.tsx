"use client";

// The "Workflow" tab of each HQ division workspace: the daily working surface for that division, built on the
// existing registers (requests, campaigns, partnerships, recruitment, tasks) plus the Growth creator and experiment
// registers. Every read is the signed-in person's own query, so RLS decides what appears.
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Send } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { announceDataChanged, useDirectory, useQuery } from "@/components/os/data";
import { useDefaultCompany } from "@/components/os/pickers";
import { PORTFOLIO, taskStats, usePortfolioProjects } from "@/components/os/portfolio";
import { RecordSheet } from "@/components/os/records";
import { requestError } from "@/components/os/requests";
import { TaskGrid } from "@/components/os/task-grid";
import { Badge, ErrorLine, Field, Loading, Section, Select, Sheet, Stat, StatusBadge, btn, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import { PRIORITIES, addDays, fmtDate, personLabel, relativeDue, todayJakarta } from "@/lib/os/meta";
import { PARTNER_CATEGORIES, partnerCategoryLabel } from "@/lib/os/org";
import { REQUEST_COLUMNS, isOpen, requestStage, type RequestRow } from "@/lib/os/requests";
import { cn } from "@/lib/utils";

type ProjectOpt = { value: string; label: string };
function useProjectOptions(): ProjectOpt[] {
  const p = useQuery<{ id: string; name: string; status: string; portfolio_rank: number | null }[]>((s) => s.from("os_projects").select("id, name, status, portfolio_rank").order("portfolio_rank", { ascending: true, nullsFirst: false }).order("name"), []);
  return (p.data ?? []).filter((x) => !["Completed", "Cancelled"].includes(x.status)).map((x) => ({ value: x.id, label: x.name }));
}
const projectLabel = (opts: ProjectOpt[], id: string | null | undefined) => opts.find((o) => o.value === id)?.label ?? (id ? id : "—");

function DueText({ due, done }: { due: string | null; done?: boolean }) {
  if (!due) return <span className={muted}>—</span>;
  const r = done ? null : relativeDue(due);
  return <span className={cn("tabular-nums", r?.overdue && "font-medium text-[#A12D2F]", r?.soon && "text-[#865400]")}>{r?.overdue ? r.label : fmtDate(due, { year: false })}</span>;
}

function MiniTable({ head, rows, empty, testId }: { head: string[]; rows: React.ReactNode[][]; empty: string; testId?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E6E9EE] bg-white" data-testid={testId}>
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead><tr>{head.map((h) => <th key={h} className="border-b border-[#DDE2E8] bg-[#F7F8FA] px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#66768A]">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i} className="hover:bg-[#FAFBFC]">{r.map((c, j) => <td key={j} className="border-b border-[#EEF1F5] px-2.5 py-1.5 align-middle">{c}</td>)}</tr>)}
          {!rows.length && <tr><td colSpan={head.length} className={cn("px-3 py-5 text-center text-sm", muted)}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Requests to or from a division ──────────────────────────────────────────────────────────────────────────────
function useRequests(filter: { to?: string; from?: string; type?: string }) {
  return useQuery<RequestRow[]>((s) => {
    let q = s.from("os_requests").select(REQUEST_COLUMNS).order("due_date");
    if (filter.to) q = q.eq("to_division_id", filter.to);
    if (filter.from) q = q.eq("from_division_id", filter.from);
    if (filter.type) q = q.eq("type_code", filter.type);
    return q.limit(500);
  }, [filter.to, filter.from, filter.type]);
}
function RequestTable({ rows, projects, testId, empty }: { rows: RequestRow[]; projects: ProjectOpt[]; testId?: string; empty: string }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  return (
    <MiniTable testId={testId} empty={empty} head={["Request", "Status", "PIC", "Project", "Deadline", "Priority", "Revisions"]}
      rows={rows.map((r) => { const st = requestStage(r); return [
        <Link key="t" href={`/os/requests/${r.id}`} className={cn(linkCls, "font-normal")}>{r.title}</Link>,
        <Badge key="s" tone={st.tone}>{st.label}</Badge>,
        personLabel(people, r.owner_person_id, "Not assigned"),
        r.related_type === "project" ? projectLabel(projects, r.related_id) : "—",
        <DueText key="d" due={r.due_date} done={!isOpen(r)} />,
        <StatusBadge key="p" value={r.priority} />,
        <span key="v" className="tabular-nums">{r.revision_rounds}</span>,
      ]; })} />
  );
}

// ── Content brief (Marketing → Creative) ────────────────────────────────────────────────────────────────────────
const BRIEF_FIELDS = [
  { key: "objective", label: "Objective", hint: "What this piece must achieve", required: true },
  { key: "audience", label: "Audience", required: true },
  { key: "message", label: "Key message", required: true },
  { key: "cta", label: "Call to action" },
  { key: "format", label: "Format and specs", hint: "e.g. Instagram carousel 1080×1350, 8 slides; Reel 30–45 s" , required: true },
  { key: "channel", label: "Channel(s)" },
  { key: "copy", label: "Copy / text", textarea: true },
  { key: "assets", label: "Required assets and links", hint: "Photos (with consent), logos (with permission), Drive links", textarea: true },
  { key: "references", label: "References", textarea: true },
  { key: "publish", label: "Planned publish date" },
];
export function ContentBriefSheet({ open, onClose, onSent, type = "content_brief" }: { open: boolean; onClose: () => void; onSent?: () => void; type?: string }) {
  const { supabase } = useOsMe();
  const company = useDefaultCompany();
  const projects = useProjectOptions();
  const [v, setV] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("P3 Normal");
  const [due, setDue] = useState(addDays(todayJakarta(), 3));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const brief = BRIEF_FIELDS.filter((f) => v[f.key]?.trim()).map((f) => `${f.label}: ${v[f.key].trim()}`).join("\n\n");
  async function send() {
    setErr(null);
    const missing = BRIEF_FIELDS.filter((f) => f.required && !v[f.key]?.trim()).map((f) => f.label);
    if (title.trim().length < 3) { setErr("Give the brief a title (at least 3 characters)."); return; }
    if (missing.length) { setErr(`Fill in: ${missing.join(", ")}.`); return; }
    if (brief.length > 5000) { setErr("The brief is longer than 5,000 characters: link a Drive document for long copy."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("os_request_submit", { p_type: type, p_company: company, p_title: title.trim(), p_brief: brief, p_priority: priority, p_due: due,
      p_related_type: project ? "project" : null, p_related_id: project || null });
    setBusy(false);
    if (error) { setErr(requestError(error.message) ?? error.message); return; }
    setV({}); setTitle(""); setProject(""); announceDataChanged(); onSent?.(); onClose();
  }
  return (
    <Sheet open={open} onClose={onClose} title={type === "distribution_plan" ? "Send to Growth for distribution" : "Content brief to Creative"} wide
      footer={<div className="flex justify-end gap-2"><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={busy} onClick={send} data-testid="os-brief-send"><Send size={15} aria-hidden="true" />Send</button></div>}>
      <div className="grid gap-3 sm:grid-cols-2" data-testid="os-brief-form">
        <Field label="Title" className="sm:col-span-2">{(id) => <input id={id} className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="GIF Super Early Bird carousel" />}</Field>
        <Field label="Project">{(id) => <Select id={id} value={project} onChange={setProject} options={projects} placeholder="No project" />}</Field>
        <Field label="Deadline for Creative">{(id) => <input id={id} type="date" className={input} value={due} min={todayJakarta()} onChange={(e) => setDue(e.target.value)} />}</Field>
        <Field label="Priority">{(id) => <Select id={id} value={priority} onChange={setPriority} options={PRIORITIES} />}</Field>
        {BRIEF_FIELDS.map((f) => (
          <Field key={f.key} label={f.required ? f.label : `${f.label} (optional)`} hint={f.hint} className={cn((f.textarea || f.key === "format") && "sm:col-span-2")}>
            {(id) => f.textarea
              ? <textarea id={id} rows={3} className={input} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
              : <input id={id} className={input} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
          </Field>
        ))}
      </div>
      <ErrorLine message={err} />
      <p className={cn("mt-2 text-xs", muted)}>Creative sees this in its queue at once. Each send-back after delivery counts as a revision round. SOP: Handbook → Content brief to Creative.</p>
    </Sheet>
  );
}

// ── Content calendar (os_campaign_items) ─────────────────────────────────────────────────────────────────────────
type CalItem = { id: string; title: string; channel: string | null; format: string | null; status: string; planned_publish_date: string | null; production_deadline: string | null; owner_person_id: string | null; related_project_id: string | null; campaign: string | null };
function ContentCalendar({ days = 30 }: { days?: number }) {
  const dir = useDirectory();
  const projects = useProjectOptions();
  const today = todayJakarta();
  const items = useQuery<CalItem[]>((s) => s.from("os_campaign_items").select("id, title, channel, format, status, planned_publish_date, production_deadline, owner_person_id, related_project_id, campaign")
    .gte("planned_publish_date", addDays(today, -7)).lte("planned_publish_date", addDays(today, days)).order("planned_publish_date"), [today, days]);
  if (items.loading && !items.data) return <Loading />;
  return (
    <MiniTable testId="os-wf-calendar" empty={`Nothing planned in the next ${days} days. Marketing adds items in Campaigns.`} head={["Publish", "Item", "Channel", "Status", "Production deadline", "Owner", "Project"]}
      rows={(items.data ?? []).map((c) => [
        <span key="d" className="tabular-nums">{fmtDate(c.planned_publish_date, { year: false })}</span>,
        <Link key="t" href={`/os/campaigns?open=${c.id}`} className={cn(linkCls, "font-normal")}>{c.title}</Link>,
        c.channel ?? "—", <StatusBadge key="s" value={c.status} />, <DueText key="p" due={c.production_deadline} done={["Published", "Cancelled", "Ready to publish"].includes(c.status)} />,
        personLabel(dir?.peopleById ?? new Map(), c.owner_person_id), projectLabel(projects, c.related_project_id),
      ])} />
  );
}

// ── Growth registers ─────────────────────────────────────────────────────────────────────────────────────────────
type Creator = { id: number; company_code: string; division_id: string; name: string; handle: string | null; platform: string; creator_type: string; niche: string | null; followers: number | null; project_id: string | null; status: string; owner_person_id: string | null; last_contact_on: string | null; next_follow_up: string | null; fee_note: string | null; deliverables: string | null; results: string | null; profile_url: string | null; notes: string | null; sensitivity: string };
const CREATOR_STATUSES = ["Researched", "Shortlisted", "Contacted", "In talks", "Agreed", "Content live", "Completed", "Declined", "Paused"];
function CreatorTracker() {
  const dir = useDirectory();
  const company = useDefaultCompany();
  const projects = useProjectOptions();
  const rows = useQuery<Creator[]>((s) => s.from("os_growth_creators").select("*").order("next_follow_up", { nullsFirst: false }), []);
  const [open, setOpen] = useState<Creator | null>(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const list = (rows.data ?? []).filter((r) => !status || r.status === status);
  const fields = [
    { key: "name", label: "Name", required: true }, { key: "handle", label: "Handle" },
    { key: "platform", label: "Platform", kind: "select" as const, options: ["Instagram", "TikTok", "YouTube", "LinkedIn", "X", "Other"], required: true },
    { key: "creator_type", label: "Type", kind: "select" as const, options: ["KOL", "UGC", "Community"], required: true },
    { key: "niche", label: "Niche" }, { key: "followers", label: "Followers" },
    { key: "project_id", label: "Project", kind: "select" as const, options: projects },
    { key: "status", label: "Status", kind: "select" as const, options: CREATOR_STATUSES, required: true },
    { key: "owner_person_id", label: "PIC", kind: "person" as const }, { key: "last_contact_on", label: "Last contact", kind: "date" as const },
    { key: "next_follow_up", label: "Next follow-up", kind: "date" as const }, { key: "profile_url", label: "Profile link (https://…)" },
    { key: "deliverables", label: "Deliverables and dates", kind: "textarea" as const }, { key: "fee_note", label: "Fee or terms note", hint: "Escalate terms to the founders; never agree them here." },
    { key: "results", label: "Results (measured, with the date read)", kind: "textarea" as const }, { key: "notes", label: "Notes", kind: "textarea" as const },
    { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: ["Internal", "Confidential"], required: true },
  ];
  return (
    <Section title="KOL and UGC creators" action={<div className="flex gap-2"><Select ariaLabel="Creator status" value={status} onChange={setStatus} options={CREATOR_STATUSES} placeholder="Any status" className="min-h-9 w-auto" /><button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-new-creator"><Plus size={15} aria-hidden="true" />Creator</button></div>}>
      <ErrorLine message={rows.error} />
      <MiniTable testId="os-wf-creators" empty="No creators yet. Add the first one you research." head={["Creator", "Platform", "Type", "Followers", "Status", "PIC", "Next follow-up", "Project"]}
        rows={list.map((c) => [
          <button key="n" type="button" className={cn(linkCls, "text-left font-normal")} onClick={() => setOpen(c)}>{c.name}{c.handle ? <span className={muted}> {c.handle}</span> : null}</button>,
          c.platform, c.creator_type, c.followers?.toLocaleString("en-US") ?? "—", <StatusBadge key="s" value={c.status} />, personLabel(dir?.peopleById ?? new Map(), c.owner_person_id),
          <DueText key="f" due={c.next_follow_up} done={["Completed", "Declined"].includes(c.status)} />, projectLabel(projects, c.project_id),
        ])} />
      <RecordSheet open={creating || !!open} title={open ? open.name : "New creator"} table="os_growth_creators" record={open as unknown as Record<string, unknown> | null} fields={fields}
        defaults={{ company_code: company, division_id: "DIV-03", platform: "Instagram", creator_type: "KOL", status: "Researched", sensitivity: "Internal" }}
        onClose={() => { setCreating(false); setOpen(null); }} onSaved={() => { setCreating(false); setOpen(null); rows.reload(); }} />
    </Section>
  );
}

type Experiment = { id: number; title: string; hypothesis: string | null; channel: string | null; metric: string | null; baseline: string | null; result: string | null; project_id: string | null; status: string; owner_person_id: string | null; start_date: string | null; end_date: string | null; sensitivity: string; company_code: string; division_id: string };
const EXP_STATUSES = ["Idea", "Planned", "Running", "Analysing", "Won", "Lost", "Inconclusive", "Stopped"];
function Experiments() {
  const dir = useDirectory();
  const company = useDefaultCompany();
  const projects = useProjectOptions();
  const rows = useQuery<Experiment[]>((s) => s.from("os_growth_experiments").select("*").order("start_date", { ascending: false, nullsFirst: true }), []);
  const [open, setOpen] = useState<Experiment | null>(null);
  const [creating, setCreating] = useState(false);
  const fields = [
    { key: "title", label: "Experiment", required: true }, { key: "hypothesis", label: "Hypothesis", kind: "textarea" as const },
    { key: "channel", label: "Channel" }, { key: "metric", label: "Metric", hint: "What you will measure" }, { key: "baseline", label: "Baseline" },
    { key: "project_id", label: "Project", kind: "select" as const, options: projects }, { key: "status", label: "Status", kind: "select" as const, options: EXP_STATUSES, required: true },
    { key: "owner_person_id", label: "PIC", kind: "person" as const }, { key: "start_date", label: "Start", kind: "date" as const }, { key: "end_date", label: "End", kind: "date" as const },
    { key: "result", label: "Result (measured)", kind: "textarea" as const }, { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: ["Internal", "Confidential"], required: true },
  ];
  return (
    <Section title="Growth experiments" action={<button type="button" className={btn} onClick={() => setCreating(true)} data-testid="os-new-experiment"><Plus size={15} aria-hidden="true" />Experiment</button>}>
      <MiniTable testId="os-wf-experiments" empty="No experiments yet. One small test a month is enough to start." head={["Experiment", "Channel", "Metric", "Status", "PIC", "Dates", "Project"]}
        rows={(rows.data ?? []).map((x) => [
          <button key="t" type="button" className={cn(linkCls, "text-left font-normal")} onClick={() => setOpen(x)}>{x.title}</button>, x.channel ?? "—", x.metric ?? "—",
          <StatusBadge key="s" value={x.status} />, personLabel(dir?.peopleById ?? new Map(), x.owner_person_id),
          <span key="d" className="tabular-nums text-xs">{x.start_date ? fmtDate(x.start_date, { year: false }) : "—"}{x.end_date ? ` – ${fmtDate(x.end_date, { year: false })}` : ""}</span>, projectLabel(projects, x.project_id),
        ])} />
      <RecordSheet open={creating || !!open} title={open ? open.title : "New experiment"} table="os_growth_experiments" record={open as unknown as Record<string, unknown> | null} fields={fields}
        defaults={{ company_code: company, division_id: "DIV-03", status: "Idea", sensitivity: "Internal" }}
        onClose={() => { setCreating(false); setOpen(null); }} onSaved={() => { setCreating(false); setOpen(null); rows.reload(); }} />
    </Section>
  );
}

// ── Per-division workflow tabs ───────────────────────────────────────────────────────────────────────────────────
export function GrowthWorkflow() {
  const projects = useProjectOptions();
  const incoming = useRequests({ to: "DIV-03" });
  return (
    <div className="space-y-6" data-testid="os-wf-growth">
      <Section title="Upcoming content to distribute (next 30 days)" action={<Link href="/os/campaigns" className={linkCls}>Content calendar</Link>}><ContentCalendar /></Section>
      <Section title="Distribution requests from Marketing"><RequestTable rows={(incoming.data ?? []).filter(isOpen)} projects={projects} empty="No open requests." /></Section>
      <CreatorTracker />
      <Experiments />
      <Section title="Growth tasks"><TaskGrid view="all" fixed={{ division: "DIV-03" }} initialGroup="project" compact testId="os-wf-growth-tasks" /></Section>
    </div>
  );
}

export function MarketingWorkflow() {
  const projects = useProjectOptions();
  const sent = useRequests({ from: "DIV-10" });
  const campaigns = useQuery<{ id: string; name: string; status: string; start_date: string | null; end_date: string | null; project_id: string | null }[]>((s) => s.from("os_campaigns").select("id, name, status, start_date, end_date, project_id").not("status", "in", "(Completed,Cancelled)").order("start_date"), []);
  const [brief, setBrief] = useState<string | null>(null);
  const rows = sent.data ?? [];
  const review = rows.filter((r) => r.status === "delivered");
  return (
    <div className="space-y-6" data-testid="os-wf-marketing">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={() => setBrief("content_brief")} data-testid="os-wf-new-brief"><Send size={15} aria-hidden="true" />Send a content brief to Creative</button>
        <button type="button" className={btn} onClick={() => setBrief("distribution_plan")}>Send approved content to Growth</button>
        <Link href="/os/handbook/guide-content-pillars" className={btn}>Content pillars</Link>
        <Link href="/os/campaigns" className={btn}>Campaigns and calendar</Link>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Briefs open" value={rows.filter((r) => r.type_code === "content_brief" && isOpen(r)).length} />
        <Stat label="Waiting for your review" value={review.length} tone={review.length ? "amber" : undefined} />
        <Stat label="In production" value={rows.filter((r) => ["accepted", "in_progress"].includes(r.status)).length} />
        <Stat label="Active campaigns" value={(campaigns.data ?? []).length} />
      </div>
      <Section title="Delivered: review and approve, or send back"><RequestTable rows={review} projects={projects} empty="Nothing waiting for review." /></Section>
      <Section title="Briefs and requests sent"><RequestTable rows={rows.filter(isOpen)} projects={projects} testId="os-wf-briefs" empty="No open briefs. Send the first one above." /></Section>
      <Section title="Content calendar (next 30 days)"><ContentCalendar /></Section>
      <Section title="Campaigns">
        <MiniTable empty="No active campaigns." head={["Campaign", "Status", "Dates", "Project"]}
          rows={(campaigns.data ?? []).map((c) => [<Link key="n" href={`/os/campaigns/${c.id}`} className={cn(linkCls, "font-normal")}>{c.name}</Link>, <StatusBadge key="s" value={c.status} />,
            <span key="d" className="text-xs tabular-nums">{fmtDate(c.start_date, { year: false })} – {fmtDate(c.end_date, { year: false })}</span>, projectLabel(projects, c.project_id)])} />
      </Section>
      <Section title="Marketing tasks"><TaskGrid view="all" fixed={{ division: "DIV-10" }} initialGroup="project" compact testId="os-wf-marketing-tasks" /></Section>
      <ContentBriefSheet open={!!brief} type={brief ?? "content_brief"} onClose={() => setBrief(null)} onSent={() => sent.reload()} />
    </div>
  );
}

export function CreativeWorkflow() {
  const projects = useProjectOptions();
  const q = useRequests({ to: "DIV-04" });
  const [show, setShow] = useState("open");
  const rows = (q.data ?? []).filter((r) => (show === "open" ? isOpen(r) : show === "all" ? true : r.status === show));
  const today = todayJakarta();
  const open = (q.data ?? []).filter(isOpen);
  return (
    <div className="space-y-6" data-testid="os-wf-creative">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="New, to triage" value={open.filter((r) => r.status === "submitted").length} tone={open.some((r) => r.status === "submitted") ? "amber" : undefined} />
        <Stat label="In production" value={open.filter((r) => ["accepted", "in_progress"].includes(r.status)).length} />
        <Stat label="Delivered, in review" value={open.filter((r) => r.status === "delivered").length} />
        <Stat label="Overdue" value={open.filter((r) => r.due_date < today).length} tone={open.some((r) => r.due_date < today) ? "red" : undefined} />
        <Stat label="Revision rounds (open)" value={open.reduce((a, r) => a + r.revision_rounds, 0)} />
      </div>
      <Section title="Production queue" action={<Select ariaLabel="Queue filter" value={show} onChange={setShow} className="min-h-9 w-auto"
        options={[{ value: "open", label: "Open" }, { value: "submitted", label: "To triage" }, { value: "info_needed", label: "Information needed" }, { value: "in_progress", label: "In progress" }, { value: "delivered", label: "In review" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]} />}>
        <ErrorLine message={q.error} />
        <RequestTable rows={rows.sort((a, b) => (a.priority === b.priority ? a.due_date.localeCompare(b.due_date) : a.priority.localeCompare(b.priority)))} projects={projects} testId="os-wf-creative-queue" empty="The queue is empty." />
        <p className={cn("mt-2 text-xs", muted)}>Sorted by priority, then deadline. Open a request to accept, assign the PIC, create the task, deliver, or see revision history. Final files go to the Brand Assets folder with the request ID in the name.</p>
      </Section>
      <Section title="Creative tasks"><TaskGrid view="all" fixed={{ division: "DIV-04" }} initialGroup="owner" compact testId="os-wf-creative-tasks" /></Section>
    </div>
  );
}

type Opp = { id: string; organisation: string; partner_category: string | null; stage: string; owner_person_id: string | null; follow_up_date: string | null; next_action: string | null; related_project_id: string | null };
export function BusinessWorkflow() {
  const dir = useDirectory();
  const projects = useProjectOptions();
  const opps = useQuery<Opp[]>((s) => s.from("os_partnerships").select("id, organisation, partner_category, stage, owner_person_id, follow_up_date, next_action, related_project_id").order("follow_up_date", { nullsFirst: false }), []);
  const [by, setBy] = useState<"category" | "project">("category");
  const all = (opps.data ?? []).filter((o) => !["6 Won", "7 Lost"].includes(o.stage));
  const today = todayJakarta();
  const groups = useMemo(() => {
    const keys = by === "category" ? [...PARTNER_CATEGORIES.map((c) => c.value as string), "none"] : [...new Set(all.map((o) => o.related_project_id ?? "none"))];
    return keys.map((k) => ({ k, label: by === "category" ? (k === "none" ? "Uncategorised" : partnerCategoryLabel(k)) : k === "none" ? "No project" : projectLabel(projects, k),
      rows: all.filter((o) => (by === "category" ? (o.partner_category ?? "none") : (o.related_project_id ?? "none")) === k) })).filter((g) => g.rows.length || by === "category");
  }, [all, by, projects]);
  return (
    <div className="space-y-6" data-testid="os-wf-business">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {PARTNER_CATEGORIES.map((c) => <Stat key={c.value} label={c.label} value={all.filter((o) => o.partner_category === c.value).length} href={`/os/partnerships?category=${c.value}`} />)}
        <Stat label="Follow-ups due" value={all.filter((o) => o.follow_up_date && o.follow_up_date <= today).length} tone={all.some((o) => o.follow_up_date && o.follow_up_date <= today) ? "amber" : undefined} />
      </div>
      <Section title="Partners" action={<div className="flex gap-2"><Select ariaLabel="Group partners by" value={by} onChange={(v) => setBy(v as "category" | "project")} className="min-h-9 w-auto" options={[{ value: "category", label: "By category" }, { value: "project", label: "By project" }]} /><Link href="/os/partnerships" className={btn}>Open Partnerships</Link></div>}>
        <ErrorLine message={opps.error} />
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.k}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#66768A]">{g.label} · {g.rows.length}</h3>
              <MiniTable empty="None yet." head={["Organisation", "Stage", "PIC", "Follow up", "Next action", by === "category" ? "Project" : "Category"]}
                rows={g.rows.map((o) => [<Link key="o" href={`/os/partnerships?open=${o.id}`} className={cn(linkCls, "font-normal")}>{o.organisation}</Link>, <StatusBadge key="s" value={o.stage} />,
                  personLabel(dir?.peopleById ?? new Map(), o.owner_person_id), <DueText key="f" due={o.follow_up_date} />, <span key="n" className="text-xs">{o.next_action ?? "—"}</span>,
                  by === "category" ? projectLabel(projects, o.related_project_id) : partnerCategoryLabel(o.partner_category)])} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Business tasks"><TaskGrid view="all" fixed={{ division: "DIV-06" }} initialGroup="project" compact testId="os-wf-business-tasks" /></Section>
    </div>
  );
}

export function PeopleWorkflow() {
  const stages = useQuery<{ stage: string }[]>((s) => s.from("os_recruitment_candidates").select("stage").limit(3000), []);
  const people = useQuery<{ id: string; full_name: string; status: string }[]>((s) => s.from("os_people").select("id, full_name, status").in("status", ["invited", "onboarding"]), []);
  const by = (k: string) => (stages.data ?? []).filter((x) => x.stage === k).length;
  const STAGES: [string, string][] = [["new", "New"], ["cv_screening", "CV screening"], ["under_review", "Under review"], ["interview", "Interview"], ["final_evaluation", "Final evaluation"], ["accepted", "Accepted"], ["rejected", "Not selected"]];
  return (
    <div className="space-y-6" data-testid="os-wf-people">
      <Section title="Recruitment pipeline (2027 cohort)" action={<Link href="/os/recruitment" className={btn}>Open Recruitment</Link>}>
        {stages.error ? <p className={cn("text-sm", muted)}>You need a recruitment grant to see candidates. A founder gives it in Admin → Access grants.</p> : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-7">{STAGES.map(([k, l]) => <Stat key={k} label={l} value={by(k)} href={`/os/recruitment?stage=${k}`} />)}</div>
        )}
        <p className={cn("mt-1.5 text-xs", muted)}>Applications close 29 Nov 23:59 WIB · schedule sent 30 Nov · group sessions 1–4 Dec · review 5–8 Dec · decisions 9 Dec · onboarding 10–18 Dec.</p>
      </Section>
      <Section title="Onboarding (people invited or onboarding)">
        <MiniTable empty="Nobody is onboarding right now." head={["Person", "Status", "Next step"]}
          rows={(people.data ?? []).map((p) => [<Link key="p" href={`/os/people/${p.id}`} className={cn(linkCls, "font-normal")}>{p.full_name}</Link>, <StatusBadge key="s" value={p.status} />,
            <span key="n" className="text-xs">{p.status === "invited" ? "First Google sign-in, then a founder approves" : "Onboarding checklist (TPL-D22), orientation, 30-day goals"}</span>])} />
      </Section>
      <div className="grid gap-4 md:grid-cols-3">
        {[["Team records", "/os/people", "Profiles, roles, reporting lines"], ["Reviews", "/os/reviews", "Cycles, feedback, development plans"], ["Announcements", "/os", "Post on Home for the whole team"]].map(([t, h, d]) => (
          <Link key={h} href={h} className={cn(panel, "block p-3 hover:border-[#C9D1DB]")}><p className="font-medium">{t}</p><p className={cn("text-xs", muted)}>{d}</p></Link>
        ))}
      </div>
      <Section title="Delegate support, community care and follow-ups (People tasks)">
        <TaskGrid view="all" fixed={{ division: "DIV-05" }} initialGroup="project" compact testId="os-wf-people-tasks" />
        <p className={cn("mt-1.5 text-xs", muted)}>Every delegate or community issue that needs more than one reply is a task here, with its project (GIF or IELS Circle). SOP: Handbook → Delegate and community support.</p>
      </Section>
    </div>
  );
}

export function OperationsWorkflow() {
  const projects = usePortfolioProjects();
  const tasks = useQuery<{ id: string; title: string; status: string; due_date: string | null; owner_person_id: string | null; division_id: string | null; project_id: string | null }[]>(
    (s) => s.from("os_tasks").select("id, title, status, due_date, owner_person_id, division_id, project_id").limit(3000), []);
  const byKey = new Map((projects.data ?? []).map((p) => [p.portfolio_key, p]));
  return (
    <div className="space-y-6" data-testid="os-wf-operations">
      <Section title="Project dashboards" action={<Link href="/os/portfolio" className={linkCls}>All dashboards</Link>}>
        <div className="grid gap-2 md:grid-cols-4">
          {PORTFOLIO.map((pj) => {
            const row = byKey.get(pj.key);
            const st = taskStats((tasks.data ?? []).filter((t) => row && t.project_id === row.id));
            return (
              <Link key={pj.key} href={`/os/portfolio/${pj.key}`} className={cn(panel, "block p-3 hover:border-[#C9D1DB]")}>
                <p className="text-xs text-[#66768A]">#{pj.rank}</p><p className="font-medium">{pj.name}</p>
                <p className="mt-1 text-xs"><span className="tabular-nums">{st.open}</span> open · <span className={cn("tabular-nums", st.overdue && "font-medium text-[#A12D2F]")}>{st.overdue} overdue</span> · {st.soon} due in 14 d</p>
              </Link>
            );
          })}
        </div>
      </Section>
      <Section title="Overdue across all projects"><TaskGrid view="overdue" initialGroup="project" compact testId="os-wf-ops-overdue" showViewHint={false} /></Section>
      <Section title="Operations tasks"><TaskGrid view="all" fixed={{ division: "DIV-02" }} initialGroup="project" compact testId="os-wf-ops-tasks" /></Section>
    </div>
  );
}


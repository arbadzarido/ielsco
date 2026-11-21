"use client";

// Programme workspace building blocks (first user: GIF Summer 2027, /os/gif). Everything reads and writes with the
// signed-in person's session: RLS decides who sees the registers, the database decides who may edit or answer a
// decision. Nothing here publishes to the website, changes the GIF engine or touches payments.
import { useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useOsMe } from "./OsProvider";
import { useQuery } from "./data";
import { ErrorLine, Field, Select, Sheet, btn, btnPrimary, input } from "./ui";
import type { Tone } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export const GIF_CODE = "GIF";

export type Programme = { project_id: string; code: string; name: string; starts_on: string | null; ends_on: string | null; gif_cohort_id: string | null; countries: string[]; approver_person_ids: string[] };
export type DecisionOption = { key: string; label: string; summary?: string; pros?: string; cons?: string; cost?: string; operations?: string; participant?: string; fact_updates?: Record<string, string>; rejected?: boolean; rejected_note?: string };
export type Decision = {
  code: string; project_id: string; title: string; question: string; background: string | null; why_it_matters: string | null; current_situation: string | null;
  evidence: string | null; options: DecisionOption[]; recommended_option: string | null; recommendation: string | null; info_needed: string | null;
  delay_consequence: string | null; dependencies: string | null; priority: string; phase: string | null; suggested_deadline: string | null; deadline_basis: string | null;
  owner_person_id: string | null; status: string; final_option: string | null; final_decision: string | null; decision_reason: string | null;
  decided_by: string | null; decided_on: string | null; os_decision_id: string | null; sort: number;
};
export const DECISION_COLS = "code, project_id, title, question, background, why_it_matters, current_situation, evidence, options, recommended_option, recommendation, info_needed, delay_consequence, dependencies, priority, phase, suggested_deadline, deadline_basis, owner_person_id, status, final_option, final_decision, decision_reason, decided_by, decided_on, os_decision_id, sort";
export type ProgTask = {
  task_id: string; code: string; project_id: string; title: string; description: string | null; definition_of_done: string | null; category: string; phase: number; country: string;
  priority: string; os_status: string; programme_status: string; owner_person_id: string | null; reviewer_person_id: string | null; start_date: string | null; due_date: string | null;
  blocker: string | null; supporting: string | null; external_dependency: string | null; effort_hours: number | null; deliverable: string | null; needs_core: boolean;
  local_support: boolean; needs_vendor: boolean; needs_approval: boolean; automatable: string | null; simplify: string | null; waiting_on: string | null; critical_path: boolean; overdue: boolean;
};
export type Fact = { key: string; label: string; category: string; value: string; unit: string | null; status: string; public_facing: boolean; source: string | null; source_decision: string | null; notes: string | null; sort: number; version: number; updated_at: string };

export const OPEN_DECISION = (s: string) => !["Decided", "Not Applicable"].includes(s);
export const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
export const rankDecisions = (a: Decision, b: Decision) =>
  (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
  || (a.suggested_deadline ?? "9999").localeCompare(b.suggested_deadline ?? "9999") || a.code.localeCompare(b.code);

export const DECISION_STATUSES = ["Pending Decision", "Needs Research", "Needs External Confirmation", "Awaiting Approval", "Revisit Later", "Decided", "Not Applicable"] as const;
export const FACT_STATUSES = ["Confirmed", "Decided", "Proposed", "Estimated", "Pending", "Unverified", "Unknown", "Outdated"] as const;
export const TASK_PROGRAMME_STATUSES = ["Not Started", "In Progress", "Waiting for Decision", "Waiting for External Party", "Under Review", "Completed", "Blocked", "Cancelled"] as const;
export const RESEARCH_STATUSES = ["To research", "In progress", "Findings recorded", "Verified", "Needs re-verification", "Not applicable"] as const;
export const OUTPUT_STATUSES = ["Not started", "Draft", "In review", "Approved", "Published", "Needs revision", "Outdated"] as const;
export const PARTNER_STATUSES = ["Identified", "To research", "Contacted", "In discussion", "Confirmed", "Declined"] as const;
export const PLAN_STATUSES = ["Confirmed", "Decided", "Proposed", "Pending", "Unknown"] as const;
export const CHECK_STATUSES = ["Not started", "In progress", "Done", "Not applicable"] as const;
export const COUNTRIES = ["All", "Indonesia", "Singapore", "Malaysia", "Thailand"] as const;
export const CATEGORY: Record<string, string> = {
  A: "Strategy and governance", B: "Finance", C: "Recruitment and admissions", D: "Website and digital", E: "Legal, compliance, safeguarding",
  F: "Institutions and partnerships", G: "Programme design", H: "Travel and logistics", I: "Local community and volunteers", J: "Event production",
  K: "Participant experience", L: "Safety and crisis", M: "Communication and documentation", N: "Monitoring and evaluation", O: "Post-event",
};
export const PHASE: Record<number, string> = {
  1: "Initial planning", 2: "Research and decisions", 3: "Recruitment preparation", 4: "Recruitment and admissions", 5: "Partner engagement",
  6: "Financial preparation", 7: "Programme design", 8: "Travel and accommodation", 9: "Local volunteers", 10: "Participant onboarding",
  11: "Pre-departure", 12: "On-site execution", 13: "Departure and follow-up", 14: "Financial reconciliation", 15: "Evaluation and reporting", 16: "Future development",
};

export const PROG_TONE: Record<string, Tone> = {
  Critical: "red", High: "amber", Medium: "neutral", Low: "neutral",
  Decided: "green", "Pending Decision": "amber", "Needs Research": "violet", "Needs External Confirmation": "blue", "Awaiting Approval": "blue", "Revisit Later": "neutral", "Not Applicable": "neutral",
  Confirmed: "green", Proposed: "blue", Estimated: "violet", Pending: "amber", Unverified: "amber", Unknown: "neutral", Outdated: "red",
  "Not Started": "neutral", "In Progress": "teal", "Waiting for Decision": "amber", "Waiting for External Party": "blue", "Under Review": "violet", Completed: "green", Blocked: "red", Cancelled: "neutral",
  "To research": "neutral", "In progress": "teal", "Findings recorded": "blue", Verified: "green", "Needs re-verification": "amber", "Not applicable": "neutral",
  "Not started": "neutral", Draft: "neutral", "In review": "violet", Approved: "green", Published: "green", "Needs revision": "red",
  Identified: "neutral", Contacted: "blue", "In discussion": "violet", Declined: "neutral", Done: "green",
  Open: "amber", Monitoring: "blue", Closed: "green", Resolved: "green", "Accepted as is": "neutral", "Revisions in progress": "teal",
  "Not estimated": "neutral", "Placeholder estimate": "amber", Formula: "blue", Quote: "violet", Contracted: "green", Actual: "green",
  Skeleton: "neutral", TBD: "neutral",
};

export function useProgramme(code = GIF_CODE) {
  return useQuery<Programme | null>((s) => s.from("os_programmes").select("project_id, code, name, starts_on, ends_on, gif_cohort_id, countries, approver_person_ids").eq("code", code).maybeSingle(), [code]);
}

/** Whether the signed-in person may edit the programme's registers and answer its decisions. */
export function useProgrammeRights(projectId: string | null | undefined) {
  const r = useQuery<{ edit: boolean; approve: boolean }>(async (s) => {
    if (!projectId) return { data: { edit: false, approve: false }, error: null };
    const [e, a] = await Promise.all([s.rpc("os_programme_can_edit", { p_project: projectId }), s.rpc("os_programme_is_approver", { p_project: projectId })]);
    return { data: { edit: Boolean(e.data), approve: Boolean(a.data) }, error: e.error ?? a.error };
  }, [projectId]);
  return r.data ?? { edit: false, approve: false };
}

/** Messages the programme functions raise are written for people; everything else gets the generic wording. */
export function programmeError(message: string): string {
  if (/row-level security|permission denied|42501/i.test(message) && !/^Only/.test(message)) return "You don't have permission to do that here.";
  if (/^(Only|Give|Write|Say|Already|There is|That option|Unknown option|Decisions are|Not allowed|Unknown fact|Unknown decision)/.test(message)) return message;
  if (/check constraint/i.test(message)) return "One of the values isn't allowed. Check the form and try again.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

/** A status picker that saves on change (for editors), or a read-only badge. */
export function StatusPicker({ table, match, column = "status", value, options, canEdit, onSaved, label }: {
  table: string; match: Record<string, string>; column?: string; value: string; options: readonly string[]; canEdit: boolean; onSaved: () => void; label: string;
}) {
  const { supabase } = useOsMe();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!canEdit) return <ToneBadge value={value} />;
  return (
    <span className="inline-flex flex-col">
      <Select ariaLabel={label} value={value} disabled={busy} options={options} className="!min-h-8 w-auto py-1 text-xs" onChange={async (v) => {
        setBusy(true); setErr(null);
        const { data, error } = await supabase.from(table).update({ [column]: v }).match(match).select(column);
        setBusy(false);
        if (error || !data?.length) setErr(error ? programmeError(error.message) : "You can't change this.");
        else onSaved();
      }} />
      {err && <span role="alert" className="mt-0.5 text-xs text-[#A12D2F]">{err}</span>}
    </span>
  );
}

const TONES: Record<Tone, string> = {
  neutral: "bg-[#F0F2F5] text-[#4A5A6E]", blue: "bg-[#E8F0FB] text-[#2457A6]", green: "bg-[#E7F4EC] text-[#22663F]", amber: "bg-[#FCF1DC] text-[#865400]",
  red: "bg-[#FCE9E9] text-[#A12D2F]", violet: "bg-[#EFEBFC] text-[#5638B8]", teal: "bg-[#E3F2F1] text-[#0B6058]",
};
export function ToneBadge({ value, tone, children }: { value?: string | null; tone?: Tone; children?: ReactNode }) {
  if (!value && !children) return null;
  return <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium", TONES[tone ?? PROG_TONE[value ?? ""] ?? "neutral"])}>{children ?? value}</span>;
}

/** Edit a few columns of one row matched by its key columns (for tables whose key is not a single id). */
export function MatchSheet({ open, title, table, match, fields, record, onClose, onSaved }: {
  open: boolean; title: string; table: string; match: Record<string, string>; record: Record<string, unknown> | null;
  fields: { key: string; label: string; kind?: "text" | "textarea" | "select"; options?: readonly string[] }[]; onClose: () => void; onSaved: () => void;
}) {
  const { supabase } = useOsMe();
  const init = () => Object.fromEntries(fields.map((f) => [f.key, String(record?.[f.key] ?? "")]));
  const [v, setV] = useState<Record<string, string>>(init);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(false);
  if (open !== last) { setLast(open); if (open) { setV(init()); setErr(null); } }
  async function save() {
    setBusy(true); setErr(null);
    const payload = Object.fromEntries(fields.map((f) => [f.key, v[f.key].trim() || null]));
    const { data, error } = await supabase.from(table).update(payload).match(match).select();
    setBusy(false);
    if (error || !data?.length) return setErr(error ? programmeError(error.message) : "You can't change this.");
    onSaved();
  }
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button></>}>
      <div className="space-y-4">
        <ErrorLine message={err} />
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {(id) => f.kind === "select"
              ? <Select id={id} value={v[f.key]} onChange={(x) => setV((o) => ({ ...o, [f.key]: x }))} options={f.options ?? []} />
              : f.kind === "textarea"
                ? <textarea id={id} rows={4} className={input} value={v[f.key]} onChange={(e) => setV((o) => ({ ...o, [f.key]: e.target.value }))} />
                : <input id={id} className={input} value={v[f.key]} onChange={(e) => setV((o) => ({ ...o, [f.key]: e.target.value }))} />}
          </Field>
        ))}
      </div>
    </Sheet>
  );
}

/** Numeric value of a fact (for budget formulas); null when the fact is not a number. */
export function factNumber(facts: Map<string, Fact>, key: string | null | undefined): number | null {
  if (!key) return null;
  const f = facts.get(key);
  if (!f) return null;
  const n = Number(f.value.replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export const idr = (n: number) => `IDR ${Math.round(n).toLocaleString("en-US")}`;

export async function decide(supabase: SupabaseClient, code: string, action: string, option?: string | null, text?: string | null, reason?: string | null) {
  const { data, error } = await supabase.rpc("os_programme_decide", { p_code: code, p_action: action, p_option: option ?? null, p_text: text ?? null, p_reason: reason ?? null });
  return { data: data as { code: string; status: string; os_decision: string | null; change: string | null } | null, error: error ? programmeError(error.message) : null };
}

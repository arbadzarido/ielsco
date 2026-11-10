import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SupabaseClient } from "@supabase/supabase-js";

// Company OS AI agents, server side only.
//
// Access: every piece of company data an agent sees is read with the signed-in person's own Supabase session, so RLS
// decides what reaches the model; an agent can never see more than the person could open themselves. Actions are
// only PROPOSED by the model; they run after the person confirms, again through their own session.
// Cost: each call reserves its worst-case cost against the monthly cap (USD 25 at most, enforced in the database)
// before it is made, then settles the real cost. The service role is used only for that ledger and for storing
// messages; never to read company data.

import { searchTerms, type AgentKey, type SimpleActionType } from "./ai-core";
import type { PageContext } from "./ai-page";
import { FUNCTION_DECLARATIONS, type DirEvent, type Directory, type IntentType, type ResolvedItem } from "./ai-intents";
import { moveEvent, type MoveScope } from "./event-moves";
export * from "./ai-core";

// ── Retrieval, through the person's own session ─────────────────────────────────────────────────────────────────

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plus = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
type Rows = Record<string, unknown>[];
async function q(p: PromiseLike<{ data: unknown; error: unknown }>): Promise<Rows> { const { data } = await p; return (Array.isArray(data) ? data : []) as Rows; }

// Words that make a section worth its tokens. Everything else is left out unless the page or the agent needs it.
const WANTS = {
  overdue: /\b(overdue|late|behind|blocked|blocker|stuck|terlambat|telat|status|progress|workload|focus|priorit\w*|today|this week|minggu ini|hari ini)\b/i,
  events: /\b(meeting|event|calendar|schedule|agenda|rapat|jadwal|acara|tomorrow|besok|clash|conflict|invite|undang)\b/i,
  timeline: /\b(milestone|timeline|roadmap|deadline|launch|tenggat)\b/i,
  kpis: /\b(kpi|okr|target|metric|objective|key result|performance|kinerja)\b/i,
  decisions: /\b(decision|decided|keputusan)\b/i,
  partnerships: /\b(partner\w*|mou|sponsor|kerja ?sama)\b/i,
  campaigns: /\b(campaign|content|post|instagram|tiktok|konten|kampanye)\b/i,
  documents: /\b(document|doc|template|letter|agreement|contract|sop|policy|dokumen|surat|perjanjian)\b/i,
  recruitment: /\b(recruit\w*|candidates?|applicants?|applications?|interviews?|screening|cv|pelamar|kandidat|rekrutmen|wawancara)\b/i,
};

/** Records with empty fields removed: the model reads less and nothing is lost. */
function compact(rows: Rows): Rows {
  return rows.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))));
}

/** What the person is looking at, read with their own session (RLS decides; a hidden record simply isn't there). */
async function pageData(supabase: SupabaseClient, page: PageContext, t: string, taskCols: string): Promise<Record<string, Rows>> {
  const out: Record<string, Rows> = {};
  const id = page.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrows any query builder by company
  const co = (x: any) => (page.company ? x.eq("company_code", page.company) : x);
  const jobs: Record<string, PromiseLike<Rows>> = {};
  switch (page.kind) {
    case "project":
      if (!id) break;
      jobs.project = q(supabase.from("os_projects").select("id, name, company_code, division_id, status, priority, start_date, due_date, owner_person_id, description").eq("id", id));
      jobs.project_tasks = q(supabase.from("os_tasks").select(`${taskCols}, parent_task_id`).eq("project_id", id).neq("status", "Cancelled").order("due_date", { nullsFirst: false }).limit(80));
      jobs.project_milestones = q(supabase.from("os_timeline_items").select("id, title, due_date, status, is_major").eq("project_id", id).limit(20));
      jobs.project_events = q(supabase.from("os_events").select("id, title, starts_at, status").eq("project_id", id).gte("starts_at", `${plus(t, -7)}T00:00:00+07:00`).order("starts_at").limit(15));
      break;
    case "task":
      if (!id) break;
      jobs.task = q(supabase.from("os_tasks").select(`${taskCols}, description, parent_task_id, division_id, timeline_item_id, reviewer_person_id`).eq("id", id));
      jobs.task_assignees = q(supabase.from("os_task_assignees").select("person_id").eq("task_id", id));
      jobs.subtasks = q(supabase.from("os_tasks").select(taskCols).eq("parent_task_id", id).limit(30));
      jobs.task_comments = q(supabase.from("os_comments").select("body, created_at").eq("entity_type", "task").eq("entity_id", id).order("created_at", { ascending: false }).limit(5));
      break;
    case "tasks": {
      const mine = (page.filters.view ?? "mine") === "mine";
      const st = page.filters.status, pri = page.filters.priority;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the same filters the page shows
      const f = (x: any) => { let y = co(x); if (st) y = y.eq("status", st); else if (!page.filters.show_done) y = y.not("status", "in", "(Done,Cancelled)"); if (pri) y = y.eq("priority", pri); if (page.division) y = y.eq("division_id", page.division); return y; };
      jobs.page_tasks = q(f(supabase.from("os_tasks").select(taskCols)).order("due_date", { nullsFirst: false }).limit(mine ? 40 : 80));
      jobs.unassigned_tasks = q(co(supabase.from("os_tasks").select(taskCols)).is("owner_person_id", null).not("status", "in", "(Done,Cancelled)").limit(30));
      break;
    }
    case "projects":
      jobs.page_projects = q(co(supabase.from("os_projects").select("id, name, company_code, division_id, status, priority, due_date, owner_person_id")).not("status", "in", "(Completed,Cancelled)").limit(60));
      break;
    case "documents":
      jobs.templates = q(supabase.from("os_doc_templates").select("id, name, category, doc_type, sensitivity, company_codes, legal_status").eq("active", true).limit(40));
      jobs.recent_documents = q(co(supabase.from("os_documents").select("id, reference_number, title, doc_type, status, sensitivity, company_code, updated_at")).order("updated_at", { ascending: false }).limit(25));
      break;
    case "document":
      if (id) jobs.document = q(supabase.from("os_documents").select("id, reference_number, title, doc_type, category, status, sensitivity, company_code, division_id, owner_person_id, version, next_review_date, generation_status, notes").eq("id", id));
      break;
    case "calendar": {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(page.filters.d ?? "") ? page.filters.d! : t;
      const view = page.filters.view ?? "month";
      const from = view === "month" ? `${d.slice(0, 8)}01` : plus(d, -1);
      const to = view === "month" ? plus(`${d.slice(0, 8)}01`, 35) : plus(d, view === "day" ? 1 : 8);
      jobs.calendar_events = q(co(supabase.from("os_events").select("id, title, category, starts_at, ends_at, all_day, recurrence, status, company_code")).neq("status", "Cancelled").or(`and(starts_at.gte.${from}T00:00:00+07:00,starts_at.lt.${to}T00:00:00+07:00),recurrence.not.is.null`).order("starts_at").limit(80));
      if (id) jobs.event = q(supabase.from("os_events").select("id, title, category, starts_at, ends_at, location, meeting_url, description, recurrence, status").eq("id", id));
      jobs.calendar_range = Promise.resolve([{ from, to, view }]);
      break;
    }
    case "person":
      if (id) {
        jobs.person = q(supabase.from("os_people").select("id, full_name, short_name, org_role, status").eq("id", id));
        jobs.person_tasks = q(supabase.from("os_tasks").select(taskCols).eq("owner_person_id", id).not("status", "in", "(Done,Cancelled)").limit(40));
      }
      break;
    case "people":
      jobs.divisions_people = q(supabase.from("os_person_divisions").select("person_id, division_id, is_manager").limit(300));
      jobs.open_task_owners = q(supabase.from("os_tasks").select("owner_person_id").not("status", "in", "(Done,Cancelled)").not("owner_person_id", "is", null).limit(1000));
      break;
    case "timeline": case "milestone":
      jobs.timeline = q(co(supabase.from("os_timeline_items").select("id, workstream_code, title, due_date, status, owner_name, is_major, project_id")).gte("due_date", plus(t, -14)).not("status", "in", "(Done,Cancelled)").order("due_date").limit(60));
      if (id) jobs.milestone = q(supabase.from("os_timeline_items").select("id, title, due_date, status, owner_name, deliverable, project_id").eq("id", id));
      break;
    case "kpis": case "kpi": case "okrs":
      jobs.kpis = q(co(supabase.from("os_kpis").select("id, name, function, unit, reporting_period, target_value, target_status, sheet_latest_value, values_restricted")).limit(60));
      jobs.objectives = q(co(supabase.from("os_objectives").select("id, title, status, period, company_code")).limit(30));
      break;
    case "campaigns": case "campaign":
      jobs.campaigns = q(co(supabase.from("os_campaigns").select("id, name, status, start_date, end_date, project_id")).limit(30));
      if (id) jobs.campaign_items = q(supabase.from("os_campaign_items").select("id, title, channel, status, planned_publish_date").eq("campaign_id", id).limit(60));
      break;
    case "partnerships":
      jobs.partnerships = q(co(supabase.from("os_partnerships").select("id, organisation, opportunity_type, stage, evidence_status, owner_person_id, next_action, follow_up_date")).limit(60));
      break;
    case "division":
      if (page.division) {
        jobs.division_projects = q(supabase.from("os_projects").select("id, name, company_code, status, due_date").eq("division_id", page.division).not("status", "in", "(Completed,Cancelled)").limit(30));
        jobs.division_tasks = q(supabase.from("os_tasks").select(taskCols).eq("division_id", page.division).not("status", "in", "(Done,Cancelled)").limit(60));
      }
      break;
    case "workspace":
      jobs.workspace_projects = q(co(supabase.from("os_projects").select("id, name, status, due_date, owner_person_id")).not("status", "in", "(Completed,Cancelled)").limit(40));
      break;
  }
  if (page.selection.length) jobs.selected_tasks = q(supabase.from("os_tasks").select(taskCols).in("id", page.selection.filter((x) => x.startsWith("TSK-"))));
  const entries = await Promise.all(Object.entries(jobs).map(async ([k, p]) => [k, await p] as const));
  for (const [k, v] of entries) if (v.length) out[k] = compact(v);
  if (out.kpis) out.kpis = out.kpis.map((k) => (k.values_restricted ? { ...k, sheet_latest_value: "restricted" } : k));
  if (out.open_task_owners) {
    const n = new Map<string, number>();
    for (const r of out.open_task_owners) n.set(String(r.owner_person_id), (n.get(String(r.owner_person_id)) ?? 0) + 1);
    out.open_tasks_per_person = [...n.entries()].map(([person, open]) => ({ person, open }));
    delete out.open_task_owners;
  }
  return out;
}

/** What this conversation already did, so "those", "continue" and "don't duplicate" resolve to real records. */
export async function conversationRecords(supabase: SupabaseClient, conversationId: string): Promise<Rows> {
  const rows = await q(supabase.from("os_ai_actions").select("action_type, status, preview, result, details, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(20));
  return rows.reverse().map((a) => {
    const r = (a.result ?? {}) as { created?: { id: string; kind: string; title: string; assignee: string | null; deadline: string | null }[]; failed?: { id: string; title: string; error: string }[]; ref?: string; error?: string };
    const items = ((a.details as { items?: { skip?: { existing: string } ; fields?: { label: string; value: string }[] }[] } | null)?.items ?? []);
    return compact([{
      action: a.action_type, status: a.status, summary: a.preview,
      records: r.created?.map((c) => `${c.id} ${c.title}${c.assignee ? ` [${c.assignee}]` : ""}${c.deadline ? ` due ${c.deadline}` : ""}`),
      already_existed: items.filter((i) => i.skip).map((i) => i.skip!.existing),
      failed: r.failed?.map((f) => `${f.id} ${f.error}`) ?? (r.error ? [r.error] : undefined),
      ref: r.ref,
    }])[0];
  });
}

export async function gatherContext(supabase: SupabaseClient, personId: string, agent: AgentKey, company: string | null, message: string, page: PageContext | null = null, conversationId: string | null = null) {
  const t = today();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrows any query builder by company
  const co = (x: any) => (company ? x.eq("company_code", company) : x);
  const ctx: Record<string, Rows> = {};
  const taskCols = "id, title, status, priority, due_date, owner_person_id, project_id, company_code, blocker";
  const want = (k: keyof typeof WANTS) => WANTS[k].test(message);
  const [me, assigned] = await Promise.all([
    q(supabase.from("os_people").select("id, full_name, short_name, org_role").eq("id", personId)),
    q(supabase.from("os_task_assignees").select("task_id").eq("person_id", personId)),
  ]);
  ctx.me = me;
  const assignedIds = assigned.map((a) => String(a.task_id));
  const jobs: Record<string, PromiseLike<Rows>> = {
    my_open_tasks: q(supabase.from("os_tasks").select(taskCols).or(`owner_person_id.eq.${personId}${assignedIds.length ? `,id.in.(${assignedIds.map((x) => x.replace(/[^A-Z0-9-]/g, "")).join(",")})` : ""}`).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(20)),
    // Every live project, briefly: so the assistant reuses one instead of creating a duplicate.
    projects: q(co(supabase.from("os_projects").select("id, name, company_code, division_id, status")).not("status", "in", "(Completed,Cancelled)").order("id", { ascending: false }).limit(60)),
    people: q(supabase.from("os_people").select("id, full_name, short_name").in("status", ["active", "onboarding"]).limit(80)),
  };
  if (agent === "operations" || want("overdue")) {
    jobs.overdue_tasks = q(co(supabase.from("os_tasks").select(taskCols)).lt("due_date", t).not("status", "in", "(Done,Cancelled)").order("due_date").limit(30));
    jobs.blocked_tasks = q(co(supabase.from("os_tasks").select(taskCols)).eq("status", "Blocked").limit(20));
  }
  if (agent === "operations" || want("decisions")) jobs.recent_decisions = q(co(supabase.from("os_decisions").select("id, decision, status, decided_on")).order("decided_on", { ascending: false }).limit(10));
  if (want("timeline") || agent === "operations") jobs.upcoming_timeline = q(supabase.from("os_timeline_items").select("id, workstream_code, title, due_date, status, owner_name, is_major").gte("due_date", t).lte("due_date", plus(t, 45)).not("status", "in", "(Done,Cancelled)").order("due_date").limit(20));
  if (want("events") && page?.kind !== "calendar") jobs.upcoming_events = q(co(supabase.from("os_events").select("id, title, category, starts_at, all_day, recurrence, project_id, campaign_id, timeline_item_id")).neq("status", "Cancelled").or(`starts_at.gte.${t},recurrence.not.is.null`).lt("starts_at", `${plus(t, 30)}T23:59:59+07:00`).order("starts_at").limit(30));
  if ((agent === "growth" || want("kpis")) && !["kpis", "kpi", "okrs"].includes(page?.kind ?? "")) {
    // Finance KPIs keep their values outside the OS; the sheet snapshot is withheld for them too.
    jobs.kpis = q(co(supabase.from("os_kpis").select("id, name, function, unit, reporting_period, target_value, target_status, sheet_latest_value, values_restricted")).eq("level", "Company").limit(40));
  }
  if ((agent === "partnerships" || want("partnerships")) && page?.kind !== "partnerships") {
    jobs.open_partnerships = q(co(supabase.from("os_partnerships").select("id, organisation, opportunity_type, stage, evidence_status, owner_person_id, next_action, follow_up_date")).not("stage", "in", "(\"6 Won\",\"7 Lost\")").order("follow_up_date", { nullsFirst: false }).limit(40));
  }
  if (agent === "growth" || want("campaigns")) {
    jobs.campaign_items = q(co(supabase.from("os_campaign_items").select("id, campaign, title, channel, status, planned_publish_date, actual_publish_date, owner_person_id")).order("planned_publish_date", { ascending: false, nullsFirst: false }).limit(30));
  }
  if (want("documents") && !["documents", "document"].includes(page?.kind ?? "")) jobs.templates = q(supabase.from("os_doc_templates").select("id, name, category, doc_type, company_codes").eq("active", true).limit(30));
  // Recruitment, only when asked about it (candidate data is sensitive and costs tokens). RLS returns rows only to the
  // recruitment team; interviewers get their own assignments. No contact details are passed to the model.
  if (want("recruitment") || page?.kind === "recruitment" || page?.kind === "candidate") {
    jobs.recruitment_candidates = q(supabase.from("career_applications").select("id, full_name, university, academic_year, domicile_city, domicile_country, role_id, role_2_id, campaign_verification, submitted_at").eq("cohort", "2027").order("submitted_at", { ascending: false }).limit(80));
    jobs.recruitment_pipeline = q(supabase.from("os_recruitment_candidates").select("application_id, stage, reviewer_person_id, stage_changed_at, employee_person_id").limit(400));
    jobs.recruitment_assigned_to_me = q(supabase.rpc("os_recruitment_my_assignments"));
    jobs.recruitment_interviews = q(supabase.from("os_events").select("id, title, starts_at, candidate_id, status").not("candidate_id", "is", null).gte("starts_at", `${plus(t, -7)}T00:00:00+07:00`).order("starts_at").limit(40));
    jobs.recruitment_tasks = q(supabase.from("os_tasks").select("id, title, status, owner_person_id, due_date, candidate_id").not("candidate_id", "is", null).not("status", "in", "(Done,Cancelled)").limit(60));
  }
  // Words from the message: matching records of each kind, merged across words (one list per kind, no repeats).
  const terms = searchTerms(message);
  const match: Record<string, PromiseLike<Rows>[]> = { match_projects: [], match_tasks: [], match_documents: [], match_events: [], match_timeline: [], match_campaigns: [] };
  for (const term of terms) {
    const pat = `%${term}%`;
    match.match_projects.push(q(supabase.from("os_projects").select("id, name, status, due_date, owner_person_id, company_code").ilike("name", pat).limit(8)));
    match.match_tasks.push(q(supabase.from("os_tasks").select(taskCols).ilike("title", pat).neq("status", "Cancelled").limit(10)));
    match.match_documents.push(q(supabase.from("os_documents").select("id, reference_number, title, doc_type, status").ilike("title", pat).limit(6)));
    match.match_events.push(q(supabase.from("os_events").select("id, title, category, starts_at, all_day, recurrence, status, project_id").ilike("title", pat).order("starts_at", { ascending: false }).limit(6)));
    match.match_timeline.push(q(supabase.from("os_timeline_items").select("id, title, due_date, status, is_major, project_id").ilike("title", pat).limit(6)));
    match.match_campaigns.push(q(supabase.from("os_campaigns").select("id, name, status, start_date, end_date, project_id").ilike("name", pat).limit(4)));
  }
  for (const [k, ps] of Object.entries(match)) if (ps.length) jobs[k] = Promise.all(ps).then((lists) => { const seen = new Set<string>(); return lists.flat().filter((r) => { const id = String(r.id); if (seen.has(id)) return false; seen.add(id); return true; }); });
  const [entries, pageCtx, records] = await Promise.all([
    Promise.all(Object.entries(jobs).map(async ([k, p]) => [k, await p] as const)),
    page ? pageData(supabase, page, t, taskCols) : Promise.resolve({} as Record<string, Rows>),
    conversationId ? conversationRecords(supabase, conversationId) : Promise.resolve([] as Rows),
  ]);
  for (const [k, v] of entries) if (v.length) ctx[k] = compact(v);
  // "Everything related to X": for the projects that matched (and not already on the page), the work linked to them.
  const projectIds = (ctx.match_projects ?? []).map((r) => String(r.id)).filter((x) => x !== page?.id).slice(0, 3);
  if (projectIds.length) {
    const [ev, tk, tl] = await Promise.all([
      q(supabase.from("os_events").select("id, title, category, starts_at, all_day, recurrence, status, project_id").in("project_id", projectIds).order("starts_at").limit(30)),
      q(supabase.from("os_tasks").select(taskCols).in("project_id", projectIds).not("status", "in", "(Cancelled)").order("due_date", { nullsFirst: false }).limit(60)),
      q(supabase.from("os_timeline_items").select("id, title, due_date, status, is_major, project_id").in("project_id", projectIds).limit(20)),
    ]);
    if (ev.length) ctx.related_project_events = compact(ev);
    if (tk.length) ctx.related_project_tasks = compact(tk);
    if (tl.length) ctx.related_project_milestones = compact(tl);
  }
  if (ctx.kpis) ctx.kpis = ctx.kpis.map((k) => (k.values_restricted ? { ...k, sheet_latest_value: "restricted" } : k));
  // Recruitment workflows that look unfinished, so the agent can point them out (IDs and counts, no judgement).
  if (ctx.recruitment_pipeline?.length) {
    const withInterview = new Set((ctx.recruitment_interviews ?? []).map((e) => String(e.candidate_id)));
    const p = ctx.recruitment_pipeline;
    ctx.recruitment_incomplete = [{
      past_new_without_reviewer: p.filter((r) => r.stage !== "new" && !r.reviewer_person_id).map((r) => r.application_id),
      interview_stage_without_scheduled_interview: p.filter((r) => r.stage === "interview" && !withInterview.has(String(r.application_id))).map((r) => r.application_id),
      accepted_without_person_record: p.filter((r) => r.stage === "accepted" && !r.employee_person_id).map((r) => r.application_id),
      campaign_not_verified: (ctx.recruitment_candidates ?? []).filter((c) => c.campaign_verification !== "verified").length,
    }];
  }
  return { today: t, company: company ?? page?.company ?? "all companies the person works in", data: ctx, page: pageCtx, records };
}

/** Runs a confirmed action with the person's own session, so RLS and the database rules apply. */
export async function executeAction(supabase: SupabaseClient, type: SimpleActionType, p: Record<string, unknown>): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const done = (r: { data: unknown; error: { message: string } | null }, key = "id") => {
    if (r.error || !r.data) return { ok: false as const, error: r.error ? (/row-level|permission/i.test(r.error.message) ? "You don't have permission to do that." : r.error.message.slice(0, 200)) : "Nothing was changed. You may not have access to that record." };
    return { ok: true as const, ref: String((r.data as Record<string, unknown>)[key]) };
  };
  switch (type) {
    case "update_task_status": return done(await supabase.from("os_tasks").update({ status: p.status }).eq("id", p.task_id as string).select("id").maybeSingle());
    case "add_comment": return done(await supabase.from("os_comments").insert(p).select("id").maybeSingle());
    case "log_kpi_value": return done(await supabase.from("os_kpi_values").insert(p).select("id").maybeSingle());
    case "create_partnership": return done(await supabase.from("os_partnerships").insert({ ...p, stage: "1 Identified" }).select("id").maybeSingle());
    case "create_recruitment_task": {
      const [{ data: me }, { data: brief }] = await Promise.all([supabase.rpc("os_current_person"), supabase.rpc("os_recruitment_candidate_brief", { p_app: p.candidate_id })]);
      if (!brief) return { ok: false, error: "You don't have recruitment access to that candidate." };
      return done(await supabase.from("os_tasks").insert({ company_code: "HQ", title: `${p.kind}: ${(brief as { full_name: string }).full_name}`.slice(0, 200), owner_person_id: p.owner_person_id,
        reviewer_person_id: me ?? null, due_date: p.due_date ?? null, status: "Ready", candidate_id: p.candidate_id }).select("id").maybeSingle());
    }
    case "schedule_interview": {
      const { data: brief } = await supabase.rpc("os_recruitment_candidate_brief", { p_app: p.candidate_id });
      if (!brief) return { ok: false, error: "You don't have recruitment access to that candidate." };
      const start = new Date(String(p.starts_at));
      const end = new Date(start.getTime() + Number(p.minutes) * 60_000);
      const ev = await supabase.from("os_events").insert({ company_code: "HQ", title: `Interview: ${(brief as { full_name: string }).full_name}`.slice(0, 200), category: "Meeting",
        starts_at: start.toISOString(), ends_at: end.toISOString(), timezone: "Asia/Jakarta", meeting_url: p.meeting_url ?? null, sensitivity: "Restricted", candidate_id: p.candidate_id }).select("id").maybeSingle();
      if (ev.error || !ev.data) return done(ev);
      const evId = (ev.data as { id: string }).id;
      const inv = await supabase.from("os_event_attendees").insert((p.interviewer_ids as string[]).map((person_id) => ({ event_id: evId, person_id })));
      if (inv.error) return { ok: false, error: `The interview was created (${evId}) but inviting failed: ${inv.error.message.slice(0, 120)}` };
      return done(ev);
    }
  }
}

// ── Intents: the directory they are resolved against, and running them ──────────────────────────────────────────

/** Everything an instruction may refer to, read with the person's own session (RLS: only what they can see). */
export async function loadDirectory(supabase: SupabaseClient, personId: string): Promise<Directory> {
  const from = `${plus(today(), -14)}T00:00:00+07:00`, until = `${plus(today(), 180)}T00:00:00+07:00`;
  const evCols = "id, title, company_code, category, starts_at, ends_at, all_day, timezone, recurrence, status, google_event_id";
  const [people, pc, pd, divisions, projects, timeline, tasks, oneOff, series, campaigns, partnerships] = await Promise.all([
    q(supabase.from("os_people").select("id, full_name, short_name, org_role, status").limit(500)),
    q(supabase.from("os_person_companies").select("person_id, company_code").limit(2000)),
    q(supabase.from("os_person_divisions").select("person_id, division_id, is_manager").limit(2000)),
    q(supabase.from("os_divisions").select("id, code, name").order("id")),
    q(supabase.from("os_projects").select("id, name, company_code, division_id, status").order("id", { ascending: false }).limit(500)),
    q(supabase.from("os_timeline_items").select("id, title, company_code, workstream_code, workstream_name").order("id").limit(1000)),
    q(supabase.from("os_tasks").select("id, title, company_code, project_id, status, due_date, priority").order("id", { ascending: false }).limit(1500)),
    q(supabase.from("os_events").select(evCols).is("recurrence", null).gte("ends_at", from).lt("starts_at", until).order("starts_at").limit(500)),
    q(supabase.from("os_events").select(evCols).not("recurrence", "is", null).or(`series_ends_at.is.null,series_ends_at.gt.${from}`).limit(200)),
    q(supabase.from("os_campaigns").select("id, name, company_code, project_id, timeline_item_id, status").limit(300)),
    q(supabase.from("os_partnerships").select("id, organisation, company_code").limit(500)),
  ]);
  const comp = new Map<string, string[]>(), divs = new Map<string, string[]>(), managed = new Map<string, string[]>();
  for (const r of pc) comp.set(String(r.person_id), [...(comp.get(String(r.person_id)) ?? []), String(r.company_code)]);
  for (const r of pd) {
    divs.set(String(r.person_id), [...(divs.get(String(r.person_id)) ?? []), String(r.division_id)]);
    if (r.is_manager) managed.set(String(r.person_id), [...(managed.get(String(r.person_id)) ?? []), String(r.division_id)]);
  }
  const exRows = series.length ? await q(supabase.from("os_event_exceptions").select("event_id, occurrence_start, cancelled, starts_at, ends_at").in("event_id", series.map((e) => String(e.id)))) : [];
  const events: DirEvent[] = [...oneOff, ...series].map((e) => ({ ...(e as unknown as DirEvent), exceptions: exRows.filter((x) => x.event_id === e.id) as unknown as DirEvent["exceptions"] }));
  const ws = new Map<string, Directory["workstreams"][number]>();
  for (const t of timeline) if (!ws.has(String(t.workstream_code))) ws.set(String(t.workstream_code), { code: String(t.workstream_code), name: String(t.workstream_name), company_code: String(t.company_code) });
  return {
    me: personId, today: today(), myCompanies: comp.get(personId) ?? [],
    people: people.map((p) => ({ id: String(p.id), full_name: String(p.full_name), short_name: (p.short_name as string) ?? null, org_role: String(p.org_role), status: String(p.status), companies: comp.get(String(p.id)) ?? [], divisions: divs.get(String(p.id)) ?? [], managed: managed.get(String(p.id)) ?? [] })),
    divisions: divisions as Directory["divisions"],
    projects: projects as Directory["projects"],
    workstreams: [...ws.values()].sort((a, b) => Number(a.code.slice(2)) - Number(b.code.slice(2))),
    milestones: timeline.map((t) => ({ id: String(t.id), title: String(t.title), company_code: String(t.company_code) })),
    tasks: tasks as Directory["tasks"],
    events, campaigns: campaigns as Directory["campaigns"], partnerships: partnerships as Directory["partnerships"],
  };
}

export interface Created { id: string; kind: string; title: string; assignee: string | null; deadline: string | null; link: string; push?: string[]; note?: string }
export interface Failed { id: string; title: string; error: string }
const denied = (m: string) => (/row-level|permission|42501/i.test(m) ? "You don't have permission to create this. Nothing was created." : "It couldn't be created. Nothing was changed.");

/** Runs resolved items with the person's own session. A batch of tasks is one transaction: all or nothing. */
export async function executeIntent(supabase: SupabaseClient, type: IntentType, all: ResolvedItem[], dir: Directory): Promise<{ ok: true; created: Created[]; failed?: Failed[] } | { ok: false; error: string; failed?: Failed[] }> {
  const who = (ids: unknown) => (Array.isArray(ids) && ids.length ? ids.map((i) => dir.people.find((p) => p.id === i)?.full_name ?? String(i)).join(", ") : null);
  // Records that already exist are reported as such and never written again.
  const existing: Created[] = all.filter((i) => i.skip && !i.skip.existing.startsWith("#")).map((i) => {
    const id = i.skip!.existing, t = dir.tasks.find((x) => x.id === id), p = dir.projects.find((x) => x.id === id);
    return { id, kind: i.kind, title: t?.title ?? p?.name ?? String((i.draft as { title?: string; name?: string }).title ?? (i.draft as { name?: string }).name ?? id), assignee: null, deadline: t?.due_date ?? null, link: id.startsWith("PRJ") ? `/os/projects/${id}` : `/os/tasks/${id}`, note: "already existed" };
  });
  const items = all.filter((i) => !i.skip);
  const ins = items.map((i) => i.insert!) as Record<string, unknown>[];
  if (!items.length) return { ok: true, created: existing };
  if (type === "create_project") {
    const { data, error } = await supabase.from("os_projects").insert(ins[0]).select("id, name").maybeSingle();
    if (error || !data) { console.error("[os ai] create project failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "row-level") }; }
    return { ok: true, created: [{ id: String(data.id), kind: "project", title: String(data.name), assignee: who(ins[0].owner_person_id ? [ins[0].owner_person_id] : []), deadline: (ins[0].due_date as string) ?? null, link: `/os/projects/${data.id}` }] };
  }
  if (type === "update_tasks") {
    // Each task on its own: one the person can't change is reported, the others still go through.
    const created: Created[] = [...existing], failed: Failed[] = [];
    for (const u of ins) {
      const id = String(u.task_id), task = dir.tasks.find((t) => t.id === id), title = task?.title ?? id;
      const set = (u.set ?? {}) as Record<string, unknown>, assign = u.assign as { people: string[]; replace: boolean } | null;
      if (Object.keys(set).length) {
        const { data, error } = await supabase.from("os_tasks").update(set).eq("id", id).select("id, title, due_date").maybeSingle();
        if (error || !data) { failed.push({ id, title, error: error ? denied(error.message).replace("create this", "change this task") : "You can't change this task. Nothing was changed." }); continue; }
      }
      if (assign) {
        const { data, error } = await supabase.rpc("os_assign_task", { p_task: id, p_people: assign.people, p_replace: assign.replace });
        if (error || !data) { failed.push({ id, title, error: Object.keys(set).length ? "The other changes were saved, but the assignment wasn't allowed." : "You can't assign this task." }); continue; }
      }
      created.push({ id, kind: "update", title: (set.title as string) ?? title, assignee: assign ? who(assign.people) : null, deadline: "due_date" in set ? (set.due_date as string | null) : null, link: `/os/tasks/${id}`,
        note: [set.status ? `status ${set.status}` : "", set.priority ? String(set.priority) : "", set.project_id ? `moved to ${set.project_id}` : ""].filter(Boolean).join(", ") || undefined });
    }
    return created.length > existing.length || !failed.length ? { ok: true, created, ...(failed.length ? { failed } : {}) } : { ok: false, error: failed[0]?.error ?? "Nothing was changed.", failed };
  }
  if (type === "create_task" || type === "create_tasks") {
    const { data, error } = await supabase.rpc("os_create_tasks", { p_tasks: ins });
    if (error || !Array.isArray(data)) { console.error("[os ai] create tasks failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "") }; }
    // Tasks that prepare for an event are linked to it (the event itself is not changed).
    const links = (data as { id: string }[]).flatMap((r, n) => (ins[n].event_id ? [{ event_id: ins[n].event_id as string, task_id: r.id }] : []));
    if (links.length) { const l = await supabase.from("os_event_tasks").insert(links); if (l.error) console.error("[os ai] event links failed", l.error.code); }
    return { ok: true, created: [...(data as { id: string; title: string }[]).map((r, n) => ({ id: r.id, kind: "task", title: r.title, assignee: who(ins[n].assignees), deadline: (ins[n].due_date as string) ?? null, link: `/os/tasks/${r.id}` })), ...existing] };
  }
  if (type === "create_event") {
    const { data, error } = await supabase.rpc("os_create_event", { p: ins[0] });
    if (error || !data) { console.error("[os ai] create event failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "") }; }
    return { ok: true, created: [{ id: String(data), kind: "event", title: String(ins[0].title), assignee: who(ins[0].attendees), deadline: String(ins[0].starts_at), link: `/os/calendar?event=${data}` }] };
  }
  if (type === "create_timeline_item") {
    const { data, error } = await supabase.from("os_timeline_items").insert(ins[0]).select("id").maybeSingle();
    if (error || !data) { console.error("[os ai] create milestone failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "row-level") }; }
    return { ok: true, created: [{ id: String(data.id), kind: "milestone", title: String(ins[0].title), assignee: (ins[0].owner_name as string) ?? null, deadline: String(ins[0].due_date), link: `/os/timeline/${data.id}` }] };
  }
  if (type === "create_campaign") {
    const { data, error } = await supabase.from("os_campaigns").insert(ins[0]).select("id").maybeSingle();
    if (error || !data) { console.error("[os ai] create campaign failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "row-level") }; }
    return { ok: true, created: [{ id: String(data.id), kind: "campaign", title: String(ins[0].name), assignee: who(ins[0].owner_person_id ? [ins[0].owner_person_id] : []), deadline: (ins[0].start_date as string) ?? null, link: `/os/campaigns/${data.id}` }] };
  }
  if (type === "create_content_items") {
    const { data, error } = await supabase.rpc("os_create_content_items", { p_items: ins[0].items });
    if (error || !Array.isArray(data)) { console.error("[os ai] content items failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "") }; }
    const list = ins[0].items as Record<string, unknown>[];
    return { ok: true, created: (data as { id: string; title: string }[]).map((r, n) => ({ id: r.id, kind: "content", title: r.title, assignee: who(list[n].creator_person_id ? [list[n].creator_person_id] : []), deadline: String(list[n].planned_publish_date), link: `/os/campaigns?open=${r.id}` })) };
  }
  if (type === "move_event") {
    const m = ins[0];
    const { data: ev } = await supabase.from("os_events").select("id, title, starts_at, ends_at, all_day, timezone, recurrence, google_event_id, google_synced_by").eq("id", m.event_id as string).maybeSingle();
    if (!ev) return { ok: false, error: "You can't change this event. Nothing was changed." };
    const occ = ev.recurrence ? { occurrence_start: String(m.occurrence_start), starts_at: String(m.occ_starts_at), ends_at: String(m.occ_ends_at) } : null;
    const r = await moveEvent(supabase, ev as never, occ, m.scope as MoveScope, { starts_at: String(m.starts_at), ends_at: String(m.ends_at) });
    if (!r.ok) return { ok: false, error: "You can't change this event. Nothing was changed." };
    return { ok: true, created: [{ id: String(ev.id), kind: "move", title: String(ev.title), assignee: null, deadline: String(m.starts_at), link: `/os/calendar?event=${ev.id}`, push: ev.google_event_id && ev.google_synced_by === dir.me ? r.changed : [] }] };
  }
  if (type === "invite_to_event") {
    const m = ins[0];
    const rows = (m.attendees as { person_id: string; via_group: string | null }[]).map((x) => ({ event_id: m.event_id as string, person_id: x.person_id, via_group: x.via_group }));
    const { error } = await supabase.from("os_event_attendees").upsert(rows, { onConflict: "event_id,person_id", ignoreDuplicates: true });
    if (error) { console.error("[os ai] invite failed", error.code); return { ok: false, error: denied(error.message) }; }
    const ev = dir.events?.find((e) => e.id === m.event_id);
    return { ok: true, created: [{ id: String(m.event_id), kind: "invitation", title: ev?.title ?? String(m.event_id), assignee: who(rows.map((r) => r.person_id)), deadline: null, link: `/os/calendar?event=${m.event_id}` }] };
  }
  const a = ins[0];
  const { data, error } = await supabase.rpc("os_assign_task", { p_task: a.task_id, p_people: a.assignees, p_replace: a.replace });
  if (error || !data) { console.error("[os ai] assign failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "") }; }
  const t = dir.tasks.find((x) => x.id === a.task_id);
  return { ok: true, created: [{ id: String(a.task_id), kind: "assignment", title: t?.title ?? String(a.task_id), assignee: who(a.assignees), deadline: null, link: `/os/tasks/${a.task_id}` }] };
}

// ── The model call ──────────────────────────────────────────────────────────────────────────────────────────────

export function aiConfigured() { return Boolean(process.env.GEMINI_API_KEY); }

/** A Gemini stand-in for automated tests. Ignored on Vercel, so production always talks to Google. */
function geminiBase(): string | undefined { return process.env.VERCEL ? undefined : process.env.OS_GEMINI_BASE || undefined; }

export interface ModelCall { name: string; args: Record<string, unknown> }
export async function callModel(model: string, system: string, history: { role: "user" | "assistant"; content: string }[], userTurn: string, maxOutput: number, functions = true) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const base = geminiBase();
  const m = genAI.getGenerativeModel({ model, systemInstruction: system, generationConfig: { maxOutputTokens: maxOutput, temperature: 0.2 },
    // Structured function calling: the model fills declared parameters; the server validates and resolves them.
    ...(functions ? { tools: [{ functionDeclarations: FUNCTION_DECLARATIONS as unknown as never[] }] } : {}) }, base ? { baseUrl: base } : undefined);
  const res = await m.generateContent({
    contents: [...history.map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })), { role: "user", parts: [{ text: userTurn }] }],
  });
  const u = res.response.usageMetadata;
  // Thinking tokens are billed as output, so count everything the model produced, not only the visible reply.
  const input = u?.promptTokenCount ?? 0;
  const output = Math.max((u?.totalTokenCount ?? 0) - input, (u?.candidatesTokenCount ?? 0) + ((u as { thoughtsTokenCount?: number } | undefined)?.thoughtsTokenCount ?? 0));
  const cut = res.response.candidates?.[0]?.finishReason === "MAX_TOKENS";
  const parts = res.response.candidates?.[0]?.content?.parts ?? [];
  const calls: ModelCall[] = parts.filter((p) => p.functionCall).map((p) => ({ name: p.functionCall!.name, args: (p.functionCall!.args ?? {}) as Record<string, unknown> }));
  const visible = parts.filter((p) => typeof p.text === "string" && !(p as { thought?: boolean }).thought).map((p) => p.text).join("");
  const text = visible + (cut ? "\n\n(The reply was cut short. Ask a narrower question for the rest.)" : "");
  return { text, calls, input, output };
}

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

import { searchTerms, type ActionType, type AgentKey } from "./ai-core";
export * from "./ai-core";

// ── Retrieval, through the person's own session ─────────────────────────────────────────────────────────────────

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plus = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
type Rows = Record<string, unknown>[];
async function q(p: PromiseLike<{ data: unknown; error: unknown }>): Promise<Rows> { const { data } = await p; return (Array.isArray(data) ? data : []) as Rows; }

export async function gatherContext(supabase: SupabaseClient, personId: string, agent: AgentKey, company: string | null, message: string) {
  const t = today();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrows any query builder by company
  const co = (x: any) => (company ? x.eq("company_code", company) : x);
  const ctx: Record<string, Rows> = {};
  const [me, assigned] = await Promise.all([
    q(supabase.from("os_people").select("id, full_name, short_name, org_role").eq("id", personId)),
    q(supabase.from("os_task_assignees").select("task_id").eq("person_id", personId)),
  ]);
  ctx.me = me;
  const assignedIds = assigned.map((a) => String(a.task_id));
  const taskCols = "id, title, status, priority, due_date, owner_person_id, project_id, company_code, blocker";
  const jobs: Record<string, PromiseLike<Rows>> = {
    my_open_tasks: q(supabase.from("os_tasks").select(taskCols).or(`owner_person_id.eq.${personId}${assignedIds.length ? `,id.in.(${assignedIds.map((x) => x.replace(/[^A-Z0-9-]/g, "")).join(",")})` : ""}`).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(25)),
    active_projects: q(co(supabase.from("os_projects").select("id, name, status, priority, due_date, owner_person_id, company_code, division_id")).not("status", "in", "(Completed,Cancelled)").limit(30)),
    upcoming_timeline: q(supabase.from("os_timeline_items").select("id, workstream_code, title, due_date, status, owner_name, is_major").gte("due_date", t).lte("due_date", plus(t, 45)).not("status", "in", "(Done,Cancelled)").order("due_date").limit(20)),
    people: q(supabase.from("os_people").select("id, full_name, short_name").in("status", ["active", "onboarding"]).limit(60)),
  };
  if (agent === "operations" || agent === "assistant") {
    jobs.overdue_tasks = q(co(supabase.from("os_tasks").select(taskCols)).lt("due_date", t).not("status", "in", "(Done,Cancelled)").order("due_date").limit(30));
    jobs.blocked_tasks = q(co(supabase.from("os_tasks").select(taskCols)).eq("status", "Blocked").limit(20));
    jobs.recent_decisions = q(co(supabase.from("os_decisions").select("id, decision, status, decided_on")).order("decided_on", { ascending: false }).limit(10));
  }
  if (agent === "operations" || agent === "growth" || agent === "assistant") {
    // Finance KPIs keep their values outside the OS; the sheet snapshot is withheld for them too.
    jobs.kpis = q(co(supabase.from("os_kpis").select("id, name, function, unit, reporting_period, target_value, target_status, sheet_latest_value, values_restricted")).eq("level", "Company").limit(40));
  }
  if (agent === "partnerships") {
    jobs.open_partnerships = q(co(supabase.from("os_partnerships").select("id, organisation, opportunity_type, stage, evidence_status, owner_person_id, next_action, follow_up_date")).not("stage", "in", "(\"6 Won\",\"7 Lost\")").order("follow_up_date", { nullsFirst: false }).limit(40));
  }
  if (agent === "growth") {
    jobs.campaign_items = q(co(supabase.from("os_campaign_items").select("id, campaign, title, channel, status, planned_publish_date, actual_publish_date, owner_person_id, results")).order("planned_publish_date", { ascending: false, nullsFirst: false }).limit(40));
  }
  for (const term of searchTerms(message)) {
    const pat = `%${term}%`;
    jobs[`match_projects_${term}`] = q(supabase.from("os_projects").select("id, name, status, due_date, owner_person_id").ilike("name", pat).limit(8));
    jobs[`match_tasks_${term}`] = q(supabase.from("os_tasks").select(taskCols).ilike("title", pat).limit(8));
    jobs[`match_documents_${term}`] = q(supabase.from("os_documents").select("id, reference_number, title, doc_type, status, drive_url").ilike("title", pat).limit(8));
  }
  const entries = await Promise.all(Object.entries(jobs).map(async ([k, p]) => [k, await p] as const));
  for (const [k, v] of entries) if (v.length) ctx[k] = v;
  if (ctx.kpis) ctx.kpis = ctx.kpis.map((k) => (k.values_restricted ? { ...k, sheet_latest_value: "restricted" } : k));
  return { today: t, company: company ?? "all companies the person works in", data: ctx };
}

/** Runs a confirmed action with the person's own session, so RLS and the database rules apply. */
export async function executeAction(supabase: SupabaseClient, type: ActionType, p: Record<string, unknown>): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const done = (r: { data: unknown; error: { message: string } | null }, key = "id") => {
    if (r.error || !r.data) return { ok: false as const, error: r.error ? (/row-level|permission/i.test(r.error.message) ? "You don't have permission to do that." : r.error.message.slice(0, 200)) : "Nothing was changed. You may not have access to that record." };
    return { ok: true as const, ref: String((r.data as Record<string, unknown>)[key]) };
  };
  switch (type) {
    case "create_task": return done(await supabase.from("os_tasks").insert(p).select("id").maybeSingle());
    case "update_task_status": return done(await supabase.from("os_tasks").update({ status: p.status }).eq("id", p.task_id as string).select("id").maybeSingle());
    case "create_project": return done(await supabase.from("os_projects").insert(p).select("id").maybeSingle());
    case "add_comment": return done(await supabase.from("os_comments").insert(p).select("id").maybeSingle());
    case "log_kpi_value": return done(await supabase.from("os_kpi_values").insert(p).select("id").maybeSingle());
    case "create_partnership": return done(await supabase.from("os_partnerships").insert({ ...p, stage: "1 Identified" }).select("id").maybeSingle());
  }
}

// ── The model call ──────────────────────────────────────────────────────────────────────────────────────────────

export function aiConfigured() { return Boolean(process.env.GEMINI_API_KEY); }

export async function callModel(model: string, system: string, history: { role: "user" | "assistant"; content: string }[], userTurn: string, maxOutput: number) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const m = genAI.getGenerativeModel({ model, systemInstruction: system, generationConfig: { maxOutputTokens: maxOutput, temperature: 0.3 } });
  const res = await m.generateContent({
    contents: [...history.map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })), { role: "user", parts: [{ text: userTurn }] }],
  });
  const u = res.response.usageMetadata;
  // Thinking tokens are billed as output, so count everything the model produced, not only the visible reply.
  const input = u?.promptTokenCount ?? 0;
  const output = Math.max((u?.totalTokenCount ?? 0) - input, (u?.candidatesTokenCount ?? 0) + ((u as { thoughtsTokenCount?: number } | undefined)?.thoughtsTokenCount ?? 0));
  const cut = res.response.candidates?.[0]?.finishReason === "MAX_TOKENS";
  const text = res.response.text() + (cut ? "\n\n(The reply was cut short. Ask a narrower question for the rest.)" : "");
  return { text, input, output };
}

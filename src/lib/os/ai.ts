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
import { FUNCTION_DECLARATIONS, type DirEvent, type Directory, type IntentType, type ResolvedItem } from "./ai-intents";
import { moveEvent, type MoveScope } from "./event-moves";
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
    upcoming_events: q(co(supabase.from("os_events").select("id, title, category, starts_at, all_day, recurrence, project_id, campaign_id, timeline_item_id")).neq("status", "Cancelled").or(`starts_at.gte.${t},recurrence.not.is.null`).lt("starts_at", `${plus(t, 30)}T23:59:59+07:00`).order("starts_at").limit(30)),
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
    jobs[`match_events_${term}`] = q(supabase.from("os_events").select("id, title, category, starts_at, all_day, recurrence, status, project_id, campaign_id, timeline_item_id").ilike("title", pat).order("starts_at", { ascending: false }).limit(8));
    jobs[`match_timeline_${term}`] = q(supabase.from("os_timeline_items").select("id, title, due_date, status, is_major, project_id").ilike("title", pat).limit(8));
    jobs[`match_campaigns_${term}`] = q(supabase.from("os_campaigns").select("id, name, status, start_date, end_date, project_id").ilike("name", pat).limit(5));
  }
  const entries = await Promise.all(Object.entries(jobs).map(async ([k, p]) => [k, await p] as const));
  for (const [k, v] of entries) if (v.length) ctx[k] = v;
  // "Everything related to X": for the projects that matched, the work linked to them (still read with RLS).
  const projectIds = Array.from(new Set(Object.entries(ctx).filter(([k]) => k.startsWith("match_projects_")).flatMap(([, v]) => v.map((r) => String(r.id))))).slice(0, 3);
  if (projectIds.length) {
    const [ev, tk, tl, cp] = await Promise.all([
      q(supabase.from("os_events").select("id, title, category, starts_at, all_day, recurrence, status, project_id").in("project_id", projectIds).order("starts_at").limit(40)),
      q(supabase.from("os_tasks").select(taskCols).in("project_id", projectIds).not("status", "in", "(Cancelled)").order("due_date", { nullsFirst: false }).limit(40)),
      q(supabase.from("os_timeline_items").select("id, title, due_date, status, is_major, project_id").in("project_id", projectIds).limit(20)),
      q(supabase.from("os_campaigns").select("id, name, status, start_date, end_date, project_id").in("project_id", projectIds).limit(10)),
    ]);
    if (ev.length) ctx.related_project_events = ev;
    if (tk.length) ctx.related_project_tasks = tk;
    if (tl.length) ctx.related_project_milestones = tl;
    if (cp.length) ctx.related_project_campaigns = cp;
  }
  if (ctx.kpis) ctx.kpis = ctx.kpis.map((k) => (k.values_restricted ? { ...k, sheet_latest_value: "restricted" } : k));
  return { today: t, company: company ?? "all companies the person works in", data: ctx };
}

/** Runs a confirmed action with the person's own session, so RLS and the database rules apply. */
export async function executeAction(supabase: SupabaseClient, type: SimpleActionType, p: Record<string, unknown>): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const done = (r: { data: unknown; error: { message: string } | null }, key = "id") => {
    if (r.error || !r.data) return { ok: false as const, error: r.error ? (/row-level|permission/i.test(r.error.message) ? "You don't have permission to do that." : r.error.message.slice(0, 200)) : "Nothing was changed. You may not have access to that record." };
    return { ok: true as const, ref: String((r.data as Record<string, unknown>)[key]) };
  };
  switch (type) {
    case "update_task_status": return done(await supabase.from("os_tasks").update({ status: p.status }).eq("id", p.task_id as string).select("id").maybeSingle());
    case "create_project": return done(await supabase.from("os_projects").insert(p).select("id").maybeSingle());
    case "add_comment": return done(await supabase.from("os_comments").insert(p).select("id").maybeSingle());
    case "log_kpi_value": return done(await supabase.from("os_kpi_values").insert(p).select("id").maybeSingle());
    case "create_partnership": return done(await supabase.from("os_partnerships").insert({ ...p, stage: "1 Identified" }).select("id").maybeSingle());
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
    q(supabase.from("os_tasks").select("id, title, company_code, project_id, status").order("id", { ascending: false }).limit(800)),
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

export interface Created { id: string; kind: string; title: string; assignee: string | null; deadline: string | null; link: string; push?: string[] }
const denied = (m: string) => (/row-level|permission|42501/i.test(m) ? "You don't have permission to create this. Nothing was created." : "It couldn't be created. Nothing was changed.");

/** Runs resolved items with the person's own session. A batch of tasks is one transaction: all or nothing. */
export async function executeIntent(supabase: SupabaseClient, type: IntentType, items: ResolvedItem[], dir: Directory): Promise<{ ok: true; created: Created[] } | { ok: false; error: string }> {
  const who = (ids: unknown) => (Array.isArray(ids) && ids.length ? ids.map((i) => dir.people.find((p) => p.id === i)?.full_name ?? String(i)).join(", ") : null);
  const ins = items.map((i) => i.insert!) as Record<string, unknown>[];
  if (type === "create_task" || type === "create_tasks") {
    const { data, error } = await supabase.rpc("os_create_tasks", { p_tasks: ins });
    if (error || !Array.isArray(data)) { console.error("[os ai] create tasks failed", error?.code ?? "no data"); return { ok: false, error: denied(error?.message ?? "") }; }
    // Tasks that prepare for an event are linked to it (the event itself is not changed).
    const links = (data as { id: string }[]).flatMap((r, n) => (ins[n].event_id ? [{ event_id: ins[n].event_id as string, task_id: r.id }] : []));
    if (links.length) { const l = await supabase.from("os_event_tasks").insert(links); if (l.error) console.error("[os ai] event links failed", l.error.code); }
    return { ok: true, created: (data as { id: string; title: string }[]).map((r, n) => ({ id: r.id, kind: "task", title: r.title, assignee: who(ins[n].assignees), deadline: (ins[n].due_date as string) ?? null, link: `/os/tasks/${r.id}` })) };
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

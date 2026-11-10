import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import {
  AGENTS, MAX_ACTIONS, aiConfigured, autoRunnable, callModel, costUsd, executeIntent, extractActions, gatherContext, loadDirectory, maxOutputFor, pickTier,
  previewFor, runRank, schemaFor, systemPrompt, type ActionType, type AgentKey, type Created, type Failed, type SimpleActionType,
} from "@/lib/os/ai";
import { cardItems, draftsOf, intentPreview, isIntent, payloadFor, resolveCompany, resolveIntent, type Directory, type IntentType, type ProjectDraftT, type ResolvedItem } from "@/lib/os/ai-intents";
import { parsePage } from "@/lib/os/ai-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  agent: z.enum(["assistant", "operations", "partnerships", "growth"]),
  conversation_id: z.string().uuid().optional(),
  company_code: z.enum(["HQ", "IEL", "ELC"]).nullable().optional(),
  message: z.string().trim().min(1).max(6000),
  deep: z.boolean().optional(),
  // Run ordinary changes the person clearly asked for straight away (the default), or show every change as a card.
  auto: z.boolean().optional(),
  // Where the person is: parsed and reduced to plain IDs and filters by parsePage; the records are read with RLS.
  page: z.object({ path: z.string().max(300), query: z.record(z.string(), z.string().max(200)).optional(), filters: z.record(z.string(), z.string().max(200)).optional(), selection: z.array(z.string().max(40)).max(100).optional(), title: z.string().max(200).optional() }).optional(),
});

type Proposed = { id: string; action_type: string; preview: string; status: string; details?: unknown; result?: unknown };
const HISTORY_TURNS = 10, HISTORY_CHARS = 1500;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad request");
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { supabase, personId } = auth;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Write a message (up to 6,000 characters).");
  const { agent, message, deep } = parsed.data;
  const auto = parsed.data.auto !== false;
  const page = parsePage(parsed.data.page);
  const service = osServiceClient();
  if (!service || !aiConfigured()) return jsonError("Elco Assistant isn't connected on this deployment yet.", 503);

  const { data: settings } = await supabase.from("os_ai_settings").select("enabled, routine_model, complex_model").maybeSingle();
  if (!settings?.enabled) return jsonError("A founder has paused Elco Assistant.", 503);

  // The conversation is created and read with the person's own session (RLS: their own only).
  let conversationId = parsed.data.conversation_id;
  let company = parsed.data.company_code ?? page?.company ?? null;
  if (conversationId) {
    const { data: c } = await supabase.from("os_ai_conversations").select("id, agent, company_code").eq("id", conversationId).maybeSingle();
    if (!c || c.agent !== agent) return jsonError("Conversation not found.", 404);
    company = c.company_code ?? page?.company ?? null;
  } else {
    const { data: c, error } = await supabase.from("os_ai_conversations").insert({ agent, company_code: parsed.data.company_code ?? null, title: message.slice(0, 80) }).select("id").single();
    if (error || !c) return jsonError("The conversation couldn't be started.", 403);
    conversationId = c.id as string;
  }
  // Recent turns only, each cut to a sensible length: what was done is in conversation_records with real IDs.
  const { data: past } = await supabase.from("os_ai_messages").select("role, content").eq("conversation_id", conversationId).in("role", ["user", "assistant"]).order("created_at", { ascending: false }).limit(HISTORY_TURNS);
  const history = ((past ?? []) as { role: "user" | "assistant"; content: string }[]).reverse().map((h) => ({ ...h, content: h.content.length > HISTORY_CHARS ? `${h.content.slice(0, HISTORY_CHARS)}…` : h.content }));

  const tier = pickTier(message, Boolean(deep));
  const model = tier === "complex" ? settings.complex_model : settings.routine_model;
  const maxOutput = maxOutputFor(tier, message);
  const context = await gatherContext(supabase, personId, agent as AgentKey, company, message, page, conversationId);
  const userTurn = [
    `DATA (records the person can access, as of ${context.today}; company scope: ${context.company}):\n${JSON.stringify(context.data)}`,
    ...(page ? [`PAGE (the person is on ${page.label}; filters ${JSON.stringify(page.filters)}):\n${JSON.stringify(context.page)}`] : []),
    ...(context.records.length ? [`conversation_records (what this conversation already proposed or did, oldest first):\n${JSON.stringify(context.records)}`] : []),
    `QUESTION:\n${message}`,
  ].join("\n\n");
  const system = systemPrompt(agent, context.today);
  // + the declared functions (about 2,000 tokens).
  const estInput = Math.ceil((system.length + userTurn.length + history.reduce((n, h) => n + h.content.length, 0)) / 3) + 2200;
  const maxCost = costUsd(model, estInput, maxOutput);

  // Reserve the worst case first. Null means the monthly cap or the person's daily limit would be passed.
  const { data: reservation, error: rErr } = await service.rpc("os_ai_reserve", { p_person: personId, p_agent: agent, p_model: model, p_max_cost: Number(maxCost.toFixed(6)), p_conversation: conversationId });
  if (rErr) return jsonError("The AI budget couldn't be checked. Try again in a moment.", 503);
  if (!reservation) return NextResponse.json({ error: "The AI budget for this month, or your daily share of it, has been used. Everything else in Company OS still works; Elco Assistant is available again when the budget resets or a founder raises your daily limit.", budget_exhausted: true, conversation_id: conversationId }, { status: 402 });

  await service.from("os_ai_messages").insert({ conversation_id: conversationId, role: "user", content: message });
  let out: Awaited<ReturnType<typeof callModel>>;
  try {
    out = await callModel(model, system, history, userTurn, maxOutput);
  } catch (e) {
    await service.rpc("os_ai_settle", { p_id: reservation, p_input: 0, p_output: 0, p_cost: 0, p_failed: true });
    console.error("[os ai] model call failed", (e as { status?: number })?.status ?? "unknown");
    return jsonError("The AI model didn't respond. Nothing was charged; try again.", 502);
  }
  const cost = costUsd(model, out.input, out.output);
  await service.rpc("os_ai_settle", { p_id: reservation, p_input: out.input, p_output: out.output, p_cost: Number(cost.toFixed(6)), p_failed: false });

  // Proposals come from function calls first, then from ```action``` blocks; anything that doesn't validate is dropped.
  const allowed = AGENTS[agent].actions;
  const { text, actions: blocks } = extractActions(out.text, allowed);
  const fromCalls = out.calls.filter((c) => (allowed as string[]).includes(c.name)).flatMap((c) => {
    const r = schemaFor(c.name as ActionType).safeParse(c.args);
    return r.success ? [{ type: c.name as ActionType, payload: r.data as Record<string, unknown> }] : [];
  });
  const actions = groupActions([...fromCalls, ...blocks]).slice(0, MAX_ACTIONS);

  // Resolve and run in dependency order: projects, then tasks, then assignments and updates. Each step sees what the
  // steps before it created, so "create the project and its tasks" works in one instruction.
  const dir: Directory = await loadDirectory(supabase, personId);
  dir.pendingProjects = actions.filter((a) => a.type === "create_project").map((a) => {
    const d = a.payload as ProjectDraftT;
    return { name: d.name, company_code: resolveCompany(d.company ?? d.company_code, dir).code ?? (dir.myCompanies.length === 1 ? dir.myCompanies[0] : ""), division_id: null };
  }).filter((p) => p.company_code);
  const proposed: Proposed[] = [];
  const done: Created[] = [], failed: Failed[] = [], waiting: string[] = [];
  const now = () => new Date().toISOString();
  for (const a of actions) {
    if (!isIntent(a.type)) {
      const preview = previewFor(a.type as SimpleActionType, a.payload);
      const { data } = await service.from("os_ai_actions").insert({ conversation_id: conversationId, person_id: personId, agent, action_type: a.type, payload: a.payload, preview }).select("id").single();
      if (data) { proposed.push({ id: data.id as string, action_type: a.type, preview, status: "proposed" }); waiting.push(preview); }
      continue;
    }
    const type = a.type as IntentType;
    const items = resolveIntent(type, draftsOf(type, a.payload) ?? [], dir);
    if (!items.length) continue;
    const payload = payloadFor(type, items.map((i) => i.draft));
    const details = cardItems(items);
    const preview = intentPreview(type, items);
    const run = auto && autoRunnable(type, items) && !items.some((i) => i.waitsFor);
    const { data: row } = await service.from("os_ai_actions").insert({ conversation_id: conversationId, person_id: personId, agent, action_type: type, payload, preview, details, ...(run ? { status: "confirmed", decided_at: now() } : {}) }).select("id").single();
    if (!row) { failed.push({ id: "-", title: preview, error: "This change couldn't be recorded, so it wasn't made." }); continue; }
    if (!run) { proposed.push({ id: row.id as string, action_type: type, preview, status: "proposed", details }); waiting.push(preview); continue; }
    const r = await executeIntent(supabase, type, items, dir);
    await service.from("os_ai_actions").update({ status: r.ok ? "executed" : "failed", result: r }).eq("id", row.id);
    proposed.push({ id: row.id as string, action_type: type, preview, status: r.ok ? "executed" : "failed", details, result: r });
    if (r.ok) {
      done.push(...r.created);
      learn(dir, type, items, r.created);
    } else failed.push({ id: "-", title: preview, error: r.error });
    if (r.failed) failed.push(...r.failed);
  }

  const summary = outcome(done, failed, waiting);
  const reply = [text.trim(), summary].filter(Boolean).join("\n\n") || "I couldn't produce an answer.";
  await service.from("os_ai_messages").insert({ conversation_id: conversationId, role: "assistant", content: reply, model });
  await service.from("os_ai_conversations").update({ updated_at: now() }).eq("id", conversationId);
  const { data: budget } = await supabase.rpc("os_ai_budget");
  return NextResponse.json({ conversation_id: conversationId, reply, model, tier, cost_usd: cost, actions: proposed, budget: Array.isArray(budget) ? budget[0] : budget });
}

/** One card per kind of work: every new task in one batch (30 at most each), every task change in one update. */
function groupActions(list: { type: ActionType; payload: Record<string, unknown> }[]) {
  const tasks: unknown[] = [], updates: unknown[] = [], rest: typeof list = [];
  for (const a of list) {
    if (a.type === "create_task") tasks.push(a.payload);
    else if (a.type === "create_tasks") tasks.push(...((a.payload as { tasks: unknown[] }).tasks ?? []));
    else if (a.type === "update_tasks") updates.push(...((draftsOf("update_tasks", a.payload) ?? []) as unknown[]));
    else rest.push(a);
  }
  const out = [...rest];
  for (let i = 0; i < tasks.length; i += 30) out.push({ type: tasks.length === 1 ? "create_task" : "create_tasks", payload: (tasks.length === 1 ? tasks[0] : { tasks: tasks.slice(i, i + 30) }) as Record<string, unknown> });
  for (let i = 0; i < updates.length; i += 50) out.push({ type: "update_tasks", payload: { updates: updates.slice(i, i + 50) } });
  return out.sort((a, b) => runRank(a.type) - runRank(b.type));
}

/** Later steps in the same turn see what earlier steps made: a new project, new tasks. */
function learn(dir: Directory, type: IntentType, items: ResolvedItem[], created: Created[]) {
  if (type === "create_project") {
    for (const c of created.filter((x) => x.kind === "project" && !x.note)) {
      const ins = items.find((i) => i.insert)?.insert ?? {};
      dir.projects.unshift({ id: c.id, name: c.title, company_code: String(ins.company_code ?? ""), division_id: (ins.division_id as string) ?? null, status: "Active" });
      dir.pendingProjects = (dir.pendingProjects ?? []).filter((p) => p.name !== c.title);
    }
    for (const i of items.filter((x) => x.skip)) dir.pendingProjects = (dir.pendingProjects ?? []).filter((p) => p.name !== (i.draft as ProjectDraftT).name);
  }
  if (type === "create_task" || type === "create_tasks") {
    for (const c of created.filter((x) => x.kind === "task" && !x.note)) {
      const ins = items.find((i) => (i.insert as { title?: string } | null)?.title === c.title)?.insert ?? {};
      dir.tasks.unshift({ id: c.id, title: c.title, company_code: String(ins.company_code ?? ""), project_id: (ins.project_id as string) ?? null, status: "Backlog", due_date: (ins.due_date as string) ?? null, priority: (ins.priority as string) ?? null });
    }
  }
}

/** What really happened, written by the server (never by the model), so the reply can't claim more than was done. */
function outcome(done: Created[], failed: Failed[], waiting: string[]): string {
  const lines: string[] = [];
  const made = done.filter((c) => !c.note || c.kind === "update"), existed = done.filter((c) => c.note === "already existed");
  const line = (c: Created) => `${c.id} ${c.title}${c.assignee ? ` · ${c.assignee}` : ""}${c.deadline ? ` · due ${c.deadline.slice(0, 10)}` : ""}${c.note && c.note !== "already existed" ? ` · ${c.note}` : ""}`;
  if (made.length) lines.push(`Done (${made.length}):`, ...made.slice(0, 40).map((c) => `• ${c.kind === "update" ? "Updated" : "Created"} ${line(c)}`), ...(made.length > 40 ? [`• …and ${made.length - 40} more`] : []));
  if (existed.length) lines.push(`Already there, not created again: ${existed.map((c) => c.id).join(", ")}.`);
  if (failed.length) lines.push(`Not done (${failed.length}):`, ...failed.map((f) => `• ${f.id !== "-" ? `${f.id} ` : ""}${f.title}: ${f.error}`));
  if (waiting.length) lines.push(`Waiting for your confirmation: ${waiting.join("; ")}.`);
  return lines.join("\n");
}


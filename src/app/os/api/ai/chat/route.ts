import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { AGENTS, aiConfigured, callModel, costUsd, extractActions, gatherContext, pickTier, previewFor, systemPrompt, type AgentKey } from "@/lib/os/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  agent: z.enum(["assistant", "operations", "partnerships", "growth"]),
  conversation_id: z.string().uuid().optional(),
  company_code: z.enum(["HQ", "IEL", "ELC"]).nullable().optional(),
  message: z.string().trim().min(1).max(4000),
  deep: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad request");
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { supabase, personId } = auth;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Write a message (up to 4,000 characters).");
  const { agent, message, deep } = parsed.data;
  const service = osServiceClient();
  if (!service || !aiConfigured()) return jsonError("The AI agents aren't connected on this deployment yet.", 503);

  const { data: settings } = await supabase.from("os_ai_settings").select("enabled, routine_model, complex_model").maybeSingle();
  if (!settings?.enabled) return jsonError("A founder has paused the AI agents.", 503);

  // The conversation is created and read with the person's own session (RLS: their own only).
  let conversationId = parsed.data.conversation_id;
  let company = parsed.data.company_code ?? null;
  if (conversationId) {
    const { data: c } = await supabase.from("os_ai_conversations").select("id, agent, company_code").eq("id", conversationId).maybeSingle();
    if (!c || c.agent !== agent) return jsonError("Conversation not found.", 404);
    company = c.company_code;
  } else {
    const { data: c, error } = await supabase.from("os_ai_conversations").insert({ agent, company_code: company, title: message.slice(0, 80) }).select("id").single();
    if (error || !c) return jsonError("The conversation couldn't be started.", 403);
    conversationId = c.id as string;
  }
  const { data: past } = await supabase.from("os_ai_messages").select("role, content").eq("conversation_id", conversationId).in("role", ["user", "assistant"]).order("created_at", { ascending: false }).limit(12);
  const history = ((past ?? []) as { role: "user" | "assistant"; content: string }[]).reverse();

  const tier = pickTier(message, Boolean(deep));
  const model = tier === "complex" ? settings.complex_model : settings.routine_model;
  // The complex model thinks before it answers and its thinking counts against this limit (and is billed as output).
  const maxOutput = tier === "complex" ? 4000 : 1200;
  const context = await gatherContext(supabase, personId, agent as AgentKey, company, message);
  const userTurn = `DATA (records the person can access, as of ${context.today}; company scope: ${context.company}):\n${JSON.stringify(context.data)}\n\nQUESTION:\n${message}`;
  const estInput = Math.ceil((systemPrompt(agent).length + userTurn.length + history.reduce((n, h) => n + h.content.length, 0)) / 3) + 200;
  const maxCost = costUsd(model, estInput, maxOutput);

  // Reserve the worst case first. Null means the monthly cap or the person's daily limit would be passed.
  const { data: reservation, error: rErr } = await service.rpc("os_ai_reserve", { p_person: personId, p_agent: agent, p_model: model, p_max_cost: Number(maxCost.toFixed(6)), p_conversation: conversationId });
  if (rErr) return jsonError("The AI budget couldn't be checked. Try again in a moment.", 503);
  if (!reservation) return NextResponse.json({ error: "The AI budget for this month, or your daily share of it, has been used. Everything else in Company OS still works; the agents are available again when the budget resets or a founder raises your daily limit.", budget_exhausted: true, conversation_id: conversationId }, { status: 402 });

  await service.from("os_ai_messages").insert({ conversation_id: conversationId, role: "user", content: message });
  let out: { text: string; input: number; output: number };
  try {
    out = await callModel(model, systemPrompt(agent), history, userTurn, maxOutput);
  } catch (e) {
    await service.rpc("os_ai_settle", { p_id: reservation, p_input: 0, p_output: 0, p_cost: 0, p_failed: true });
    console.error("[os ai] model call failed", (e as { status?: number })?.status ?? "unknown");
    return jsonError("The AI model didn't respond. Nothing was charged; try again.", 502);
  }
  const cost = costUsd(model, out.input, out.output);
  await service.rpc("os_ai_settle", { p_id: reservation, p_input: out.input, p_output: out.output, p_cost: Number(cost.toFixed(6)), p_failed: false });

  const { text, actions } = extractActions(out.text, AGENTS[agent].actions);
  const reply = text || (actions.length ? "Here's what I suggest. Review each change before confirming." : "I couldn't produce an answer.");
  await service.from("os_ai_messages").insert({ conversation_id: conversationId, role: "assistant", content: reply, model });
  const proposed: { id: string; action_type: string; preview: string }[] = [];
  for (const a of actions) {
    const preview = previewFor(a.type, a.payload);
    const { data } = await service.from("os_ai_actions").insert({ conversation_id: conversationId, person_id: personId, agent, action_type: a.type, payload: a.payload, preview }).select("id").single();
    if (data) proposed.push({ id: data.id as string, action_type: a.type, preview });
  }
  await service.from("os_ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  const { data: budget } = await supabase.rpc("os_ai_budget");
  return NextResponse.json({ conversation_id: conversationId, reply, model, tier, cost_usd: cost, actions: proposed, budget: Array.isArray(budget) ? budget[0] : budget });
}

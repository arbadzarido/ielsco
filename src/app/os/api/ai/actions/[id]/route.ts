import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { ACTION_SCHEMAS, AGENTS, executeAction, executeIntent, loadDirectory, type ActionType, type SimpleActionType } from "@/lib/os/ai";
import { INTENT_SCHEMAS, cardItems, draftsOf, intentPreview, isIntent, resolveIntent } from "@/lib/os/ai-intents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The person confirms, edits or rejects an action an agent proposed.
//   reject   → nothing happens; the decision is kept.
//   revise   → (records described in words) the edited draft is resolved again and the card updated; nothing runs.
//   confirm  → the draft (edited or not) is resolved again on the server, and runs only if every field resolved to a
//              real record. It runs with the person's own session, so it succeeds only if they could have made the
//              change themselves. A suggestion runs at most once (claimed before it runs). Every outcome is kept in
//              os_ai_actions and the records' own activity and audit trails.
const Body = z.object({ decision: z.enum(["confirm", "reject", "revise"]), drafts: z.array(z.record(z.string(), z.unknown())).min(1).max(10).optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Bad request");
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Not found.", 404);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Confirm, edit or cancel.");
  const { data: a } = await auth.supabase.from("os_ai_actions").select("id, person_id, agent, action_type, payload, status, created_at").eq("id", id).maybeSingle();
  if (!a || a.person_id !== auth.personId) return jsonError("Not found.", 404);
  if (a.status !== "proposed") return jsonError("This suggestion was already handled.", 409);

  if (body.data.decision === "reject") {
    const { error } = await auth.supabase.from("os_ai_actions").update({ status: "rejected" }).eq("id", id);
    return error ? jsonError("It couldn't be updated.", 403) : NextResponse.json({ status: "rejected" });
  }
  const service = osServiceClient();
  if (!service) return jsonError("Not available on this deployment.", 503);
  if (Date.now() - Date.parse(a.created_at) > 24 * 3600 * 1000) {
    await service.from("os_ai_actions").update({ status: "expired", decided_at: new Date().toISOString() }).eq("id", id).eq("status", "proposed");
    return jsonError("This suggestion is more than a day old. Ask the agent again.", 409);
  }
  const type = a.action_type as ActionType;
  if (!AGENTS[a.agent as keyof typeof AGENTS]?.actions.includes(type)) return jsonError("This suggestion isn't valid any more.", 409);

  if (isIntent(type)) {
    // The browser's edits are only a new draft: validated by the same schema and resolved again here.
    const payload = body.data.drafts ? (type === "create_tasks" ? { tasks: body.data.drafts } : body.data.drafts[0]) : a.payload;
    if (body.data.drafts && type !== "create_tasks" && body.data.drafts.length !== 1) return jsonError("Bad request.");
    if (!INTENT_SCHEMAS[type].safeParse(payload).success) return jsonError("Some details aren't valid. Check the dates, times and links.", 422);
    const dir = await loadDirectory(auth.supabase, auth.personId);
    const items = resolveIntent(type, draftsOf(type, payload) ?? [], dir);
    const details = cardItems(items);
    const stored = type === "create_tasks" ? { tasks: items.map((i) => i.draft) } : items[0].draft;
    const preview = intentPreview(type, items);
    const ready = items.length > 0 && items.every((i) => i.issues.length === 0 && i.insert);
    if (body.data.decision === "revise" || !ready) {
      await service.from("os_ai_actions").update({ payload: stored, details, preview }).eq("id", id).eq("status", "proposed");
      return NextResponse.json({ status: "proposed", preview, details, ready }, { status: ready || body.data.decision === "revise" ? 200 : 422 });
    }
    const { data: claimed } = await service.from("os_ai_actions").update({ status: "confirmed", decided_at: new Date().toISOString(), payload: stored, details, preview }).eq("id", id).eq("status", "proposed").select("id").maybeSingle();
    if (!claimed) return jsonError("This suggestion was already handled.", 409);
    const r = await executeIntent(auth.supabase, type, items, dir);
    await service.from("os_ai_actions").update({ status: r.ok ? "executed" : "failed", result: r }).eq("id", id);
    return r.ok ? NextResponse.json({ status: "executed", created: r.created, ref: r.created.map((c) => c.id).join(", ") }) : NextResponse.json({ status: "failed", error: r.error }, { status: 403 });
  }

  if (body.data.decision === "revise") return jsonError("This suggestion can't be edited. Confirm or cancel it.");
  const parsed = ACTION_SCHEMAS[type as SimpleActionType].safeParse(a.payload);
  if (!parsed.success) return jsonError("This suggestion isn't valid any more.", 409);
  // Claim it first so a double click can't run it twice.
  const { data: claimed } = await service.from("os_ai_actions").update({ status: "confirmed", decided_at: new Date().toISOString() }).eq("id", id).eq("status", "proposed").select("id").maybeSingle();
  if (!claimed) return jsonError("This suggestion was already handled.", 409);
  const r = await executeAction(auth.supabase, type as SimpleActionType, parsed.data as Record<string, unknown>);
  await service.from("os_ai_actions").update({ status: r.ok ? "executed" : "failed", result: r }).eq("id", id);
  return r.ok ? NextResponse.json({ status: "executed", ref: r.ref }) : NextResponse.json({ status: "failed", error: r.error }, { status: 403 });
}

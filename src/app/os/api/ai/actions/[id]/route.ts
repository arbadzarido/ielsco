import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { ACTION_SCHEMAS, AGENTS, executeAction, type ActionType } from "@/lib/os/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The person confirms or rejects an action an agent proposed. Confirmed actions run with the person's own session,
// so they succeed only if the person could have made the change themselves. Every decision is kept in os_ai_actions.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Bad request");
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Not found.", 404);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const body = z.object({ decision: z.enum(["confirm", "reject"]) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Confirm or reject.");
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
  const parsed = AGENTS[a.agent as keyof typeof AGENTS]?.actions.includes(type) ? ACTION_SCHEMAS[type].safeParse(a.payload) : null;
  if (!parsed?.success) return jsonError("This suggestion isn't valid any more.", 409);
  // Claim it first so a double click can't run it twice.
  const { data: claimed } = await service.from("os_ai_actions").update({ status: "confirmed", decided_at: new Date().toISOString() }).eq("id", id).eq("status", "proposed").select("id").maybeSingle();
  if (!claimed) return jsonError("This suggestion was already handled.", 409);
  const r = await executeAction(auth.supabase, type, parsed.data as Record<string, unknown>);
  await service.from("os_ai_actions").update({ status: r.ok ? "executed" : "failed", result: r }).eq("id", id);
  return r.ok ? NextResponse.json({ status: "executed", ref: r.ref }) : NextResponse.json({ status: "failed", error: r.error }, { status: 403 });
}

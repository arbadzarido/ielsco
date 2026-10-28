// GET /api/connect/ice — ICE servers (STUN, plus short-lived TURN credentials when configured) for a Quick Match call.
// Auth: IELSco cookie session. Returns 404 unless the member has a live call, so TURN credentials are only handed out for
// an authorised session (the call check runs in quick_match_poll(), with auth.uid() from the session).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { iceConfig } from "@/lib/connect/ice";

export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json(401, { error: "not_signed_in" });
  const { data, error } = await supabase.rpc("quick_match_poll");
  if (error) return json(["PGRST202", "PGRST205", "42883"].includes(error.code ?? "") ? 503 : 500, { error: "unavailable" });
  if (!data?.enabled || !data?.call_id) return json(404, { error: "no_active_call" });
  return json(200, iceConfig(auth.user.id));
}

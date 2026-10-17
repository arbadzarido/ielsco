// DELETE /api/integrations/elco/link — the signed-in member unlinks Elco from IELSco.
// Auth: IELSco cookie session + same-site Origin check. Revokes here first (that alone stops all data flow, because
// Elco's calls for a revoked link get 404), then tells Elco best effort.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, isSameSiteRequest, json, notifyElcoRevoked } from "@/lib/integrations/elco";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  if (!isSameSiteRequest(request)) return fail(403, "forbidden");
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "not_signed_in");

  const { data: linkId, error } = await supabase.rpc("revoke_my_elco_link");
  if (error) {
    if (["PGRST202", "PGRST205", "42883"].includes(error.code ?? "")) return fail(503, "integration_not_configured");
    return fail(500, "server_error");
  }
  if (!linkId) return json(200, { unlinked: false });
  const elcoNotified = await notifyElcoRevoked(linkId as string);
  return json(200, { unlinked: true, elco_notified: elcoNotified });
}

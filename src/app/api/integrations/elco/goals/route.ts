// GET /api/integrations/elco/goals?link_id= — Elco API reads the member's IELSco goals (needs goals:read).
// Auth: Elco → IELSco HMAC signature (the query string is part of the signed path).
import { adminClient, fail, isUuid, json, verifiedElcoRequest } from "@/lib/integrations/elco";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const verified = await verifiedElcoRequest(request);
  if ("response" in verified) return verified.response;
  const linkId = new URL(request.url).searchParams.get("link_id");
  if (!isUuid(linkId)) return fail(400, "invalid_request");

  const admin = adminClient();
  if (!admin) return fail(503, "integration_not_configured");
  const { data, error } = await admin.rpc("elco_goals_for_link", { p_link_id: linkId });
  if (error) return fail(500, "server_error");
  // Unknown, revoked, or missing the goals:read scope: all look the same to the caller.
  if (!data) return fail(404, "link_not_found");
  return json(200, data);
}

// POST /api/integrations/elco/revoke — Elco tells IELSco a link was unlinked on the Elco side. Idempotent.
// Auth: Elco → IELSco HMAC signature. Body: { link_id }.
import { adminClient, fail, isUuid, parseJson, verifiedElcoRequest } from "@/lib/integrations/elco";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const verified = await verifiedElcoRequest(request);
  if ("response" in verified) return verified.response;
  const body = parseJson<{ link_id?: unknown }>(verified.body);
  if (!body || !isUuid(body.link_id)) return fail(400, "invalid_request");
  const admin = adminClient();
  if (!admin) return fail(503, "integration_not_configured");
  const { error } = await admin.rpc("revoke_elco_link", { p_link_id: body.link_id });
  if (error) return fail(500, "server_error");
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

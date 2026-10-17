// POST /api/integrations/elco/exchange — Elco API exchanges a one-time code for a link (server-to-server).
// Auth: Elco → IELSco HMAC signature (src/lib/integrations/signature.ts). Body: { code, state, elco_user_id }.
// The code is single-use even when the exchange fails; the elco_user_id is asserted by Elco from its verified JWT.
import { adminClient, fail, isUuid, json, parseJson, verifiedElcoRequest } from "@/lib/integrations/elco";
import { hashToken, isTokenShape } from "@/lib/integrations/signature";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, [number, string]> = {
  invalid_code: [400, "This link request is invalid or was already used. Start again from Elco."],
  expired_code: [400, "This link request expired. Start again from Elco."],
  state_mismatch: [400, "This link request doesn't match. Start again from Elco."],
  already_linked: [409, "This IELSco account is already connected to an Elco account. Unlink it first."],
  elco_already_linked: [409, "This Elco account is already connected to an IELSco account. Unlink it first."],
};

export async function POST(request: Request) {
  const verified = await verifiedElcoRequest(request);
  if ("response" in verified) return verified.response;
  const body = parseJson<{ code?: unknown; state?: unknown; elco_user_id?: unknown }>(verified.body);
  if (!body || !isTokenShape(body.code) || !isTokenShape(body.state) || !isUuid(body.elco_user_id)) return fail(400, "invalid_request");

  const admin = adminClient();
  if (!admin) return fail(503, "integration_not_configured");
  const { data, error } = await admin.rpc("consume_elco_link_code", {
    p_code_hash: hashToken(body.code),
    p_state_hash: hashToken(body.state),
    p_elco_user_id: body.elco_user_id,
  });
  if (error) return fail(500, "server_error");
  const result = data as { error?: string; link_id?: string; scopes?: string[]; ielsco_user_id?: string };
  if (result.error) {
    const [status, message] = MESSAGES[result.error] ?? [400, "Linking failed."];
    return fail(status, result.error, message);
  }

  // Display name only (shown back to the account owner in Elco). No email or other PII.
  const uid = result.ielsco_user_id!;
  const [{ data: mp }, { data: u }] = await Promise.all([
    admin.from("member_profiles").select("display_name").eq("user_id", uid).maybeSingle(),
    admin.from("users").select("full_name").eq("id", uid).maybeSingle(),
  ]);
  const name = (mp?.display_name || u?.full_name || "").trim().slice(0, 80) || null;
  return json(200, { link_id: result.link_id, scopes: result.scopes, ielsco_display_name: name });
}

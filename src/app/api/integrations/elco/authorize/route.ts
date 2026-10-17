// POST /api/integrations/elco/authorize — the signed-in IELSco member consents to linking Elco.
// Auth: IELSco cookie session (same pattern as /auth/callback) + same-site Origin check.
// Body: { state, scopes } → { redirect_url } pointing at Elco's fixed callback with a one-time code (5 min).
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ELCO_SCOPES, elcoCallbackUrl, fail, isSameSiteRequest, json, MAX_BODY_BYTES, newToken, parseJson } from "@/lib/integrations/elco";
import { hashToken, isTokenShape } from "@/lib/integrations/signature";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return fail(403, "forbidden");
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, "too_large");
  const body = parseJson<{ state?: unknown; scopes?: unknown }>(raw);
  if (!body || !isTokenShape(body.state)) return fail(400, "invalid_state");
  const scopes = Array.isArray(body.scopes) ? [...new Set(body.scopes)] : [];
  if (scopes.length === 0 || !scopes.every((s) => (ELCO_SCOPES as readonly unknown[]).includes(s))) return fail(400, "invalid_scopes");

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "not_signed_in");

  const code = newToken();
  // The user id comes from auth.uid() inside the function, never from the request.
  const { error } = await supabase.rpc("create_elco_link_code", { p_code_hash: hashToken(code), p_state_hash: hashToken(body.state), p_scopes: scopes });
  if (error) {
    if (/already_linked/.test(error.message)) return fail(409, "already_linked", "Your IELSco account is already connected to Elco. Unlink it first.");
    if (/too_many_codes/.test(error.message)) return fail(429, "too_many_attempts", "Too many attempts. Wait a few minutes and try again.");
    if (["PGRST202", "PGRST205", "42883"].includes(error.code ?? "")) return fail(503, "integration_not_configured");
    return fail(500, "server_error");
  }

  const redirect = new URL(elcoCallbackUrl());
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", body.state);
  return json(200, { redirect_url: redirect.toString() });
}

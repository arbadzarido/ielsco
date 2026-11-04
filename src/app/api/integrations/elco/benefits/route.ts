// POST /api/integrations/elco/benefits — Elco tells IELSco about a General English entitlement that carries IELSco benefits
// (Starter: 12 Daily Speaking Club sessions a month; Pro: Daily Speaking Club + 4 mentoring sessions a month).
// Auth: Elco → IELSco HMAC signature (ELCO_TO_IELSCO_SECRET). Body:
//   { event_id, grant_id, version, elco_user_id, link_id|null, tier, source, status, starts_at, ends_at,
//     benefits: { speaking_club_per_month: int|null, mentoring_per_month: int }, order_ref }
// Idempotent per event_id, newest version per grant wins. The account is resolved only through the signed account link
// (elco_account_links), never by email. Answers { status }: active | pending_link | revoked | stale | duplicate.
import { adminClient, fail, json, parseJson, verifiedElcoRequest } from "@/lib/integrations/elco";
import { validateBenefitEvent } from "@/lib/integrations/elco-benefits";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const verified = await verifiedElcoRequest(request);
  if ("response" in verified) return verified.response;
  const parsed = validateBenefitEvent(parseJson<Record<string, unknown>>(verified.body));
  if (!parsed.ok) return fail(400, parsed.error);
  const e = parsed.event;
  const admin = adminClient();
  if (!admin) return fail(503, "integration_not_configured");
  const { data, error } = await admin.rpc("apply_elco_benefit", {
    p_event_id: e.event_id,
    p_grant_id: e.grant_id,
    p_version: e.version,
    p_elco_user_id: e.elco_user_id,
    p_link_id: e.link_id,
    p_tier: e.tier,
    p_source: e.source,
    p_status: e.status,
    p_starts_at: e.starts_at,
    p_ends_at: e.ends_at,
    p_speaking_club: e.speaking_club_per_month,
    p_mentoring: e.mentoring_per_month,
    p_order_ref: e.order_ref,
    p_modes: e.modes,
  });
  if (error) return fail(500, "server_error");
  if (data === "invalid") return fail(400, "invalid_event");
  return json(200, { status: data });
}


// Validation for Elco → IELSco benefit events (POST /api/integrations/elco/benefits). Pure, unit-tested.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const isIso = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));
const intIn = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

export interface BenefitEvent {
  event_id: string;
  grant_id: string;
  version: number;
  elco_user_id: string;
  link_id: string | null;
  tier: "starter" | "pro" | "exam";
  modes: ("toefl" | "ielts" | "toeic")[];
  source: "purchase" | "bundle" | "reward";
  status: "active" | "cancelled" | "refunded";
  starts_at: string;
  ends_at: string;
  speaking_club_per_month: number | null;
  mentoring_per_month: number;
  order_ref: string | null;
}

export function validateBenefitEvent(b: Record<string, unknown> | null): { ok: true; event: BenefitEvent } | { ok: false; error: string } {
  if (!b) return { ok: false, error: "invalid_request" };
  if (!isUuid(b.event_id) || !isUuid(b.grant_id) || !isUuid(b.elco_user_id)) return { ok: false, error: "invalid_ids" };
  if (b.link_id != null && !isUuid(b.link_id)) return { ok: false, error: "invalid_link_id" };
  if (!Number.isSafeInteger(b.version) || (b.version as number) <= 0) return { ok: false, error: "invalid_version" };
  if (b.tier !== "starter" && b.tier !== "pro" && b.tier !== "exam") return { ok: false, error: "invalid_tier" };
  const modes = b.modes ?? [];
  if (!Array.isArray(modes) || modes.length > 3 || !modes.every((m) => m === "toefl" || m === "ielts" || m === "toeic")
      || (b.tier === "exam") !== (modes.length > 0)) return { ok: false, error: "invalid_modes" };
  if (!["purchase", "bundle", "reward"].includes(b.source as string)) return { ok: false, error: "invalid_source" };
  if (!["active", "cancelled", "refunded"].includes(b.status as string)) return { ok: false, error: "invalid_status" };
  if (!isIso(b.starts_at) || !isIso(b.ends_at) || Date.parse(b.ends_at) <= Date.parse(b.starts_at)) return { ok: false, error: "invalid_dates" };
  const benefits = (b.benefits ?? {}) as Record<string, unknown>;
  const sc = benefits.speaking_club_per_month ?? null;
  const mt = benefits.mentoring_per_month ?? 0;
  if (sc !== null && !intIn(sc, 0, 100)) return { ok: false, error: "invalid_benefits" };
  if (!intIn(mt, 0, 31)) return { ok: false, error: "invalid_benefits" };
  if (b.order_ref != null && (typeof b.order_ref !== "string" || b.order_ref.length > 80)) return { ok: false, error: "invalid_order_ref" };
  return {
    ok: true,
    event: {
      event_id: b.event_id, grant_id: b.grant_id, version: b.version as number, elco_user_id: b.elco_user_id,
      link_id: (b.link_id as string | null) ?? null, tier: b.tier, modes: modes as BenefitEvent["modes"], source: b.source as BenefitEvent["source"],
      status: b.status as BenefitEvent["status"], starts_at: b.starts_at, ends_at: b.ends_at,
      speaking_club_per_month: sc as number | null, mentoring_per_month: mt as number, order_ref: (b.order_ref as string | null) ?? null,
    },
  };
}

// PUT /api/integrations/elco/summary — Elco API stores the latest learning summary (needs summary:write).
// Auth: Elco → IELSco HMAC signature. Body: { link_id, level_estimate, focus_skills[], practice_count_30d,
// last_active_at, generated_at }. Older snapshots never overwrite newer ones (replay-safe).
import { adminClient, fail, isUuid, json, parseJson, verifiedElcoRequest } from "@/lib/integrations/elco";

export const dynamic = "force-dynamic";

const LEVELS = ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced"];
const isIsoDate = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));

interface SummaryIn {
  link_id?: unknown;
  level_estimate?: unknown;
  focus_skills?: unknown;
  practice_count_30d?: unknown;
  last_active_at?: unknown;
  generated_at?: unknown;
}

export async function PUT(request: Request) {
  const verified = await verifiedElcoRequest(request);
  if ("response" in verified) return verified.response;
  const b = parseJson<SummaryIn>(verified.body);
  if (!b || !isUuid(b.link_id) || !isIsoDate(b.generated_at)) return fail(400, "invalid_request");
  if (b.level_estimate != null && !LEVELS.includes(b.level_estimate as string)) return fail(400, "invalid_level");
  const skills = b.focus_skills ?? [];
  if (!Array.isArray(skills) || skills.length > 3 || !skills.every((s) => typeof s === "string" && s.length > 0 && s.length <= 40)) {
    return fail(400, "invalid_focus_skills");
  }
  const count = b.practice_count_30d ?? 0;
  if (!Number.isInteger(count) || (count as number) < 0 || (count as number) > 100000) return fail(400, "invalid_practice_count");
  if (b.last_active_at != null && !isIsoDate(b.last_active_at)) return fail(400, "invalid_last_active_at");

  const admin = adminClient();
  if (!admin) return fail(503, "integration_not_configured");
  const { data, error } = await admin.rpc("upsert_elco_summary", {
    p_link_id: b.link_id,
    p_level_estimate: b.level_estimate ?? null,
    p_focus_skills: skills,
    p_practice_count_30d: count,
    p_last_active_at: b.last_active_at ?? null,
    p_generated_at: b.generated_at,
  });
  if (error) return fail(500, "server_error");
  if (data === "not_found") return fail(404, "link_not_found");
  if (data === "scope_missing") return fail(403, "scope_missing");
  if (data === "invalid_time") return fail(400, "invalid_generated_at");
  return json(200, { status: data }); // "ok" or "stale" (an older snapshot was ignored)
}

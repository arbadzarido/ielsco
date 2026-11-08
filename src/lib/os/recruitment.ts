// Company OS → Recruitment: shared labels (pure; no imports so tests can load it).

export const CRITERIA: { key: string; label: string; hint: string }[] = [
  { key: "cv_quality", label: "CV quality", hint: "Clear, relevant and honest" },
  { key: "portfolio_quality", label: "Portfolio quality", hint: "Where a portfolio applies" },
  { key: "relevant_experience", label: "Relevant experience", hint: "Organisations, projects, class work" },
  { key: "communication", label: "Communication potential", hint: "Writing, the motivation, the interview" },
  { key: "motivation", label: "Motivation", hint: "Why IELSco / Elco AI, why these roles" },
  { key: "role_fit", label: "Role suitability", hint: "Fit with the chosen roles' work" },
  { key: "campaign_compliance", label: "Campaign compliance", hint: "The seven Instagram tasks" },
];
export const RATINGS: { value: string; label: string }[] = [
  { value: "strong", label: "Strong" }, { value: "adequate", label: "Adequate" }, { value: "weak", label: "Weak" }, { value: "not_applicable", label: "Not applicable" },
];
export const EVAL_KINDS: { value: string; label: string }[] = [
  { value: "screening", label: "CV screening" }, { value: "interview", label: "Interview" }, { value: "final", label: "Final evaluation" },
];
export const RECOMMENDATIONS: { value: string; label: string }[] = [
  { value: "advance", label: "Move forward" }, { value: "hold", label: "Hold" }, { value: "decline", label: "Don't move forward" },
];
export const TASK_STATUS_LABEL: Record<string, string> = { pending: "To check", verified: "Verified", not_found: "Not found" };

export type Stage = { key: string; label: string; sort: number; applicant_status: string; is_final: boolean; active: boolean };

export type CandidateRow = {
  id: string; full_name: string; email: string; whatsapp: string; university: string; academic_year: number; batch_year: number | null;
  domicile_country: string | null; domicile_city: string | null; division: string; role_id: string | null; role_2_id: string | null;
  instagram_url: string; linkedin_url: string; cv_path: string; portfolio_path: string | null; portfolio_url: string | null;
  motivation: string | null; status: string; campaign_verification: string; campaign_tasks: Record<string, string> | null;
  admin_notes: string | null; submitted_at: string | null; created_at: string; user_id: string | null;
};
export const CANDIDATE_COLUMNS = "id, full_name, email, whatsapp, university, academic_year, batch_year, domicile_country, domicile_city, division, role_id, role_2_id, instagram_url, linkedin_url, cv_path, portfolio_path, portfolio_url, motivation, status, campaign_verification, campaign_tasks, admin_notes, submitted_at, created_at, user_id";

/** Overall campaign status from the per-task results (the same rule the careers admin uses). */
export function overallCampaign(tasks: Record<string, string> | null | undefined, keys: string[]): "verified" | "incomplete" | "pending" {
  const all = keys.map((k) => tasks?.[k] ?? "pending");
  return all.every((x) => x === "verified") ? "verified" : all.some((x) => x === "not_found") ? "incomplete" : "pending";
}

/** Text search across what a recruiter types: name, email, university, city. */
export function matchesQuery(c: Pick<CandidateRow, "full_name" | "email" | "university" | "domicile_city">, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${c.full_name} ${c.email} ${c.university} ${c.domicile_city ?? ""}`.toLowerCase().includes(s);
}

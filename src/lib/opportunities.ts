// Opportunity board: types, labels and the public query. Data lives in public.opportunities (RLS: published rows are
// public; staff manage them in Dashboard → Admin → Opportunities).
import { publicSupabase } from "@/lib/supabase/public";

export type Category = "scholarship" | "fellowship" | "exchange" | "competition" | "conference" | "internship" | "volunteering" | "program";
export type Funding = "fully_funded" | "partially_funded" | "self_funded" | "free" | "unknown";
export type Verification = "verified" | "link_checked" | "unverified";

export interface Opportunity {
  id: string; slug: string; title: string; organizer: string; category: Category; summary: string; eligibility: string | null;
  regions: string[]; open_to: string | null; study_level: string | null; funding: Funding; deadline: string | null; deadline_note: string | null;
  official_url: string; documents: string[]; verification: Verification; checked_on: string | null; is_iels_program: boolean; featured: boolean;
  updated_at: string;
}

export const OPP_COLUMNS = "id, slug, title, organizer, category, summary, eligibility, regions, open_to, study_level, funding, deadline, deadline_note, official_url, documents, verification, checked_on, is_iels_program, featured, updated_at";

export const CATEGORY_LABEL: Record<Category, string> = {
  scholarship: "Scholarship", fellowship: "Fellowship", exchange: "Exchange", competition: "Competition", conference: "Conference",
  internship: "Internship", volunteering: "Volunteering", program: "Program",
};
export const FUNDING_LABEL: Record<Funding, string> = {
  fully_funded: "Fully funded", partially_funded: "Partly funded", self_funded: "Self-funded", free: "Free to join", unknown: "Funding varies",
};
export const LEVEL_LABEL: Record<string, string> = { undergraduate: "Undergraduate", masters: "Master's", doctoral: "Doctoral", any: "Several levels", non_degree: "Non-degree" };

const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
export function regionLabel(code: string) {
  if (code === "multiple") return "Several countries";
  if (code === "online") return "Online";
  try { return regionNames?.of(code.toUpperCase()) ?? code; } catch { return code; }
}

export function verificationText(o: Pick<Opportunity, "verification" | "checked_on">) {
  const d = o.checked_on ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(o.checked_on)) : null;
  if (o.verification === "verified") return `Details checked against the official page${d ? ` on ${d}` : ""}`;
  if (o.verification === "link_checked") return `Official link checked${d ? ` on ${d}` : ""}. Dates and eligibility not yet confirmed for this cycle`;
  return "Not yet checked by IELS. Rely on the official page";
}

// Deadline state on a given day (Asia/Jakarta dates are close enough at day precision).
export function deadlineState(deadline: string | null, now = new Date()): "none" | "closed" | "soon" | "open" {
  if (!deadline) return "none";
  const end = new Date(`${deadline.slice(0, 10)}T23:59:59+07:00`).getTime();
  if (Number.isNaN(end)) return "none";
  if (end < now.getTime()) return "closed";
  return end - now.getTime() < 21 * 864e5 ? "soon" : "open";
}

export async function listPublishedOpportunities(): Promise<Opportunity[]> {
  try {
    const { data, error } = await publicSupabase().from("opportunities").select(OPP_COLUMNS).eq("status", "published")
      .order("featured", { ascending: false }).order("title");
    if (error) return [];
    return (data ?? []) as Opportunity[];
  } catch {
    return [];
  }
}

export async function getOpportunity(slug: string): Promise<Opportunity | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  try {
    const { data } = await publicSupabase().from("opportunities").select(OPP_COLUMNS).eq("slug", slug).eq("status", "published").maybeSingle();
    return (data as Opportunity) ?? null;
  } catch {
    return null;
  }
}

// Home "Opportunity Spotlight" and Discover recommendations: plain, explainable scoring from the member's own goals
// (direction + interests chosen in onboarding). No AI and no hidden signals; every pick carries its reason.
const DIRECTION_CATEGORIES: Record<string, Category[]> = {
  study: ["scholarship", "exchange", "fellowship", "program"],
  work: ["internship", "fellowship", "volunteering", "competition", "conference"],
  explore: ["exchange", "competition", "volunteering", "conference", "program"],
};
const INTEREST_CATEGORIES: Record<string, Category[]> = {
  Scholarships: ["scholarship"], "University applications": ["scholarship", "program"], "Exchange / short programs": ["exchange", "program"],
  Internships: ["internship"], "Job applications": ["internship", "fellowship"], "Explore global opportunities": ["exchange", "fellowship", "conference"],
  "Meet people with similar goals": ["conference", "volunteering", "exchange"],
};

// `diverse`: one pick per category first (Home shows a short mix), then the next best ones.
export function recommendOpportunities(rows: Opportunity[], goals: { direction: string | null; interests: string[] }, n = 3, now = new Date(), diverse = false) {
  const fromDirection = new Set(goals.direction ? DIRECTION_CATEGORIES[goals.direction] ?? [] : []);
  const fromInterests = new Set(goals.interests.flatMap((i) => INTEREST_CATEGORIES[i] ?? []));
  const ranked = rows
    .filter((o) => deadlineState(o.deadline, now) !== "closed")
    .map((o) => {
      const interest = fromInterests.has(o.category), direction = fromDirection.has(o.category);
      const soon = deadlineState(o.deadline, now) === "soon";
      const score = (interest ? 3 : 0) + (direction ? 2 : 0) + (o.featured ? 1 : 0) + (soon ? 1 : 0);
      const reason = interest ? "Matches your interests" : direction ? "Fits your goal" : o.featured ? "Featured by IELS" : null;
      return { opportunity: o, score, reason };
    })
    .sort((a, b) => b.score - a.score || (a.opportunity.deadline ?? "9999").localeCompare(b.opportunity.deadline ?? "9999"));
  if (!diverse) return ranked.slice(0, n);
  const seen = new Set<string>();
  const firsts = ranked.filter((r) => !seen.has(r.opportunity.category) && seen.add(r.opportunity.category));
  return [...firsts, ...ranked.filter((r) => !firsts.includes(r))].slice(0, n);
}

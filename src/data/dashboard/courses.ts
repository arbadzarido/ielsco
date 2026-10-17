// Dashboard view over the EXISTING course data in src/data/courses.ts (single source of truth for
// courses, mentors, prices, registration form and WhatsApp). Do not duplicate prices here.
import {
  COURSE_PACKAGES, GOOGLE_FORM_URL, MENTORS, TRACK_META, WHATSAPP_URL,
  type CourseTrack, type Mentor,
} from "@/data/courses";
import type { ResourceCategory } from "@/lib/dashboard/types";

export { GOOGLE_FORM_URL, WHATSAPP_URL };
export type { CourseTrack, Mentor };

export const COURSE_TRACKS = Object.keys(TRACK_META) as CourseTrack[];

export function trackInfo(track: CourseTrack) {
  const meta = TRACK_META[track];
  const packages = COURSE_PACKAGES.filter((p) => p.trackId === track);
  // Mentor may be missing from MENTORS (e.g. "hana" is referenced but not defined) → show "to be confirmed".
  const mentor = MENTORS.find((m) => m.id === meta.mentorId) ?? null;
  return { track, label: meta.label, packages, mentor };
}

export const isCourseTrack = (v: string): v is CourseTrack => v in TRACK_META;

export const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// Which course genuinely relates to a resource topic. null = no honest match → no promotion.
export const CATEGORY_TO_TRACK: Record<ResourceCategory, CourseTrack | null> = {
  "English Speaking": "speaking",
  "English for Interviews": "work-abroad",
  "Workplace Communication": "work-abroad",
  "Academic English": "standardized-test",
  "Writing & Applications": "scholarship-essay",
  "Vocabulary & Grammar": "grammar",
  "Learning Strategies": null,
};

// Course shown on Home for a member's goals.
export function trackForGoals(direction: string | null, interests: string[]): CourseTrack {
  if (interests.includes("Scholarships") || interests.includes("University applications")) return "scholarship-essay";
  if (interests.includes("Academic English")) return "standardized-test";
  if (direction === "work") return "work-abroad";
  return "speaking";
}

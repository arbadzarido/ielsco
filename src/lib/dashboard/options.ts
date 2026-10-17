import type { Direction, PublicField } from "./types";

export const OTHER_COUNTRY = "__other__";
export const NOT_DECIDED = "Not decided yet";
export const PREFER_NOT_TO_SAY = "Prefer not to say";

// Southeast Asian countries, used for both origin and destination. "Other" → free text.
export const SEA_COUNTRIES = [
  "Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam", "Philippines",
  "Brunei Darussalam", "Cambodia", "Laos", "Myanmar", "Timor-Leste",
];

// "Where are you from?" — country of origin. Not residence, not destination.
export const ORIGIN_OPTIONS = [...SEA_COUNTRIES, PREFER_NOT_TO_SAY];

// "Where would you like to go?" — destination.
export const COUNTRY_OPTIONS = [...SEA_COUNTRIES, NOT_DECIDED];

export const SEA_FLAGS: Record<string, string> = {
  Indonesia: "🇮🇩", Malaysia: "🇲🇾", Singapore: "🇸🇬", Thailand: "🇹🇭", Vietnam: "🇻🇳", Philippines: "🇵🇭",
  "Brunei Darussalam": "🇧🇳", Cambodia: "🇰🇭", Laos: "🇱🇦", Myanmar: "🇲🇲", "Timor-Leste": "🇹🇱",
};

export const DIRECTIONS: { value: Direction; label: string; hint: string }[] = [
  { value: "study", label: "Study", hint: "Degrees, scholarships, exchange programs" },
  { value: "work", label: "Work", hint: "Internships, jobs, workplace English" },
  { value: "explore", label: "Explore / Not sure yet", hint: "Improve English and see what's possible" },
];

export const INTERESTS: Record<Direction, string[]> = {
  study: ["Scholarships", "University applications", "Academic English", "Exchange / short programs", "Not sure yet"],
  work: ["Internships", "Job applications", "Interview English", "Workplace communication", "Not sure yet"],
  explore: ["Improve my English", "Explore global opportunities", "Meet people with similar goals", "Not sure yet"],
};

export const ENGLISH_LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper-intermediate", "Advanced"];

export const ROLE_OPTIONS = [
  "High school student",
  "University student",
  "Fresh graduate",
  "Working professional",
  "Educator",
  "Other",
];

export const PUBLIC_FIELD_OPTIONS: { value: PublicField; label: string }[] = [
  { value: "origin", label: "Where I'm from (country of origin)" },
  { value: "country", label: "Where I live now" },
  { value: "role_status", label: "Current role" },
  { value: "goals", label: "Goals & interests" },
  { value: "bio", label: "Short bio" },
  { value: "links", label: "LinkedIn / Instagram / portfolio links" },
];

export function directionLabel(direction: Direction | null) {
  return DIRECTIONS.find((d) => d.value === direction)?.label ?? "";
}

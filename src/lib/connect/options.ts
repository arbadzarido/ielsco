// IELSco Connect option lists. The values must match public.connect_allowed() in
// supabase/migrations/20261028000000_connect_core.sql (the database rejects anything else).

type Option = { value: string; label: string };

export const LANGUAGES: Option[] = [
  { value: "en", label: "English" }, { value: "id", label: "Bahasa Indonesia" }, { value: "ms", label: "Bahasa Melayu" },
  { value: "fil", label: "Filipino" }, { value: "th", label: "Thai" }, { value: "vi", label: "Vietnamese" },
  { value: "my", label: "Burmese" }, { value: "km", label: "Khmer" }, { value: "lo", label: "Lao" }, { value: "tet", label: "Tetum" },
  { value: "jv", label: "Javanese" }, { value: "su", label: "Sundanese" }, { value: "ceb", label: "Cebuano" },
  { value: "zh", label: "Mandarin Chinese" }, { value: "ja", label: "Japanese" }, { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" }, { value: "hi", label: "Hindi" }, { value: "ta", label: "Tamil" }, { value: "fr", label: "French" },
  { value: "de", label: "German" }, { value: "es", label: "Spanish" }, { value: "nl", label: "Dutch" }, { value: "other", label: "Other" },
];

export const TOPICS: Option[] = [
  { value: "education", label: "Education" }, { value: "culture", label: "Culture" }, { value: "technology", label: "Technology" },
  { value: "business", label: "Business & entrepreneurship" }, { value: "career", label: "Career" }, { value: "travel", label: "Travel" },
  { value: "music", label: "Music & entertainment" }, { value: "sports", label: "Sports" }, { value: "languages", label: "Languages" },
  { value: "food", label: "Food" }, { value: "books", label: "Books" }, { value: "film", label: "Film & series" },
  { value: "science", label: "Science" }, { value: "social_impact", label: "Social impact" },
];

export const ACTIVITIES: Option[] = [
  { value: "high_school_student", label: "High school student" }, { value: "university_student", label: "University student" },
  { value: "professional", label: "Working professional" }, { value: "job_seeker", label: "Job seeker" },
  { value: "scholarship_applicant", label: "Scholarship applicant" }, { value: "entrepreneur", label: "Aspiring entrepreneur" },
  { value: "educator", label: "Educator" }, { value: "other", label: "Other" },
];

export const GOALS: Option[] = [
  { value: "friends", label: "Make international friends" }, { value: "practise_english", label: "Practise English" },
  { value: "culture_exchange", label: "Exchange cultures" }, { value: "study_together", label: "Study together" },
  { value: "scholarships", label: "Prepare for scholarships" }, { value: "career_networking", label: "Career networking" },
  { value: "collaborators", label: "Find project collaborators" },
];

export const DAYS: Option[] = [
  { value: "mon", label: "Mon" }, { value: "tue", label: "Tue" }, { value: "wed", label: "Wed" }, { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" }, { value: "sat", label: "Sat" }, { value: "sun", label: "Sun" },
];

export const TIMES: Option[] = [
  { value: "morning", label: "Mornings" }, { value: "afternoon", label: "Afternoons" }, { value: "evening", label: "Evenings" },
  { value: "night", label: "Late night" },
];

export const ROOM_CATEGORIES: Option[] = [
  { value: "english_practice", label: "English speaking practice" }, { value: "culture_exchange", label: "Culture exchange" },
  { value: "study_together", label: "Study together" }, { value: "scholarship_prep", label: "Scholarship preparation" },
  { value: "career_networking", label: "Career networking" }, { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "language_exchange", label: "Language exchange" }, { value: "hangout", label: "Community hangout" }, { value: "other", label: "Other" },
];

export const REPORT_REASONS: Option[] = [
  { value: "harassment", label: "Harassment or bullying" }, { value: "spam", label: "Spam or selling" },
  { value: "inappropriate", label: "Sexual or inappropriate content" }, { value: "fake_profile", label: "Fake profile or impersonation" },
  { value: "underage", label: "May be under 18" }, { value: "safety", label: "Threat or safety concern" }, { value: "other", label: "Something else" },
];

// Same strings as lib/dashboard/options.ts ENGLISH_LEVELS (self-reported).
export const ENGLISH_LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper-intermediate", "Advanced"];

const index = (list: Option[]) => Object.fromEntries(list.map((o) => [o.value, o.label]));
const LABELS = {
  language: index(LANGUAGES), topic: index(TOPICS), activity: index(ACTIVITIES), goal: index(GOALS),
  day: index(DAYS), time: index(TIMES), category: index(ROOM_CATEGORIES),
};
export const label = (kind: keyof typeof LABELS, value: string) => LABELS[kind][value] ?? value;
export const labels = (kind: keyof typeof LABELS, values: string[] | null | undefined) => (values ?? []).map((v) => label(kind, v));

// A few common IANA zones for Southeast Asia first; the browser's own zone is added by the form.
export const TIMEZONES = [
  "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Bangkok",
  "Asia/Ho_Chi_Minh", "Asia/Yangon", "Asia/Phnom_Penh", "Asia/Vientiane", "Asia/Brunei", "Asia/Dili", "Asia/Tokyo", "Asia/Seoul",
  "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai", "Australia/Sydney", "Europe/London", "Europe/Amsterdam", "America/New_York", "UTC",
];

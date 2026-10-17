// IELS Circle activities. Source: the existing public agenda in src/app/circle/agenda/page.tsx
// (Oct–Dec 2026 cohort). Keep these in sync with that page. Add new cohorts by appending weeks.
// Registration for this cohort closed on 9 Oct 2026 (REGISTRATION_DEADLINE on the agenda page).

export interface CircleActivity {
  start: string; // ISO date, inclusive
  end: string; // ISO date, inclusive
  label: string;
  title: string;
  focus: string;
  activities: string[];
}

export const CIRCLE_COHORT = {
  name: "IELS Circle · Oct–Dec 2026 cohort",
  agendaHref: "/circle/agenda",
  registrationClosedOn: "2026-10-09",
  // Registration = one row in public.event_registrations with this event_id (see lib/events/registration.ts).
  eventId: "circle-2026-oct",
  registrationClosesAt: "2026-10-09T23:59:59+07:00",
};

export const CIRCLE_ACTIVITIES: CircleActivity[] = [
  { start: "2026-10-12", end: "2026-10-18", label: "Week 1", title: "Daily Conversation & Greetings", focus: "Getting comfortable expressing yourself in English", activities: ["Everyday communication basics", "Natural greetings & small talk", "Kick-off community forum"] },
  { start: "2026-10-19", end: "2026-10-25", label: "Week 2", title: "Grammar Essentials", focus: "Building accuracy without the boring memorization", activities: ["Tenses & sentence structure", "Common mistakes, simplified", "Weekly evaluation quiz"] },
  { start: "2026-10-26", end: "2026-11-01", label: "Week 3", title: "Everyday Listening Comprehension", focus: "Training your ear for real-life English", activities: ["Listening to natural conversations", "Everyday situational context", "Speaking club practice"] },
  { start: "2026-11-02", end: "2026-11-08", label: "Week 4", title: "Practical Reading & Vocabulary", focus: "Expanding vocabulary for everyday use", activities: ["Practical reading strategies", "Vocabulary building activities", "Community mini games"] },
  { start: "2026-11-09", end: "2026-11-15", label: "Week 5", title: "Academic Reading Strategies", focus: "Reading academic texts with more confidence", activities: ["Approaching academic material", "Skimming & scanning techniques", "Weekly evaluation quiz"] },
  { start: "2026-11-16", end: "2026-11-22", label: "Week 6", title: "Paragraph & Essay Writing Basics", focus: "Turning ideas into clear, structured writing", activities: ["Organizing your ideas", "Paragraph & essay structure", "Speaking club practice"] },
  { start: "2026-11-23", end: "2026-11-29", label: "Week 7", title: "Idioms, Phrasal Verbs & Slang", focus: "Sounding more natural and conversational", activities: ["Everyday idioms & slang", "Phrasal verbs in context", "Community mini games"] },
  { start: "2026-11-30", end: "2026-12-06", label: "Week 8", title: "Podcasts & Lectures", focus: "Leveling up with longer-form listening", activities: ["Podcast & lecture comprehension", "Note-taking while listening", "Weekly evaluation quiz"] },
  { start: "2026-12-12", end: "2026-12-12", label: "Grand Finale", title: "Graduation Day", focus: "Celebrating 8 weeks of progress, together", activities: ["Recap of the full journey", "Community celebration", "E-Certificate distribution"] },
];

const today = () => new Date().toISOString().slice(0, 10);

// Current activity if one is running, otherwise the next upcoming one. null = nothing scheduled.
export function currentOrNextActivity(): { activity: CircleActivity; isNow: boolean } | null {
  const t = today();
  const now = CIRCLE_ACTIVITIES.find((a) => a.start <= t && t <= a.end);
  if (now) return { activity: now, isNow: true };
  const next = CIRCLE_ACTIVITIES.find((a) => a.start > t);
  return next ? { activity: next, isNow: false } : null;
}

export const upcomingActivities = () => CIRCLE_ACTIVITIES.filter((a) => a.end >= today());

export function formatRange(a: CircleActivity) {
  const f = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return a.start === a.end ? f(a.start) : `${f(a.start)} – ${f(a.end)}`;
}

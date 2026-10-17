// IELS Circle recurring sessions. Canonical timezone: Asia/Jakarta (WIB, UTC+7, no daylight saving).
//   Every Wednesday 19:00 WIB  (= 12:00 UTC)
//   Every Saturday  13:00 WIB  (= 06:00 UTC)
// Sessions are computed, never stored as a list. A session is identified by its UTC start instant (ISO string), which
// is also what circle_session_checkins.session_start stores (timestamptz). The database checks the same slots in
// Asia/Jakarta (supabase/migrations/20261017030000_circle_session_checkins.sql). Dependency-free for unit tests.

export const CIRCLE_TIMEZONE = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// isoDow: 1 = Monday … 7 = Sunday, in WIB.
export const CIRCLE_SLOTS = [
  { isoDow: 3, hour: 19, minute: 0, key: "wed" },
  { isoDow: 6, hour: 13, minute: 0, key: "sat" },
] as const;

export interface CircleTopic {
  title: string;
  description: string;
  theme: string;
}

// Curated rotation (no AI dependency). Order alternates themes so consecutive sessions differ.
export const CIRCLE_TOPICS: CircleTopic[] = [
  { theme: "Speaking", title: "Introduce yourself in 60 seconds", description: "Practise a short, confident self-introduction and give each other friendly feedback." },
  { theme: "Scholarships", title: "What makes a scholarship essay stand out", description: "Share what you know about motivation letters and talk through common mistakes." },
  { theme: "Careers", title: "Talking about your experience in interviews", description: "Practise answering “Tell me about a project you worked on” with clear structure." },
  { theme: "ASEAN", title: "Life in your city, explained to a neighbour", description: "Describe daily life where you live and compare it with members from other countries." },
  { theme: "Learning", title: "Building an English habit that lasts", description: "Swap realistic study routines and set one small goal for the next week." },
  { theme: "Study abroad", title: "Choosing a country to study in", description: "Weigh costs, language, culture and opportunities, and hear what others are considering." },
  { theme: "Stories", title: "A moment that changed your plans", description: "Members share a turning point in their learning or career journey. Listening counts too." },
  { theme: "Speaking", title: "Small talk without the awkwardness", description: "Practise opening, keeping and politely closing everyday conversations." },
  { theme: "Work abroad", title: "Remote work and working abroad", description: "Discuss what international and remote roles look for and which skills transfer." },
  { theme: "Entrepreneurship", title: "Ideas that solve a local problem", description: "Pitch a small idea for your community in English and get questions from the group." },
  { theme: "Learning", title: "Learning vocabulary you actually use", description: "Compare methods for remembering new words and practise them in context." },
  { theme: "Scholarships", title: "Preparing for a scholarship interview", description: "Practise common interview questions and how to answer honestly and clearly." },
  { theme: "ASEAN", title: "Youth collaboration across Southeast Asia", description: "Talk about projects, exchanges and causes that young people across the region care about." },
  { theme: "Careers", title: "Writing a LinkedIn summary in English", description: "Draft a short professional summary together and give each other suggestions." },
  { theme: "Speaking", title: "Explaining something you know well", description: "Teach the group about a hobby or skill in a few minutes, then take questions." },
  { theme: "Study abroad", title: "Questions to ask before you apply", description: "Make a shared checklist of what to research about programmes and universities." },
  { theme: "Stories", title: "Lessons from a failure", description: "Share something that didn't work out and what you learned from it." },
  { theme: "Learning", title: "Accountability check-in", description: "Review the goals you set, celebrate progress and adjust plans for the weeks ahead." },
  { theme: "Entrepreneurship", title: "Education ideas for your community", description: "Brainstorm ways to make learning more accessible where you live." },
  { theme: "Work abroad", title: "Workplace English for meetings", description: "Practise agreeing, disagreeing and asking for clarification politely." },
];

// First Saturday of 2026 in WIB, used to number weeks for the rotation.
const ANCHOR_UTC = Date.UTC(2026, 0, 3, 6, 0); // Sat 3 Jan 2026 13:00 WIB

export interface CircleSession {
  id: string; // UTC ISO start, e.g. "2026-10-21T12:00:00.000Z"
  start: Date;
  slot: (typeof CIRCLE_SLOTS)[number]["key"];
  topic: CircleTopic;
}

function topicFor(startUtcMs: number, slotIndex: number): CircleTopic {
  const week = Math.floor((startUtcMs - ANCHOR_UTC) / (7 * DAY_MS));
  const i = (((week * CIRCLE_SLOTS.length + slotIndex) % CIRCLE_TOPICS.length) + CIRCLE_TOPICS.length) % CIRCLE_TOPICS.length;
  return CIRCLE_TOPICS[i];
}

// Next `count` sessions whose start is after `from` (or that started less than `graceMinutes` ago).
export function upcomingSessions(count = 4, from: Date = new Date(), graceMinutes = 0): CircleSession[] {
  const out: CircleSession[] = [];
  const fromMs = from.getTime() - graceMinutes * 60_000;
  // Midnight WIB of "today" expressed in UTC ms.
  const wibNow = fromMs + WIB_OFFSET_MS;
  const wibMidnight = wibNow - (((wibNow % DAY_MS) + DAY_MS) % DAY_MS);
  for (let d = 0; out.length < count && d < 7 * (count + 1); d++) {
    const dayWib = wibMidnight + d * DAY_MS; // midnight WIB, as a "WIB clock" timestamp
    const isoDow = ((new Date(dayWib).getUTCDay() + 6) % 7) + 1;
    CIRCLE_SLOTS.forEach((slot, slotIndex) => {
      if (slot.isoDow !== isoDow) return;
      const startUtc = dayWib + (slot.hour * 60 + slot.minute) * 60_000 - WIB_OFFSET_MS;
      if (startUtc < fromMs) return;
      out.push({ id: new Date(startUtc).toISOString(), start: new Date(startUtc), slot: slot.key, topic: topicFor(startUtc, slotIndex) });
    });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, count);
}

// True when `iso` is a real Circle slot (same rule as the database check constraint).
export function isCircleSlot(iso: string): boolean {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return false;
  const wib = new Date(ms + WIB_OFFSET_MS);
  const isoDow = ((wib.getUTCDay() + 6) % 7) + 1;
  return CIRCLE_SLOTS.some((s) => s.isoDow === isoDow && wib.getUTCHours() === s.hour && wib.getUTCMinutes() === s.minute && wib.getUTCSeconds() === 0 && wib.getUTCMilliseconds() === 0);
}

// Display in WIB regardless of the viewer's own timezone.
export function formatSessionWib(start: Date, locale = "en-GB") {
  const day = new Intl.DateTimeFormat(locale, { timeZone: CIRCLE_TIMEZONE, weekday: "long", day: "numeric", month: "long" }).format(start);
  const time = new Intl.DateTimeFormat(locale, { timeZone: CIRCLE_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(start);
  return { day, time: `${time} WIB` };
}

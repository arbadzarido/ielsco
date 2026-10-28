// Elco Copilot help content: fixed answers about how IELSco works today, each with a link to the real page.
// Deterministic on purpose (no AI call, no cost, no invented features). Keep answers in step with the product: when a
// feature changes, change its answer here. Quick Match's answer depends on whether staff have switched it on.

export interface HelpTopic {
  id: string;
  q: string;
  a: string;
  href: string;
  cta: string;
  keywords: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  { id: "how", q: "How does IELSco work?", href: "/dashboard", cta: "Go to Home",
    a: "IELSco has five menus. Home shows your next steps and upcoming events. Discover has People, Circles, Opportunities, IELSco Pulse and SEA Cultural Exchange. Social holds intro requests, messages and connections. Connect has Quick Match, Rooms & Events and Elco AI. More has your goals, membership, saved items, profile, settings and help.",
    keywords: ["start", "begin", "menu", "navigate", "overview", "what is"] },
  { id: "passport", q: "What is my IELSco Passport?", href: "/dashboard/connect/passport", cta: "Open Passport",
    a: "Your Passport is your profile for meeting people: languages, English level (self-reported), interests, what you're looking for and when you're usually free. To send intros, join Circles or use Quick Match you accept the Connect guidelines and confirm you're 18+. Others only find you if you turn on “Show me in Discover”.",
    keywords: ["profile", "passport", "visible", "privacy", "hide", "18"] },
  { id: "people", q: "How do I find people with similar interests?", href: "/dashboard/connect/discover", cta: "Discover people",
    a: "Open Discover → People and filter by language, goal, interest, activity or the day you're free. Best matches come first, and each card says why it's suggested (for example, they speak a language you're learning). Only members who turned on Discover appear.",
    keywords: ["people", "friends", "match", "partner", "find", "language exchange", "similar"] },
  { id: "intro", q: "How do I request an introduction?", href: "/dashboard/connect/discover", cta: "Find someone",
    a: "Open a member's Passport and write a Letter Intro (at least 20 characters: who you are and why you'd like to connect). If they accept, you're connected and can message each other. If they decline, you can try again after 30 days. You can send up to 10 intros a day.",
    keywords: ["intro", "introduction", "say hi", "request", "connect with", "contact"] },
  { id: "messages", q: "Who can I message?", href: "/dashboard/connect/messages", cta: "Open Messages",
    a: "Only your connections: people who accepted your intro (or whose intro you accepted), or who also said yes after a Quick Match. Messages are private between the two of you.",
    keywords: ["message", "chat", "dm", "inbox", "unread"] },
  { id: "circles", q: "How do I join a Circle?", href: "/dashboard/circles", cta: "See Circles",
    a: "Go to Discover → Circles, open one and press Join. Members can read and post in the Circle's discussion and reply to each other. You can leave anytime. The weekly IELS Circle sessions and check-ins have their own page.",
    keywords: ["circle", "group", "community", "discussion", "join"] },
  { id: "opportunities", q: "Where can I find scholarships?", href: "/dashboard/discover/opportunities", cta: "Browse opportunities",
    a: "Discover → Opportunities lists scholarships, exchanges, fellowships, internships and programs. Each one links to its official page and says when IELS last checked it. Always confirm dates and eligibility on the official page. Save one to track it in My opportunities.",
    keywords: ["scholarship", "opportunity", "fellowship", "exchange", "internship", "program", "deadline", "apply"] },
  { id: "pulse", q: "Where can I find articles and videos?", href: "/dashboard/pulse", cta: "Open IELSco Pulse",
    a: "IELSco Pulse (in Discover) brings together opportunities, member stories and hand-picked guides, videos and tools. External items open the original source in a new tab.",
    keywords: ["article", "video", "news", "read", "story", "stories", "guide", "pulse", "podcast"] },
  { id: "sea", q: "How do I join SEA Cultural Exchange?", href: "/dashboard/sea-exchange", cta: "Open SEA Cultural Exchange",
    a: "Pick a prompt in Discover → SEA Cultural Exchange, then answer it in the Cross-Cultural Connections Circle, host a room on it, or find members who want to exchange cultures. Everyone shares their own perspective.",
    keywords: ["culture", "cultural", "sea", "southeast asia", "tradition", "country"] },
  { id: "events", q: "How do I join an IELSco event?", href: "/dashboard/connect/rooms", cta: "Rooms & Events",
    a: "Connect → Rooms & Events lists member-hosted rooms and official IELS events. For a room, press Register; the meeting link appears once you're registered. Official events are registered on their own event page, with their own rules.",
    keywords: ["event", "room", "register", "meetup", "session", "workshop", "webinar", "host"] },
  { id: "quickmatch", q: "How does Quick Match work?", href: "/dashboard/connect/quick-match", cta: "Open Quick Match",
    a: "Choose voice or video (your camera stays off until you turn it on) and a topic card or free talk. You're paired with the next member who starts the same kind of call, for up to 8 minutes. Calls aren't recorded. Afterwards you each choose whether to connect; you're connected only if you both say yes.",
    keywords: ["quick match", "call", "video", "voice", "random", "talk", "speak"] },
  { id: "elco", q: "Where can I access Elco AI?", href: "/dashboard/connect/elco", cta: "Connect with Elco",
    a: "Elco AI is IELS's separate English practice app, with its own account. Open it from Connect → Connect with Elco. I'm Elco Copilot: I only help you find your way around IELSco.",
    keywords: ["elco", "ai", "practice", "english", "learn", "speaking practice"] },
  { id: "safety", q: "How do I block or report someone?", href: "/dashboard/connect/safety", cta: "Safety",
    a: "Use the … menu on a member's Passport, an intro, a conversation, a Circle post or during a call. Blocking stops them finding, contacting or matching with you. Reports go to the IELS team only; the other person isn't told who reported them.",
    keywords: ["block", "report", "safety", "harass", "spam", "unsafe", "abuse"] },
];

const BY_SECTION: Record<string, string[]> = {
  home: ["how", "passport", "events"],
  discover: ["people", "circles", "opportunities", "pulse", "sea"],
  social: ["intro", "messages", "safety"],
  connect: ["quickmatch", "events", "elco"],
  more: ["how", "passport", "safety"],
};

const BY_PAGE: [string, string][] = [
  ["/dashboard/connect/quick-match", "quickmatch"], ["/dashboard/discover/opportunities", "opportunities"], ["/dashboard/opportunities", "opportunities"],
  ["/dashboard/circles", "circles"], ["/dashboard/pulse", "pulse"], ["/dashboard/sea-exchange", "sea"], ["/dashboard/connect/passport", "passport"],
  ["/dashboard/connect/people", "intro"], ["/dashboard/connect/rooms", "events"], ["/dashboard/events", "events"], ["/dashboard/connect/elco", "elco"],
];

// Topics for the current page first, then the rest of its section, then everything else.
export function topicsFor(pathname: string, sectionId: string | null): HelpTopic[] {
  const page = BY_PAGE.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1];
  const order = [...new Set([...(page ? [page] : []), ...(BY_SECTION[sectionId ?? "home"] ?? []), ...HELP_TOPICS.map((t) => t.id)])];
  return order.map((id) => HELP_TOPICS.find((t) => t.id === id)!).filter(Boolean);
}

// Plain keyword search: every word of the query must appear in the question, answer or keywords.
export function searchTopics(query: string): HelpTopic[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return HELP_TOPICS
    .map((t) => {
      const hay = `${t.q} ${t.a} ${t.keywords.join(" ")}`.toLowerCase();
      const hits = words.filter((w) => hay.includes(w)).length;
      const strong = t.keywords.some((k) => query.toLowerCase().includes(k)) ? 2 : 0;
      return { t, score: hits + strong, all: hits === words.length };
    })
    .filter((x) => x.all || x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}

// Quick Match's answer must say whether it's actually on.
export function quickMatchStatus(enabled: boolean | null) {
  if (enabled === null) return null;
  return enabled ? "Quick Match is open now." : "Quick Match isn't switched on yet: live calls are still being tested. Rooms and intros work today.";
}

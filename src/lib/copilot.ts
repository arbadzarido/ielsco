// Elco Help (formerly Elco Copilot) help content: fixed answers about how IELSco works today, each with a link to the real page.
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
    a: "The menu has Home, Social, Discover and Events. Home shows IELSco highlights, upcoming IELSco events, programs, opportunities and your Elco practice. Social has People (members, your connections, intro requests and your Elco-Pass) and Inbox. Discover has Programs, Opportunities, News & Stories and Learning Materials. Events has Circle (the IELS Circle speaking community), IELSco Events (official events and IELSco Talks) and Other Events. Your profile card at the bottom has your Elco-Pass, Saved items, membership, settings and help.",
    keywords: ["start", "begin", "menu", "navigate", "overview", "what is"] },
  { id: "passport", q: "What is my Elco-Pass?", href: "/dashboard/passport", cta: "Open Elco-Pass",
    a: "Elco-Pass is your one identity across IELSco and Elco AI: your goals, learning journey (events, Circle check-ins, opportunities you track), Elco practice once you link it, and badges. It's private to you. Your Social profile (languages, interests, availability) is the part other members can see in People, and only if you turn on “Show me in Discover”. To send intros or join Circle groups you accept the community guidelines and confirm you're 18+.",
    keywords: ["profile", "passport", "elco-pass", "elco pass", "stamp", "visible", "privacy", "hide", "18"] },
  { id: "people", q: "How do I find people with similar interests?", href: "/dashboard/connect/discover", cta: "Discover people",
    a: "Open Social → People and filter by language, goal, interest, activity or the day you're free. Best matches come first, and each card says why it's suggested (for example, they speak a language you're learning). Only members who turned on Discover appear.",
    keywords: ["people", "friends", "match", "partner", "find", "language exchange", "similar"] },
  { id: "intro", q: "How do I request an introduction?", href: "/dashboard/connect/discover", cta: "Find someone",
    a: "Open a member's Passport and write a Letter Intro (at least 20 characters: who you are and why you'd like to connect). If they accept, you're connected and can message each other. If they decline, you can try again after 30 days. You can send up to 10 intros a day.",
    keywords: ["intro", "introduction", "say hi", "request", "connect with", "contact"] },
  { id: "messages", q: "Who can I message?", href: "/dashboard/connect/messages", cta: "Open Messages",
    a: "Only your connections: people who accepted your intro, or whose intro you accepted. Open Social → Inbox; a number shows unread messages. Messages are private between the two of you.",
    keywords: ["message", "chat", "dm", "inbox", "unread"] },
  { id: "circles", q: "How do I join IELS Circle?", href: "/dashboard/circle", cta: "Open Circle",
    a: "IELS Circle is IELSco's ongoing English speaking community. Open Events → Circle: open speaking sessions run every Wednesday 19:00 and Saturday 13:00 WIB. Check in to a session so the hosts know you're coming; it's added to My events and your Elco-Pass. Elco AI Starter and Pro members also get Speaking Club sessions (see Membership).",
    keywords: ["circle", "speaking club", "speaking", "community", "discussion", "join", "practice"] },
  { id: "opportunities", q: "Where can I find scholarships?", href: "/dashboard/discover/opportunities", cta: "Browse opportunities",
    a: "Discover → Opportunities lists scholarships, internships, jobs abroad, fellowships, exchanges, competitions and programs, with search and filters for type, country, study level and deadline. Each one links to its official page and says when IELS last checked it. Save one to track it as Interested, Applying or Applied in your Opportunity tracker.",
    keywords: ["scholarship", "opportunity", "fellowship", "exchange", "internship", "program", "deadline", "apply"] },
  { id: "pulse", q: "Where can I find articles and videos?", href: "/dashboard/explore", cta: "Learning Materials",
    a: "Discover → Learning Materials has hand-picked guides, videos, podcasts and collections you can save. Discover → News & Stories has IELSco news and member stories. External items open the original source in a new tab.",
    keywords: ["article", "video", "news", "read", "story", "stories", "guide", "pulse", "podcast"] },
  { id: "sea", q: "How do I join SEA Cultural Exchange?", href: "/dashboard/sea-exchange", cta: "Open SEA Cultural Exchange",
    a: "Pick a prompt on the SEA Cultural Exchange page, then answer it in the Cross-Cultural Connections Circle, host a room on it, or find members who want to exchange cultures. Everyone shares their own perspective.",
    keywords: ["culture", "cultural", "sea", "southeast asia", "tradition", "country"] },
  { id: "events", q: "How do I join an IELSco event?", href: "/dashboard/events", cta: "Open Events",
    a: "Events → IELSco Events lists official one-time IELSco events (register in one click) and IELSco Talks. Events → Circle has the weekly IELS Circle speaking sessions (check in). Other Events has sessions hosted by members (the meeting link appears once you register). Your upcoming registrations are on Home.",
    keywords: ["event", "room", "register", "meetup", "session", "workshop", "webinar", "host"] },
  { id: "quickmatch", q: "How does Quick Match work?", href: "/dashboard/connect/quick-match", cta: "Open Quick Match",
    a: "Choose voice or video (your camera stays off until you turn it on) and a topic card or free talk. You're paired with the next member who starts the same kind of call, for up to 8 minutes. Calls aren't recorded. Afterwards you each choose whether to connect; you're connected only if you both say yes.",
    keywords: ["quick match", "call", "video", "voice", "random", "talk", "speak"] },
  { id: "elco", q: "Where can I access Elco AI?", href: "/dashboard/connect/elco", cta: "Elco AI",
    a: "Elco AI is IELSco's AI English learning platform: English courses, speaking and writing practice, and test preparation. Open it from the Elco card in the menu or your Elco-Pass (Social → People → My Elco-Pass), where you can link accounts so your practice shows on Home and in your Elco-Pass. I'm Elco Help: I only help you find your way around IELSco.",
    keywords: ["elco", "ai", "practice", "english", "learn", "speaking practice"] },
  { id: "membership", q: "Is there an IELSco membership?", href: "/dashboard/membership", cta: "Membership",
    a: "There's no separate IELSco membership. Paid membership comes from Elco AI: Elco Starter includes 12 IELS Circle Speaking Club sessions a month, and Elco Pro includes Speaking Club without a monthly limit plus 4 mentoring sessions a month. Subscribe on Elco AI, then link your Elco account; the benefits appear here automatically.",
    keywords: ["membership", "member", "subscription", "subscribe", "starter", "pro", "price", "pay", "benefit", "mentoring"] },
  { id: "tests", q: "Where can I take an English test?", href: "/dashboard/connect/elco", cta: "Elco AI",
    a: "Test preparation is on Elco AI: TOEFL ITP, IELTS and TOEIC, each with lessons, practice and tryout / mock tests. SAT English is coming soon. IELSco itself no longer runs tests.",
    keywords: ["test", "toefl", "ielts", "toeic", "sat", "exam", "score", "tryout", "mock"] },
  { id: "tutor", q: "Can I get a private tutor?", href: "/dashboard/programs", cta: "Programs",
    a: "Yes. Elco AI is where you learn and practise every day; IELSco adds private sessions with a human tutor for Rp90,000 per session, requested one session at a time (no subscription). Use “Request a private tutor” on Programs or the course page.",
    keywords: ["tutor", "course", "class", "teacher", "private", "lesson", "90"] },
  { id: "safety", q: "How do I block or report someone?", href: "/dashboard/connect/safety", cta: "Safety",
    a: "Use the … menu on a member's profile, an intro, a conversation or a Circle post. Blocking stops them finding, contacting or matching with you. Reports go to the IELS team only; the other person isn't told who reported them.",
    keywords: ["block", "report", "safety", "harass", "spam", "unsafe", "abuse"] },
];

const BY_SECTION: Record<string, string[]> = {
  home: ["how", "passport", "membership"],
  social: ["people", "intro", "messages", "safety"],
  discover: ["opportunities", "pulse", "tutor", "tests"],
  events: ["circles", "events"],
  passport: ["passport", "elco"],
};

const BY_PAGE: [string, string][] = [
  ["/dashboard/connect/quick-match", "quickmatch"], ["/dashboard/discover/opportunities", "opportunities"], ["/dashboard/opportunities", "opportunities"],
  ["/dashboard/circle", "circles"], ["/dashboard/circles", "circles"], ["/dashboard/pulse", "pulse"], ["/dashboard/explore", "pulse"], ["/dashboard/passport", "passport"], ["/dashboard/sea-exchange", "sea"], ["/dashboard/connect/passport", "passport"],
  ["/dashboard/connect/people", "intro"], ["/dashboard/connect/rooms", "events"], ["/dashboard/events", "events"], ["/dashboard/connect/elco", "elco"],
  ["/dashboard/membership", "membership"], ["/dashboard/programs", "tutor"],
];

// Quick Match is out of the navigation until it's reactivated (NEXT_PUBLIC_QUICK_MATCH_IN_NAV); until then its help
// answer is offered only on its own page.
const QUICK_MATCH_LISTED = process.env.NEXT_PUBLIC_QUICK_MATCH_IN_NAV === "true";
// Cultural exchange is out of the navigation too (route kept); its answer stays on its own page.
const HIDDEN = new Set(["sea", ...(QUICK_MATCH_LISTED ? [] : ["quickmatch"])]);
const listed = (t: HelpTopic) => !HIDDEN.has(t.id);

// Topics for the current page first, then the rest of its section, then everything else.
export function topicsFor(pathname: string, sectionId: string | null): HelpTopic[] {
  const page = BY_PAGE.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1];
  const order = [...new Set([...(page ? [page] : []), ...(BY_SECTION[sectionId ?? "home"] ?? []), ...HELP_TOPICS.filter(listed).map((t) => t.id)])];
  return order.map((id) => HELP_TOPICS.find((t) => t.id === id)!).filter(Boolean);
}

// Plain keyword search: every word of the query must appear in the question, answer or keywords.
export function searchTopics(query: string): HelpTopic[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return HELP_TOPICS.filter(listed)
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

// IELS Membership: the one place that describes what free accounts and members get. The public /membership page, the
// dashboard and the FAQ read from here, so a promise is changed in one place. Access itself is enforced in the database
// (supabase/migrations/20261026000000_membership_platform.sql); this file only describes it.
//
// Status of every commitment below: see docs/MEMBERSHIP-PLATFORM.md. In short:
// - Prices (public.membership_plans) are PROPOSED. They are shown publicly only when NEXT_PUBLIC_MEMBERSHIP_PRICES_PUBLIC
//   is "true", i.e. after the owner approves them; until then the page invites people to the founding-member waitlist.
// - The feedback cap (1 review / 90 days), the 10-opportunity free limit and buddy matching are enforced in code.
// - Member-session frequency is an operational commitment and is NOT stated as a number until approved (APPROVED_CADENCE).

export const PRICES_PUBLIC = process.env.NEXT_PUBLIC_MEMBERSHIP_PRICES_PUBLIC === "true";

// Set to e.g. "At least 2 live sessions a month" once the team commits to a schedule it can keep.
export const APPROVED_CADENCE: string | null = null;

export const FREE_TRACKER_LIMIT = 10;
export const FEEDBACK_WINDOW_DAYS = 90;

export interface Benefit {
  id: string;
  title: string;
  what: string;          // what the member receives
  howOften: string;      // frequency / limit, stated honestly
  howToJoin: string;     // how to use it
  fees?: string;         // anything that costs extra
}

export const MEMBER_BENEFITS: Benefit[] = [
  {
    id: "sessions",
    title: "Live member sessions",
    what: "Small online sessions run by the IELS team: application clinics, interview practice and Q&As about specific programs.",
    howOften: APPROVED_CADENCE ?? "Published in your dashboard at least two weeks ahead. Seats are limited per session.",
    howToJoin: "Register in your dashboard. The join link appears there once you're registered.",
  },
  {
    id: "feedback",
    title: "Written feedback on one application document",
    what: "A written review of your CV, motivation letter, scholarship essay or interview answers, with concrete suggestions.",
    howOften: `One review every ${FEEDBACK_WINDOW_DAYS} days while you're a member. We aim to reply within 7 days.`,
    howToJoin: "Share a Google Doc link from your dashboard and tell us what you're applying for.",
  },
  {
    id: "buddy",
    title: "A study buddy with the same goal",
    what: "We introduce you to another member working toward a similar destination or program, so you can keep each other on track.",
    howOften: "Matching is done by the team in rounds. If there's no good match yet, you stay in the queue and we tell you.",
    howToJoin: "Tell us your goal in your dashboard. You can pause matching at any time.",
  },
  {
    id: "community",
    title: "Private member group",
    what: "A members-only group for questions, accountability check-ins and sharing what you're applying to.",
    howOften: "Always on. Moderated by the IELS team.",
    howToJoin: "The invite link is in your dashboard while your membership is active. We remove access when it ends.",
  },
  {
    id: "tracker",
    title: "Unlimited opportunity tracking",
    what: "Save and track as many opportunities as you like, from saved to applied to result, with your own deadlines and notes.",
    howOften: `Free accounts can track ${FREE_TRACKER_LIMIT}.`,
    howToJoin: "Use Save on any opportunity, then manage them in your dashboard.",
  },
];

export const FREE_FEATURES: { title: string; text: string }[] = [
  { title: "The opportunity board", text: "Every listing, filters, and the official link for each program." },
  { title: `Track up to ${FREE_TRACKER_LIMIT} opportunities`, text: "Save, set your own deadline and note where you are in the application." },
  { title: "IELS Circle", text: "The open weekly speaking sessions stay free, as they are today." },
  { title: "Free resources", text: "Guides and checked links for scholarships, CVs, interviews and studying abroad." },
  { title: "Your profile and the member directory", text: "Share your goals and find people heading the same way (you choose what's visible)." },
  { title: "Public events", text: "Register for open IELS events and info sessions." },
];

// Rows for the comparison table.
export const COMPARISON: { feature: string; free: string | boolean; member: string | boolean }[] = [
  { feature: "Opportunity board and filters", free: true, member: true },
  { feature: "Track opportunities", free: `Up to ${FREE_TRACKER_LIMIT}`, member: "Unlimited" },
  { feature: "IELS Circle weekly sessions", free: true, member: true },
  { feature: "Free resources", free: true, member: true },
  { feature: "Member directory", free: true, member: true },
  { feature: "Live member sessions (clinics, interview practice)", free: false, member: true },
  { feature: "Written feedback on an application document", free: false, member: `1 every ${FEEDBACK_WINDOW_DAYS} days` },
  { feature: "Study buddy matching", free: false, member: true },
  { feature: "Private member group", free: false, member: true },
];

// What membership does NOT include or promise. Shown on the page, word for word.
export const NOT_INCLUDED = [
  "IELS Courses, the Global Impact Fellowship and other paid programs are priced separately.",
  "Elco AI (our English-practice app) is a separate product with its own free and paid plans.",
  "We don't guarantee scholarships, admissions, jobs, visas or selection into any program. We help you find opportunities and prepare strong applications; the decision is always the program's.",
  "Mentoring by named experts isn't part of membership yet. When we add it, we'll say exactly who, when and how often.",
];

export const MEMBERSHIP_FAQ: { q: string; a: string }[] = [
  { q: "Does my membership renew automatically?", a: "No. You pay once for 3 or 12 months. Before it ends, we remind you in your dashboard and you choose whether to renew. Nothing is charged automatically." },
  { q: "How do I pay?", a: "Through Midtrans, a licensed Indonesian payment gateway: bank transfer (virtual account), e-wallets and cards, depending on what Midtrans offers for your account. Your membership starts once Midtrans confirms the payment to us, usually within minutes." },
  { q: "What happens right after I pay?", a: "Your dashboard switches to member mode: you'll see the member group link, upcoming member sessions, the feedback request form and buddy matching." },
  { q: "If I renew early, do I lose days?", a: "No. A renewal starts when your current period ends." },
  { q: "What if something goes wrong with my payment?", a: "Email hello@ielsco.com with your order number (it's in your dashboard). If you were charged twice, we refund the duplicate. When a payment is refunded, the access it bought ends." },
  { q: "Is IELS Circle still free?", a: "Yes. The weekly Circle sessions stay open to everyone with a free account. Membership adds smaller, more focused sessions and personal support." },
  { q: "Is Elco AI included?", a: "No. Elco AI is a separate English-practice product with its own plans. Many members use both: IELS for opportunities and people, Elco for daily English practice." },
];

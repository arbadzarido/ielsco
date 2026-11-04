// IELSco membership = Elco AI membership. IELSco has NO independent membership subscription and sells no membership.
// Paid benefits come only from an Elco AI subscription (Starter or Pro), which Elco syncs to IELSco server to server
// (supabase/migrations/20261105000000_elco_benefits.sql, route /api/integrations/elco/benefits). A member reaches them by
// linking their Elco account to their IELSco account (never matched by email). The database decides who has benefits
// (public.my_elco_benefits()); this file only describes them, so a promise is changed in one place.
//
// The legacy "IELS Member" checkout (Midtrans, 3/12-month plans) is retired as a purchase path. Its code and data stay in
// the repo, and anyone who already holds an active legacy period keeps the member tools until it ends.
import { ELCO_URL } from "@/lib/elco";

/** Elco's real subscription flow (same destination the dashboard uses: see src/lib/elco-next.ts). */
export const ELCO_PRICING_URL = `${ELCO_URL}/pricing?program=learning&from=ielsco`;
/** Elco starts the account-linking flow; it ends on IELSco's consent screen at /connect/elco. */
export const ELCO_LINK_URL = `${ELCO_URL}/connect/ielsco`;

export const FREE_TRACKER_LIMIT = 10;
export const FEEDBACK_WINDOW_DAYS = 90;

export interface ElcoPlanBenefits {
  id: "starter" | "pro";
  name: string;
  tagline: string;
  elco: string;       // what the Elco plan itself includes (no feature list is invented here)
  ielsco: string[];   // what reaches the member on IELSco
}

export const ELCO_PLANS: ElcoPlanBenefits[] = [
  {
    id: "starter",
    name: "Elco Starter",
    tagline: "Elco AI Starter features plus the IELS Circle speaking club.",
    elco: "Elco AI Starter features",
    ielsco: ["IELS Circle speaking club: 12 sessions per month"],
  },
  {
    id: "pro",
    name: "Elco Pro",
    tagline: "Elco AI Pro features, the IELS Circle speaking club and monthly mentoring.",
    elco: "Elco AI Pro features",
    ielsco: ["IELS Circle speaking club: no monthly cap", "Mentoring: 4 sessions a month (one a week)"],
  },
];

export const FREE_FEATURES: { title: string; text: string }[] = [
  { title: "The opportunity board", text: "Every listing, filters, and the official link for each program." },
  { title: `Track up to ${FREE_TRACKER_LIMIT} opportunities`, text: "Save, set your own deadline and note where you are in the application." },
  { title: "IELS Circle open sessions", text: "The open weekly speaking sessions stay free, as they are today." },
  { title: "Free resources", text: "Guides and checked links for scholarships, CVs, interviews and studying abroad." },
  { title: "Your profile and the member directory", text: "Share your goals and find people heading the same way (you choose what's visible)." },
  { title: "Public events", text: "Register for open IELS events and info sessions." },
];

// Rows for the comparison table: free IELSco account, Elco Starter, Elco Pro.
export const COMPARISON: { feature: string; free: string | boolean; starter: string | boolean; pro: string | boolean }[] = [
  { feature: "Opportunity board and filters", free: true, starter: true, pro: true },
  { feature: "IELS Circle open weekly sessions", free: true, starter: true, pro: true },
  { feature: "Free resources", free: true, starter: true, pro: true },
  { feature: "Elco AI features", free: "Elco free plan", starter: "Starter features", pro: "Pro features" },
  { feature: "IELS Circle speaking club", free: false, starter: "12 sessions a month", pro: "No monthly cap" },
  { feature: "Mentoring sessions", free: false, starter: false, pro: "4 a month (one a week)" },
];

// What this does NOT include or promise. Shown on the page, word for word.
export const NOT_INCLUDED = [
  "IELSco does not sell a membership of its own. Benefits come only from an active Elco Starter or Pro subscription.",
  "Benefits reach your IELSco account only after you link your Elco account. We never match accounts by email.",
  "Private tutoring is separate: Rp90,000 per session, requested per session. It is not part of an Elco plan.",
  "We don't guarantee scholarships, admissions, jobs, visas or selection into any program. We help you find opportunities and prepare strong applications; the decision is always the program's.",
];

export const HOW_BENEFITS_REACH_IELSCO: { title: string; text: string }[] = [
  { title: "Subscribe in Elco AI", text: "Choose Elco Starter or Elco Pro on the Elco pricing page. Payment and billing are handled by Elco." },
  { title: "Link your Elco account", text: "Sign in to IELSco and link the same Elco account on the consent screen. It takes a minute and you can revoke it in Settings." },
  { title: "Benefits sync automatically", text: "Elco tells IELSco about your plan. Your speaking club and mentoring sessions then appear in your IELSco dashboard." },
  { title: "Register for sessions", text: "Open Membership in your dashboard, pick a session and register. Monthly counts renew on the 1st (WIB)." },
];

export const MEMBERSHIP_FAQ: { q: string; a: string }[] = [
  { q: "Does IELSco have its own membership?", a: "No. IELSco has no independent membership subscription. Paid benefits on IELSco come from an Elco AI subscription (Starter or Pro), which is synced to your IELSco account." },
  { q: "What does Elco Starter include on IELSco?", a: "Elco AI Starter features plus the IELS Circle speaking club, 12 sessions per month." },
  { q: "What does Elco Pro include on IELSco?", a: "Elco AI Pro features plus the IELS Circle speaking club with no monthly cap, and 4 mentoring sessions a month (one a week)." },
  { q: "How do I get my benefits on IELSco?", a: "Subscribe in Elco AI, then link your Elco account with your IELSco account. Benefits sync automatically after that. If you subscribed first, they attach as soon as you link." },
  { q: "I don't have an Elco plan. Do I lose anything?", a: "No. The opportunity board, open IELS Circle sessions, free resources and public events stay free on a free IELSco account." },
  { q: "What if I cancel or get a refund on Elco?", a: "The benefits follow your Elco subscription. When it ends or is refunded, the paid benefits on IELSco end with it." },
  { q: "Is IELS Circle still free?", a: "Yes. The open weekly Circle sessions stay available with a free account. Starter and Pro add the speaking club sessions described above." },
  { q: "Can I get a private tutor?", a: "Yes. Private human tutoring is available at Rp90,000 per session, requested per session on WhatsApp. It is separate from Elco plans." },
];

// IELScourse product lines: Collective (public group), Studio (small group), One (private 1-on-1).
// Prices approved by the founder on 22 Nov 2026. One's packages and payment rules live in src/components/tutoring/packages.ts
// and src/lib/tutoring/payments.ts and are unchanged. Collective and Studio are monthly memberships assigned to a cohort by the
// IELSco team; registration is by WhatsApp until the cohort dashboard ships (see docs/IELSCOURSE-ARCHITECTURE.md).
import { WHATSAPP_URL } from "@/data/courses";

export const COLLECTIVE_MONTHLY_IDR = 199000;
export const STUDIO_MONTHLY_IDR = 399000;

export type ProductId = "collective" | "studio" | "one";

export const IELSCOURSE_TAGLINE = "Learn English. Practice Daily. Connect Globally.";

export const PRODUCT_CARDS = [
  {
    id: "collective" as const, name: "Collective", kind: "Public Group Classes", anchor: "#collective", cta: "Explore Collective",
    price: "Rp199,000", per: "per month",
    points: ["3 live classes a week", "Structured General English curriculum", "Group conversation practice", "Elco AI included while you are a member", "IELS Circle included"],
  },
  {
    id: "studio" as const, name: "Studio", kind: "Semi-Private Small Group", anchor: "#studio", cta: "Explore Studio",
    price: "Rp399,000", per: "per month",
    points: ["4 live sessions a month", "3 to 5 students per group", "More personal tutor attention", "Structured learning plan", "Elco AI included while you are a member", "IELS Circle included"],
  },
  {
    id: "one" as const, name: "One", kind: "Private 1-on-1 Tutoring", anchor: "#one", cta: "Explore Private Tutoring",
    price: "From Rp179,000", per: "per package",
    points: ["Personalised learning with a dedicated mentor", "You propose times, your mentor confirms", "Personal learning roadmap and feedback", "1 month of Elco AI included", "IELS Circle access with your package"],
  },
];

export const COMPARISON_ROWS: { feature: string; collective: string; studio: string; one: string }[] = [
  { feature: "Learning format", collective: "Public group", studio: "Small group", one: "1-on-1" },
  { feature: "Group size", collective: "Up to 20", studio: "3 to 5", one: "1" },
  { feature: "Live sessions", collective: "3 a week (target 12 a month)", studio: "1 a week (target 4 a month)", one: "By package: 2, 4 or 8" },
  { feature: "Personalised learning", collective: "Group level", studio: "More focused", one: "Fully individual" },
  { feature: "Tutor feedback", collective: "Class level", studio: "More individual", one: "Personalised" },
  { feature: "Learning roadmap", collective: "General curriculum", studio: "Group learning plan", one: "Individual roadmap" },
  { feature: "Elco AI", collective: "While membership is active", studio: "While membership is active", one: "1 month" },
  { feature: "IELS Circle", collective: "Included", studio: "Included", one: "With your package" },
  { feature: "Pricing", collective: "Rp199,000 a month", studio: "Rp399,000 a month", one: "Rp179,000 / 329,000 / 599,000 per package" },
];

export const PATHS: { id: ProductId; name: string; text: string; cta: string; anchor: string }[] = [
  { id: "collective", name: "Collective", text: "Choose this if you want affordable, structured group learning and regular English practice.", cta: "Join Collective", anchor: "#collective" },
  { id: "studio", name: "Studio", text: "Choose this if you want a smaller group and more personal interaction with a tutor.", cta: "Join Studio", anchor: "#studio" },
  { id: "one", name: "One", text: "Choose this if you need individual attention, personalised feedback, or focused preparation for a specific goal.", cta: "Start Private Tutoring", anchor: "#one" },
];

export function joinUrl(p: "collective" | "studio") {
  const name = p === "collective" ? "Collective (Rp199,000/month)" : "Studio (Rp399,000/month)";
  const msg = `Hi IELSco, I'd like to join IELScourse ${name}. My English level and goal: `;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`;
}
export function waitlistUrl(p: "collective" | "studio") {
  const msg = `Hi IELSco, please add me to the waiting list for the next IELScourse ${p === "collective" ? "Collective" : "Studio"} cohort. My preferred days and times: `;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`;
}
export function helpMeChooseUrl() {
  return `${WHATSAPP_URL}?text=${encodeURIComponent("Hi IELSco, I'm not sure whether IELScourse Collective, Studio or One fits me. My goal and level: ")}`;
}

// Elco-Pass badges (docs/IELSCO-PRODUCT-ARCHITECTURE.md §9). Computed from the member's own records every time,
// never stored: a badge exists only while the records behind it exist, so nothing can be awarded by mistake or faked.
// No points, XP or leaderboard by design. Adding a badge = one entry here (the Milestone Hall lists them all).
// Pure functions, unit-tested in tests/me-badges.test.mjs.

import type { MyRecords } from "./records";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  /** How to earn it, in the member's words. */
  how: string;
  group: "speaking" | "consistency" | "learning" | "community" | "opportunities";
  target: number;
  measure: (r: MyRecords) => number | null; // null = can't be measured (e.g. Elco not linked)
}

const pastCircle = (r: MyRecords) => r.activities.filter((a) => a.kind === "circle_session" && a.past).length;
const eventsTaken = (r: MyRecords) =>
  r.activities.filter((a) => a.past && ((a.kind === "ielsco_event" && a.status === "attended") || a.kind === "room" || a.kind === "member_session")).length;
const applied = (r: MyRecords) => r.tracked.filter((t) => ["applied", "accepted", "not_selected"].includes(t.status)).length;

export const BADGES: BadgeDef[] = [
  { id: "first-voice", name: "First Voice", group: "speaking", target: 1, measure: pastCircle,
    description: "Checked in to your first IELS Circle session.", how: "Check in to an IELS Circle session (Events → IELS Circle)." },
  { id: "circle-regular", name: "Circle Regular", group: "consistency", target: 4, measure: pastCircle,
    description: "Checked in to four IELS Circle sessions.", how: "Check in to 4 IELS Circle sessions." },
  { id: "consistency-star", name: "Consistency Star", group: "consistency", target: 12,
    measure: (r) => (r.elco?.linked ? r.elco.practice_count_30d : null),
    description: "Practised with Elco AI at least 12 times in 30 days.", how: "Link Elco AI in Elco-Pass and practise 12 times within 30 days." },
  { id: "fearless-speaker", name: "Fearless Speaker", group: "speaking", target: 1, measure: (r) => r.roomsHosted,
    description: "Hosted a community session for other members.", how: "Host a community event in Events → Other Events." },
  { id: "word-collector", name: "Word Collector", group: "learning", target: 10, measure: (r) => r.bookmarks,
    description: "Built a shelf of 10 saved learning items.", how: "Save 10 materials, stories or collections." },
  { id: "rising-star", name: "Rising Star", group: "opportunities", target: 1, measure: applied,
    description: "Sent your first application.", how: "Mark an opportunity as Applied in your tracker." },
  { id: "community-builder", name: "Community Builder", group: "community", target: 5, measure: (r) => r.connections,
    description: "Five connections in the IELSco community.", how: "Connect with 5 members through Letter Intros." },
  { id: "global-connector", name: "Global Connector", group: "community", target: 3, measure: eventsTaken,
    description: "Took part in 3 events with people across the region.", how: "Take part in 3 IELSco or community events." },
];

export interface BadgeState {
  def: BadgeDef;
  value: number | null;
  earned: boolean;
}

export function badgeStates(r: MyRecords): BadgeState[] {
  return BADGES.map((def) => {
    const value = def.measure(r);
    return { def, value, earned: value !== null && value >= def.target };
  });
}

// Elco-Pass stamps: one per thing the member really has, with the same rules the badges use (badges.ts). A registration
// that was never attended is not a stamp; a future session is not a stamp. Newest first within each group.
export interface StampEntry { id: string; group: "circle" | "events" | "opportunities" | "elco"; label: string; title: string; at: Date; href?: string }

export function buildStamps(r: MyRecords): StampEntry[] {
  const out: StampEntry[] = [];
  for (const a of r.activities) {
    if (!a.past) continue;
    if (a.kind === "circle_session") out.push({ id: a.id, group: "circle", label: "Circle", title: a.title, at: a.start, href: a.href });
    else if ((a.kind === "ielsco_event" && a.status === "attended") || a.kind === "room" || a.kind === "member_session")
      out.push({ id: a.id, group: "events", label: a.status === "hosting" ? "Hosted" : "Event", title: a.title, at: a.start, href: a.href });
  }
  for (const t of r.tracked) {
    if (!["applied", "accepted", "not_selected"].includes(t.status)) continue;
    out.push({ id: `tracker-${t.opportunity_id}`, group: "opportunities", label: "Applied", title: t.opportunity?.title ?? "An opportunity", at: new Date(t.updated_at), href: "/dashboard/opportunities" });
  }
  if (r.elco?.linked_at) out.push({ id: "elco-linked", group: "elco", label: "Elco", title: "Linked Elco AI", at: new Date(r.elco.linked_at), href: "/dashboard/connect/elco" });
  return out.filter((s) => !Number.isNaN(s.at.getTime())).sort((a, b) => b.at.getTime() - a.at.getTime());
}

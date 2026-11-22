// Short tips Elco shows during longer waits (ElcoLoader), the IELSco set. Mirrors the shape of Elco AI's
// lib/loadingTips.js; the content is IELSco's own. Every tip is either general application/English advice or a real
// IELSco feature worded from the site's own pages (data/membership.ts, lib/circle/sessions.ts, the opportunity and
// search pages). No invented facts or numbers, no motivational filler.
export type TipKind = "Applications" | "English" | "IELSco";
export type Tip = { kind: TipKind; text: string };
import type { TipContext } from "./tipContext.ts";
export type { TipContext } from "./tipContext.ts";

export const TIPS: Record<TipContext, Tip[]> = {
  opportunities: [
    { kind: "Applications", text: "Read the official page before you apply: eligibility and dates can change from one cycle to the next." },
    { kind: "Applications", text: "Start the documents early. Recommendation letters and transcripts usually take the longest to get." },
    { kind: "Applications", text: "A motivation letter answers three things: why this programme, why you, and what you will do with it." },
    { kind: "Applications", text: "Keep one master CV, then trim it to fit each application instead of rewriting it every time." },
    { kind: "IELSco", text: "Save an opportunity to track your own deadline and note where you are in the application." },
    { kind: "IELSco", text: "Every listing links to the official page and says what IELSco has checked, and when." },
  ],
  learning: [
    { kind: "English", text: "Use the present perfect for experiences without a time (“I've visited Bali”), and the past with a time (“I visited Bali in 2024”)." },
    { kind: "English", text: "“Since” goes with a starting point (since Monday); “for” goes with a length of time (for three days)." },
    { kind: "English", text: "Uncountable nouns like advice, information and furniture have no plural: “some useful advice”, not “advices”." },
    { kind: "English", text: "You make a plan, a mistake or a decision; you do homework, research or the dishes." },
    { kind: "IELSco", text: "Free resources lists guides and official sites for scholarships, CVs and essays, interviews and studying abroad." },
  ],
  community: [
    { kind: "English", text: "Stuck for a word while speaking? Describe it: “It's the thing you use to…”. Keeping the conversation going matters more than the perfect word." },
    { kind: "English", text: "Short fillers like “Let me think…” give you time to find the next sentence without an awkward silence." },
    { kind: "IELSco", text: "IELS Circle meets every Wednesday at 19:00 and every Saturday at 13:00, Jakarta time (WIB)." },
    { kind: "IELSco", text: "People appear in Discover only if they chose to be listed." },
  ],
  events: [
    { kind: "English", text: "Before a talk, note two questions you could ask. Asking one is an easy way to practise speaking up." },
    { kind: "IELSco", text: "IELS Circle meets every Wednesday at 19:00 and every Saturday at 13:00, Jakarta time (WIB)." },
    { kind: "Applications", text: "Check the time zone of an event before you plan around it." },
  ],
  general: [
    { kind: "English", text: "“Fewer” is for things you count (fewer mistakes); “less” is for amounts (less time)." },
    { kind: "English", text: "“Its” shows possession (the app and its features); “it's” means “it is” or “it has”." },
    { kind: "Applications", text: "Nobody can guarantee selection or placement: the decision is always the programme's or the employer's." },
    { kind: "IELSco", text: "Save opportunities to track your deadlines for free." },
  ],
};

/** A tip for a context, rotating so the same person doesn't see the same one twice in a row. */
let last = -1;
export function pickTip(context: TipContext = "general", rng: () => number = Math.random): Tip {
  const pool = [...(TIPS[context] || []), ...(context === "general" ? [] : TIPS.general)];
  let i = Math.floor(rng() * pool.length);
  if (pool.length > 1 && i === last) i = (i + 1) % pool.length;
  last = i;
  return pool[i];
}

export { tipContextFor } from "./tipContext.ts";

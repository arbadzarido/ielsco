// Elco AI: a separate English learning app, developed and operated by PT Elco Edukasi Berkah Indonesia, a subsidiary of
// PT English Space Berkah Indonesia (IELSco). IELSco only links to it; no Elco UI lives here.
// Elco entry points (callouts, sidebar promo, tour step, Connected apps) stay hidden until Elco is deployed.
// Turn on per environment with NEXT_PUBLIC_ELCO_ENABLED=true.
export const ELCO_ENABLED = process.env.NEXT_PUBLIC_ELCO_ENABLED === "true";

// The Elco app host for signed-in integration flows (account-linking callback, Elco settings/progress links). Sessions
// are per host, so this moves only together with Elco's auth redirect URLs. Override with NEXT_PUBLIC_ELCO_URL.
// The old host ai.ielsco.com no longer serves Elco, so the default is the app on www.elcoai.com.
export const ELCO_URL = (process.env.NEXT_PUBLIC_ELCO_URL || "https://www.elcoai.com").replace(/\/+$/, "");
// Elco's official public website: every marketing link (home, footer, programs, callouts) goes here.
export const ELCO_SITE_URL = "https://www.elcoai.com";

// The Elco robot is the mascot for both IELSco and Elco (public/images/contents/mascot/). The old owl is retired.
export const ELCO_MASCOT = "/images/contents/mascot/elco.svg";
export const ELCO_MASCOT_WAVE = "/images/contents/mascot/hi.svg";

/** Link to Elco's public site with a `ref` so Elco can tell where the visit came from (no personal data). */
export function elcoHref(ref: string, path = "") {
  return `${ELCO_SITE_URL}${path || "/"}?ref=${encodeURIComponent(`ielsco-${ref}`)}`;
}

// Contextual practice: where an IELSco page has a natural English task, a CTA points to the Elco page that practises it
// (docs/IELSCO-PRODUCT-ARCHITECTURE.md §7). Paths are real Elco routes; Elco asks visitors to sign in where needed.
export type ElcoContext =
  | "scholarship" | "internship" | "job" | "fellowship" | "exchange" | "competition"
  | "article" | "podcast" | "video" | "circle_before" | "circle_after" | "talk" | "workshop";

export const ELCO_PRACTICE: Record<ElcoContext, { title: string; body: string; cta: string; path: string }> = {
  scholarship: { title: "Prepare for the scholarship interview", body: "Rehearse answers about your goals and motivation with Elco, and get feedback on clarity.", cta: "Practise interview answers", path: "/roleplay" },
  internship: { title: "Get ready for professional English", body: "Practise emails, introductions and short updates you'll use at work.", cta: "Practise workplace English", path: "/coach" },
  job: { title: "Run a mock interview", body: "Answer common interview questions out loud and see what to improve.", cta: "Start a mock interview", path: "/roleplay" },
  fellowship: { title: "Practise presenting your project", body: "Explain your idea in two minutes and get feedback on structure and fluency.", cta: "Practise presenting", path: "/learn/skill/speaking" },
  exchange: { title: "Practise everyday conversations abroad", body: "Small talk, asking for help and introducing yourself, before you go.", cta: "Practise speaking", path: "/learn/skill/speaking" },
  competition: { title: "Sharpen your writing", body: "Practise clear, structured writing for submissions and pitches.", cta: "Practise writing", path: "/learn/skill/writing" },
  article: { title: "Learn the words from this read", body: "Practise reading and the vocabulary that comes with topics like this one.", cta: "Practise reading", path: "/learn/skill/reading" },
  podcast: { title: "Train your listening", body: "Short listening practice with questions, at your level.", cta: "Practise listening", path: "/learn/skill/listening" },
  video: { title: "Say it yourself", body: "Practise speaking about what you just watched, with feedback.", cta: "Practise speaking", path: "/learn/skill/speaking" },
  circle_before: { title: "Warm up before the session", body: "Five minutes of speaking practice so you walk in ready to talk.", cta: "Warm up with Elco", path: "/learn/skill/speaking" },
  circle_after: { title: "Keep practising after Circle", body: "Turn what came up in the session into a short practice round.", cta: "Practise with Elco", path: "/practice" },
  talk: { title: "Practise listening to real talks", body: "Listening practice on longer, real-world English.", cta: "Practise listening", path: "/learn/skill/listening" },
  workshop: { title: "Practise what the workshop covers", body: "A short practice round on the same skills, at your own pace.", cta: "Practise with Elco", path: "/practice" },
};

export const OPPORTUNITY_ELCO_CONTEXT: Record<string, ElcoContext> = {
  scholarship: "scholarship", program: "scholarship", fellowship: "fellowship", conference: "fellowship", exchange: "exchange",
  competition: "competition", internship: "internship", volunteering: "internship", job: "job",
};

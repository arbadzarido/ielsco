// Elco AI: a separate English learning app, developed and operated by PT Elco Edukasi Berkah Indonesia (IELSco is
// PT English Space Berkah Indonesia; the companies share a founder). IELSco only links to it; no Elco UI lives here.
// Elco entry points (callouts, sidebar promo, tour step, Connected apps) stay hidden until Elco is deployed.
// Turn on per environment with NEXT_PUBLIC_ELCO_ENABLED=true.
export const ELCO_ENABLED = process.env.NEXT_PUBLIC_ELCO_ENABLED === "true";

// The Elco app host for signed-in integration flows (account-linking callback, Elco settings/progress links). Sessions
// are per host, so this moves only together with Elco's auth redirect URLs. Override with NEXT_PUBLIC_ELCO_URL.
export const ELCO_URL = (process.env.NEXT_PUBLIC_ELCO_URL || "https://ai.ielsco.com").replace(/\/+$/, "");
// Elco's official public website: every marketing link (home, footer, programs, callouts) goes here.
export const ELCO_SITE_URL = "https://www.elcoai.com";

// The Elco robot is the mascot for both IELSco and Elco (public/images/contents/mascot/). The old owl is retired.
export const ELCO_MASCOT = "/images/contents/mascot/elco.svg";
export const ELCO_MASCOT_WAVE = "/images/contents/mascot/hi.svg";

/** Link to Elco's public site with a `ref` so Elco can tell where the visit came from (no personal data). */
export function elcoHref(ref: string, path = "") {
  return `${ELCO_SITE_URL}${path || "/"}?ref=${encodeURIComponent(`ielsco-${ref}`)}`;
}

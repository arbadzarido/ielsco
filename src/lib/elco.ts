// Elco AI (separate product at ai.ielsco.com). IELSco only links to it; no Elco practice UI lives here.
// Override per environment (local / staging) with NEXT_PUBLIC_ELCO_URL.
// Elco entry points (callouts, sidebar promo, tour step, Connected apps) stay hidden until Elco is deployed.
// Turn on per environment with NEXT_PUBLIC_ELCO_ENABLED=true.
export const ELCO_ENABLED = process.env.NEXT_PUBLIC_ELCO_ENABLED === "true";

export const ELCO_URL = (process.env.NEXT_PUBLIC_ELCO_URL || "https://ai.ielsco.com").replace(/\/+$/, "");

// Original IELSco mascot artwork (public/images/contents/mascot/).
export const ELCO_MASCOT = "/images/contents/mascot/elco.svg";
export const ELCO_MASCOT_WAVE = "/images/contents/mascot/hi.svg";

/** Link to Elco with a `ref` so Elco can tell where the visit came from (no personal data). */
export function elcoHref(ref: string, path = "") {
  return `${ELCO_URL}${path}?ref=${encodeURIComponent(`ielsco-${ref}`)}`;
}

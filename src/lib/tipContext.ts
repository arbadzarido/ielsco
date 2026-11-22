// Which set of loading tips fits the page that is loading (its own tiny file, so the loader does not carry the tips).
export type TipContext = "opportunities" | "learning" | "community" | "events" | "general";

/** The tip context for a route (so the loader fits the page). */
export function tipContextFor(pathname = ""): TipContext {
  if (/^\/(dashboard\/(discover|opportunities|programs|search|shelf)|opportunities|products\/resources|resources)/.test(pathname)) return "opportunities";
  if (/^\/(dashboard\/(learning|my-learning|explore|test)|products|school|quiz)/.test(pathname)) return "learning";
  if (/^\/(dashboard\/(connect|people|social|circles|community)|circle|connect)/.test(pathname)) return "community";
  if (/^\/(dashboard\/(events|circle|gif)|events)/.test(pathname)) return "events";
  return "general";
}

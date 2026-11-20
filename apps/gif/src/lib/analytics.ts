import "server-only";
import { q } from "./db";

// Server-side funnel events carry no identifier (no account, email, IP or session): only the event, pathway and
// a few non-personal properties. Browser events (page views, Apply clicks) are recorded by /api/analytics only after
// the visitor accepts analytics cookies.
export const CLIENT_EVENTS = ["page_view", "apply_click", "explore_click", "pathway_view", "pathway_select", "application_start", "sponsorship_submit"] as const;

export async function recordServerEvent(event: string, props: Record<string, string | number | null | undefined> = {}, country?: string | null) {
  try {
    const { pathway, ...rest } = props;
    await q(`insert into gif.analytics_events (cohort_id, event, pathway, country, props)
             select id, $1, $2, $3, $4 from gif.cohorts where is_current`, [event, pathway ?? null, country ?? null, JSON.stringify(rest)]);
  } catch (e) {
    console.error("[gif] analytics event failed", (e as Error).message);
  }
}

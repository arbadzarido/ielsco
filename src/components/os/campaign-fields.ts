// Shared definitions for campaigns (os_campaigns) and content items (os_campaign_items): columns, row types and
// the form fields used by the Marketing pages.
import { CAMPAIGN_PLAN_STATUSES, CAMPAIGN_STATUSES, SENSITIVITIES } from "@/lib/os/meta";

export type ContentItem = { id: string; company_code: string; division_id: string | null; campaign: string | null; campaign_id: string | null; title: string; audience: string | null; objective: string | null; channel: string | null;
  format: string | null; pillar: string | null; planned_publish_date: string | null; publish_at: string | null; production_deadline: string | null; owner_person_id: string | null; creator_person_id: string | null; reviewer_person_id: string | null;
  status: string; actual_publish_date: string | null; brief: string | null; asset_url: string | null; call_to_action: string | null; published_link: string | null; kpi_id: string | null; related_project_id: string | null;
  results: string | null; review: string | null; sensitivity: string };
export const CONTENT_COLS = "id, company_code, division_id, campaign, campaign_id, title, audience, objective, channel, format, pillar, planned_publish_date, publish_at, production_deadline, owner_person_id, creator_person_id, reviewer_person_id, status, actual_publish_date, brief, asset_url, call_to_action, published_link, kpi_id, related_project_id, results, review, sensitivity";
export type Campaign = { id: string; company_code: string; division_id: string | null; name: string; objective: string | null; description: string | null; owner_person_id: string | null; start_date: string | null; end_date: string | null;
  status: string; project_id: string | null; timeline_item_id: string | null; kpi_id: string | null; sensitivity: string };
export const CAMPAIGN_COLS = "id, company_code, division_id, name, objective, description, owner_person_id, start_date, end_date, status, project_id, timeline_item_id, kpi_id, sensitivity";

export function contentFields(campaigns: { id: string; name: string }[]) {
  return [
    { key: "title", label: "Title", required: true }, { key: "campaign_id", label: "Campaign", kind: "select" as const, options: campaigns.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` })) },
    { key: "channel", label: "Channel", hint: "Instagram, TikTok, email, website…" }, { key: "format", label: "Format" }, { key: "pillar", label: "Content pillar" },
    { key: "audience", label: "Audience" }, { key: "objective", label: "Objective" },
    { key: "status", label: "Status", kind: "select" as const, options: CAMPAIGN_STATUSES, required: true },
    { key: "owner_person_id", label: "Owner", kind: "person" as const }, { key: "creator_person_id", label: "Creator", kind: "person" as const }, { key: "reviewer_person_id", label: "Reviewer", kind: "person" as const },
    { key: "production_deadline", label: "Production deadline", kind: "date" as const }, { key: "planned_publish_date", label: "Planned publish", kind: "date" as const },
    { key: "actual_publish_date", label: "Published on", kind: "date" as const }, { key: "brief", label: "Brief", kind: "textarea" as const }, { key: "asset_url", label: "Asset link" }, { key: "published_link", label: "Published link" },
    { key: "call_to_action", label: "Call to action" }, { key: "results", label: "Results", kind: "textarea" as const, hint: "Only figures you've read from the platform." },
    { key: "review", label: "What we learned", kind: "textarea" as const }, { key: "division_id", label: "Division", kind: "division" as const },
    { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: SENSITIVITIES, required: true },
  ];
}
export const campaignFields = [
  { key: "name", label: "Name", required: true }, { key: "objective", label: "Objective", kind: "textarea" as const }, { key: "description", label: "Description", kind: "textarea" as const },
  { key: "status", label: "Status", kind: "select" as const, options: CAMPAIGN_PLAN_STATUSES, required: true }, { key: "owner_person_id", label: "Owner", kind: "person" as const },
  { key: "start_date", label: "Starts", kind: "date" as const }, { key: "end_date", label: "Ends", kind: "date" as const }, { key: "project_id", label: "Project ID", hint: "For example PRJ-0003." },
  { key: "timeline_item_id", label: "Timeline milestone ID", hint: "For example TL-0012." }, { key: "division_id", label: "Division", kind: "division" as const },
  { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: SENSITIVITIES, required: true },
];


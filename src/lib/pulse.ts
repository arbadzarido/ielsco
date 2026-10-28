// IELSco Pulse: one feed over content IELSco already curates. Nothing here is generated or scraped.
//   opportunity  public.opportunities (published; verification + checked date from the board)
//   story        published Member Stories (public.published_member_stories)
//   resource     the curated external resources (data/dashboard/resources.ts; placeholder templates excluded)
// External items always link to their original source.
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import { CATEGORY_LABEL, deadlineState, OPP_COLUMNS, type Opportunity } from "@/lib/opportunities";
import type { PublicStory } from "@/lib/stories/types";
import type { Accent } from "@/components/dashboard/ui";

export type PulseKind = "opportunity" | "story" | "guide" | "video" | "growth";

export interface PulseItem {
  id: string;
  kind: PulseKind;
  title: string;
  summary: string;
  source: string;
  label: string; // editorial label: "Official opportunity", "Member story", "External resource"
  date: string | null; // ISO date: published (stories), checked (opportunities, resources)
  dateLabel: string;
  href: string;
  external: boolean;
  image?: string;
  badge?: string;
  closed?: boolean;
}

export const PULSE_KINDS: { value: PulseKind; label: string; accent: Accent }[] = [
  { value: "opportunity", label: "Opportunities", accent: "amber" },
  { value: "story", label: "Member stories", accent: "coral" },
  { value: "guide", label: "Articles & guides", accent: "teal" },
  { value: "video", label: "Videos & podcasts", accent: "violet" },
  { value: "growth", label: "English & growth", accent: "green" },
];
export const kindAccent = (k: PulseKind) => PULSE_KINDS.find((x) => x.value === k)!.accent;

const RESOURCE_KIND: Record<string, PulseKind> = {
  Article: "guide", "Official page": "guide", Template: "guide", Video: "video", Podcast: "video", Website: "growth", Course: "growth", Tool: "growth",
};

export function resourceItems(): PulseItem[] {
  return DEMO_RESOURCES.filter((r) => r.origin === "curated" && r.url).map((r) => ({
    id: `resource:${r.id}`, kind: RESOURCE_KIND[r.type] ?? "guide", title: r.title, summary: r.description, source: r.source,
    label: "External resource", date: r.linkCheckedOn, dateLabel: r.linkCheckedOn ? "Link checked" : "", href: r.url!, external: true,
    badge: `${r.type} · ${r.level}${r.isFree ? " · Free" : ""}`,
  }));
}

export function storyItems(stories: PublicStory[]): PulseItem[] {
  return stories.map((s) => ({
    id: `story:${s.slug}`, kind: "story", title: s.title, summary: s.summary, source: [s.author.name, s.author.country].filter(Boolean).join(" · "),
    label: "Member story", date: s.sortDate, dateLabel: "Published", href: `/circle/stories/${s.slug}`, external: false, image: s.bannerImage,
  }));
}

export function opportunityItems(rows: Opportunity[], now = new Date()): PulseItem[] {
  return rows.map((o) => ({
    id: `opportunity:${o.slug}`, kind: "opportunity", title: o.title, summary: o.summary, source: o.organizer,
    label: o.is_iels_program ? "IELS program" : "Official opportunity", date: o.checked_on, dateLabel: o.checked_on ? "Checked" : "",
    href: `/opportunities/${o.slug}`, external: false, badge: CATEGORY_LABEL[o.category], closed: deadlineState(o.deadline, now) === "closed",
  }));
}

export async function loadOpportunities(supabase: SupabaseClient): Promise<Opportunity[]> {
  const { data, error } = await supabase.from("opportunities").select(OPP_COLUMNS).eq("status", "published")
    .order("featured", { ascending: false }).order("title");
  if (error) return [];
  return (data ?? []) as Opportunity[];
}

// Newest first by date; open opportunities before closed ones; undated last.
export function sortPulse(items: PulseItem[]) {
  return [...items].sort((a, b) => Number(!!a.closed) - Number(!!b.closed) || (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title));
}

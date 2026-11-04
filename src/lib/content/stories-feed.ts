// News & Stories (Discover): IELSco Stories (official editorial) and Member Stories in one list, both from the single
// stories CMS (public.member_stories through its published views). Client-side read with the member's session.
// Detail pages stay the public ones (/stories/[slug], /circle/stories/[slug]) with their own related stories.

import type { SupabaseClient } from "@supabase/supabase-js";
import { IELSCO_CATEGORY_LABELS, IELSCO_STORY_COLUMNS, rowToIelscoStory, type IelscoCategory, type IelscoStoryRow } from "@/lib/stories/ielsco";
import { PUBLIC_STORY_COLUMNS, rowToStory, sortStories, staticStories, type StoryRow } from "@/lib/stories/types";

export type FeedCategory = IelscoCategory | "member";

export interface FeedStory {
  /** Bookmark id: "ielsco:<slug>" or "member:<slug>". */
  id: string;
  kind: "ielsco" | "member";
  category: FeedCategory;
  categoryLabel: string;
  title: string;
  summary: string;
  author: string;
  /** Verified author identity for the card header (name, optional photo and role from the record; nothing invented). */
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  date: string | null;
  image?: string;
  href: string;
  tags: string[];
}

export async function loadStoriesFeed(supabase: SupabaseClient): Promise<{ items: FeedStory[]; partial: boolean }> {
  const [news, members] = await Promise.all([
    supabase.from("published_ielsco_stories").select(IELSCO_STORY_COLUMNS).eq("lang", "en").order("published_at", { ascending: false }).limit(200),
    supabase.from("published_member_stories").select(PUBLIC_STORY_COLUMNS).order("sort_date", { ascending: false, nullsFirst: false }).limit(200),
  ]);
  const ielsco: FeedStory[] = news.error ? [] : (news.data as unknown as IelscoStoryRow[]).map(rowToIelscoStory).map((s) => ({
    id: `ielsco:${s.slug}`, kind: "ielsco", category: s.category, categoryLabel: IELSCO_CATEGORY_LABELS[s.category].en, title: s.title, summary: s.summary,
    author: s.author.name, authorName: s.author.name, authorRole: s.author.role, date: s.publishedAt || s.date || null, image: s.bannerImage, href: `/stories/${s.slug}`, tags: s.tags,
  }));
  // Member stories fall back to the static list of already-published stories (same as the public Circle stories page).
  const memberRows = members.error ? sortStories(staticStories()) : sortStories((members.data as unknown as StoryRow[]).map(rowToStory));
  const member: FeedStory[] = memberRows.map((s) => ({
    id: `member:${s.slug}`, kind: "member", category: "member", categoryLabel: "Member story", title: s.title, summary: s.summary,
    author: [s.author.name, s.author.country].filter(Boolean).join(" · "), authorName: s.author.name, authorAvatar: s.author.avatar,
    authorRole: s.author.role || s.author.country, date: s.sortDate, image: s.bannerImage, href: `/circle/stories/${s.slug}`, tags: [],
  }));
  const items = [...ielsco, ...member].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { items, partial: !!news.error };
}

export function relatedStories(story: FeedStory, all: FeedStory[], n = 3) {
  return all.filter((s) => s.id !== story.id)
    .map((s) => ({ s, score: (s.category === story.category ? 2 : 0) + s.tags.filter((t) => story.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || (b.s.date ?? "").localeCompare(a.s.date ?? ""))
    .slice(0, n).map((x) => x.s);
}

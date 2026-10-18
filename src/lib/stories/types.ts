// Member Stories: shared types and mapping between database rows (public.member_stories /
// public.published_member_stories) and the shape the public pages render. See
// supabase/migrations/20261019000000_member_stories.sql for the schema and access rules.
import { memberStoriesData, type MemberStory } from "@/data/member-stories";
import { generateSlug } from "@/utils/slug";

export type StoryCategory = "internals" | "circle" | "inspires";
export type StoryStatus = "draft" | "pending_review" | "needs_info" | "published" | "rejected" | "archived";

// One canonical "IELS Circle" filter: the old "IELS Circle Members" (Lounge) and "IELS Circle" (Speakers) merged.
export const CATEGORY_LABELS: Record<StoryCategory, string> = {
  internals: "IELS Internals",
  circle: "IELS Circle",
  inspires: "IELS Inspires",
};
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as StoryCategory[];

export const STORY_TYPES = {
  exchange: "Exchange",
  internship: "Internship",
  study_abroad: "Study abroad",
  competition: "Competition",
  international_program: "International program",
  entrepreneurship: "Entrepreneurship",
  career: "Career",
  community: "Community",
  volunteering: "Volunteering",
  travel: "Travel & culture",
  other: "Other",
} as const;
export type StoryType = keyof typeof STORY_TYPES;

export interface StorySectionData { title: string; content: string; image?: string; quote?: string }
export interface StoryQuoteData { text: string; attribution?: string }
export interface StoryHighlightData { value: string; label: string }
export interface GalleryItemData { image: string; caption?: string; type?: "activity" | "travel" | "event" | "people" | "campus" | "other" }
export interface StorySeo { meta_title?: string; meta_description?: string; meta_keywords?: string }

export interface PublicStory {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: StoryCategory;
  storyType: StoryType;
  author: {
    name: string;
    country?: string;
    location?: string;
    role?: string;
    bio?: string;
    avatar?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  bannerImage?: string;
  legacyContent?: string;
  sections: StorySectionData[];
  quotes: StoryQuoteData[];
  highlights: StoryHighlightData[];
  gallery: GalleryItemData[];
  credits: { writer?: string; designer?: string };
  seo: StorySeo;
  date: string;
  sortDate: string | null;
  location: string;
}

// Row of public.published_member_stories (also a subset of public.member_stories).
export interface StoryRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: StoryCategory;
  story_type: StoryType;
  author_name: string;
  author_country: string | null;
  author_location: string | null;
  author_role: string | null;
  author_bio: string | null;
  author_avatar: string | null;
  social: { instagram?: string; linkedin?: string; website?: string } | null;
  banner_image: string | null;
  legacy_content: string | null;
  sections: StorySectionData[] | null;
  quotes: StoryQuoteData[] | null;
  highlights: StoryHighlightData[] | null;
  gallery: GalleryItemData[] | null;
  credits: { writer?: string; designer?: string } | null;
  seo: StorySeo | null;
  story_date: string | null;
  sort_date: string | null;
  location: string | null;
}

export const PUBLIC_STORY_COLUMNS =
  "id, slug, title, summary, category, story_type, author_name, author_country, author_location, author_role, author_bio, author_avatar, social, banner_image, legacy_content, sections, quotes, highlights, gallery, credits, seo, story_date, sort_date, location";

const opt = (v: string | null | undefined) => (v && v.trim() ? v : undefined);

export function rowToStory(r: StoryRow): PublicStory {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary ?? r.seo?.meta_description ?? "",
    category: r.category,
    storyType: r.story_type ?? "other",
    author: {
      name: r.author_name,
      country: opt(r.author_country),
      location: opt(r.author_location),
      role: opt(r.author_role),
      bio: opt(r.author_bio),
      avatar: opt(r.author_avatar),
      instagram: opt(r.social?.instagram),
      linkedin: opt(r.social?.linkedin),
      website: opt(r.social?.website),
    },
    bannerImage: opt(r.banner_image),
    legacyContent: opt(r.legacy_content),
    sections: Array.isArray(r.sections) ? r.sections : [],
    quotes: Array.isArray(r.quotes) ? r.quotes : [],
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    credits: r.credits ?? {},
    seo: r.seo ?? {},
    date: r.story_date ?? "",
    sortDate: r.sort_date,
    location: r.location ?? "",
  };
}

// --- Static fallback (src/data/member-stories.ts), used only when the database can't be reached --------------------
const LEGACY_CATEGORY: Record<MemberStory["subcategory"], StoryCategory> = {
  Internals: "internals",
  Lounge: "circle",
  Speakers: "circle",
  Inspires: "inspires",
};
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function legacySortDate(d: string): string | null {
  const p = d.replace(",", "").trim().split(/\s+/);
  const m = MONTHS.indexOf((p[0] ?? "").toLowerCase()) + 1;
  if (!m) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return p.length === 3 ? `${p[2]}-${pad(m)}-${pad(Number(p[1]))}` : p.length === 2 ? `${p[1]}-${pad(m)}-01` : null;
}

export function staticStories(): PublicStory[] {
  return memberStoriesData.map((s) => ({
    id: `static-${s.id}`,
    slug: generateSlug(s.title),
    title: s.title,
    summary: s.seo.meta_description,
    category: LEGACY_CATEGORY[s.subcategory],
    storyType: "other",
    author: { ...s.author },
    bannerImage: s.bannerImage,
    legacyContent: s.content,
    sections: s.storySections ?? [],
    quotes: s.quotes ?? [],
    highlights: s.highlights ?? [],
    gallery: s.gallery ?? [],
    credits: s.credits ?? {},
    seo: s.seo,
    date: s.date,
    sortDate: legacySortDate(s.date),
    location: s.location,
  }));
}

export function sortStories(list: PublicStory[]) {
  return [...list].sort((a, b) => (b.sortDate ?? "").localeCompare(a.sortDate ?? "") || a.slug.localeCompare(b.slug));
}

// Stable "related stories": same category first, then the nearest by date, ties by slug. No randomness, so the
// cached page and every visitor see the same list.
export function relatedStories(story: PublicStory, all: PublicStory[], n = 3): PublicStory[] {
  const t = (s: PublicStory) => (s.sortDate ? Date.parse(s.sortDate) : 0);
  return all
    .filter((s) => s.id !== story.id)
    .sort((a, b) =>
      Number(b.category === story.category) - Number(a.category === story.category) ||
      Math.abs(t(a) - t(story)) - Math.abs(t(b) - t(story)) ||
      a.slug.localeCompare(b.slug))
    .slice(0, n);
}

export function storyDescription(s: PublicStory) {
  return s.seo.meta_description || s.summary || `${s.author.name}'s story on IELS Circle.`;
}

export const STORIES_CACHE_TAG = "member-stories";

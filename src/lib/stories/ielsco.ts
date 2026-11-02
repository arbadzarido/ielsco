// IELSco Stories: official IELSco editorial articles, stored in public.member_stories with section = 'ielsco' and read
// through the view public.published_ielsco_stories (published and due). Same CMS, cache tag and revalidation as
// Member Stories (see ./public.ts). Schema: supabase/migrations/20261102100000_ielsco_stories.sql.
import { createClient } from "@supabase/supabase-js";
import { STORIES_CACHE_TAG, type StoryHighlightData, type StoryQuoteData, type StorySectionData, type StorySeo, type GalleryItemData } from "./types";

export type StoryLang = "en" | "id";
export type IelscoCategory = "achievements" | "events" | "partnerships" | "community" | "press" | "insights";

export const IELSCO_CATEGORY_LABELS: Record<IelscoCategory, Record<StoryLang, string>> = {
  achievements: { en: "Achievements & Milestones", id: "Pencapaian & Tonggak" },
  events: { en: "Events & Programs", id: "Acara & Program" },
  partnerships: { en: "Partnerships & Collaborations", id: "Kemitraan & Kolaborasi" },
  community: { en: "Community & Impact", id: "Komunitas & Dampak" },
  press: { en: "Press & Announcements", id: "Rilis & Pengumuman" },
  insights: { en: "Insights & Education", id: "Wawasan & Edukasi" },
};
export const IELSCO_CATEGORIES = Object.keys(IELSCO_CATEGORY_LABELS) as IelscoCategory[];

// Public paths: English at /stories/<slug>, Indonesian at /id/stories/<slug> (both on www.ielsco.com).
export const IELSCO_STORIES_PATH: Record<StoryLang, string> = { en: "/stories", id: "/id/stories" };
export const ielscoStoryPath = (lang: StoryLang, slug: string) => `${IELSCO_STORIES_PATH[lang]}/${slug}`;

export interface IelscoStory {
  id: string;
  slug: string;
  lang: StoryLang;
  title: string;
  summary: string;
  category: IelscoCategory;
  tags: string[];
  author: { name: string; role?: string };
  bannerImage?: string;
  bannerAlt?: string;
  bannerCaption?: string;
  sections: StorySectionData[];
  quotes: StoryQuoteData[];
  highlights: StoryHighlightData[];
  gallery: GalleryItemData[];
  credits: { writer?: string; designer?: string };
  seo: StorySeo;
  date: string;
  location: string;
  publishedAt: string;
  updatedAt: string;
  translationSlug?: string;
}

export interface IelscoStoryRow {
  id: string;
  slug: string;
  lang: StoryLang;
  title: string;
  summary: string | null;
  category: IelscoCategory;
  tags: string[] | null;
  author_name: string;
  author_role: string | null;
  banner_image: string | null;
  banner_alt: string | null;
  banner_caption: string | null;
  sections: StorySectionData[] | null;
  quotes: StoryQuoteData[] | null;
  highlights: StoryHighlightData[] | null;
  gallery: GalleryItemData[] | null;
  credits: { writer?: string; designer?: string } | null;
  seo: StorySeo | null;
  story_date: string | null;
  location: string | null;
  published_at: string | null;
  updated_at: string | null;
  translation_slug?: string | null;
}

export const IELSCO_STORY_COLUMNS =
  "id, slug, lang, title, summary, category, tags, author_name, author_role, banner_image, banner_alt, banner_caption, sections, quotes, highlights, gallery, credits, seo, story_date, location, published_at, updated_at, translation_slug";

const opt = (v: string | null | undefined) => (v && v.trim() ? v : undefined);

export function rowToIelscoStory(r: IelscoStoryRow): IelscoStory {
  return {
    id: r.id,
    slug: r.slug,
    lang: r.lang === "id" ? "id" : "en",
    title: r.title,
    summary: r.summary ?? r.seo?.meta_description ?? "",
    category: r.category,
    tags: Array.isArray(r.tags) ? r.tags : [],
    author: { name: r.author_name, role: opt(r.author_role) },
    bannerImage: opt(r.banner_image),
    bannerAlt: opt(r.banner_alt),
    bannerCaption: opt(r.banner_caption),
    sections: Array.isArray(r.sections) ? r.sections : [],
    quotes: Array.isArray(r.quotes) ? r.quotes : [],
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    credits: r.credits ?? {},
    seo: r.seo ?? {},
    date: r.story_date ?? "",
    location: r.location ?? "",
    publishedAt: r.published_at ?? r.updated_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.published_at ?? new Date().toISOString(),
    translationSlug: opt(r.translation_slug),
  };
}

// Related IELSco stories: same language; same category first, then shared tags, then newest. Deterministic.
export function relatedIelscoStories(story: IelscoStory, all: IelscoStory[], n = 3): IelscoStory[] {
  const shared = (s: IelscoStory) => s.tags.filter((t) => story.tags.includes(t)).length;
  return all
    .filter((s) => s.id !== story.id && s.lang === story.lang)
    .sort((a, b) =>
      Number(b.category === story.category) - Number(a.category === story.category) ||
      shared(b) - shared(a) ||
      b.publishedAt.localeCompare(a.publishedAt) ||
      a.slug.localeCompare(b.slug))
    .slice(0, n);
}

export const ielscoStoryDescription = (s: IelscoStory) => s.seo.meta_description || s.summary || s.title;

// ── Server reads (anon key, cached, refreshed on editor saves) ────────────────────────────────────────────────────
const REVALIDATE_SECONDS = 300;

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: REVALIDATE_SECONDS, tags: [STORIES_CACHE_TAG] } }),
    },
  });
}

/** Published IELSco stories, newest first. No static fallback: if the database is unreachable the list is empty. */
export async function getIelscoStories(lang?: StoryLang): Promise<IelscoStory[]> {
  try {
    let q = client().from("published_ielsco_stories").select(IELSCO_STORY_COLUMNS).order("published_at", { ascending: false }).limit(500);
    if (lang) q = q.eq("lang", lang);
    const { data, error } = await q;
    if (error) throw error;
    return (data as unknown as IelscoStoryRow[]).map(rowToIelscoStory);
  } catch (e) {
    console.error("[ielsco-stories] database unavailable:", e instanceof Error ? e.message : e);
    return [];
  }
}

export type IelscoStoryLookup =
  | { kind: "found"; story: IelscoStory; all: IelscoStory[] }
  | { kind: "redirect"; slug: string; lang: StoryLang }
  | { kind: "missing" };

export async function getIelscoStoryBySlug(lang: StoryLang, slug: string): Promise<IelscoStoryLookup> {
  const all = await getIelscoStories();
  const story = all.find((s) => s.slug === slug);
  if (story) return story.lang === lang ? { kind: "found", story, all } : { kind: "redirect", slug: story.slug, lang: story.lang };
  try {
    const { data } = await client().from("published_ielsco_story_redirects").select("slug, lang").eq("old_slug", slug).maybeSingle();
    if (data?.slug && data.slug !== slug) return { kind: "redirect", slug: data.slug, lang: data.lang === "id" ? "id" : "en" };
  } catch {
    // no redirect
  }
  return { kind: "missing" };
}

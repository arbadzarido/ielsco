// Server-side reads for the public story pages. Uses the anon key against the read-only view
// public.published_member_stories, through Next's data cache: entries are tagged STORIES_CACHE_TAG and refresh every
// 5 minutes, and the admin editor revalidates the tag on every save (app/api/admin/member-stories/revalidate), so
// edits show up without a redeploy.
//
// Fallback: if the database can't be reached (or the migration isn't applied yet), the static stories in
// src/data/member-stories.ts are served instead. A story that is simply not published is NOT looked up in the
// fallback, so unpublished stories never leak.
import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_STORY_COLUMNS,
  STORIES_CACHE_TAG,
  rowToStory,
  sortStories,
  staticStories,
  type PublicStory,
  type StoryRow,
} from "./types";

const REVALIDATE_SECONDS = 300;

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: REVALIDATE_SECONDS, tags: [STORIES_CACHE_TAG] } }),
    },
  });
}

export type StoriesResult = { stories: PublicStory[]; source: "database" | "fallback" };

export async function getPublishedStories(): Promise<StoriesResult> {
  try {
    const { data, error } = await client()
      .from("published_member_stories")
      .select(PUBLIC_STORY_COLUMNS)
      .order("sort_date", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw error;
    return { stories: sortStories((data as unknown as StoryRow[]).map(rowToStory)), source: "database" };
  } catch (e) {
    console.error("[stories] database unavailable, serving static stories:", e instanceof Error ? e.message : e);
    return { stories: sortStories(staticStories()), source: "fallback" };
  }
}

export type StoryLookup =
  | { kind: "found"; story: PublicStory; all: PublicStory[] }
  | { kind: "redirect"; slug: string }
  | { kind: "missing" };

export async function getStoryBySlug(slug: string): Promise<StoryLookup> {
  const { stories, source } = await getPublishedStories();
  const story = stories.find((s) => s.slug === slug);
  if (story) return { kind: "found", story, all: stories };
  if (source === "fallback") return { kind: "missing" };
  try {
    const { data } = await client().from("published_member_story_redirects").select("slug").eq("old_slug", slug).maybeSingle();
    if (data?.slug && data.slug !== slug) return { kind: "redirect", slug: data.slug };
  } catch {
    // no redirect
  }
  return { kind: "missing" };
}

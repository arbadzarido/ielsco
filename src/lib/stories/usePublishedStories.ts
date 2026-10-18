"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_STORY_COLUMNS, rowToStory, sortStories, staticStories, type PublicStory, type StoryRow } from "./types";

// Latest published stories for client components (home page, dashboard Circle). Starts with the static list so the
// first render matches the server, then swaps in the published stories from the database when they load.
export function usePublishedStories(limit: number): PublicStory[] {
  const [stories, setStories] = useState<PublicStory[]>(() => sortStories(staticStories()).slice(0, limit));
  useEffect(() => {
    let alive = true;
    createClient()
      .from("published_member_stories")
      .select(PUBLIC_STORY_COLUMNS)
      .order("sort_date", { ascending: false, nullsFirst: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (alive && !error && data) setStories(sortStories((data as unknown as StoryRow[]).map(rowToStory)));
      });
    return () => {
      alive = false;
    };
  }, [limit]);
  return stories;
}

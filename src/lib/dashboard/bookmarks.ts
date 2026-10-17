// Saved resources/collections ("My Learning Shelf"), stored per account in public.member_bookmarks.
// If the table doesn't exist yet we report `available: false` and NEVER fall back to localStorage,
// so the UI can't claim something was saved when it wasn't.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookmarkType } from "./types";
import { isMissingRelation } from "./profile";

export const bookmarkKey = (type: BookmarkType, id: string) => `${type}:${id}`;

export async function fetchBookmarks(
  supabase: SupabaseClient,
  userId: string
): Promise<{ keys: string[]; available: boolean }> {
  const { data, error } = await supabase
    .from("member_bookmarks")
    .select("item_type, item_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error && isMissingRelation(error)) return { keys: [], available: false };
  if (error) throw new Error(`Could not load your saved items: ${error.message}`);
  return { keys: (data ?? []).map((r) => bookmarkKey(r.item_type, r.item_id)), available: true };
}

export async function setBookmark(
  supabase: SupabaseClient,
  userId: string,
  type: BookmarkType,
  id: string,
  saved: boolean
) {
  const { error } = saved
    ? await supabase
        .from("member_bookmarks")
        .upsert({ user_id: userId, item_type: type, item_id: id }, { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true })
    : await supabase.from("member_bookmarks").delete().eq("user_id", userId).eq("item_type", type).eq("item_id", id);
  if (error) throw new Error(`Could not ${saved ? "save" : "remove"} this item: ${error.message}`);
}

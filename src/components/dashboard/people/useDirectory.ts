"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDirectoryPage, type DirectoryQuery } from "@/lib/dashboard/profile";
import type { DirectoryMember } from "@/lib/dashboard/types";

const PAGE_SIZE = 12;

export const EMPTY_QUERY: DirectoryQuery = { direction: null, search: "", origin: "", destination: "", interest: "" };

// Paginated, server-filtered, server-ranked list of real opted-in members (RPC list_member_directory).
export function useDirectory(supabase: SupabaseClient, query: DirectoryQuery, enabled: boolean) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { direction, search, origin, destination, interest } = query;

  const load = useCallback(
    async (offset: number) => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetchDirectoryPage(supabase, { direction, search, origin, destination, interest, offset, limit: PAGE_SIZE });
        if (!res.available) {
          setStatus("unavailable");
          return;
        }
        setMembers((prev) => (offset === 0 ? res.members : [...prev, ...res.members]));
        setHasMore(res.members.length === PAGE_SIZE);
        setStatus("ready");
      } catch (e) {
        setError((e as Error).message);
        setStatus("error");
      }
    },
    [supabase, direction, search, origin, destination, interest]
  );

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => load(0), 300);
    return () => clearTimeout(t);
  }, [load, enabled]);

  return { members, status, error, hasMore, loadMore: () => load(members.length), retry: () => load(0) };
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Whether the signed-in user is a Member Stories admin, asked from the database (public.is_story_admin(), backed by
// public.staff_roles). Only decides what the UI shows: every read and write is enforced again by RLS.
let cache: { userId: string; result: Promise<boolean> } | null = null;

export function useStoryAdmin(): { isAdmin: boolean; checked: boolean } {
  const [state, setState] = useState({ isAdmin: false, checked: false });
  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) return alive && setState({ isAdmin: false, checked: true });
      if (cache?.userId !== userId) {
        cache = {
          userId,
          result: Promise.resolve(supabase.rpc("is_story_admin")).then(({ data: ok, error }) => !error && ok === true).catch(() => false),
        };
      }
      cache.result.then((isAdmin) => alive && setState({ isAdmin, checked: true }));
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Role check from the database (tutoring_is_staff / tutoring_is_admin). This only decides what to SHOW; every action is
 *  re-checked by the database functions, so hiding or showing a button never grants access. */
export function useTutoringRole(supabase: SupabaseClient) {
  const [role, setRole] = useState<{ staff: boolean; admin: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([supabase.rpc("tutoring_is_staff"), supabase.rpc("tutoring_is_admin")])
      .then(([s, a]) => { if (live) setRole({ staff: s.data === true, admin: a.data === true }); })
      .catch(() => { if (live) setRole({ staff: false, admin: false }); });
    return () => { live = false; };
  }, [supabase]);
  return role;
}
export function useIsTutoringStaff(supabase: SupabaseClient) { return useTutoringRole(supabase)?.staff === true; }

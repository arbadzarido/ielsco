"use client";

import { useEffect, useState } from "react";
import { useOs } from "./OsProvider";

// Whether to show Recruitment in the OS menu: the recruitment team (founders, 'recruitment' grant) or anyone assigned to
// evaluate a candidate. Presentation only; the database decides what each query returns.
export type RecruitmentAccess = { team: boolean; edit: boolean; assigned: number } | null;
let cached: Promise<RecruitmentAccess> | null = null;

export function useRecruitmentAccess(): RecruitmentAccess {
  const { state, supabase } = useOs();
  const [v, setV] = useState<RecruitmentAccess>(null);
  useEffect(() => {
    if (state.status !== "ready") return;
    cached ??= Promise.all([
      supabase.rpc("os_recruitment_access", { p_level: "view" }),
      supabase.rpc("os_recruitment_access", { p_level: "edit" }),
      supabase.rpc("os_recruitment_my_assignments"),
    ]).then(([a, b, c]) => ({ team: a.data === true, edit: b.data === true, assigned: Array.isArray(c.data) ? c.data.length : 0 }))
      .catch(() => ({ team: false, edit: false, assigned: 0 }));
    let live = true;
    cached.then((x) => live && setV(x));
    return () => { live = false; };
  }, [state.status, supabase]);
  return v;
}

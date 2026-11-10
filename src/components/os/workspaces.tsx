"use client";

// The caller's division workspaces (os_my_workspaces), loaded once per session and shared by the sidebar and pages.
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useOsMe } from "./OsProvider";
import type { MyWorkspace } from "@/lib/os/workspaces";

const cache = new WeakMap<SupabaseClient, Promise<MyWorkspace[]>>();
const listeners = new Set<() => void>();
const load = async (s: SupabaseClient): Promise<MyWorkspace[]> => { const { data } = await s.rpc("os_my_workspaces"); return (data ?? []) as MyWorkspace[]; };

export function useMyWorkspaces(): { list: MyWorkspace[] | null; reload: () => void } {
  const { supabase } = useOsMe();
  const [list, setList] = useState<MyWorkspace[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let p = cache.get(supabase);
    if (!p) { p = load(supabase); cache.set(supabase, p); }
    let live = true;
    p.then((l) => live && setList(l));
    const on = () => setTick((t) => t + 1);
    listeners.add(on);
    return () => { live = false; listeners.delete(on); };
  }, [supabase, tick]);
  const reload = useCallback(() => { cache.delete(supabase); listeners.forEach((f) => f()); }, [supabase]);
  return { list, reload };
}

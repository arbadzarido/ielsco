"use client";

// Small data hooks shared by Company OS pages. Every query runs as the signed-in person, so RLS decides the rows.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useOsMe } from "./OsProvider";
import type { OsDivision } from "@/lib/os/types";

export interface DirPerson { id: string; full_name: string; short_name: string | null; org_role: string; status: string }
export interface Directory {
  people: DirPerson[];
  peopleById: Map<string, DirPerson>;
  divisions: OsDivision[];
  divisionById: Map<string, OsDivision>;
}

const cache = new WeakMap<SupabaseClient, Promise<Directory>>();

async function loadDirectory(supabase: SupabaseClient): Promise<Directory> {
  const [p, d] = await Promise.all([
    supabase.from("os_people").select("id, full_name, short_name, org_role, status").order("full_name"),
    supabase.from("os_divisions").select("id, code, name, owner_person_id, drive_folder_id").order("id"),
  ]);
  const people = (p.data ?? []) as DirPerson[];
  const divisions = (d.data ?? []) as OsDivision[];
  return { people, peopleById: new Map(people.map((x) => [x.id, x])), divisions, divisionById: new Map(divisions.map((x) => [x.id, x])) };
}

export function useDirectory(): Directory | null {
  const { supabase } = useOsMe();
  const [dir, setDir] = useState<Directory | null>(null);
  useEffect(() => {
    let p = cache.get(supabase);
    if (!p) { p = loadDirectory(supabase); cache.set(supabase, p); }
    let live = true;
    p.then((d) => live && setDir(d));
    return () => { live = false; };
  }, [supabase]);
  return dir;
}

export function invalidateDirectory(supabase: SupabaseClient) { cache.delete(supabase); }

/** Run a query function and keep {data, error, loading}; reload() re-runs it. */
export function useQuery<T>(fn: (s: SupabaseClient) => PromiseLike<{ data: T | null; error: { message: string } | null }>, deps: unknown[]) {
  const { supabase } = useOsMe();
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve(run(supabase)).then(
      ({ data, error }) => live && setState({ data, error: error ? friendlyError(error.message) : null, loading: false }),
      (e: unknown) => live && setState({ data: null, error: friendlyError(e instanceof Error ? e.message : String(e)), loading: false }),
    );
    return () => { live = false; };
  }, [run, supabase, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** Database errors in words a person can act on. Never echoes SQL or internal identifiers. */
export function friendlyError(message: string): string {
  if (/row-level security|permission denied|42501/i.test(message)) return "You don't have permission to do that here.";
  if (/duplicate key|unique/i.test(message)) return "That already exists.";
  if (/check constraint/i.test(message)) return "One of the values isn't allowed. Check the form and try again.";
  if (/violates foreign key|23503|Unknown project|Unknown parent/i.test(message)) return "A linked record doesn't exist or you can't see it.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  // Our own trigger messages are written for people already.
  if (/^(Only|A |The |Values|Subtasks|Grants|Comment)/.test(message)) return message;
  return "Something went wrong. Please try again.";
}

/** The divisions the signed-in person belongs to, and whether they manage each. */
export function useMyScope() {
  const { me } = useOsMe();
  return useMemo(() => {
    const isFounder = me.person.org_role === "founder";
    const managed = new Set(me.divisions.filter((d) => d.is_manager).map((d) => d.division_id));
    const member = new Set(me.divisions.map((d) => d.division_id));
    return { me, isFounder, isAdmin: me.isAdmin, managed, member, isManager: managed.size > 0 && me.person.org_role !== "member", companies: me.companies };
  }, [me]);
}

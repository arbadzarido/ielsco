"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { PERSON_COLUMNS, type CompanyCode, type OsMe, type OsPerson, type OsPersonDivision } from "@/lib/os/types";

// Loads the signed-in person's Company OS record. Everything here is presentation: RLS decides what each query returns,
// so a person who is not in the OS gets empty results from every table whatever this component shows.
type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-staff"; email: string | null }
  | { status: "error"; message: string }
  | { status: "ready"; me: OsMe };

interface OsCtx {
  state: State;
  supabase: SupabaseClient;
  reload: () => void;
}

const Ctx = createContext<OsCtx | null>(null);

export function OsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setState({ status: "signed-out" });

    const { data: person, error } = await supabase
      .from("os_people")
      .select(PERSON_COLUMNS)
      .eq("user_id", auth.user.id)
      .in("status", ["onboarding", "active"])
      .maybeSingle<OsPerson>();
    // A missing table (migration not applied yet) looks like an error here; say so plainly.
    if (error) return setState({ status: "error", message: error.code === "42P01" || error.code === "PGRST205" ? "The Company OS database isn't set up yet." : error.message });
    if (!person) return setState({ status: "not-staff", email: auth.user.email ?? null });

    const [divs, comps, admin, mfa] = await Promise.all([
      supabase.from("os_person_divisions").select("person_id, division_id, is_manager").eq("person_id", person.id),
      supabase.from("os_person_companies").select("company_code").eq("person_id", person.id),
      supabase.rpc("os_is_founder"),
      supabase.rpc("os_is_founder_needing_mfa"),
    ]);
    if (divs.error || comps.error) return setState({ status: "error", message: (divs.error ?? comps.error)!.message });
    setState({
      status: "ready",
      me: {
        person,
        divisions: (divs.data ?? []) as OsPersonDivision[],
        companies: (comps.data ?? []).map((c) => c.company_code as CompanyCode),
        isAdmin: admin.data === true,
        needsMfa: mfa.data === true,
      },
    });
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return <Ctx.Provider value={{ state, supabase, reload: load }}>{children}</Ctx.Provider>;
}

export function useOs(): OsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOs must be used inside OsProvider");
  return ctx;
}

/** For pages rendered inside the ready shell. */
export function useOsMe(): { me: OsMe; supabase: SupabaseClient; reload: () => void } {
  const { state, supabase, reload } = useOs();
  if (state.status !== "ready") throw new Error("useOsMe used before the OS loaded");
  return { me: state.me, supabase, reload };
}

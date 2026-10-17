"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { loadMemberProfile, normalizeDestinations, saveMemberProfile } from "@/lib/dashboard/profile";
import type { MemberProfile, ProfileStorage } from "@/lib/dashboard/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: User; profile: MemberProfile; storage: ProfileStorage };

// Loads the signed-in user + their member profile. Redirects to /sign-in when signed out.
export function useMemberProfile() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      router.replace("/sign-in");
      return;
    }
    try {
      const { profile, storage } = await loadMemberProfile(supabase, data.user);
      setState({ status: "ready", user: data.user, profile, storage });
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    }
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (next: MemberProfile) => {
      if (state.status !== "ready") throw new Error("Profile is not loaded yet.");
      const storage = await saveMemberProfile(supabase, next, state.storage);
      setState({ ...state, profile: normalizeDestinations(next), storage });
      return storage;
    },
    [supabase, state]
  );

  return { state, reload: load, save, supabase };
}

export const ONBOARDING_LATER_KEY = "iels:onboarding-later";

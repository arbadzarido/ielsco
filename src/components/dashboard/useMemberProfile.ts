"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getUserOnce } from "@/lib/supabase/getUser";
import { classifyError, type ErrorKind } from "@/lib/errorKind";
import { loadMemberProfile, normalizeDestinations, saveMemberProfile } from "@/lib/dashboard/profile";
import type { MemberProfile, ProfileStorage } from "@/lib/dashboard/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string; kind: ErrorKind }
  | { status: "ready"; user: User; profile: MemberProfile; storage: ProfileStorage };

// Loads the signed-in user + their member profile. Redirects to /sign-in when signed out.
export function useMemberProfile() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const { data, error } = await getUserOnce(supabase);
    if (error || !data.user) {
      // Signed out (no session at all): back to sign-in, as before. A failed check is not the same thing: no connection
      // or a server hiccup keeps the page with a retry, and a session that ended says so with a "Sign in again" button.
      const kind = error ? classifyError(error as never) : "session";
      if (kind === "network" || kind === "server") {
        setState({ status: "error", message: error?.message ?? "We couldn't check your sign-in.", kind });
        return;
      }
      if (error && (error as { status?: number }).status === 401) {
        setState({ status: "error", message: error.message, kind: "session" });
        return;
      }
      router.replace("/sign-in");
      return;
    }
    try {
      const { profile, storage } = await loadMemberProfile(supabase, data.user);
      setState({ status: "ready", user: data.user, profile, storage });
    } catch (e) {
      setState({ status: "error", message: (e as Error).message, kind: classifyError(e as Error) });
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

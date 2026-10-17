"use client";

import type { ReactNode } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import DashboardLayout from "./DashboardLayout";
import { ErrorState, LoadingState } from "./PageStates";
import { useMemberProfile } from "./useMemberProfile";
import { BookmarksProvider } from "./bookmarks/BookmarksProvider";
import type { MemberProfile, ProfileStorage } from "@/lib/dashboard/types";

export interface DashboardCtx {
  user: User;
  profile: MemberProfile;
  storage: ProfileStorage;
  save: (p: MemberProfile) => Promise<ProfileStorage>;
  supabase: SupabaseClient;
}

// Standard wrapper for dashboard pages: auth + profile loading/error states + layout + saved-items context.
export function DashboardPage({ children }: { children: (ctx: DashboardCtx) => ReactNode }) {
  const { state, reload, save, supabase } = useMemberProfile();

  if (state.status === "loading") return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (state.status === "error") return <DashboardLayout><ErrorState message={state.message} onRetry={reload} /></DashboardLayout>;

  return (
    <DashboardLayout userName={state.profile.display_name || "Learner"} userAvatar={state.profile.avatar_url}>
      <BookmarksProvider supabase={supabase} userId={state.user.id}>
        {children({ user: state.user, profile: state.profile, storage: state.storage, save, supabase })}
      </BookmarksProvider>
    </DashboardLayout>
  );
}

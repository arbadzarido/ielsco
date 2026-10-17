"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { OnboardingFlow } from "@/components/dashboard/goals/OnboardingFlow";
import { ErrorState, LoadingState, ProfilePendingNotice } from "@/components/dashboard/PageStates";
import { ONBOARDING_LATER_KEY, useMemberProfile } from "@/components/dashboard/useMemberProfile";

// First-login goal setup. Also used later to edit goals (avatar menu → "Edit my goals").
export default function OnboardingPage() {
  const router = useRouter();
  const { state, reload, save } = useMemberProfile();

  if (state.status === "loading") return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (state.status === "error") return <DashboardLayout><ErrorState message={state.message} onRetry={reload} /></DashboardLayout>;

  const isEdit = !!state.profile.onboarding_completed_at;
  const later = () => {
    if (!isEdit) window.sessionStorage.setItem(ONBOARDING_LATER_KEY, "1");
    router.push("/dashboard");
  };

  return (
    <DashboardLayout userName={state.profile.display_name || "Learner"} userAvatar={state.profile.avatar_url}>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10 md:py-16">
        {state.storage === "unavailable" && <ProfilePendingNotice />}
        <OnboardingFlow profile={state.profile} isEdit={isEdit} onSave={save} onLater={later} />
      </div>
    </DashboardLayout>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, IdCard } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { card, btnSecondary } from "@/components/dashboard/ui";
import { ErrorState, LoadingState, ProfilePendingNotice, PageHeader } from "@/components/dashboard/PageStates";
import { useMemberProfile } from "@/components/dashboard/useMemberProfile";
import { ProfileForm } from "@/components/dashboard/profile/ProfileForm";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Simple editable member profile. Saves to public.member_profiles only (account data in public.users is read-only here).
// Private account details (phone, birth date, institution, ...) used for event registration live at /dashboard/profile/account.
export default function ProfilePage() {
  const { state, reload, save } = useMemberProfile();
  const { t } = useI18n();

  if (state.status === "loading") return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (state.status === "error") return <DashboardLayout><ErrorState message={state.message} onRetry={reload} /></DashboardLayout>;

  return (
    <DashboardLayout userName={state.profile.display_name || "Learner"} userAvatar={state.profile.avatar_url}>
      <div className="mx-auto max-w-[110rem] space-y-6 px-4 py-10 md:px-6 md:py-14 lg:px-12">
        <PageHeader title={t("pages.profileTitle")} description={t("pages.profileBody")} />
        {state.storage === "unavailable" && <ProfilePendingNotice />}
        <div data-testid="account-details-card" className={`${card} flex flex-col gap-4 p-5 shadow-[0_1px_2px_rgba(47,65,87,0.04)] sm:flex-row sm:items-center sm:justify-between md:p-6`}>
          <div className="flex items-start gap-3">
            <IdCard size={22} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-[#2F4157]">{t("nav.accountDetails")}</h2>
              <p className="text-base text-[#2F4157]/65">Private details for one-click event registration and certificates: full name, WhatsApp, city, school or company.</p>
            </div>
          </div>
          <Link href="/dashboard/profile/account" data-testid="account-details-link" className={btnSecondary}>
            {t("nav.accountDetails")} <ArrowRight size={16} />
          </Link>
        </div>
        <ProfileForm key={state.user.id} initial={state.profile} onSave={save} />
      </div>
    </DashboardLayout>
  );
}

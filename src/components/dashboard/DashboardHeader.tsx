"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { ring } from "./sidebar/NavLinks";
import { useAccountSummary } from "./useAccountSummary";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { shortName } from "@/lib/names";
import { cn } from "@/lib/utils";

// Phone header (< md), the same as Elco's MobileTopBar: logo, and the member's avatar as a shortcut to their profile
// and Elco-Pass. No navigation here: the dock at the bottom (MobileTabBar) is the navigation, as in Elco.
export default function DashboardHeader({ userName = "Learner", userAvatar }: { userName?: string; userAvatar?: string | null }) {
  const { t } = useI18n();
  const summary = useAccountSummary();
  const name = shortName(summary?.display_name?.trim() || userName);
  const avatar = summary?.hasProfile ? summary.avatar_url : userAvatar;
  return (
    <div data-testid="mobile-top-bar"
      className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E3E7ED] bg-white/90 px-[16px] pb-[12px] pt-[calc(env(safe-area-inset-top)+12px)] font-heading backdrop-blur-md md:hidden">
      <Link href="/dashboard" data-testid="header-logo-link" className={cn("flex shrink-0 items-center gap-[10px] rounded-[12px]", ring)}>
        <Image src="/images/logos/iels_blue1.png" alt="" width={36} height={36} className="h-[36px] w-[36px] shrink-0 object-contain" />
        <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#2F4157] max-[379px]:hidden">IELSco</span>
        <span className="sr-only">dashboard home</span>
      </Link>
      <Link href="/dashboard/passport" aria-label={t("nav.profilePassport")} data-testid="mobile-profile-link"
        className={cn("flex h-[40px] w-[40px] items-center justify-center rounded-full", ring)}>
        <Avatar name={name} url={avatar} size={32} className="bg-[#304156] text-white" />
      </Link>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { Avatar } from "./Avatar";
import { ring } from "./sidebar/NavLinks";
import { useAccountSummary } from "./useAccountSummary";
import { useHeaderCounts } from "./useHeaderCounts";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { shortName } from "@/lib/names";
import { cn } from "@/lib/utils";

// Phone header (< md), the same as Elco's MobileTopBar: logo, then round 40px shortcuts and the member's avatar
// (a link to their profile). Elco's streak chip slot holds IELSco's inbox and notifications, with Elco's coral count.
// Navigation is the dock at the bottom (MobileTabBar); account actions are in its More sheet.
function Shortcut({ href, label, count, icon: Icon, testId }: { href: string; label: string; count: number; icon: typeof Bell; testId: string }) {
  return (
    <Link href={href} aria-label={count ? `${label} (${count})` : label} data-testid={testId}
      className={cn("relative flex h-[40px] w-[40px] items-center justify-center rounded-full text-[#2F4157] hover:bg-[#2F4157]/[0.06]", ring)}>
      <Icon className="h-[20px] w-[20px]" strokeWidth={1.8} aria-hidden="true" />
      {count > 0 && <span className="absolute right-0 top-0 min-w-[18px] rounded-full bg-[#FDEEEE] px-[5px] text-center text-[11px] font-semibold leading-[18px] text-[#C04C4E]" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

export default function DashboardHeader({ userName = "Learner", userAvatar }: { userName?: string; userAvatar?: string | null }) {
  const { t } = useI18n();
  const counts = useHeaderCounts();
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
      <div className="flex items-center gap-[6px]">
        <Shortcut href="/dashboard/notifications" label={t("nav.notifications")} count={counts.notifications} icon={Bell} testId="header-notifications" />
        <Shortcut href="/dashboard/connect/messages" label={t("nav.inbox")} count={counts.unread} icon={MessageCircle} testId="header-inbox" />
        <Link href="/dashboard/profile" aria-label={t("nav.profile")} data-testid="mobile-profile-link"
          className={cn("flex h-[40px] w-[40px] items-center justify-center rounded-full", ring)}>
          <Avatar name={name} url={avatar} size={32} className="bg-[#304156] text-white" />
        </Link>
      </div>
    </div>
  );
}

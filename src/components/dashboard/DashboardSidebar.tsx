"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";
import { NavLinks } from "./sidebar/NavLinks";
import { GifBanner } from "./sidebar/GifBanner";
import { ElcoPromo } from "./sidebar/ElcoPromo";
import { focusRing } from "./ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Floating glass sidebar (lg and up): inset 16px from the viewport, 304px wide, rounded, translucent white with blur.
// DashboardLayout offsets content with lg:pl-[336px] (16 + 304 + 16). Phones/tablets use DashboardHeader + MobileTabBar.
export const SIDEBAR_GLASS =
  "border border-white/80 bg-white/95 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_24px_60px_rgba(26,37,52,0.10),0_2px_8px_rgba(26,37,52,0.04)] supports-[backdrop-filter]:bg-white/72 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150";

export function DashboardSidebar({ userName, userAvatar }: { userName: string; userAvatar?: string | null }) {
  const { t } = useI18n();
  return (
    <aside
      data-testid="dashboard-sidebar"
      className={cn(SIDEBAR_GLASS, "fixed bottom-[16px] left-[16px] top-[16px] z-40 hidden w-[304px] flex-col overflow-hidden rounded-[28px] lg:flex")}
    >
      <div className="px-[22px] pb-[14px] pt-[22px]">
        <Link href="/dashboard" data-testid="sidebar-logo" className={cn("inline-flex items-center gap-3 rounded-xl", focusRing)}>
          <Image src="/images/logos/iels_blue1.png" alt="" width={40} height={40} />
          <span className="text-[24px] font-bold tracking-tight text-[#1A2534]">IELSco</span>
          <span className="sr-only">dashboard home</span>
        </Link>
      </div>
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#2F4157]/12 to-transparent" aria-hidden="true" />
      <nav aria-label={t("nav.mainNav")} className="flex-1 overflow-y-auto overflow-x-hidden px-[14px] pb-[14px] pt-[10px] [scrollbar-width:thin]">
        <NavLinks />
        <GifBanner className="mt-[20px]" />
      </nav>
      <div className="space-y-[10px] px-[14px] pb-[14px] pt-[4px]">
        <ElcoPromo />
        <div className="rounded-2xl border border-[#E3E7ED]/80 bg-white/70 p-1.5">
          <AccountMenu userName={userName} userAvatar={userAvatar} placement="up" />
        </div>
      </div>
    </aside>
  );
}

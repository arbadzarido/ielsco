"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";
import { NavLinks, ring } from "./sidebar/NavLinks";
import { ElcoPromo } from "./sidebar/ElcoPromo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Desktop/tablet sidebar (md and up), the same component as Elco's AppShell Sidebar: 288px, inset 16px, white with a
// hairline border and soft shadow, 28px radius; logo, navigation (scrolls on short screens), then the Elco card and
// the profile card at the bottom. DashboardLayout offsets content to match. Phones use DashboardHeader + MobileTabBar.
// Elco sets its sidebar in Poppins (.app-type); here that's font-heading on the aside.
export function DashboardSidebar({ userName, userAvatar }: { userName: string; userAvatar?: string | null }) {
  const { t } = useI18n();
  return (
    <aside data-testid="dashboard-sidebar"
      className="fixed bottom-[16px] left-[16px] top-[16px] z-40 hidden w-[288px] flex-col overflow-hidden rounded-[28px] border border-[#E3E7ED] bg-white px-[16px] pb-[16px] pt-[20px] font-heading shadow-[0_24px_60px_rgba(26,37,52,0.08),0_2px_8px_rgba(26,37,52,0.04)] md:flex">
      <div className="mb-[16px] px-[4px] pt-[4px]">
        <Link href="/dashboard" data-testid="sidebar-logo" className={cn("inline-flex shrink-0 items-center gap-[10px] rounded-[12px]", ring)}>
          <Image src="/images/logos/iels_blue1.png" alt="" width={36} height={36} className="h-[36px] w-[36px] shrink-0 object-contain" />
          <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#2F4157]">IELSco</span>
          <span className="sr-only">dashboard home</span>
        </Link>
      </div>
      {/* Items never shrink: the nav scrolls instead (as in Elco). */}
      <nav aria-label={t("nav.mainNav")} className="-mx-[4px] flex min-h-0 flex-1 flex-col gap-[8px] overflow-y-auto overflow-x-hidden px-[4px] [@media(max-height:900px)]:gap-[12px] [&>*]:shrink-0">
        <NavLinks />
      </nav>
      <div className="mt-[12px] space-y-[12px] border-t border-[#E3E7ED] pt-[12px]">
        <ElcoPromo />
        <AccountMenu userName={userName} userAvatar={userAvatar} placement="up" />
      </div>
    </aside>
  );
}

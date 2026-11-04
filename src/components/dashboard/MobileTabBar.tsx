"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Compass, LogOut, Menu } from "lucide-react";
import { ACCOUNT_ITEMS, ADMIN_NAV_GROUP, SECTIONS, isItemActive } from "./nav";
import { BottomSheet } from "./BottomSheet";
import { Divider, NavGroup, NavItem, SectionLabel, ring, sectionLeaves, type Leaf } from "./sidebar/NavLinks";
import { GifBanner } from "./sidebar/GifBanner";
import { ElcoPromo } from "./sidebar/ElcoPromo";
import { useStoryAdmin } from "./stories-admin/useStoryAdmin";
import { useHeaderCounts } from "./useHeaderCounts";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Phone dock (< md), the same as Elco's MobileNav: a navy glass bar inset 10px above the home indicator, five cells,
// the centre one wider with its icon in a pill. IELSco: Home, Social, Discover (centre), Events, More. "More" opens a
// bottom sheet with the three groups, the account rows and sign-out, as in Elco.
// DashboardLayout reserves matching bottom padding so the dock never covers content.
const GLASS_NAVY = "border border-white/10 bg-[rgba(47,65,87,0.94)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_30px_rgba(26,37,52,0.25)] backdrop-blur-[16px]";

export function MobileTabBar() {
  const path = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { isAdmin } = useStoryAdmin();
  const { unread } = useHeaderCounts();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const byId = (id: string) => SECTIONS.find((s) => s.id === id)!;
  const moreActive = ACCOUNT_ITEMS.some((i) => isItemActive(i, path));

  const plain = (active: boolean) => cn("flex min-h-[46px] flex-col items-center justify-center gap-[2px] rounded-[16px] text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
    active ? "text-white" : "text-white/65");
  const cell = (id: string) => {
    const s = byId(id);
    const active = isItemActive(s, path);
    return (
      <Link key={id} href={s.path} data-testid={`mobile-nav-${id}`} aria-current={active ? "page" : undefined} className={plain(active)}>
        <s.icon className="h-[20px] w-[20px]" strokeWidth={1.8} aria-hidden="true" />{t(s.key)}
      </Link>
    );
  };
  const discover = byId("discover");
  const discoverActive = isItemActive(discover, path);

  const signOut = async () => {
    close();
    await createClient().auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };
  const leaf = (i: { path: string; key: string; icon: Leaf["icon"]; id: string; match?: string[] }): Leaf =>
    ({ href: i.path, label: t(i.key), icon: i.icon, id: i.id, match: i.match });

  return (
    <>
      <nav aria-label={t("nav.mainNav")} data-testid="mobile-tab-bar"
        className={cn(GLASS_NAVY, "fixed bottom-[calc(env(safe-area-inset-bottom)+8px)] left-[calc(env(safe-area-inset-left)+10px)] right-[calc(env(safe-area-inset-right)+10px)] z-50 mx-auto grid max-w-[512px] grid-cols-[1fr_1fr_1.3fr_1fr_1fr] items-center rounded-[24px] px-[4px] py-[4px] font-heading md:hidden")}>
        {cell("home")}
        {cell("social")}
        <Link href={discover.path} data-testid="mobile-nav-discover" aria-current={discoverActive ? "page" : undefined} className={cn(plain(discoverActive), "font-semibold")}>
          <span className={cn("flex h-[28px] w-[48px] items-center justify-center rounded-full transition-colors", discoverActive ? "bg-white text-[#2F4157]" : "bg-white/[0.12] text-white")}>
            <discover.icon className="h-[21px] w-[21px]" strokeWidth={1.9} aria-hidden="true" />
          </span>{t(discover.key)}
        </Link>
        {cell("events")}
        <button ref={opener} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-current={moreActive ? "true" : undefined}
          data-testid="mobile-nav-more" className={plain(moreActive || open)}>
          <Menu className="h-[20px] w-[20px]" aria-hidden="true" />{t("nav.more")}
        </button>
      </nav>
      <BottomSheet open={open} onClose={close} title={t("nav.more")} returnFocusTo={opener} testId="mobile-more-sheet">
        <div className="mt-[4px] space-y-[16px] font-heading">
          {["social", "discover", "events"].map((id) => {
            const s = byId(id);
            return <NavGroup key={id} id={id} label={t(s.key)} icon={s.icon} items={sectionLeaves(s, unread)} inside={isItemActive(s, path)} onClick={close} testPrefix="drawer" />;
          })}
          <Divider />
          <div role="group" aria-labelledby="more-account">
            <SectionLabel id="more-account">{t("nav.account")}</SectionLabel>
            <div className="grid gap-[2px]">
              {ACCOUNT_ITEMS.map((i) => <NavItem key={i.id} item={leaf(i)} onClick={close} testPrefix="drawer" />)}
              <NavItem item={{ href: "/dashboard?tour=1", label: t("tour.take"), icon: Compass, id: "take-tour", exact: true }} onClick={close} testPrefix="drawer" />
              {isAdmin && ADMIN_NAV_GROUP.items.map((i) => <NavItem key={i.id} item={leaf(i)} onClick={close} testPrefix="drawer" />)}
              <div className="flex min-h-[44px] items-center px-[16px]"><LanguageSelect testId="account-language-select" /></div>
              <button type="button" onClick={signOut} data-testid="account-menu-sign-out"
                className={cn("flex min-h-[44px] items-center gap-[14px] rounded-[16px] px-[16px] py-[8px] text-[15px] text-[#C04C4E] hover:bg-[#FEF4F4]", ring)}>
                <LogOut className="h-[20px] w-[20px]" strokeWidth={1.8} aria-hidden="true" />{t("nav.signOut")}
              </button>
            </div>
          </div>
          <GifBanner onNavigate={close} />
          <ElcoPromo />
        </div>
      </BottomSheet>
    </>
  );
}

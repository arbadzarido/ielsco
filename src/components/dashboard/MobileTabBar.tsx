"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { MOBILE_ITEMS, NAV_ITEMS, isNavActive } from "./nav";
import { MobileMenu } from "./sidebar/MobileMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Phone/tablet bottom bar: a floating, glossy pill inset 12px from the edges and above the home indicator
// (safe-area). Four destinations plus "More", which opens the full menu drawer (everything incl. Community/Explore).
// DashboardLayout reserves matching bottom padding so the bar never covers content or controls.
const BAR_GLASS =
  "border border-white/80 bg-white/95 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_18px_40px_rgba(26,37,52,0.16),0_2px_6px_rgba(26,37,52,0.06)] supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150";

const SHORT: Record<string, string> = { "my-goals": "nav.myGoalsShort" };

export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const inBar = MOBILE_ITEMS.some((i) => isNavActive(i.path, pathname));
  const moreActive = !inBar && NAV_ITEMS.some((i) => isNavActive(i.path, pathname));
  const cell = "flex min-h-[56px] flex-col items-center justify-center gap-[3px] rounded-[18px] px-1 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90]";
  return (
    <>
      <nav
        aria-label={t("nav.mainNav")}
        data-testid="mobile-tab-bar"
        className={cn(BAR_GLASS, "fixed inset-x-[12px] z-40 rounded-[24px] p-[6px] lg:hidden")}
        style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <ul className="grid grid-cols-5 gap-[2px]">
          {MOBILE_ITEMS.map(({ key, path, icon: Icon, id }) => {
            const active = isNavActive(path, pathname);
            return (
              <li key={path}>
                <Link href={path} data-testid={`mobile-nav-${id}`} aria-current={active ? "page" : undefined}
                  className={cn(cell, active ? "bg-[#2F4157] text-white" : "text-[#2F4157]/70 hover:bg-[#2F4157]/[0.06]")}>
                  <Icon size={21} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                  <span className="max-w-full truncate">{t(SHORT[id] ?? key)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button ref={opener} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} data-testid="mobile-nav-more"
              className={cn(cell, "w-full", moreActive ? "bg-[#2F4157] text-white" : "text-[#2F4157]/70 hover:bg-[#2F4157]/[0.06]")}>
              <Menu size={21} strokeWidth={moreActive ? 2.3 : 1.8} aria-hidden="true" />
              <span>{t("nav.more")}</span>
            </button>
          </li>
        </ul>
      </nav>
      <MobileMenu open={open} onClose={close} returnFocusTo={opener} />
    </>
  );
}

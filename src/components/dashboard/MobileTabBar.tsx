"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { MOBILE_ITEMS, isItemActive, moreActive as onMorePage } from "./nav";
import { MobileMenu } from "./sidebar/MobileMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Phone/tablet bottom bar, same look and behaviour as Elco's: a floating navy bar inset 12px from the edges and above
// the home indicator (safe-area). The five top-level menus: Home, Discover, Social, Connect, and "More" (a bottom sheet).
// DashboardLayout reserves matching bottom padding so the bar never covers content or controls.
const BAR_NAVY =
  "border border-white/10 bg-[#2F4157]/[0.96] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_30px_rgba(26,37,52,0.25)] supports-[backdrop-filter]:backdrop-blur-xl";


export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const moreActive = onMorePage(pathname);
  const cell = "flex min-h-[56px] flex-col items-center justify-center gap-[3px] rounded-[18px] px-0 text-[11px] tracking-[-0.01em] min-[380px]:px-1 min-[380px]:text-[12px] min-[380px]:tracking-normal font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
  return (
    <>
      <nav
        aria-label={t("nav.mainNav")}
        data-testid="mobile-tab-bar"
        className={cn(BAR_NAVY, "fixed inset-x-[12px] z-40 mx-auto max-w-[512px] rounded-[24px] p-[6px] lg:hidden")}
        style={{ bottom: "calc(12px + env(safe-area-inset-bottom))", left: "calc(12px + env(safe-area-inset-left))", right: "calc(12px + env(safe-area-inset-right))" }}
      >
        <ul className="grid grid-cols-5 gap-[2px]">
          {MOBILE_ITEMS.map((item) => {
            const { key, path, icon: Icon, id } = item;
            const active = isItemActive(item, pathname);
            return (
              <li key={path}>
                <Link href={path} data-testid={`mobile-nav-${id}`} aria-current={active ? "page" : undefined}
                  className={cn(cell, active ? "bg-white/[0.14] text-white" : "text-white/65 hover:bg-white/[0.08] hover:text-white")}>
                  <Icon size={21} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                  <span className="max-w-full truncate">{t(key)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button ref={opener} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} data-testid="mobile-nav-more"
              className={cn(cell, "w-full", moreActive || open ? "bg-white/[0.14] text-white" : "text-white/65 hover:bg-white/[0.08] hover:text-white")}>
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

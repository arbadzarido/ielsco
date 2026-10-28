"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ADMIN_NAV_GROUP, MORE_ITEMS, MORE_SECTION, SECTIONS, isItemActive, moreActive, type NavItem } from "../nav";
import { useStoryAdmin } from "../stories-admin/useStoryAdmin";
import { focusRing } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Desktop sidebar navigation: the five top-level menus (Home, Discover, Social, Connect, More). "More" is a disclosure
// with the supporting pages; it opens by itself on those pages. Staff also see the Admin group.
// Sizes are in px because the site's root font size is 75%: 16px labels, 22px icons, 48px rows.
const itemBase = "group flex min-h-[48px] [@media(max-height:960px)]:min-h-[44px] w-full items-center gap-[14px] rounded-[16px] px-[16px] text-[16px] transition-colors";
const activeCls = "bg-[#2F4157] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_rgba(47,65,87,0.22)]";
const idleCls = "font-medium text-[#2F4157]/80 hover:bg-[#2F4157]/[0.06] hover:text-[#1A2534]";

// Each section keeps a colour of its own for its icon (navy fill when active), so the menus are recognisable at a glance.
export const SECTION_TINT: Record<string, string> = {
  home: "text-[#2F4157]", discover: "text-[#0E8A7E]", social: "text-[#C94F51]", connect: "text-[#6C4BD8]", more: "text-[#B7791F]",
};

function Row({ item, active, onNavigate, testPrefix, small }: { item: NavItem; active: boolean; onNavigate?: () => void; testPrefix: string; small?: boolean }) {
  const { t } = useI18n();
  const Icon = item.icon;
  return (
    <Link href={item.path} onClick={onNavigate} data-testid={`${testPrefix}-${item.id}`} aria-current={active ? "page" : undefined}
      className={cn(itemBase, focusRing, active ? activeCls : idleCls, small && "min-h-[42px] pl-[22px] text-[15px]")}>
      <Icon size={small ? 19 : 22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true"
        className={cn("shrink-0", active ? "text-white" : small ? "text-[#2F4157]/60 group-hover:text-[#2F4157]" : SECTION_TINT[item.id] ?? "text-[#2F4157]/70")} />
      <span className="leading-tight">{t(item.key)}</span>
    </Link>
  );
}

export function NavLinks({ onNavigate, testPrefix = "nav" }: { onNavigate?: () => void; testPrefix?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAdmin } = useStoryAdmin();
  const onMore = moreActive(pathname);
  const [open, setOpen] = useState(onMore);
  useEffect(() => { if (onMore) setOpen(true); }, [onMore]);

  return (
    <>
      <ul className="space-y-[4px]">
        {SECTIONS.map((s) => <li key={s.id}><Row item={s} active={isItemActive(s, pathname)} onNavigate={onNavigate} testPrefix={testPrefix} /></li>)}
        <li>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={`${testPrefix}-more-list`} data-testid={`${testPrefix}-more`}
            className={cn(itemBase, focusRing, onMore && !open ? activeCls : idleCls)}>
            <MORE_SECTION.icon size={22} strokeWidth={1.8} aria-hidden="true" className={cn("shrink-0", onMore && !open ? "text-white" : SECTION_TINT.more)} />
            <span className="flex-1 text-left leading-tight">{t(MORE_SECTION.key)}</span>
            <ChevronDown size={18} aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          </button>
          {open && (
            <ul id={`${testPrefix}-more-list`} className="mt-[4px] space-y-[2px]">
              {MORE_ITEMS.map((i) => <li key={i.id}><Row item={i} active={isItemActive(i, pathname)} onNavigate={onNavigate} testPrefix={testPrefix} small /></li>)}
            </ul>
          )}
        </li>
      </ul>
      {isAdmin && (
        <div className="mt-[18px]">
          <p className="mb-[6px] px-[16px] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2F4157]/50" id={`${testPrefix}-group-admin`}>{t(ADMIN_NAV_GROUP.title!)}</p>
          <ul className="space-y-[4px]" aria-labelledby={`${testPrefix}-group-admin`}>
            {ADMIN_NAV_GROUP.items.map((i) => <li key={i.id}><Row item={i} active={isItemActive(i, pathname)} onNavigate={onNavigate} testPrefix={testPrefix} /></li>)}
          </ul>
        </div>
      )}
    </>
  );
}

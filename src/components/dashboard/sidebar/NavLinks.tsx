"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUP, NAV_GROUPS, isNavActive } from "../nav";
import { useStoryAdmin } from "../stories-admin/useStoryAdmin";
import { focusRing } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Grouped dashboard navigation, shared by the desktop sidebar and the mobile drawer.
// Sizes are in px because the site's root font size is 75%: 16px labels, 22px icons, 48px rows.
// Active state: IELSco navy fill (same treatment as the public header), white label and icon.
const itemBase = "group flex min-h-[48px] [@media(max-height:960px)]:min-h-[44px] items-center gap-[14px] rounded-[16px] px-[16px] text-[16px] transition-colors";
const activeCls = "bg-[#2F4157] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_rgba(47,65,87,0.22)]";
const idleCls = "font-medium text-[#2F4157]/80 hover:bg-[#2F4157]/[0.06] hover:text-[#1A2534]";

export function NavLinks({ onNavigate, testPrefix = "nav" }: { onNavigate?: () => void; testPrefix?: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAdmin } = useStoryAdmin();
  const groups = isAdmin ? [...NAV_GROUPS, ADMIN_NAV_GROUP] : NAV_GROUPS;
  return (
    <>
      {groups.map((group, gi) => (
        <div key={group.id} className={cn(gi > 0 && "mt-[18px] [@media(max-height:960px)]:mt-[12px]")}>
          {group.title && <p className="mb-[6px] px-[16px] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#2F4157]/50" id={`${testPrefix}-group-${group.id}`}>{t(group.title)}</p>}
          <ul className="space-y-[4px]" aria-labelledby={group.title ? `${testPrefix}-group-${group.id}` : undefined}>
            {group.items.map(({ key, path, icon: Icon, id }) => {
              const active = isNavActive(path, pathname);
              return (
                <li key={path}>
                  <Link href={path} onClick={onNavigate} data-testid={`${testPrefix}-${id}`} aria-current={active ? "page" : undefined} className={cn(itemBase, focusRing, active ? activeCls : idleCls)}>
                    <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" className={cn("shrink-0", active ? "text-white" : "text-[#2F4157]/70 group-hover:text-[#2F4157]")} />
                    <span className="leading-tight">{t(key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUP, MORE_ITEMS, isItemActive } from "../nav";
import { useStoryAdmin } from "../stories-admin/useStoryAdmin";
import { BottomSheet, sheetRow, sheetRowActive } from "../BottomSheet";
import { GifBanner } from "./GifBanner";
import { ElcoPromo } from "./ElcoPromo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// "More" on phones and tablets (< lg): a bottom sheet with the supporting pages (the fifth top-level menu), the Admin
// group for staff, the GIF banner and the Elco CTA. Same interaction as Elco's "More" sheet.
export function MobileMenu({ open, onClose, returnFocusTo }: { open: boolean; onClose: () => void; returnFocusTo: React.RefObject<HTMLButtonElement | null> }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { isAdmin } = useStoryAdmin();
  const groups = [{ id: "more", title: null as string | null, items: MORE_ITEMS }, ...(isAdmin ? [ADMIN_NAV_GROUP] : [])];

  return (
    <BottomSheet open={open} onClose={onClose} title={t("nav.menu")} returnFocusTo={returnFocusTo} testId="mobile-menu">
      <nav aria-label={t("nav.mainNav")}>
        {groups.map((g) => (
          <div key={g.id} className="mt-[4px] first:mt-0">
            {g.title && <p className="px-[12px] pb-[4px] pt-[8px] text-[12px] font-semibold uppercase tracking-[0.08em] text-[#2F4157]/50" id={`sheet-group-${g.id}`}>{t(g.title)}</p>}
            <ul aria-labelledby={g.title ? `sheet-group-${g.id}` : undefined}>
              {g.items.map((item) => {
                const { key, path, icon: Icon, id } = item;
                const active = isItemActive(item, pathname);
                return (
                  <li key={path}>
                    <Link href={path} onClick={onClose} data-testid={`drawer-${id}`} aria-current={active ? "page" : undefined} className={cn(sheetRow, active && sheetRowActive)}>
                      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" className="shrink-0 text-[#577E90]" />
                      {t(key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <GifBanner className="mt-[16px]" onNavigate={onClose} />
        <ElcoPromo className="mt-[12px]" />
      </nav>
    </BottomSheet>
  );
}

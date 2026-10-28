"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isTabActive, sectionFor } from "./nav";
import { focusRing } from "./ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Sub-navigation of the current top-level menu (Discover, Social or Connect), shown above every page of that menu,
// including older pages that predate the five-menu structure (People, Circle, Resources, Events).
export function SectionTabs() {
  const pathname = usePathname();
  const { t } = useI18n();
  const section = sectionFor(pathname);
  if (!section?.tabs) return null;
  return (
    <nav aria-label={`${t(section.key)} sections`} data-testid={`section-tabs-${section.id}`} className="mx-auto max-w-[110rem] px-4 pt-6 md:px-6 lg:px-10">
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        {section.tabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <li key={tab.href} className="shrink-0">
              <Link href={tab.href} aria-current={active ? "page" : undefined}
                className={cn("inline-flex rounded-full px-4 py-2 text-[14px] font-semibold transition-colors", focusRing,
                  active ? "bg-[#2F4157] text-white shadow-[0_6px_16px_rgba(47,65,87,0.18)]" : "border border-[#E3E7ED] bg-white text-[#2F4157]/80 hover:border-[#577E90] hover:text-[#2F4157]")}>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

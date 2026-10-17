"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NavLinks } from "./NavLinks";
import { GifBanner } from "./GifBanner";
import { ElcoPromo } from "./ElcoPromo";
import { focusRing } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Navigation drawer for phones and tablets (< lg): all destinations, the GIF banner and the Elco CTA.
// Modal dialog: focus moves in, Tab stays inside, Esc / backdrop / route change close it, focus returns to the opener.
export function MobileMenu({ open, onClose, returnFocusTo }: { open: boolean; onClose: () => void; returnFocusTo: React.RefObject<HTMLButtonElement | null> }) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (open && pathname !== firstPath.current) onClose();
    firstPath.current = pathname;
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = returnFocusTo.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [open, onClose, returnFocusTo]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-hidden="true" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#1A2534]/40 backdrop-blur-[2px]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.menu")}
        data-testid="mobile-menu"
        className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-white shadow-[0_20px_60px_rgba(26,37,52,0.25)]"
      >
        <div className="flex items-center justify-between border-b border-[#E3E7ED] px-5 py-4">
          <p className="text-[17px] font-bold text-[#2F4157]">{t("nav.menu")}</p>
          <button type="button" onClick={onClose} data-testid="mobile-menu-close" aria-label={t("nav.closeMenu")} className={cn("rounded-full p-2 text-[#2F4157]/70 hover:bg-[#F1F4F8]", focusRing)}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label={t("nav.mainNav")} className="flex-1 overflow-y-auto px-4 py-4">
          <NavLinks onNavigate={onClose} testPrefix="drawer" />
          <GifBanner className="mt-6" onNavigate={onClose} />
          <ElcoPromo className="mt-4" />
        </nav>
      </div>
    </div>
  );
}

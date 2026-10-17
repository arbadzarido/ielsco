"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ELCO_ENABLED, ELCO_MASCOT, elcoHref } from "@/lib/elco";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Product CTA above the account control: promotes Elco AI (separate app, free to start) with the original mascot.
export function ElcoPromo({ className }: { className?: string }) {
  const { t } = useI18n();
  if (!ELCO_ENABLED) return null;
  return (
    <div data-testid="nav-elco-promo" className={cn("relative overflow-hidden rounded-[18px] border border-[#E3E7ED] bg-gradient-to-br from-white to-[#EEF3F6] p-[14px]", className)}>
      <Image src={ELCO_MASCOT} alt="" width={64} height={63} className="pointer-events-none absolute -bottom-2 -right-1 h-16 w-auto opacity-95" aria-hidden="true" />
      <p className="pr-12 text-[15px] font-bold text-[#1A2534]">{t("elcoPromo.title")}</p>
      <p className="mt-1 pr-12 text-[14px] leading-snug text-[#2F4157]/70 lg:[@media(max-height:960px)]:hidden">{t("elcoPromo.body")}</p>
      <a
        href={elcoHref("sidebar")}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="nav-elco-promo-cta"
        className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#2F4157] px-4 py-2 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_14px_rgba(47,65,87,0.2)] transition-colors hover:bg-[#3d5470] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2"
      >
        {t("elcoPromo.cta")} <ArrowUpRight size={14} aria-hidden="true" />
        <span className="sr-only">{t("elcoPromo.newTab")}</span>
      </a>
    </div>
  );
}

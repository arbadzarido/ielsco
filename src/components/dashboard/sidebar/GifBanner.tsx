"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNavAccess } from "../useNavAccess";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Global Impact Fellowship banner in the dashboard navigation, in the GIF identity (navy #304156 → maroon #914D4D,
// GIF Singapore logo). Delegates go to their dashboard; everyone else to the public program page. No program status,
// deadlines or eligibility are claimed here.
export function GifBanner({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { t } = useI18n();
  const { gifDelegate } = useNavAccess();
  const href = gifDelegate ? "/dashboard/gif" : "/events/gif";
  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-testid="nav-gif-banner"
      className={cn(
        "group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#304156] via-[#3d4560] to-[#914D4D] p-4 text-white shadow-[0_8px_24px_rgba(48,65,86,0.22)] transition-shadow hover:shadow-[0_12px_30px_rgba(145,77,77,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#914D4D] focus-visible:ring-offset-2",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" aria-hidden="true" />
      <span className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 p-1.5 ring-1 ring-white/20">
          <Image src="/images/logos/events/gifsgp.png" alt="" width={40} height={40} className="h-auto max-h-full w-auto object-contain" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD1D1]">GIF Singapore</span>
          <span className="block text-[15px] font-bold leading-snug">Global Impact Fellowship</span>
        </span>
      </span>
      <span className="mt-2 block text-[14px] leading-snug text-white/80 lg:[@media(max-height:960px)]:hidden">{gifDelegate ? t("gif.bannerDelegate") : t("gif.bannerPublic")}</span>
      <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold">
        {gifDelegate ? t("gif.openDashboard") : t("gif.explore")}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

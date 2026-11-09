"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNavAccess } from "../useNavAccess";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { EARLY_BIRD_END } from "@/lib/gif-summer-2027";

// Global Impact Fellowship banner in the dashboard navigation, in the GIF identity (navy #304156 → maroon #914D4D,
// navy GIF logo on a white plate). Delegates (GIF Singapore, Batch 2) go to their dashboard; everyone else sees GIF Summer 2027
// and goes to the public program page, which has the registration form. The Early Bird line shows only while it is open.
export function GifBanner({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { t } = useI18n();
  const { gifDelegate } = useNavAccess();
  const href = gifDelegate ? "/dashboard/gif" : "/events/gif";
  const earlyBird = !gifDelegate && Date.now() < Date.parse(EARLY_BIRD_END);
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-start overflow-hidden rounded-xl bg-white px-1.5">
          {/* The navy GIF mark (left part of the logo); the program name is spelled out next to it. */}
          <Image src="/images/logos/events/gif.png" alt="" width={238} height={87} className="h-8 w-auto max-w-none" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD1D1]">{gifDelegate ? "GIF Singapore" : "GIF Summer 2027"}</span>
          <span className="block text-[15px] font-bold leading-snug">Global Impact Fellowship</span>
        </span>
      </span>
      <span className="mt-2 block text-[14px] leading-snug text-white/80 lg:[@media(max-height:960px)]:hidden">{gifDelegate ? t("gif.bannerDelegate") : t("gif.bannerPublic")}</span>
      {earlyBird && <span className="mt-2 inline-block rounded-full bg-[#F9E15B] px-2.5 py-0.5 text-[12px] font-bold text-[#284055]" suppressHydrationWarning>Early Bird until 20 Nov 2026</span>}
      <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold">
        {gifDelegate ? t("gif.openDashboard") : t("gif.explore")}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

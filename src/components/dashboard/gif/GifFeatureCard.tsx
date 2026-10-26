"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNavAccess } from "../useNavAccess";
import { focusRing } from "../ui";
import { cn } from "@/lib/utils";

// Global Impact Fellowship card for dashboard pages (Home, Events). GIF identity: navy #304156 → maroon #914D4D,
// navy GIF logo on a white plate. Delegates go to their portal; everyone else to the public program page. It states no program
// status, deadlines or results: those live on the GIF pages themselves.
export function GifFeatureCard({ className }: { className?: string }) {
  const { gifDelegate } = useNavAccess();
  return (
    <section
      aria-labelledby="gif-card-heading"
      data-testid="home-gif-access"
      className={cn("relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#304156] via-[#3b4460] to-[#914D4D] text-white shadow-[0_18px_44px_rgba(48,65,86,0.22)]", className)}
    >
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#914D4D]/40 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" aria-hidden="true" />
      <div className="relative grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center md:p-8 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex h-24 items-center justify-center justify-self-start rounded-2xl bg-white px-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)] md:h-28 md:px-5">
          <Image src="/images/logos/events/gif.png" alt="GIF Singapore" width={238} height={87} className="h-12 w-auto object-contain md:h-14" />
        </div>
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#FFD1D1]">Global Impact Fellowship · Singapore</p>
          <h2 id="gif-card-heading" className="mt-1 text-[24px] font-bold leading-tight md:text-[28px]">
            {gifDelegate ? "Your GIF delegate portal" : "IELSco's international fellowship"}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/80">
            {gifDelegate
              ? "Check your screening status, manage your project submissions and read the latest announcements."
              : "Learn what the fellowship involves: the program, its activities in Singapore and how delegates take part."}
          </p>
        </div>
        <Link
          href={gifDelegate ? "/dashboard/gif" : "/events/gif"}
          data-testid="home-gif-access-link"
          className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#304156] shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-colors hover:bg-[#FFF4F4] sm:col-span-2 sm:justify-self-start lg:col-span-1", focusRing)}
        >
          {gifDelegate ? "Open GIF dashboard" : "Explore GIF"} <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

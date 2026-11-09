"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNavAccess } from "../useNavAccess";
import { focusRing } from "../ui";
import { cn } from "@/lib/utils";
import { EARLY_BIRD_END, GIF_REGISTER_URL } from "@/lib/gif-summer-2027";

// Global Impact Fellowship card for dashboard pages (Home, Events). GIF identity: navy #304156 → maroon #914D4D,
// navy GIF logo on a white plate. Delegates (GIF Singapore, Batch 2) go to their portal; everyone else sees GIF Summer 2027 with
// the registration form and, while it is open, the Early Bird deadline (EARLY_BIRD_END).
export function GifFeatureCard({ className }: { className?: string }) {
  const { gifDelegate } = useNavAccess();
  const earlyBird = Date.now() < Date.parse(EARLY_BIRD_END);
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
          <Image src="/images/logos/events/gif.png" alt="Global Impact Fellowship" width={238} height={87} className="h-12 w-auto object-contain md:h-14" />
        </div>
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#FFD1D1]">{gifDelegate ? "Global Impact Fellowship · Singapore" : "Global Impact Fellowship · Summer 2027"}</p>
          <h2 id="gif-card-heading" className="mt-1 text-[24px] font-bold leading-tight md:text-[28px]">
            {gifDelegate ? "Your GIF delegate portal" : "GIF Summer 2027"}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/80">
            {gifDelegate
              ? "Check your screening status, manage your project submissions and read the latest announcements."
              : `Six months of incubation, then Singapore, Malaysia and Thailand by bus (27 July to 3 August 2027, tentative).${earlyBird ? " Early Bird USD 800 until 20 November 2026." : ""}`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:justify-self-start lg:col-span-1 lg:flex-col">
          <Link
            href={gifDelegate ? "/dashboard/gif" : "/events/gif"}
            data-testid="home-gif-access-link"
            className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#304156] shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-colors hover:bg-[#FFF4F4]", focusRing)}
          >
            {gifDelegate ? "Open GIF dashboard" : "Explore GIF"} <ArrowRight size={17} aria-hidden="true" />
          </Link>
          {!gifDelegate && (
            <a
              href={GIF_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="home-gif-register"
              className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F9E15B] px-6 text-[15px] font-semibold text-[#284055] transition-colors hover:bg-white", focusRing)}
            >
              {earlyBird ? "Register for Early Bird" : "Register for GIF Summer 2027"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

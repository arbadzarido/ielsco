"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { GIF_PATHWAYS, GIF_PROGRAMME, GIF_SITE_URL, gifApplyHref, pathwayOpen, pathwayStatus } from "@/lib/gif-summer-2027";
import { focusRing } from "@/components/site/ui";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// GIF Summer 2027 flagship feature for the main site (Events and Products). The programme lives at gif.ielsco.com:
// "Explore programme" goes there; "Apply now" goes to its application (sign-in with the IELSco account first).
// GIF identity inside the IELSco system: Nightfall #304156 panel, Amber #B8862E accents, official logo, own photo.
const AMBER = "#B8862E", AMBER_SOFT = "#E0B865", NIGHTFALL = "#304156";

export function GifFeature({ placement, className }: { placement: "events" | "products" | "home"; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const anyOpen = now !== null && GIF_PATHWAYS.some((p) => pathwayOpen(p, now));
  const click = (cta: string) => track("gif_feature_click", { placement, cta });

  return (
    <article className={cn("overflow-hidden rounded-[24px] border border-[#E6E9EE] bg-white shadow-[0_18px_48px_rgba(26,37,52,0.08)]", className)}
      data-testid={`gif-feature-${placement}`} aria-labelledby={`gif-feature-${placement}-title`}>
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* Programme panel */}
        <div className="relative overflow-hidden p-7 text-white sm:p-9" style={{ background: NIGHTFALL }}>
          <div className="pointer-events-none absolute inset-0" aria-hidden="true"
            style={{ background: "radial-gradient(420px 220px at 0% 0%, rgba(255,255,255,0.08), transparent 70%), radial-gradient(520px 300px at 100% 100%, rgba(184,134,46,0.28), transparent 70%)" }} />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-14 items-center rounded-xl bg-white px-3"><Image src={GIF_PROGRAMME.logo} alt="Global Impact Fellowship" width={238} height={87} className="h-10 w-auto" /></span>
              <span className="rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: "rgba(224,184,101,0.45)", color: AMBER_SOFT }}>Flagship programme</span>
            </div>
            <h2 id={`gif-feature-${placement}-title`} className="mt-6 text-[28px] font-extrabold leading-[1.12] tracking-[-0.01em] sm:text-[34px]">
              {GIF_PROGRAMME.name}<span className="block" style={{ color: AMBER_SOFT }}>{GIF_PROGRAMME.edition}</span>
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white/85">
              <span className="font-semibold text-white">{GIF_PROGRAMME.dates}</span>
              <ol className="flex items-center" aria-label="Programme route">
                {GIF_PROGRAMME.route.map((c, i) => (
                  <li key={c} className="flex items-center">
                    {i > 0 && <span className="mx-2 h-px w-5" style={{ background: "rgba(224,184,101,0.6)" }} aria-hidden="true" />}
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: AMBER_SOFT }} aria-hidden="true" />{c}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-5 max-w-[560px] text-[16px] leading-[1.65] text-white/80">{GIF_PROGRAMME.description}</p>

            <ul className="mt-6 grid gap-2.5 sm:grid-cols-3" aria-label="Ways to join">
              {GIF_PATHWAYS.map((p) => {
                const open = now !== null && pathwayOpen(p, now);
                return (
                  <li key={p.key} className="rounded-2xl border border-white/12 bg-white/[0.06] p-3.5">
                    <p className="text-[15px] font-bold">{p.name}</p>
                    <p className="mt-1 text-[13px] leading-snug text-white/70">{p.line}</p>
                    <p className="mt-2 text-[12px] font-semibold" style={{ color: open ? "#9FD9B9" : AMBER_SOFT }} suppressHydrationWarning>{now === null ? " " : pathwayStatus(p, now)}</p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={GIF_SITE_URL} onClick={() => click("explore")} className={cn("inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-[#1A2534] hover:bg-[#F5EEDF]", focusRing)}>
                Explore programme <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              {anyOpen && (
                <a href={gifApplyHref()} onClick={() => click("apply")} className={cn("inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border px-6 text-[16px] font-semibold text-white hover:bg-white/10", focusRing)} style={{ borderColor: "rgba(224,184,101,0.55)" }}>
                  Apply now <ArrowRight size={18} aria-hidden="true" />
                </a>
              )}
            </div>
            <p className="mt-4 text-[13px] text-white/55">Partial Funded places are awarded through the Fully Funded selection.</p>
          </div>
        </div>

        {/* Programme photo (own GIF 2026 photo) */}
        <figure className="relative min-h-[260px] lg:min-h-0">
          <Image src="/images/gif/nus-sign.jpg" alt="GIF 2026 delegates in fellowship T-shirts in front of the NUS sign" fill sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" style={{ objectPosition: "center 40%" }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 55%, rgba(48,65,86,0.78))` }} aria-hidden="true" />
          <figcaption className="absolute bottom-4 left-5 right-5 text-[13px] font-medium text-white/90">
            <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: AMBER }} aria-hidden="true" />GIF 2026 delegates at NUS, Singapore
          </figcaption>
        </figure>
      </div>
    </article>
  );
}

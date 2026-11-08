"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/site/ui";

export type CarouselPhoto = { src: string; alt: string; caption: string };

// A compact, auto-rotating slideshow: one fixed 16:10 frame, crossfade, prev/next and dots, pauses on hover/focus and
// when the tab is hidden, and doesn't auto-rotate for people who prefer reduced motion.
export function PhotoCarousel({ photos, interval = 5000, className }: { photos: CarouselPhoto[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useRef(false);
  const n = photos.length;
  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  useEffect(() => { reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useEffect(() => {
    if (paused || reduce.current || n < 2) return;
    const t = window.setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % n); }, interval);
    return () => window.clearInterval(t);
  }, [paused, interval, n]);

  return (
    <div className={cn("relative", className)} data-testid="careers-photo-carousel" aria-roledescription="carousel" aria-label="IELSco moments"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] border border-[#E6E9EE] bg-[#F1F4F8]">
        {photos.map((p, k) => (
          <figure key={p.src} className={cn("absolute inset-0 transition-opacity duration-700 ease-out", k === i ? "opacity-100" : "pointer-events-none opacity-0")}
            aria-hidden={k !== i} aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
            <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover grayscale" priority={k === 0} loading={k === 0 ? undefined : "lazy"} />
            <figcaption className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-[#1A2534]">
              <MapPin size={14} aria-hidden="true" className="text-[#577E90]" />{p.caption}
            </figcaption>
          </figure>
        ))}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button type="button" onClick={() => go(i - 1)} className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1A2534] hover:bg-white", focusRing)} aria-label="Previous photo" data-testid="carousel-prev"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => go(i + 1)} className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1A2534] hover:bg-white", focusRing)} aria-label="Next photo" data-testid="carousel-next"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Choose a photo">
        {photos.map((p, k) => (
          <button key={p.src} type="button" role="tab" aria-selected={k === i} aria-label={p.caption} onClick={() => go(k)}
            className={cn("h-2 rounded-full transition-all", focusRing, k === i ? "w-6 bg-[#2F4157]" : "w-2 bg-[#C9D1DC] hover:bg-[#9AA8B8]")} />
        ))}
      </div>
    </div>
  );
}

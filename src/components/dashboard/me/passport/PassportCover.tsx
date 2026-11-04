"use client";

import { ElcoMascot } from "@/components/elco/ElcoMascot";

// The navy cover: gold-foil emblem, title and the small Elco robot. The mascot plays its own gentle idle loop
// (blink, an occasional wave) and is switched off under prefers-reduced-motion by the mascot's own CSS.
export function PassportCover({ name }: { name: string }) {
  return (
    <header data-testid="passport-cover" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2F4157] to-[#1A2534] px-6 py-7 text-white shadow-[0_18px_40px_-24px_rgba(26,37,52,0.9)] md:px-10 md:py-9">
      <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[1.25rem] border border-[#D9B45F]/30" />
      <div className="relative flex items-center gap-5 md:gap-8">
        <svg aria-hidden="true" viewBox="0 0 64 64" className="h-16 w-16 shrink-0 text-[#D9B45F] md:h-20 md:w-20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="32" cy="32" r="28" /><circle cx="32" cy="32" r="22" strokeDasharray="2 3" />
          <ellipse cx="32" cy="32" rx="11" ry="22" /><path d="M10 32h44M14 21h36M14 43h36" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#D9B45F]">IELSco × Elco AI</p>
          <h1 className="mt-1 text-[32px] font-bold leading-none tracking-wide md:text-[44px]">Elco-Pass</h1>
          <p className="mt-2 truncate text-[15px] text-white/75">Learning passport of {name}</p>
        </div>
        <ElcoMascot mood="wave" size={72} className="hidden sm:inline-block" />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { focusRing } from "../../ui";
import { cn } from "@/lib/utils";

export type StampTone = "navy" | "teal" | "coral" | "gold";
const TONE: Record<StampTone, string> = {
  navy: "border-[#2F4157] text-[#2F4157]", teal: "border-[#577E90] text-[#3F6475]", coral: "border-[#E56668] text-[#B94B4D]", gold: "border-[#B8862B] text-[#8A5A00]",
};

// Small deterministic tilt so stamps look pressed by hand, but never change between renders.
const tilt = (seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 9) - 4;
};

export interface StampProps { id: string; icon: LucideIcon; tone: StampTone; kind: string; title: string; date?: string; href?: string }

// A passport stamp. Rendered only for something the member really has (see PassportPages); `kind` is the short label
// inside the ring, `title` the caption underneath so the stamp is readable without colour or rotation.
export function Stamp({ id, icon: Icon, tone, kind, title, date, href }: StampProps) {
  const ring = (
    <span style={{ transform: `rotate(${tilt(id)}deg)` }}
      className={cn("flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full border-[3px] bg-white/40 p-1 text-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.9),inset_0_0_0_4.5px_currentColor]", TONE[tone])}>
      <Icon size={20} aria-hidden="true" />
      <span className="mt-0.5 max-w-[80px] text-[11px] font-bold uppercase leading-tight tracking-[0.08em]">{kind}</span>
      {date && <span className="mt-0.5 text-[11px] font-semibold tabular-nums opacity-80">{date}</span>}
    </span>
  );
  const body = (
    <>
      {ring}
      <span className="mt-2 line-clamp-2 max-w-[132px] text-center text-[13px] font-medium leading-snug text-[#1A2534]">{title}</span>
    </>
  );
  const cls = "flex flex-col items-center rounded-xl p-2";
  return href
    ? <Link href={href} className={cn(cls, "hover:bg-[#2F4157]/5", focusRing)}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

// A page with no stamps yet: an honest empty slot that states the real rule for earning the first one.
export function EmptyStampSlot({ rule }: { rule: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-[#2F4157]/20 p-4">
      <span aria-hidden="true" className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#2F4157]/25 text-[12px] font-semibold uppercase tracking-wide text-[#2F4157]/40">Stamp</span>
      <p className="text-[15px] text-[#2F4157]/75">{rule}</p>
    </div>
  );
}

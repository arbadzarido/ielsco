"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { focusRing } from "../../ui";
import { cn } from "@/lib/utils";

export interface BookPage { id: string; label: string; icon: LucideIcon; content: ReactNode }

// The open passport: page tabs along the top edge and a paper page below. Standard tabs pattern (arrow keys, Home/End
// move between pages, only the open page is tabbable), so it works with keyboard and screen readers.
export function PassportBook({ pages }: { pages: BookPage[] }) {
  const [open, setOpen] = useState(pages[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const idx = Math.max(0, pages.findIndex((p) => p.id === open));
  const go = (i: number) => { const p = pages[(i + pages.length) % pages.length]; setOpen(p.id); refs.current[p.id]?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(pages.length - 1); }
  };
  const page = pages[idx];
  return (
    <div data-testid="passport-book">
      <div role="tablist" aria-label="Elco-Pass pages" onKeyDown={onKey} className="flex gap-1 overflow-x-auto px-2 pt-1">
        {pages.map((p, i) => {
          const on = i === idx;
          return (
            <button key={p.id} ref={(el) => { refs.current[p.id] = el; }} role="tab" id={`pp-tab-${p.id}`} aria-selected={on} aria-controls={`pp-panel-${p.id}`}
              tabIndex={on ? 0 : -1} onClick={() => setOpen(p.id)} data-testid={`passport-tab-${p.id}`}
              className={cn("-mb-px inline-flex shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-[15px] font-semibold transition-colors", focusRing,
                on ? "border-[#2F4157]/15 bg-[#FBF8F1] text-[#1A2534]" : "border-transparent bg-[#2F4157]/10 text-[#2F4157]/70 hover:bg-[#2F4157]/15")}>
              <p.icon size={16} aria-hidden="true" /> {p.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`pp-panel-${page.id}`} aria-labelledby={`pp-tab-${page.id}`} tabIndex={0}
        className={cn("relative rounded-2xl rounded-tl-none border border-[#2F4157]/15 bg-[#FBF8F1] p-5 shadow-[0_10px_30px_-22px_rgba(26,37,52,0.6)] md:p-8", focusRing)}>
        <p aria-hidden="true" className="absolute right-5 top-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2F4157]/35">Page {idx + 1} / {pages.length}</p>
        {page.content}
      </div>
    </div>
  );
}

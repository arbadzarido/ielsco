import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "./ui";

// Native <details> FAQ: keyboard- and screen-reader-friendly without JavaScript, and indexable.
export function Faq({ items, className }: { items: { q: string; a: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-[#E6E9EE] rounded-[20px] border border-[#E6E9EE] bg-white", className)}>
      {items.map((it) => (
        <details key={it.q} className="group px-6">
          <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold text-[#1A2534] [&::-webkit-details-marker]:hidden", focusRing)}>
            {it.q}
            <ChevronDown size={18} className="shrink-0 text-[#577E90] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="pb-6 text-[16px] leading-[1.65] text-[#2F4157]/80">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

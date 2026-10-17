import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ELCO_ENABLED, ELCO_MASCOT, elcoHref } from "@/lib/elco";
import { focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Compact, contextual pointer to Elco AI. One per page, in places where English practice genuinely helps.
// Copy is passed in so each page can say why Elco is relevant there.
export function ElcoCallout({
  refId,
  title,
  body,
  cta = "Start learning with Elco",
  className,
}: {
  refId: string;
  title: string;
  body: string;
  cta?: string;
  className?: string;
}) {
  if (!ELCO_ENABLED) return null;
  return (
    <aside
      data-testid={`elco-callout-${refId}`}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_30px_rgba(47,65,87,0.07)] sm:flex-row sm:items-center md:p-6",
        className
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F7F8FA]">
        <Image src={ELCO_MASCOT} alt="" width={40} height={39} className="h-10 w-auto" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#C04C4E]">Elco AI</p>
        <p className="mt-1 text-lg font-bold text-[#2F4157]">{title}</p>
        <p className="mt-1 text-base text-[#2F4157]/70">{body}</p>
      </div>
      <a
        href={elcoHref(refId)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#2F4157] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#3d5470]",
          focusRing
        )}
      >
        {cta} <ArrowUpRight size={16} />
      </a>
    </aside>
  );
}

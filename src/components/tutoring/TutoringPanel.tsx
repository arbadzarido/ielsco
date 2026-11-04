import { ArrowUpRight, Bot, UserRound } from "lucide-react";
import { body, btnPrimary, btnSecondary, card, h3 } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { elcoHref } from "@/lib/elco";
import { ELCO_TEST_PREP_TEXT, TUTOR_PRICE_LABEL, tutorRequestUrl } from "./links";

// Public explainer: Elco AI for learning and test prep, a person for private tutoring. Used on the Programs hub and the
// tutoring page so the distinction reads the same everywhere.
export function TutoringPanel({ refId, className }: { refId: string; className?: string }) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2", className)} data-testid="learn-two-ways">
      <div className={cn(card, "flex flex-col p-7")}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><Bot size={20} aria-hidden="true" /></span>
        <h3 className={cn(h3, "mt-5 text-[22px]")}>Learn and practise with Elco AI</h3>
        <p className={cn(body, "mt-2 flex-1 text-[15px]")}>
          Elco AI is the primary place to learn and practise English: courses, learning tools and test preparation, any time.
          Test prep that is live: {ELCO_TEST_PREP_TEXT}
        </p>
        <a href={elcoHref(refId)} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, "mt-6 self-start")}>Access Elco AI <ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
      <div className={cn(card, "flex flex-col p-7")}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><UserRound size={20} aria-hidden="true" /></span>
        <h3 className={cn(h3, "mt-5 text-[22px]")}>Add a private human tutor</h3>
        <p className={cn(body, "mt-2 flex-1 text-[15px]")}>
          Need a person to correct, coach and keep you accountable? IELSco tutors work with you one to one, at {TUTOR_PRICE_LABEL}.
          You request each session when you need it. There is no course subscription.
        </p>
        <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "mt-6 self-start")}>Request a private tutor <ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
    </div>
  );
}

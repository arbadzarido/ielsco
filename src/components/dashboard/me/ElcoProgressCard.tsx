"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Link2 } from "lucide-react";
import type { ElcoSnapshot } from "@/lib/me/records";
import { ELCO_ENABLED, ELCO_MASCOT, ELCO_URL } from "@/lib/elco";
import { btnPrimary, btnSecondary, cardGloss } from "../ui";
import { cn } from "@/lib/utils";

const LEVEL: Record<string, string> = {
  beginner: "Beginner", elementary: "Elementary", intermediate: "Intermediate", upper_intermediate: "Upper-intermediate", advanced: "Advanced",
};
const SKILL_PAGES = new Set(["speaking", "listening", "reading", "writing", "grammar"]);

function ago(iso: string, now = Date.now()) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

// "Continue learning": the latest snapshot Elco AI shares with IELSco (elco_learning_summaries, written by Elco only
// while the member's link allows it). Three honest states: not linked, linked without a snapshot yet, snapshot.
export function ElcoProgressCard({ elco, className }: { elco: ElcoSnapshot | null; className?: string }) {
  if (!ELCO_ENABLED) return null;
  const focus = elco?.focus_skills ?? [];
  const suggested = focus.find((s) => SKILL_PAGES.has(s.toLowerCase()));
  const practiceHref = `${ELCO_URL}${suggested ? `/learn/skill/${suggested.toLowerCase()}` : "/dashboard"}?ref=ielsco-home-continue`;

  return (
    <section aria-labelledby="continue-heading" data-testid="home-continue-learning" className={cn(cardGloss, "relative overflow-hidden p-6", className)}>
      <Image src={ELCO_MASCOT} alt="" width={96} height={94} aria-hidden="true" className="pointer-events-none absolute -bottom-3 -right-2 h-24 w-auto opacity-90" />
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#C04C4E]">Elco AI</p>
      <h2 id="continue-heading" className="mt-1 text-[22px] font-bold">Continue learning</h2>

      {!elco?.linked ? (
        <div className="pr-20">
          <p className="mt-2 text-[16px] text-[#2F4157]/70">Link your Elco AI account to see your practice, level estimate and focus skills here and in your Elco-Pass. You choose what&apos;s shared.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/connect/elco" data-testid="home-elco-link" className={btnPrimary}><Link2 size={16} aria-hidden="true" /> Link Elco AI</Link>
          </div>
        </div>
      ) : !elco.generated_at ? (
        <div className="pr-20">
          <p className="mt-2 text-[16px] text-[#2F4157]/70">Your accounts are linked. Your progress appears here after your next practice in Elco.</p>
          <a href={practiceHref} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, "mt-4")}>Practise in Elco <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      ) : (
        <div className="pr-16">
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div><dt className="text-[13px] text-[#2F4157]/60">Level estimate</dt><dd className="text-[17px] font-semibold">{elco.level_estimate ? LEVEL[elco.level_estimate] : "Not yet"}</dd></div>
            <div><dt className="text-[13px] text-[#2F4157]/60">Practice, last 30 days</dt><dd className="text-[17px] font-semibold">{elco.practice_count_30d}</dd></div>
            <div><dt className="text-[13px] text-[#2F4157]/60">Last activity</dt><dd className="text-[17px] font-semibold">{elco.last_active_at ? ago(elco.last_active_at) : "—"}</dd></div>
          </dl>
          {focus.length > 0 && <p className="mt-3 text-[15px] text-[#2F4157]/75">Focus skills: <strong>{focus.join(", ")}</strong></p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={practiceHref} target="_blank" rel="noopener noreferrer" data-testid="home-elco-continue" className={btnPrimary}>
              {suggested ? `Practise ${suggested.toLowerCase()}` : "Continue in Elco"} <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <Link href="/dashboard/passport" className={btnSecondary}>See my journey</Link>
          </div>
          <p className="mt-3 text-[13px] text-[#2F4157]/55">Shared by Elco AI on {new Date(elco.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. The level is Elco&apos;s estimate, not a certificate.</p>
        </div>
      )}
    </section>
  );
}

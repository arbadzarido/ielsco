"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { ErrorState, LoadingState, PageHeader } from "../PageStates";
import { useMyRecords } from "../useMyRecords";
import { btnLink, cardGloss } from "../ui";
import { badgeStates, type BadgeDef } from "@/lib/me/badges";
import { cn } from "@/lib/utils";

const GROUPS: { id: BadgeDef["group"]; label: string }[] = [
  { id: "speaking", label: "Speaking" }, { id: "consistency", label: "Consistency" }, { id: "learning", label: "Learning" },
  { id: "community", label: "Community" }, { id: "opportunities", label: "Opportunities" },
];

// Milestone Hall: every badge, how to earn it and the member's own progress (lib/me/badges.ts). Personal only: no
// leaderboard and no points until that design has been reviewed (docs/IELSCO-PRODUCT-ARCHITECTURE.md §9).
export function MilestoneHall({ user }: DashboardCtx) {
  const { state, reload } = useMyRecords(user.id);
  if (state.s === "loading") return <LoadingState />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={reload} />;
  if (state.s === "signed-out") return null;
  const states = badgeStates(state.data);
  const earned = states.filter((s) => s.earned).length;
  return (
    <div className="mx-auto max-w-[110rem] space-y-8 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <PageHeader title="Milestone Hall" description={`${earned} of ${states.length} badges earned. Badges come from what you actually do on IELSco and Elco AI, and are only visible to you.`} />
      {GROUPS.map((g) => {
        const list = states.filter((s) => s.def.group === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id} aria-labelledby={`group-${g.id}`} className="space-y-3">
            <h2 id={`group-${g.id}`} className="text-[20px] font-bold">{g.label}</h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map(({ def, value, earned: done }) => {
                return (
                  <li key={def.id} data-testid={`badge-${def.id}`} className={cn(cardGloss, "p-5", done && "border-[#8A5A00]/30 bg-gradient-to-br from-[#FDF3E3] to-white")}>
                    <div className="flex items-start gap-3">
                      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", done ? "bg-[#8A5A00] text-white" : "bg-[#F1F4F8] text-[#2F4157]/50")}><Trophy size={20} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-[17px] font-bold">{def.name}{done ? <CheckCircle2 size={16} className="text-[#2E6B4F]" aria-label="Earned" /> : <Circle size={16} className="text-[#2F4157]/30" aria-label="Not earned yet" />}</p>
                        <p className="text-[15px] text-[#2F4157]/70">{done ? def.description : def.how}</p>
                      </div>
                    </div>
                    {!done && (value === null ? (
                      <p className="mt-3 text-[14px]"><Link href="/dashboard/connect/elco" className={btnLink}>Link Elco AI to track this</Link></p>
                    ) : (
                      <p className="mt-3 text-[14px] text-[#2F4157]/65">{Math.min(value, def.target)} of {def.target}</p>
                    ))}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="rounded-2xl border border-dashed border-[#E3E7ED] bg-white/60 p-5 text-[15px] text-[#2F4157]/70">
        Monthly recognition (members the IELS team highlights each month) isn&apos;t running yet. When it starts, highlighted members are asked for consent first and appear in Beyond the Circle.
      </p>
    </div>
  );
}

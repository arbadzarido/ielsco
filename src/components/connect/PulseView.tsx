"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Briefcase, Clapperboard, Quote, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState } from "@/components/dashboard/PageStates";
import { ACCENTS, cardGloss, focusRing, tag } from "@/components/dashboard/ui";
import { ElcoMascot } from "@/components/elco/ElcoMascot";
import { kindAccent, loadOpportunities, opportunityItems, PULSE_KINDS, resourceItems, sortPulse, storyItems, type PulseItem, type PulseKind } from "@/lib/pulse";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, useLoad } from "./shared";

const ICON: Record<PulseKind, LucideIcon> = { opportunity: Briefcase, story: Quote, guide: BookOpen, video: Clapperboard, growth: Sprout };
const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : null);

export function PulseCard({ item, compact }: { item: PulseItem; compact?: boolean }) {
  const a = ACCENTS[kindAccent(item.kind)];
  const Icon = ICON[item.kind];
  const body = (
    <>
      <div className={cn("relative overflow-hidden", item.image ? (compact ? "aspect-[16/7]" : "aspect-[16/9]") : compact ? "h-20" : "h-28", a.soft)}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", a.gradient)} aria-hidden="true">
            <Icon size={compact ? 28 : 36} strokeWidth={1.6} className={a.text} />
          </div>
        )}
        <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm", a.strong)}>{item.label}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{item.title}</h3>
        {!compact && <p className="line-clamp-3 text-base text-[#2F4157]/70">{item.summary}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-sm text-[#2F4157]/60">
          {item.closed && <span className={cn(tag, "bg-[#FDECEC] text-[#B4383A]")}>Closed</span>}
          {item.badge && <span className={tag}>{item.badge}</span>}
          <span>{item.source}</span>
          {item.date && item.dateLabel && <span>· {item.dateLabel} {day(item.date)}</span>}
          {item.external && <ArrowUpRight size={15} aria-label="opens the original source in a new tab" />}
        </div>
      </div>
    </>
  );
  const cls = cn(cardGloss, "flex h-full flex-col overflow-hidden transition-colors hover:border-[#577E90]", focusRing);
  const onClick = () => track("pulse_item_opened", { kind: item.kind, external: item.external });
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onClick} data-testid={`pulse-${item.id}`}>{body}</a>
  ) : (
    <Link href={item.href} className={cls} onClick={onClick} data-testid={`pulse-${item.id}`}>{body}</Link>
  );
}

export function usePulse(ctx: Pick<DashboardCtx, "supabase">) {
  const stories = usePublishedStories(12);
  const opps = useLoad(() => loadOpportunities(ctx.supabase), [ctx.supabase]);
  const items = useMemo(() => sortPulse([
    ...(opps.state.s === "ready" ? opportunityItems(opps.state.data) : []), ...storyItems(stories), ...resourceItems(),
  ]), [opps.state, stories]);
  return { items, state: opps.state, reload: opps.reload };
}

export function PulseView(ctx: DashboardCtx) {
  const pulse = usePulse(ctx);
  const [kind, setKind] = useState<PulseKind | "all">("all");
  const shown = kind === "all" ? pulse.items : pulse.items.filter((i) => i.kind === kind);
  const counts = Object.fromEntries(PULSE_KINDS.map((k) => [k.value, pulse.items.filter((i) => i.kind === k.value).length]));

  return (
    <ConnectFrame title="IELSco Pulse" description="Opportunities, member stories and hand-picked guides, videos and tools in one place. External links open the original source.">
      <div role="tablist" aria-label="Content type" className="flex flex-wrap gap-2">
        {[{ value: "all" as const, label: "All", accent: "navy" as const }, ...PULSE_KINDS].map((k) => {
          const on = kind === k.value;
          const a = ACCENTS[k.accent];
          return (
            <button key={k.value} role="tab" type="button" aria-selected={on} onClick={() => setKind(k.value)}
              className={cn("rounded-full px-4 py-2 text-[14px] font-semibold transition-colors", focusRing, on ? a.strong : cn("border bg-white", a.ring, a.text))}>
              {k.label}{k.value !== "all" && ` (${counts[k.value] ?? 0})`}
            </button>
          );
        })}
      </div>
      {pulse.state.s !== "ready" && <LoadGate state={pulse.state} onRetry={pulse.reload} label="Loading Pulse…" />}
      {pulse.state.s === "ready" && shown.length === 0 && <EmptyState title="Nothing here yet" body="The IELS team adds new items every week." />}
      {shown.length > 0 && <div data-testid="pulse-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((i) => <PulseCard key={i.id} item={i} />)}</div>}
      <section className={cn(cardGloss, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center")}>
        <ElcoMascot mood="happy" size={80} />
        <div className="flex-1">
          <h2 className="text-xl font-bold">Have a story worth sharing?</h2>
          <p className="text-base text-[#2F4157]/70">Member stories are written with members and checked by the IELS team before they appear here.</p>
        </div>
        <Link href="/circle/stories/submit" className={cn("rounded-full bg-[#2F4157] px-5 py-2.5 font-semibold text-white", focusRing)}>Share your story</Link>
      </section>
    </ConnectFrame>
  );
}

"use client";

import { useState } from "react";
import ElcoActor from "@/components/brand/ElcoActorLazy";
import type { Act } from "@/components/brand/ElcoActor";
import { pickTip, type TipContext } from "@/lib/loadingTips";
import { useDelayed } from "@/lib/motion";

// The "still working" part of ElcoLoader: Elco, a quiet message, an indeterminate bar and (after ~1.2 s more) a tip.
// Its own file so that route bundles carry only the tiny ElcoLoader; this loads when a wait is actually long.
const POSE: Record<TipContext, { pose: string; act: Act | null }> = {
  opportunities: { pose: "reading", act: null },
  learning: { pose: "reading", act: null },
  community: { pose: "talking", act: "talk" },
  events: { pose: "presenting", act: null },
  general: { pose: "thinking", act: "wait" },
};

export default function ElcoWait({ context = "general", message, tipAfter = 1200, progress = null, compact = false, testid = "elco-wait" }: {
  context?: TipContext; message?: string; tipAfter?: number; progress?: number | null; compact?: boolean; testid?: string;
}) {
  const [tip] = useState(() => pickTip(context));
  const showTip = useDelayed(tipAfter);
  const p = POSE[context] || POSE.general;
  return (
    <div className={`flex ${compact ? "items-center gap-4 text-left" : "flex-col items-center text-center"}`} data-testid={testid} data-context={context}>
      <span className={`flex shrink-0 items-end justify-center rounded-full bg-[#EEF2F6] ${compact ? "h-[64px] w-[64px]" : "h-[104px] w-[104px]"}`}>
        <ElcoActor pose={p.pose} act={p.act} idle style={{ height: compact ? 56 : 92 }} testid="elco-wait-actor" />
      </span>
      <div className={compact ? "min-w-0" : "mt-4 max-w-[380px]"}>
        <p className="text-[16px] font-semibold text-[#1A2534]">{message || "Still working on it…"}</p>
        <div className={`elco-bar mt-2 h-[4px] overflow-hidden rounded-full bg-[#E8EEF3] ${compact ? "w-[160px]" : "mx-auto w-[192px]"}`} aria-hidden="true">
          {progress === null ? <span className="bg-[#577E90]" /> : <span className="!animate-none bg-[#577E90]" style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`, transform: "none" }} />}
        </div>
        {tip && (
          <p className={`mt-3 text-[14px] leading-snug text-[#4A5B70] transition-opacity duration-500 ${showTip ? "opacity-100" : "opacity-0"}`} data-testid="elco-tip" aria-hidden={!showTip}>
            <span className="mr-2 rounded-full bg-[#E8EEF3] px-2 py-[2px] text-[11px] font-bold uppercase tracking-wide text-[#2F4157]">{tip.kind} tip</span>{tip.text}
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { tipContextFor, type TipContext } from "@/lib/tipContext";
import { useDelayed } from "@/lib/motion";

// The loading experience, in stages, so waiting feels shorter without ever slowing anything down. Mirrors Elco AI's
// components/feedback/ElcoLoader.jsx:
//   0 ms     the skeleton of the coming content (`skeleton`), immediately; nothing else
//   ~800 ms  if it is still loading, Elco appears with a quiet "still working" line
//   ~2 s     a short tip for this part of the site (lib/loadingTips.ts)
// Content replaces the loader the moment it arrives: no minimum display time and no fake percentage. The bar only says
// "working"; pass `progress` (0-1) when real progress is known. Elco, the tips and the mascot code (ElcoWait) are loaded
// only when a wait passes the first stage, so every route's loading.tsx stays tiny.
const ElcoWait = dynamic(() => import("./ElcoWait"), { ssr: false });

/**
 * <ElcoLoader skeleton={<SkeletonList rows={3} />} />      the skeleton now; Elco and a tip only if it takes a while
 * <ElcoLoader fullPage message="Opening your dashboard…" /> route-level waits with no skeleton available
 * context: opportunities | learning | community | events | general (default: from the current route)
 */
export default function ElcoLoader({ skeleton = null, message, context, fullPage = false, delay = 800, progress = null, label = "Loading", testid = "elco-loader" }: {
  skeleton?: ReactNode; message?: string; context?: TipContext; fullPage?: boolean; delay?: number; progress?: number | null; label?: string; testid?: string;
}) {
  const pathname = usePathname();
  const ctx = context || tipContextFor(pathname || "");
  const late = useDelayed(delay);
  const wait = <ElcoWait context={ctx} message={message} progress={progress} compact={!!skeleton} />;
  return (
    <div className={fullPage ? "flex min-h-[60vh] w-full items-center justify-center px-4 py-10" : ""} role="status" aria-live="polite" aria-busy="true" data-testid={testid}>
      <span className="sr-only">{message || label}</span>
      {skeleton ? (
        <div>
          {/* Floats over the page (fixed), so Elco arriving never pushes the skeleton down: no layout shift. */}
          {late && <div className="elco-fade pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-30 w-[calc(100%-32px)] max-w-[460px] -translate-x-1/2 rounded-3xl border border-[#E3E7ED] bg-white/95 p-3 shadow-[0_12px_32px_rgba(26,37,52,0.14)] backdrop-blur md:bottom-8" aria-hidden="true">{wait}</div>}
          {skeleton}
        </div>
      ) : late ? <div className="elco-fade">{wait}</div> : <div className="min-h-[8rem]" aria-hidden="true" />}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Small, dependency-free product tour.
// - Each step points at the first VISIBLE element matching one of its selectors (desktop sidebar vs. mobile tab bar).
//   Steps whose target is missing are skipped; a step without targets is shown centred.
// - Accessible: role="dialog" + aria-modal, focus moves into the dialog and is trapped, Esc skips, focus is restored.
// - Mobile (< 640px): the card is a bottom sheet instead of an anchored popover.
// The Elco app has a JavaScript port of this component with the same behaviour.

export interface TourStep {
  id: string;
  targets?: string[];
  title: string;
  body: string;
}

export interface TourLabels {
  next: string;
  back: string;
  finish: string;
  skip: string;
  step: (n: number, total: number) => string;
  close: string;
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;

function findVisible(selectors?: string[]): HTMLElement | null {
  for (const sel of selectors || []) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none") return el;
    }
  }
  return null;
}

export function ProductTour({ steps, open, labels, onFinish, onSkip }: {
  steps: TourStep[];
  open: boolean;
  labels: TourLabels;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1024);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Resolve which steps can be shown right now (missing targets are dropped, untargeted steps kept).
  const active = useMemo(() => {
    if (!open || typeof window === "undefined") return [];
    return steps.filter((s) => !s.targets?.length || findVisible(s.targets));
  }, [open, steps]);
  const step = active[index];

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    const el = step ? findVisible(step.targets) : null;
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  useEffect(() => { if (open) setIndex(0); }, [open]);

  // Bring the target into view, then measure.
  useEffect(() => {
    if (!open || !step) return;
    const el = findVisible(step.targets);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const t = window.setTimeout(measure, reduce ? 0 : 350);
    return () => window.clearTimeout(t);
  }, [open, step, measure]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Entry animations / sidebar transitions can move the target after the first measurement.
    const poll = window.setInterval(measure, 250);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(poll);
    };
  }, [open, measure]);

  // Focus management: remember the trigger, focus the dialog, restore on close.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    return () => restoreRef.current?.focus?.();
  }, [open]);
  useEffect(() => {
    if (open && step) dialogRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus();
  }, [open, step]);

  const next = useCallback(() => (index >= active.length - 1 ? onFinish() : setIndex((i) => i + 1)), [index, active.length, onFinish]);
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onSkip(); return; }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!open || !step || typeof document === "undefined") return null;

  const mobile = vw < 640;
  const cardW = Math.min(360, vw - 32);
  let style: React.CSSProperties = {};
  if (!mobile) {
    if (rect) {
      const below = rect.top + rect.height + 12;
      const fitsBelow = below + 220 < window.innerHeight;
      const top = fitsBelow ? below : Math.max(16, rect.top - 12 - 220);
      const left = Math.min(Math.max(16, rect.left), vw - cardW - 16);
      style = { position: "fixed", top, left, width: cardW };
    } else {
      style = { position: "fixed", top: "50%", left: "50%", width: cardW, transform: "translate(-50%, -50%)" };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" data-testid="product-tour">
      {/* Dimmed backdrop with a cut-out around the target (or a plain backdrop for centred steps). */}
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-2 ring-white/80 transition-all duration-200 motion-reduce:transition-none"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(26,37,52,0.55)" }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[#1A2534]/55" />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        onKeyDown={onKeyDown}
        data-testid="product-tour-dialog"
        style={style}
        className={cn(
          "border border-[#E3E7ED] bg-white p-5 text-[#2F4157] shadow-[0_24px_60px_rgba(26,37,52,0.25)]",
          mobile ? "fixed inset-x-0 bottom-0 rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]" : "rounded-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p aria-live="polite" className="text-sm font-semibold text-[#577E90]" data-testid="product-tour-step">{labels.step(index + 1, active.length)}</p>
          <button type="button" onClick={onSkip} aria-label={labels.close} className={cn("rounded-full p-1 text-[#2F4157]/60 hover:text-[#2F4157]", focusRing)}>
            <X size={18} />
          </button>
        </div>
        <h2 id="tour-title" className="mt-2 text-xl font-bold">{step.title}</h2>
        <p id="tour-body" className="mt-2 text-base leading-relaxed text-[#2F4157]/75">{step.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onSkip} data-testid="product-tour-skip" className={cn("rounded-full px-2 py-1 text-base font-semibold text-[#2F4157]/60 hover:text-[#2F4157]", focusRing)}>
            {labels.skip}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={back} disabled={index === 0} data-testid="product-tour-back"
              className={cn("rounded-full border border-[#E3E7ED] px-4 py-2 text-base font-semibold disabled:opacity-40", focusRing)}>
              {labels.back}
            </button>
            <button type="button" onClick={next} data-tour-primary data-testid="product-tour-next"
              className={cn("rounded-full bg-[#2F4157] px-5 py-2 text-base font-semibold text-white hover:bg-[#3d5470]", focusRing)}>
              {index >= active.length - 1 ? labels.finish : labels.next}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

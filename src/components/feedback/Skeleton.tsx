import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Skeletons: the shape of the content that is coming, shown immediately while data loads (no blank screens, no layout
// jump). Mirrors Elco AI's components/feedback/Skeleton.jsx (same primitives), in IELSco's palette and px type scale.
// Decorative to screen readers: the surrounding SkeletonRegion announces "Loading" once. The shimmer is a slow opacity
// pulse (.sk in globals.css), off with prefers-reduced-motion.
//
//   <SkeletonRegion label="Loading opportunities"><SkeletonGrid count={4} /></SkeletonRegion>
export function Skeleton({ className, style, rounded = "rounded-xl" }: { className?: string; style?: CSSProperties; rounded?: string }) {
  return <span className={cn("sk block", rounded, className)} style={style} aria-hidden="true" />;
}

/** Lines of text: widths vary so it reads as a paragraph, not a barcode. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"];
  return (
    <span className={cn("block space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className={cn("h-[12px]", i === lines - 1 ? "w-1/2" : widths[i % widths.length])} rounded="rounded-full" />)}
    </span>
  );
}

const CARD = "rounded-[20px] border border-[#E3E7ED] bg-white";

/** A card: optional image or icon tile, title + two lines, optional footer chip. */
export function SkeletonCard({ media = "none", chip = false, className }: { media?: "none" | "icon" | "image"; chip?: boolean; className?: string }) {
  return (
    <div className={cn(CARD, "flex flex-col gap-4 p-5", className)} aria-hidden="true">
      {media === "image" && <Skeleton className="h-[140px] w-full" rounded="rounded-2xl" />}
      {media === "icon" && <Skeleton className="h-[40px] w-[40px]" />}
      <span className="block space-y-2"><Skeleton className="h-[18px] w-2/3" rounded="rounded-full" /><SkeletonText lines={2} /></span>
      {chip && <Skeleton className="mt-auto h-[22px] w-[96px]" rounded="rounded-full" />}
    </div>
  );
}

/** A list of rows: leading tile, two text lines, trailing mark. */
export function SkeletonList({ rows = 3, className, leading = true }: { rows?: number; className?: string; leading?: boolean }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-4">
          {leading && <Skeleton className="h-[44px] w-[44px] shrink-0" />}
          <span className="block min-w-0 flex-1 space-y-2">
            <Skeleton className={cn("h-[16px]", i % 2 ? "w-1/2" : "w-2/3")} rounded="rounded-full" />
            <Skeleton className="h-[12px] w-1/3" rounded="rounded-full" />
          </span>
          <Skeleton className="h-[16px] w-[16px] shrink-0" rounded="rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A grid of cards (opportunities, resources, programs). */
export function SkeletonGrid({ count = 4, className = "grid gap-5 md:grid-cols-2", card }: { count?: number; className?: string; card?: Parameters<typeof SkeletonCard>[0] }) {
  return <div className={className} aria-hidden="true">{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} {...card} />)}</div>;
}

/** A table: header + rows of cells (admin tables). */
export function SkeletonTable({ rows = 6, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  const grid = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  return (
    <div className={cn(CARD, "overflow-hidden", className)} aria-hidden="true">
      <div className="grid gap-4 border-b border-[#E3E7ED] p-4" style={grid}>{Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-[12px] w-2/3" rounded="rounded-full" />)}</div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 border-b border-[#F1F4F8] p-4 last:border-0" style={grid}>
          {Array.from({ length: cols }).map((__, c) => <Skeleton key={c} className={cn("h-[14px]", c === 0 ? "w-4/5" : "w-1/2")} rounded="rounded-full" />)}
        </div>
      ))}
    </div>
  );
}

/** Stat tiles (numbers at the top of a page). */
export function SkeletonStats({ count = 3, className = "grid grid-cols-3 gap-3" }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-[#F7F8FA] p-4"><Skeleton className="h-[10px] w-[48px]" rounded="rounded-full" /><Skeleton className="mt-3 h-[22px] w-[34px]" /></div>
      ))}
    </div>
  );
}

/** A page heading (title + one intro line) followed by a body (a list by default). */
export function SkeletonPage({ children, className, title = true }: { children?: ReactNode; className?: string; title?: boolean }) {
  return (
    <div className={className} aria-hidden="true">
      {title && <><Skeleton className="h-[34px] w-1/2 max-w-[380px]" rounded="rounded-2xl" /><Skeleton className="mt-3 h-[16px] w-2/3 max-w-[520px]" rounded="rounded-full" /></>}
      <div className={title ? "mt-8" : ""}>{children ?? <SkeletonList rows={4} />}</div>
    </div>
  );
}

/** Wraps skeletons with one polite "loading" announcement for assistive tech. */
export function SkeletonRegion({ label = "Loading", children, className, testid = "skeleton" }: { label?: string; children: ReactNode; className?: string; testid?: string }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true" data-testid={testid}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

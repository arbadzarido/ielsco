"use client";

import { useRef } from "react";
import { Briefcase, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/site/ui";
import type { OpportunityTrack } from "@/lib/professional/model";

const TRACKS: { id: OpportunityTrack; label: string; hint: string; icon: typeof Briefcase }[] = [
  { id: "academic", label: "Academic", hint: "Study & scholarships", icon: GraduationCap },
  { id: "professional", label: "Professional", hint: "Work abroad", icon: Briefcase },
];

// Academic | Professional segmented control (ARIA tabs: arrow keys move between the two, the sliding thumb is decorative).
export function TrackSwitch({ value, onChange, controls, className }: {
  value: OpportunityTrack; onChange: (t: OpportunityTrack) => void; controls: string; className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = TRACKS.findIndex((t) => t.id === value);
  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? TRACKS.length - 1 : (index + (e.key === "ArrowRight" ? 1 : -1) + TRACKS.length) % TRACKS.length;
    onChange(TRACKS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label="Opportunity type" onKeyDown={onKey}
      className={cn("relative grid w-full max-w-[480px] grid-cols-2 rounded-full border border-[#E6E9EE] bg-[#F4F6F9] p-1.5", className)} data-testid="track-switch">
      <span aria-hidden="true"
        className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%-6px)] rounded-full bg-white shadow-[0_1px_2px_rgba(26,37,52,0.08),0_6px_18px_rgba(26,37,52,0.08)] transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }} />
      {TRACKS.map((t, i) => {
        const on = t.id === value;
        const Icon = t.icon;
        return (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`track-${t.id}`} aria-selected={on} aria-controls={controls}
            tabIndex={on ? 0 : -1} onClick={() => onChange(t.id)} data-testid={`track-${t.id}`}
            className={cn("relative z-10 flex min-h-[52px] items-center justify-center gap-2.5 rounded-full px-3 text-left transition-colors", focusRing,
              on ? "text-[#1A2534]" : "text-[#2F4157]/65 hover:text-[#1A2534]")}>
            <Icon size={20} aria-hidden="true" className={cn("shrink-0 transition-colors", on ? "text-[#E56668]" : "")} />
            <span className="leading-tight">
              <span className="block text-[16px] font-bold">{t.label}</span>
              <span className="hidden text-[12.5px] font-medium text-[#2F4157]/60 sm:block">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

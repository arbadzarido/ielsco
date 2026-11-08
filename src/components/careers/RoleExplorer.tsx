"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Handshake, HeartHandshake, Megaphone, PenTool, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/site/ui";
import { LEADS, placesLabel, type Division } from "@/data/careers/divisions";

const ICON: Record<string, typeof Megaphone> = {
  growth: Megaphone, creative: PenTool, community: Users, learning: BookOpen, partnerships: Handshake, operations: ClipboardCheck, people: HeartHandshake,
};

// The 17 roles, one division at a time: a row of division tabs, then every role in that division with what it does.
// Every role is also in the page HTML (hidden panels), so the details stay readable without JavaScript and indexable.
export function RoleExplorer({ divisions }: { divisions: Division[] }) {
  const [active, setActive] = useState(divisions[0].slug);
  return (
    <div data-testid="role-explorer">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Divisions">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {divisions.map((d) => {
            const Icon = ICON[d.slug] ?? Users;
            const on = d.slug === active;
            return (
              <button key={d.slug} type="button" role="tab" id={`tab-${d.slug}`} aria-selected={on} aria-controls={`panel-${d.slug}`} onClick={() => setActive(d.slug)}
                className={cn("inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors", focusRing,
                  on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#D5DBE3] bg-white text-[#2F4157] hover:border-[#2F4157]")}
                data-testid={`division-tab-${d.slug}`}>
                <Icon size={16} aria-hidden="true" />{d.title}<span className={cn("text-[13px] font-medium", on ? "text-white/70" : "text-[#2F4157]/55")}>{d.roles.length}</span>
              </button>
            );
          })}
        </div>
      </div>
      {divisions.map((d) => (
        <div key={d.slug} id={`panel-${d.slug}`} role="tabpanel" aria-labelledby={`tab-${d.slug}`} hidden={d.slug !== active} className="mt-6" data-testid={`division-${d.slug}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[640px] text-[16px] leading-relaxed text-[#2F4157]/80">{d.description}</p>
            <p className="shrink-0 text-[14px] text-[#2F4157]/60">Led by {LEADS[d.lead].name}</p>
          </div>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {d.roles.map((r) => (
              <li key={r.id} className="flex flex-col rounded-[20px] border border-[#E6E9EE] bg-white p-6" data-testid={`role-card-${r.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[18px] font-bold text-[#1A2534]">{r.title}</h3>
                  {r.isNew && <span className="rounded-full bg-[#F9E15B] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1A2534]">New</span>}
                </div>
                <p className="mt-1 text-[13px] text-[#2F4157]/60">{[r.scope, "Remote", placesLabel(r)].filter(Boolean).join(" · ")}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-[#2F4157]/85">{r.summary}</p>
                <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">What you&apos;ll do</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-[#2F4157]/80">{r.responsibilities.map((x) => <li key={x}>{x}</li>)}</ul>
                {(r.required || r.preferred) && (
                  <p className="mt-4 border-t border-[#E6E9EE] pt-3 text-[14px] leading-relaxed text-[#2F4157]/75">
                    <span className="font-semibold text-[#1A2534]">We look for:</span> {r.required}{r.preferred ? `. Nice to have: ${r.preferred}` : ""}{d.slug === "creative" ? ". Portfolio required." : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Link href={`/careers/${d.slug}`} className={cn("mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157] underline-offset-4 hover:text-[#E56668] hover:underline", focusRing)}>
            {d.title} division page <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { formatSessionWib, upcomingSessions, type CircleSession } from "@/lib/circle/sessions";
import { btnPrimary, btnSecondary, card, container, eyebrow, h2, lead } from "@/components/site/ui";
import { cn } from "@/lib/utils";

export const CIRCLE_REGISTRATION_LINK = "https://forms.gle/ADAEiK5Uj2aRBgf39";
export const CIRCLE_DISCORD_LINK = "https://discord.gg/apFxnhvhWr";

// On circle.ielsco.com every path is rewritten to /circle/*, so links into the member dashboard must point at the
// main domain there. On ielsco.com (and locally) they stay relative.
export function useMainSiteBase() {
  const [base, setBase] = useState("");
  useEffect(() => {
    if (window.location.hostname.startsWith("circle.")) setBase("https://ielsco.com");
  }, []);
  return base;
}

// Public view of the recurring weekly sessions (Wed 19:00 and Sat 13:00 WIB). Computed after mount so the dates are
// always the viewer's real "next" sessions and server and client renders agree.
export function PublicSessions() {
  const [sessions, setSessions] = useState<CircleSession[] | null>(null);
  useEffect(() => setSessions(upcomingSessions(4)), []);
  return (
    <section id="sessions" aria-labelledby="public-sessions-heading" className="scroll-mt-[96px] border-t border-[#E6E9EE] bg-white py-[64px] md:py-[88px]">
      <div className={container}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[640px]">
            <p className={eyebrow}>Every week</p>
            <h2 id="public-sessions-heading" className={cn(h2, "mt-3")}>Weekly Circle sessions</h2>
            <p className={cn(lead, "mt-4")}>
              Wednesdays at 19:00 and Saturdays at 13:00 WIB (Jakarta time). A new topic each time: English practice,
              scholarships, careers and life across Southeast Asia.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={CIRCLE_REGISTRATION_LINK} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="public-sessions-register">
              Register for IELS Circle <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a href={CIRCLE_DISCORD_LINK} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Join our Discord</a>
          </div>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          {sessions === null && [0, 1, 2, 3].map((i) => <li key={i} className="h-[200px] animate-pulse rounded-[20px] bg-[#F1F4F8]" aria-hidden="true" />)}
          {sessions?.map((s, i) => {
            const { day, time } = formatSessionWib(s.start);
            return (
              <li key={s.id} data-testid="public-session" className={cn(card, "flex flex-col p-6", i === 0 && "border-[#2F4157] ring-1 ring-[#2F4157]")}>
                {i === 0 && <span className="mb-3 self-start rounded-full bg-[#2F4157] px-2.5 py-0.5 text-[12px] font-bold text-white">Next session</span>}
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[#577E90]"><CalendarClock size={15} aria-hidden="true" /> {day}</p>
                <p className="text-[14px] font-semibold text-[#577E90]">{time}</p>
                <h3 className="mt-3 text-[18px] font-bold leading-snug text-[#1A2534]">{s.topic.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#2F4157]/70">{s.topic.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

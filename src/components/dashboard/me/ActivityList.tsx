"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, CheckCircle2, Mic, Sparkles, Users, CalendarDays, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelEventRegistration } from "@/lib/events/registration";
import { KIND_LABEL, calendarHref, formatActivityWhen, type ActivityKind, type MyActivity } from "@/lib/me/records";
import { invalidateMyRecords } from "../useMyRecords";
import { ACCENTS, btnLink, cardGloss, focusRing, type Accent } from "../ui";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; accent: Accent }> = {
  ielsco_event: { icon: CalendarDays, accent: "coral" },
  circle_cohort: { icon: Mic, accent: "teal" },
  circle_session: { icon: Mic, accent: "teal" },
  room: { icon: Users, accent: "violet" },
  member_session: { icon: Sparkles, accent: "amber" },
};

const STATUS_LABEL = { registered: "Registered", attended: "Attended", hosting: "Hosting", checked_in: "Checked in" } as const;

// The member's registered events, Circle check-ins, community events and member sessions, in date order.
// Official-event registrations can be cancelled here; the others are managed on their own page (link).
export function ActivityList({ items, userId, onChanged, compact }: { items: MyActivity[]; userId: string; onChanged?: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = async (a: MyActivity) => {
    if (!a.eventId || !window.confirm(`Cancel your registration for “${a.title}”?`)) return;
    setBusy(a.id);
    setError(null);
    try {
      await cancelEventRegistration(createClient(), userId, a.eventId);
      invalidateMyRecords();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="rounded-xl bg-[#FDEDED] px-4 py-2 text-[15px] text-[#B4383A]">{error}</p>}
      <ul className="space-y-2" data-testid="activity-list">
        {items.map((a) => {
          const { icon: Icon, accent } = KIND_STYLE[a.kind];
          const tone = ACCENTS[accent];
          return (
            <li key={a.id} data-testid="activity-item" className={cn(cardGloss, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center")}>
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone.soft, tone.text)}><Icon size={20} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <Link href={a.href} className={cn("block truncate text-[16px] font-semibold text-[#1A2534] hover:underline", focusRing)}>{a.title}</Link>
                <p className="text-[14px] text-[#2F4157]/65">
                  {formatActivityWhen(a)} · {KIND_LABEL[a.kind]}
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#F1F4F8] px-2 py-0.5 text-[12px] font-semibold text-[#2F4157]">
                    <CheckCircle2 size={12} aria-hidden="true" />{STATUS_LABEL[a.status]}
                  </span>
                </p>
              </div>
              {!compact && !a.past && (
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={a.href} className={btnLink}>{a.kind === "ielsco_event" ? "Details" : "Manage"}</Link>
                  <a href={calendarHref(a)} target="_blank" rel="noopener noreferrer" className={btnLink}>
                    <CalendarPlus size={16} aria-hidden="true" /> Calendar<span className="sr-only"> (opens Google Calendar)</span>
                  </a>
                  {a.cancellable && (
                    <button type="button" onClick={() => cancel(a)} disabled={busy === a.id} data-testid="activity-cancel"
                      className={cn("inline-flex items-center gap-1 rounded text-[15px] font-semibold text-[#B4383A] hover:underline disabled:opacity-50", focusRing)}>
                      <XCircle size={16} aria-hidden="true" /> {busy === a.id ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

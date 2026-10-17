"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Lock } from "lucide-react";
import type { EventData } from "@/data/events";
import { wibDeadline } from "@/lib/events/deadline";
import { btnAccent, pill } from "@/components/site/ui";
import { cn } from "@/lib/utils";

// Public event call to action. Registration goes through each event's own registration link (as before); the button
// only appears while the deadline (WIB) has not passed, and is re-checked in the browser so cached pages stay honest.
export function EventCta({ event, className }: { event: EventData; className?: string }) {
  const closesAt = wibDeadline(event.registrationDateDeadline, event.registrationTimeDeadline);
  const [open, setOpen] = useState(() => Date.parse(closesAt) > Date.now());
  useEffect(() => setOpen(Date.parse(closesAt) > Date.now()), [closesAt]);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(closesAt));
  const link = event.registrationLink;
  const usable = link && link !== "#";

  if (!open || !usable) {
    return (
      <p className={cn(pill, "px-4 py-2 text-[14px] text-[#2F4157]/75", className)} data-testid="event-closed">
        <Lock size={14} aria-hidden="true" /> {open ? "Registration details coming soon" : `Registration closed on ${date} WIB`}
      </p>
    );
  }
  const external = /^https?:\/\//.test(link);
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <a href={link} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={btnAccent} data-testid="event-register">
        Register {external && <ArrowUpRight size={18} aria-hidden="true" />}
      </a>
      <p className="text-[14px] text-[#2F4157]/65">Registration closes {date} WIB</p>
    </div>
  );
}

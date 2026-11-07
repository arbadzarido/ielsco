"use client";

// Events linked to a project or task, with a shortcut to schedule one. Read with the person's own session (RLS).
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useQuery } from "./data";
import { EventSheet, EVENT_COLUMNS, type EventRow, type GoogleStatus } from "./EventSheet";
import { Badge, btn, muted, panel, ring } from "./ui";
import { DEFAULT_TZ, zonedParts } from "@/lib/os/calendar";
import { cn } from "@/lib/utils";

export function LinkedEvents({ type, id, company }: { type: "project" | "task"; id: string; company: string }) {
  const col = type === "project" ? "project_id" : "task_id";
  const events = useQuery<EventRow[]>((s) => s.from("os_events").select(EVENT_COLUMNS).eq(col, id).order("starts_at").limit(100), [col, id]);
  const [sheet, setSheet] = useState<{ open: boolean; event: EventRow | null }>({ open: false, event: null });
  const [google, setGoogle] = useState<GoogleStatus>(null);
  useEffect(() => { fetch("/os/api/calendar/status").then((r) => r.json()).then(setGoogle).catch(() => setGoogle(null)); }, []);
  const now = new Date().toISOString();
  const list = events.data ?? [];
  return (
    <div data-testid="os-linked-events">
      <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
        {list.map((e) => {
          const s = zonedParts(e.starts_at, DEFAULT_TZ);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => setSheet({ open: true, event: e })} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#F7F9FB]", ring, e.ends_at < now && "opacity-70")}>
                <span className="w-24 shrink-0 text-xs text-[#3A4B60]">{new Date(`${s.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}{!e.all_day && ` ${s.time}`}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                <Badge>{e.category}</Badge>
              </button>
            </li>
          );
        })}
        {events.data && !list.length && <li className={cn("px-3 py-2 text-xs", muted)}>No events linked yet.</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <button type="button" className={btn} onClick={() => setSheet({ open: true, event: null })}><CalendarPlus size={14} aria-hidden="true" />Schedule an event</button>
        <Link href="/os/calendar" className={cn(btn)}>Open calendar</Link>
      </div>
      <EventSheet open={sheet.open} event={sheet.event} google={google} defaults={{ company_code: company, ...(type === "project" ? { project_id: id } : { task_id: id }) }}
        onClose={() => setSheet({ open: false, event: null })} onSaved={() => { setSheet({ open: false, event: null }); events.reload(); }} />
    </div>
  );
}

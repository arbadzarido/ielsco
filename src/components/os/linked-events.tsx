"use client";

// Events linked to a project, task, campaign, partnership or timeline milestone, with a shortcut to schedule one
// that is linked from the start. Task links come from os_event_tasks (one event can serve several tasks); the
// other links are columns on the event. Read with the person's own session (RLS).
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarPlus, Repeat } from "lucide-react";
import { useQuery } from "./data";
import { EventSheet, EVENT_COLUMNS, type EventDefaults, type EventRow, type GoogleStatus } from "./EventSheet";
import { Badge, btn, muted, panel, ring } from "./ui";
import { DEFAULT_TZ, zonedParts } from "@/lib/os/calendar";
import { describeRule } from "@/lib/os/recurrence";
import { cn } from "@/lib/utils";

export type LinkType = "project" | "task" | "campaign" | "partnership" | "timeline";
const COLUMN: Record<Exclude<LinkType, "task">, string> = { project: "project_id", campaign: "campaign_id", partnership: "partnership_id", timeline: "timeline_item_id" };
const DEFAULT_KEY: Record<LinkType, keyof EventDefaults> = { project: "project_id", task: "task_id", campaign: "campaign_id", partnership: "partnership_id", timeline: "timeline_item_id" };

export function LinkedEvents({ type, id, company, defaults }: { type: LinkType; id: string; company: string; defaults?: EventDefaults }) {
  const events = useQuery<EventRow[]>(async (s) => {
    if (type === "task") {
      const links = await s.from("os_event_tasks").select("event_id").eq("task_id", id).limit(200);
      const ids = (links.data ?? []).map((r) => r.event_id as string);
      if (!ids.length) return { data: [] as EventRow[], error: links.error };
      return s.from("os_events").select(EVENT_COLUMNS).in("id", ids).order("starts_at").returns<EventRow[]>();
    }
    return s.from("os_events").select(EVENT_COLUMNS).eq(COLUMN[type], id).order("starts_at").limit(200).returns<EventRow[]>();
  }, [type, id]);
  const [sheet, setSheet] = useState<{ open: boolean; event: EventRow | null }>({ open: false, event: null });
  const [google, setGoogle] = useState<GoogleStatus>(null);
  const [past, setPast] = useState(false);
  useEffect(() => { fetch("/os/api/calendar/status").then((r) => r.json()).then(setGoogle).catch(() => setGoogle(null)); }, []);
  const now = new Date().toISOString();
  const all = events.data ?? [];
  const isPast = (e: EventRow) => !e.recurrence && e.ends_at < now;
  const list = all.filter((e) => past || !isPast(e));
  const hiddenPast = all.filter(isPast).length;
  return (
    <div data-testid="os-linked-events">
      <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
        {list.map((e) => {
          const s = zonedParts(e.starts_at, DEFAULT_TZ);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => setSheet({ open: true, event: e })} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#F7F9FB]", ring, isPast(e) && "opacity-70")}>
                <span className="w-24 shrink-0 text-xs text-[#3A4B60]">{new Date(`${s.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}{!e.all_day && ` ${s.time}`}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.status === "Cancelled" ? `Cancelled: ${e.title}` : e.title}</span>
                  {e.recurrence && <span className={cn("flex items-center gap-1 text-xs", muted)}><Repeat size={11} aria-hidden="true" />{describeRule(e.recurrence)}</span>}
                </span>
                <Badge>{e.category}</Badge>
              </button>
            </li>
          );
        })}
        {events.data && !list.length && <li className={cn("px-3 py-2 text-xs", muted)}>{hiddenPast ? "No upcoming events." : "No events linked yet."}</li>}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setSheet({ open: true, event: null })} data-testid="os-linked-events-new"><CalendarPlus size={14} aria-hidden="true" />Schedule an event</button>
        {hiddenPast > 0 && <button type="button" className={btn} onClick={() => setPast((p) => !p)}>{past ? "Hide past" : `Show ${hiddenPast} past`}</button>}
        <Link href={type === "project" ? `/os/calendar?ws=project&p=${id}` : type === "campaign" ? "/os/calendar?ws=marketing" : "/os/calendar"} className={btn}>Open calendar</Link>
      </div>
      <EventSheet open={sheet.open} event={sheet.event} google={google} defaults={{ company_code: company, [DEFAULT_KEY[type]]: id, ...defaults }}
        onClose={() => setSheet({ open: false, event: null })} onSaved={() => { setSheet({ open: false, event: null }); events.reload(); }} />
    </div>
  );
}

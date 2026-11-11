"use client";

import { useTimeZone } from "@/components/time/TimeZoneProvider";
import { SOURCE_ZONE, dualDeadline, formatClock, formatDate, formatDateTime, sameClock, zoneLabel } from "@/lib/time/zone";
import { upcomingSessions, type CircleSession } from "@/lib/circle/sessions";

// Inline time displays. All of them render in SOURCE_ZONE on the server and switch to the viewer's zone after mount.

/** "Wed 11 Nov · 19:00 GMT+8" in the viewer's zone. */
export function LocalDateTime({ value, className }: { value: string | Date; className?: string }) {
  const { zone } = useTimeZone();
  return <time dateTime={new Date(value).toISOString()} className={className}>{formatDateTime(value, zone)}</time>;
}

/** "11 November 2026" in the viewer's zone. */
export function LocalDate({ value, className, options }: { value: string | Date; className?: string; options?: Intl.DateTimeFormatOptions }) {
  const { zone } = useTimeZone();
  return <time dateTime={new Date(value).toISOString()} className={className}>{formatDate(value, zone, options)}</time>;
}

/**
 * An official deadline: always shown in its source zone (so the rule stays unambiguous), followed by the viewer's own
 * time when their clock differs: "29 November 2026, 23:59 WIB (29 November 2026, 17:59 GMT+1 your time)".
 */
export function OfficialDeadline({ value, sourceZone = SOURCE_ZONE, className }: { value: string | Date; sourceZone?: string; className?: string }) {
  const { zone, ready } = useTimeZone();
  const { official, local } = dualDeadline(value, zone, sourceZone);
  return (
    <time dateTime={new Date(value).toISOString()} className={className} data-testid="official-deadline">
      {official}
      {ready && local && <span className="whitespace-nowrap" data-testid="official-deadline-local"> ({local} your time)</span>}
    </time>
  );
}

/**
 * After a fixed-zone schedule line ("Wednesdays 19:00 and Saturdays 13:00 WIB"), the same slots in the viewer's zone:
 * " (Wednesday 20:00 and Saturday 14:00 your time, GMT+8)". Renders nothing when the viewer's clock matches WIB.
 */
export function CircleScheduleLocal({ className }: { className?: string }) {
  const { zone, ready } = useTimeZone();
  if (!ready) return null;
  const next = upcomingSessions(4);
  const slots = [next.find((s) => isoDowIn(s.start) === 3), next.find((s) => isoDowIn(s.start) === 6)].filter(Boolean) as CircleSession[];
  if (!slots.length || slots.every((s) => sameClock(zone, SOURCE_ZONE, s.start))) return null;
  const text = slots.map((s) => `${formatDate(s.start, zone, { weekday: "long" })} ${formatClock(s.start, zone)}`).join(" and ");
  return <span className={className} data-testid="circle-schedule-local"> ({text} your time, {zoneLabel(zone, slots[0].start)})</span>;
}

// ISO weekday (1 = Monday) of an instant in WIB, the zone the Circle schedule is defined in.
const isoDowIn = (d: Date) => ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[new Intl.DateTimeFormat("en-US", { timeZone: SOURCE_ZONE, weekday: "short" }).format(d)];

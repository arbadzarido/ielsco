// Official IELS events (src/data/events.ts) for Connect's combined "Rooms & events" view. Read-only: registration stays
// on the existing event pages and /dashboard/events (public.event_registrations), with their own rules.
import { eventsData } from "@/data/events";
import { generateSlug } from "@/utils/slug";

export interface OfficialEvent {
  id: string;
  title: string;
  poster: string;
  date: Date;
  href: string;
}

// Event dates are YYYY-M-D without a time (same parsing as /dashboard/events): an all-day date.
const parseDay = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, day || 1));
};

export function upcomingOfficialEvents(limit = 6, now = new Date()): OfficialEvent[] {
  const today = parseDay(now.toISOString().slice(0, 10));
  return eventsData
    .map((e) => ({ id: e.id, title: e.title, poster: e.poster, date: parseDay(e.startDate), href: `/events/${generateSlug(e.title)}` }))
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

export const eventDay = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "medium" }).format(d);

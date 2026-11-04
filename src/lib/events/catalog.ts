// Official IELSco events (src/data/events.ts) as one list for the Events hub, IELSco Events and IELSco Talks.
// The format of each event is classified here from its own description (the data file has no format field), so the
// big data file stays untouched. Add a new event's id here when it is a talk or info session; anything not listed is
// shown as a program/workshop.

import { eventsData, type EventData } from "@/data/events";
import { officialEventHref, parseEventDay } from "@/lib/me/records";

export type EventFormat = "talk" | "program";

// Talks, info sessions and guest-speaker events ("Real Stories. Global Perspectives. New Possibilities.").
const TALK_IDS = new Set(["3", "4", "7", "11", "12"]);

export interface OfficialEvent extends EventData {
  date: Date;
  isPast: boolean;
  format: EventFormat;
  href: string;
  excerpt: string;
}

const excerptOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function officialEvents(now = new Date()): OfficialEvent[] {
  const today = parseEventDay(now.toISOString().slice(0, 10));
  return eventsData.map((e) => {
    const date = parseEventDay(e.startDate);
    return { ...e, date, isPast: date < today, format: TALK_IDS.has(e.id) ? "talk" : "program", href: officialEventHref(e.title), excerpt: excerptOf(e.description) };
  });
}

export const upcomingFirst = (list: OfficialEvent[]) =>
  [...list].sort((a, b) => Number(a.isPast) - Number(b.isPast) || (a.isPast ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()));

export const eventDayLabel = (d: Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(d);

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CalendarPlus, CheckCircle2, ExternalLink } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { invalidateMyRecords } from "@/components/dashboard/useMyRecords";
import { btnSecondary, cardGloss, focusRing, tag } from "@/components/dashboard/ui";
import { RegisterButton } from "@/components/events/RegisterButton";
import { SaveButton } from "@/components/dashboard/bookmarks/SaveButton";
import { wibDeadline } from "@/lib/events/registration";
import { officialEvents, type EventFormat, type OfficialEvent } from "@/lib/events/catalog";
import { generateSlug } from "@/utils/slug";
import { cn } from "@/lib/utils";

type Status = "registered" | "attended" | null;
type Item = OfficialEvent & { status: Status };
type Filter = "upcoming" | "past" | "all";

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(d);

// All-day calendar entry: the event data has a date but no start time, so none is invented.
function calendarLink(e: Item) {
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const next = new Date(e.date.getTime() + 86_400_000);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${ymd(e.date)}/${ymd(next)}&details=${encodeURIComponent("IELS event. Details: https://ielsco.com/events/" + generateSlug(e.title))}`;
}

// IELSco Events (and, with format="talk", IELSco Talks): the official events from src/data/events.ts with one-click
// registration (public.event_registrations), add-to-calendar and "I attended this" for past ones.
export function OfficialEventsView({ user, supabase, format, title, description, children }: {
  user: User; supabase: SupabaseClient; format?: EventFormat; title: string; description: string; children?: ReactNode;
}) {
  const [state, setState] = useState<{ s: "loading" } | { s: "error"; message: string } | { s: "ready"; regs: Map<string, Status> }>({ s: "loading" });
  const [filter, setFilter] = useState<Filter>("upcoming");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("event_registrations").select("event_id, attended").eq("user_id", user.id);
    if (error) return setState({ s: "error", message: `Couldn't load your registrations: ${error.message}` });
    invalidateMyRecords();
    setState({ s: "ready", regs: new Map((data ?? []).map((r) => [r.event_id, r.attended ? "attended" : "registered"])) });
  }, [supabase, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const items: Item[] = useMemo(() => {
    const regs = state.s === "ready" ? state.regs : new Map<string, Status>();
    return officialEvents()
      .filter((e) => !format || e.format === format)
      .map((e) => ({ ...e, status: regs.get(e.id) ?? null }))
      .sort((a, b) => (filter === "past" ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()));
  }, [state, filter, format]);

  const markAttended = async (eventId: string) => {
    if (!window.confirm("Mark this event as attended?")) return;
    const { error } = await supabase
      .from("event_registrations")
      .upsert({ user_id: user.id, event_id: eventId, attended: true, updated_at: new Date().toISOString() }, { onConflict: "user_id,event_id" });
    if (error) return window.alert(`Couldn't save: ${error.message}`);
    load();
  };

  const shown = items.filter((e) => (filter === "upcoming" ? !e.isPast : filter === "past" ? e.isPast : true));
  const counts = { registered: items.filter((e) => e.status).length, attended: items.filter((e) => e.status === "attended").length };

  return (
    <div className="mx-auto max-w-[110rem] space-y-10 px-4 py-10 md:px-6 md:py-12 lg:px-10">
      <PageHeader title={title} description={description}>
        {state.s === "ready" && (
          <p className="text-[15px] text-[#2F4157]/65" data-testid="events-counts">
            {counts.registered} registered · {counts.attended} attended
          </p>
        )}
      </PageHeader>

      <div role="tablist" aria-label="Event filter" className="flex gap-1 border-b border-[#E3E7ED]">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            type="button"
            aria-selected={filter === f}
            data-testid={`events-tab-${f}`}
            onClick={() => setFilter(f)}
            className={cn("-mb-px border-b-2 px-4 py-3 text-[15px] font-semibold capitalize transition-colors", focusRing, filter === f ? "border-[#2F4157] text-[#1A2534]" : "border-transparent text-[#2F4157]/55 hover:text-[#2F4157]")}
          >
            {f}
          </button>
        ))}
      </div>

      {state.s === "loading" && <LoadingState label="Loading events…" />}
      {state.s === "error" && <ErrorState message={state.message} onRetry={load} />}
      {state.s === "ready" && shown.length === 0 && (
        <EmptyState
          title={filter === "upcoming" ? `No upcoming ${format === "talk" ? "talks" : "events"} right now` : "Nothing here yet"}
          body={filter === "upcoming" ? "New IELS events are announced here first. Meanwhile, join a weekly Circle session." : "Events you could join appear here."}
          action={filter === "upcoming" ? <Link href="/dashboard/circle" className={btnSecondary}>See Circle sessions</Link> : undefined}
        />
      )}
      {state.s === "ready" && shown.length > 0 && (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="events-list">
          {shown.map((e) => (
            <li key={e.id} data-testid="event-card" className={cn(cardGloss, "flex flex-col overflow-hidden rounded-3xl")}>
              <Link href={`/events/${generateSlug(e.title)}`} className={cn("relative block aspect-[16/10] bg-[#2F4157]", focusRing)}>
                {e.poster && <Image src={e.poster} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className={cn("object-cover", e.isPast && "saturate-[0.6]")} />}
                <span className="absolute left-4 top-4 rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-sm">
                  <span className="block text-[12px] font-bold uppercase tracking-wide text-[#C04C4E]">{fmt(e.date, { month: "short" })}</span>
                  <span className="block text-[22px] font-bold leading-none text-[#1A2534]">{fmt(e.date, { day: "numeric" })}</span>
                </span>
                {e.status && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-[#2F4157]">
                    <CheckCircle2 size={14} className="text-[#577E90]" aria-hidden="true" /> {e.status === "attended" ? "Attended" : "Registered"}
                  </span>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[#577E90]">
                  <CalendarDays size={15} aria-hidden="true" /> {fmt(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {e.isPast && <span className={tag}>Past</span>}
                </p>
                <h2 className="text-[19px] font-bold leading-snug text-[#1A2534]">
                  <Link href={`/events/${generateSlug(e.title)}`} className="hover:underline">{e.title}</Link>
                </h2>
                <p className="line-clamp-3 text-[15px] leading-relaxed text-[#2F4157]/70">{e.excerpt}</p>
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[#E3E7ED]/70 pt-4">
                  {!e.isPast && (
                    <>
                      <RegisterButton eventId={e.id} closesAt={wibDeadline(e.registrationDateDeadline, e.registrationTimeDeadline)} whatsappUrl={e.whatsappGroup} onRegistered={load} />
                      <a href={calendarLink(e)} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "px-4")}>
                        <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
                      </a>
                    </>
                  )}
                  {e.isPast && e.status === "registered" && (
                    <button type="button" onClick={() => markAttended(e.id)} className={btnSecondary} data-testid="event-mark-attended">I attended this</button>
                  )}
                  <SaveButton type="event" id={e.id} title={e.title} className="ml-auto" />
                  <Link href={`/events/${generateSlug(e.title)}`} className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#577E90] hover:underline">
                    Details <ExternalLink size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {children}
    </div>
  );
}

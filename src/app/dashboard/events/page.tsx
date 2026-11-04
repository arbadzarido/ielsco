"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Lock, Mic, Plus, Users } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { EmptyState, PageHeader } from "@/components/dashboard/PageStates";
import { ActivityList } from "@/components/dashboard/me/ActivityList";
import { useMyRecords } from "@/components/dashboard/useMyRecords";
import { ACCENTS, btnLink, btnPrimary, btnSecondary, cardGloss, focusRing, tag } from "@/components/dashboard/ui";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { formatSessionWib, upcomingSessions } from "@/lib/circle/sessions";
import { connectApi } from "@/lib/connect/api";
import { formatInZone } from "@/lib/connect/time";
import type { Room } from "@/lib/connect/types";
import { eventDayLabel, officialEvents } from "@/lib/events/catalog";
import { pastActivities, upcoming } from "@/lib/me/records";
import { cn } from "@/lib/utils";

// Events hub (docs/IELSCO-PRODUCT-ARCHITECTURE.md §4): "My upcoming events" first (every registration the member
// has, from all four event sources), then Explore Events in three tabs: IELSco Events, IELS Circle, Other Events.
type Tab = "ielsco" | "circle" | "other";
type MemberSession = { id: string; title: string; kind: string; starts_at: string; members_only: boolean; seats_left: number | null; registered: boolean };

function TabButton({ id, tab, setTab, children }: { id: Tab; tab: Tab; setTab: (t: Tab) => void; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" id={`events-tab-${id}`} aria-selected={tab === id} aria-controls={`events-panel-${id}`} onClick={() => setTab(id)}
      data-testid={`explore-tab-${id}`}
      className={cn("-mb-px border-b-2 px-4 py-3 text-[15px] font-semibold transition-colors", focusRing, tab === id ? "border-[#2F4157] text-[#1A2534]" : "border-transparent text-[#2F4157]/55 hover:text-[#2F4157]")}>
      {children}
    </button>
  );
}

function Explore({ supabase }: { supabase: SupabaseClient }) {
  const [tab, setTab] = useState<Tab>("ielsco");
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [sessions, setSessions] = useState<MemberSession[] | null>(null);
  useEffect(() => {
    connectApi.rooms(supabase, "discover", { limit: 6 }).then(setRooms).catch(() => setRooms([]));
    supabase.rpc("list_member_sessions", { p_limit: 6 }).then(({ data, error }) => setSessions(error ? [] : ((data ?? []) as MemberSession[])));
  }, [supabase]);
  const nextOfficial = officialEvents().filter((e) => !e.isPast).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);
  const circle = upcomingSessions(4);

  return (
    <section aria-labelledby="explore-heading" className="space-y-4">
      <h2 id="explore-heading" className="text-[24px] font-bold">Explore events</h2>
      <div role="tablist" aria-label="Event types" className="flex gap-1 overflow-x-auto border-b border-[#E3E7ED]">
        <TabButton id="ielsco" tab={tab} setTab={setTab}>IELSco Events</TabButton>
        <TabButton id="circle" tab={tab} setTab={setTab}>IELS Circle</TabButton>
        <TabButton id="other" tab={tab} setTab={setTab}>Other Events</TabButton>
      </div>

      {tab === "ielsco" && (
        <div role="tabpanel" id="events-panel-ielsco" aria-labelledby="events-tab-ielsco" className="space-y-4">
          {nextOfficial.length === 0 ? (
            <EmptyState title="No upcoming IELSco events right now" body="New events are announced here first. Past events and talks are in IELSco Events."
              action={<Link href="/dashboard/events/ielsco" className={btnSecondary}>See all IELSco Events</Link>} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-3">
              {nextOfficial.map((e) => (
                <li key={e.id}>
                  <Link href={e.href} className={cn(cardGloss, "flex h-full flex-col gap-2 p-5 hover:border-[#577E90]", focusRing)}>
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-[#C04C4E]"><CalendarDays size={15} aria-hidden="true" />{eventDayLabel(e.date)}</span>
                    <span className="text-[17px] font-semibold leading-snug text-[#1A2534]">{e.title}</span>
                    {e.format === "talk" && <span className={cn(tag, "w-fit")}>IELSco Talk</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/events/ielsco" className={btnLink}>All IELSco Events <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/dashboard/events/talks" className={btnLink}>IELSco Talks <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      )}

      {tab === "circle" && (
        <div role="tabpanel" id="events-panel-circle" aria-labelledby="events-tab-circle" className="space-y-4">
          <p className="max-w-2xl text-[16px] text-[#2F4157]/70">Open speaking sessions every Wednesday 19:00 and Saturday 13:00 WIB, each with a theme. Check in so the hosts know you&apos;re coming.</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {circle.map((s) => {
              const { day, time } = formatSessionWib(s.start);
              return (
                <li key={s.id} className={cn(cardGloss, "flex gap-3 p-4")}>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", ACCENTS.teal.soft, ACCENTS.teal.text)}><Mic size={20} aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-[#0B6E64]">{day} · {time}</span>
                    <span className="block text-[16px] font-semibold text-[#1A2534]">{s.topic.title}</span>
                    <span className="mt-1 flex flex-wrap gap-2"><span className={tag}>{s.topic.theme}</span><span className={tag}>Open session</span></span>
                  </span>
                </li>
              );
            })}
          </ul>
          {sessions && sessions.length > 0 && (
            <div className="space-y-2" data-testid="events-member-sessions">
              <h3 className="text-[18px] font-bold">Member sessions</h3>
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li key={s.id} className={cn(cardGloss, "flex flex-wrap items-center gap-3 p-4")}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.title}</span>
                      <span className="text-[14px] text-[#2F4157]/65">{formatInZone(s.starts_at, "Asia/Jakarta")}{s.seats_left !== null ? ` · ${s.seats_left} seats left` : ""}</span>
                    </span>
                    {s.members_only && <span className={cn(tag, "gap-1")}><Lock size={12} aria-hidden="true" /> Members only</span>}
                    {s.registered && <span className={tag}>Registered</span>}
                    <Link href="/dashboard/membership" className={btnLink}>{s.registered ? "Manage" : "Details"}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/circle" className={btnPrimary} data-testid="events-circle-checkin">Check in to a session <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/dashboard/circles" className={btnSecondary}>Circle groups (discussions)</Link>
          </div>
          <ElcoPractice context="circle_before" refId="events-circle" />
        </div>
      )}

      {tab === "other" && (
        <div role="tabpanel" id="events-panel-other" aria-labelledby="events-tab-other" className="space-y-4">
          <p className="max-w-2xl text-[16px] text-[#2F4157]/70">Sessions hosted by members and partners. Partner listings from outside IELSco will appear here too once partners publish them.</p>
          {rooms === null ? <div className="h-24 animate-pulse rounded-2xl bg-white/70" aria-hidden="true" /> : rooms.length === 0 ? (
            <EmptyState title="No community events scheduled" body="Host a practice session on a topic you care about. Members can register and you share the meeting link."
              action={<Link href="/dashboard/connect/rooms/new" className={btnPrimary}><Plus size={16} aria-hidden="true" /> Host an event</Link>} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-3">
              {rooms.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/dashboard/connect/rooms/${r.id}`} className={cn(cardGloss, "flex h-full flex-col gap-2 p-5 hover:border-[#577E90]", focusRing)}>
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-[#5A3DC4]"><Users size={15} aria-hidden="true" />{formatInZone(r.starts_at, r.timezone)}</span>
                    <span className="text-[17px] font-semibold leading-snug">{r.title}</span>
                    <span className="text-[14px] text-[#2F4157]/65">Hosted by {r.host.display_name} · {r.registered_count}/{r.capacity}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/connect/rooms" className={btnLink}>All community events <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      )}
    </section>
  );
}

function EventsHub({ user, supabase }: { user: User; supabase: SupabaseClient }) {
  const { state, reload } = useMyRecords(user.id);
  const records = state.s === "ready" ? state.data : null;
  const mine = records ? upcoming(records) : [];
  const past = records ? pastActivities(records).slice(0, 10) : [];
  return (
    <div className="mx-auto max-w-[110rem] space-y-10 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <PageHeader title="Events" description="Everything you've registered for, then IELSco Events, IELS Circle sessions and community events to explore." />

      <section aria-labelledby="my-events-heading" className="space-y-3" data-testid="my-upcoming-events">
        <h2 id="my-events-heading" className="text-[24px] font-bold">My upcoming events</h2>
        {state.s === "loading" && <div className="h-24 animate-pulse rounded-2xl bg-white/70" aria-hidden="true" />}
        {state.s === "error" && <p role="alert" className="text-[15px] text-[#B4383A]">Couldn&apos;t load your events: {state.message}</p>}
        {records && (mine.length === 0 ? (
          <EmptyState title="You haven't registered for anything yet" body="Pick an IELSco event, check in to an IELS Circle session or join a community event below. It will show up here with a calendar link."
            action={<a href="#explore-heading" className={btnSecondary}>Explore events</a>} />
        ) : <ActivityList items={mine} userId={user.id} onChanged={reload} />)}
        {records && records.gaps.length > 0 && <p className="text-[13px] text-[#2F4157]/55" title={records.gaps.join("; ")}>Some of your records couldn&apos;t be loaded right now, so this list may be incomplete. Reload the page to try again.</p>}
      </section>

      <Explore supabase={supabase} />

      {past.length > 0 && (
        <details className="group" data-testid="events-history">
          <summary className={cn("cursor-pointer list-none text-[18px] font-bold", focusRing)}>Past events ({past.length}) <span className="text-[14px] font-normal text-[#2F4157]/60">· also in your Elco-Pass</span></summary>
          <div className="mt-3"><ActivityList items={past} userId={user.id} compact /></div>
        </details>
      )}
    </div>
  );
}

export default function EventsPage() {
  return <DashboardPage>{({ user, supabase }) => <EventsHub user={user} supabase={supabase} />}</DashboardPage>;
}

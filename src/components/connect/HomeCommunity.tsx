"use client";

import Link from "next/link";
import { CalendarDays, Inbox, MessageCircle } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCENTS, btnLink, cardGloss, focusRing } from "@/components/dashboard/ui";
import { circlesApi, connectApi } from "@/lib/connect/api";
import { eventDay, upcomingOfficialEvents } from "@/lib/connect/events";
import { formatInZone } from "@/lib/connect/time";
import { cn } from "@/lib/utils";
import { CircleCard } from "./CirclesView";
import { PassportChecklist } from "./HubViews";
import { PulseCard, usePulse } from "./PulseView";
import { useLoad } from "./shared";

// Home's community block: real next actions (intros, unread messages, Passport), what's coming up (rooms + official
// events), featured content and Circles. Every number comes from the database; sections with nothing in them are left
// out rather than padded. Renders nothing while Connect isn't available.
export function HomeCommunity({ supabase }: { supabase: SupabaseClient }) {
  const data = useLoad(async () => {
    const [summary, passport, rooms, circles] = await Promise.all([
      connectApi.summary(supabase), connectApi.myPassport(supabase),
      connectApi.rooms(supabase, "discover", { limit: 3 }).catch(() => []), circlesApi.list(supabase).catch(() => []),
    ]);
    return { summary, passport, rooms, circles };
  }, [supabase]);
  const pulse = usePulse({ supabase });
  if (data.state.s !== "ready") return null;
  const { summary, passport, rooms, circles } = data.state.data;
  const events = upcomingOfficialEvents(3);
  const comingUp = [
    ...rooms.map((r) => ({ id: `room-${r.id}`, href: `/dashboard/connect/rooms/${r.id}`, title: r.title, when: formatInZone(r.starts_at, r.timezone), kind: "Community room", accent: "teal" as const, sort: r.starts_at })),
    ...events.map((e) => ({ id: `event-${e.id}`, href: e.href, title: e.title, when: eventDay(e.date), kind: "Official IELS event", accent: "coral" as const, sort: e.date.toISOString() })),
  ].sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, 4);
  const featured = pulse.items.filter((i) => i.kind === "opportunity" && !i.closed).slice(0, 2);
  const story = pulse.items.find((i) => i.kind === "story");
  const mine = circles.filter((c) => c.is_member);

  return (
    <section aria-labelledby="community-heading" className="space-y-6" data-testid="home-community">
      <h2 id="community-heading" className="text-2xl font-bold md:text-3xl">Your community</h2>

      {(summary.incoming > 0 || summary.unread > 0) && (
        <div className="flex flex-wrap gap-3" data-testid="home-social-actions">
          {summary.incoming > 0 && (
            <Link href="/dashboard/connect/requests" className={cn(cardGloss, "inline-flex items-center gap-2 px-4 py-3 font-semibold hover:border-[#577E90]", focusRing)}>
              <Inbox size={18} className={ACCENTS.coral.text} aria-hidden="true" /> {summary.incoming} intro{summary.incoming === 1 ? "" : "s"} waiting for your answer
            </Link>
          )}
          {summary.unread > 0 && (
            <Link href="/dashboard/connect/messages" className={cn(cardGloss, "inline-flex items-center gap-2 px-4 py-3 font-semibold hover:border-[#577E90]", focusRing)}>
              <MessageCircle size={18} className={ACCENTS.violet.text} aria-hidden="true" /> {summary.unread} unread message{summary.unread === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      )}

      <PassportChecklist passport={passport} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-end justify-between"><h3 className="text-xl font-bold">Coming up</h3><Link href="/dashboard/connect/rooms" className={btnLink}>Rooms & Events</Link></div>
          {comingUp.length === 0 ? (
            <p className="text-base text-[#2F4157]/60" data-testid="home-nothing-coming">Nothing scheduled yet. <Link href="/dashboard/connect/rooms/new" className="font-semibold underline">Host a room</Link> for other members.</p>
          ) : (
            <ul className="space-y-2" data-testid="home-coming-up">
              {comingUp.map((x) => (
                <li key={x.id}>
                  <Link href={x.href} className={cn(cardGloss, "flex items-center gap-3 p-4 hover:border-[#577E90]", focusRing)}>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENTS[x.accent].soft, ACCENTS[x.accent].text)}><CalendarDays size={18} aria-hidden="true" /></span>
                    <span className="min-w-0"><span className="block truncate font-semibold">{x.title}</span><span className="text-sm text-[#2F4157]/65">{x.when} · {x.kind}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-end justify-between"><h3 className="text-xl font-bold">Featured for you</h3><Link href="/dashboard/pulse" className={btnLink}>IELSco Pulse</Link></div>
          {featured.length + (story ? 1 : 0) === 0 ? (
            <p className="text-base text-[#2F4157]/60">New opportunities and stories appear here.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[...featured, ...(story ? [story] : [])].slice(0, 2).map((i) => <PulseCard key={i.id} item={i} compact />)}</div>
          )}
        </div>
      </div>

      {circles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between"><h3 className="text-xl font-bold">{mine.length ? "Your Circles" : "Join a Circle"}</h3><Link href="/dashboard/circles" className={btnLink}>All Circles</Link></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(mine.length ? mine : circles).slice(0, 3).map((c) => <CircleCard key={c.id} circle={c} footer={<Link href={`/dashboard/circles/${c.id}`} className={btnLink}>{c.is_member ? "Open discussion" : "View & join"}</Link>} />)}
          </div>
        </div>
      )}
    </section>
  );
}

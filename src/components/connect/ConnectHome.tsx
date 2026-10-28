"use client";

import Link from "next/link";
import { CalendarDays, Compass, Inbox, MessageCircle, Mic, Stamp, Users } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { cardGloss, btnPrimary, btnSecondary, focusRing } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { eventDay, upcomingOfficialEvents } from "@/lib/connect/events";
import type { Passport } from "@/lib/connect/types";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, useLoad, when } from "./shared";
import type { LucideIcon } from "lucide-react";

// Steps that make a Passport useful to others. Shown as a checklist, not a percentage.
function passportGaps(p: Passport) {
  return [
    !p.guidelines_accepted || !p.adult_confirmed ? "Accept the Connect guidelines and confirm you're 18+" : null,
    p.languages_spoken.length === 0 ? "Add the languages you speak" : null,
    p.goals.length === 0 ? "Choose what you're looking for" : null,
    p.topics.length === 0 ? "Pick a few interests" : null,
    !p.discoverable ? "Turn on “Show me in Discover” so others can find you" : null,
  ].filter(Boolean) as string[];
}

function Tile({ href, icon: Icon, title, body, count, testId }: { href: string; icon: LucideIcon; title: string; body: string; count?: number; testId: string }) {
  return (
    <Link href={href} data-testid={testId} className={cn(cardGloss, "group flex items-start gap-4 p-5 transition-colors hover:border-[#577E90]", focusRing)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] text-[#577E90]"><Icon size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-lg font-bold">
          {title}
          {count ? <span className="rounded-full bg-[#E56668] px-2 py-0.5 text-xs font-bold text-white">{count}</span> : null}
        </span>
        <span className="block text-base text-[#2F4157]/65">{body}</span>
      </span>
    </Link>
  );
}

export function ConnectHome({ supabase }: DashboardCtx) {
  const data = useLoad(async () => {
    const [summary, passport, rooms] = await Promise.all([
      connectApi.summary(supabase), connectApi.myPassport(supabase), connectApi.rooms(supabase, "discover", { limit: 3 }),
    ]);
    return { summary, passport, rooms };
  }, [supabase]);
  const events = upcomingOfficialEvents(3);

  return (
    <ConnectFrame title="Meet people across Southeast Asia" description="Practise English, exchange cultures and find people with the same goals. Introduce yourself, chat with your connections, join community rooms.">
      <LoadGate state={data.state} onRetry={data.reload} label="Loading Connect…" />
      {data.state.s === "ready" && (() => {
        const { summary, passport, rooms } = data.state.data;
        const gaps = passportGaps(passport);
        return (
          <>
            {gaps.length > 0 && (
              <section data-testid="passport-checklist" className={cn(cardGloss, "flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between")}>
                <div>
                  <h2 className="text-xl font-bold">{passport.exists && passport.display_name ? "Finish your IELSco Passport" : "Create your IELSco Passport"}</h2>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-base text-[#2F4157]/70">{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
                </div>
                <Link href="/dashboard/connect/passport" className={btnPrimary}>Open Passport</Link>
              </section>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Tile testId="tile-passport" href="/dashboard/connect/passport" icon={Stamp} title="IELSco Passport" body={summary.discoverable ? "Visible in Discover. Edit anytime." : "Hidden from Discover."} />
              <Tile testId="tile-discover" href="/dashboard/connect/discover" icon={Compass} title="Discover people" body="Filter by language, interests and goals." />
              <Tile testId="tile-requests" href="/dashboard/connect/requests" icon={Inbox} title="Letter Intros" count={summary.incoming} body={summary.incoming ? `${summary.incoming} waiting for your answer` : summary.outgoing ? `${summary.outgoing} sent, waiting for an answer` : "No pending intros"} />
              <Tile testId="tile-messages" href="/dashboard/connect/messages" icon={MessageCircle} title="Messages" count={summary.unread} body={summary.connections ? `${summary.connections} connection${summary.connections === 1 ? "" : "s"}` : "Connect with someone to start chatting"} />
              <Tile testId="tile-quick-match" href="/dashboard/connect/quick-match" icon={Mic} title="Quick Match" body="8-minute voice or video chats with another member." />
              <Tile testId="tile-rooms" href="/dashboard/connect/rooms" icon={Users} title="Rooms & events" body={summary.rooms_joined || summary.rooms_hosting ? `${summary.rooms_joined} joined · ${summary.rooms_hosting} hosting` : "Join or host a community activity."} />
            </div>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Upcoming community rooms</h2>
                  <Link href="/dashboard/connect/rooms/new" className={cn(btnSecondary, "px-4 py-2 text-sm")}>Host a room</Link>
                </div>
                {rooms.length === 0 ? (
                  <p data-testid="home-no-rooms" className="text-base text-[#2F4157]/60">No upcoming rooms yet. Be the first to host one.</p>
                ) : rooms.map((r) => (
                  <Link key={r.id} href={`/dashboard/connect/rooms/${r.id}`} className={cn(cardGloss, "block p-4 hover:border-[#577E90]", focusRing)}>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-sm text-[#2F4157]/65">{when(r.starts_at)} · hosted by {r.host.display_name} · {r.registered_count}/{r.capacity} registered</p>
                  </Link>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Official IELS events</h2>
                  <Link href="/dashboard/events" className={cn(btnSecondary, "px-4 py-2 text-sm")}>All events</Link>
                </div>
                {events.length === 0 ? (
                  <p data-testid="home-no-events" className="text-base text-[#2F4157]/60">No upcoming official events are scheduled right now.</p>
                ) : events.map((e) => (
                  <Link key={e.id} href={e.href} className={cn(cardGloss, "flex items-center gap-3 p-4 hover:border-[#577E90]", focusRing)}>
                    <CalendarDays size={18} className="shrink-0 text-[#577E90]" />
                    <span><span className="block font-bold">{e.title}</span><span className="text-sm text-[#2F4157]/65">{eventDay(e.date)} · official IELS event</span></span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        );
      })()}
    </ConnectFrame>
  );
}

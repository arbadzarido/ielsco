"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Compass, Inbox, MessageCircle, Mic, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { EmptyState, Notice } from "@/components/dashboard/PageStates";
import { ConnectedApps } from "@/components/dashboard/settings/ConnectedApps";
import { ACCENTS, btnPrimary, btnSecondary, card, cardGloss, focusRing, type Accent } from "@/components/dashboard/ui";
import { ElcoMascot } from "@/components/elco/ElcoMascot";
import OpportunityBoard from "@/components/opportunities/OpportunityBoard";
import { circlesApi, connectApi } from "@/lib/connect/api";
import { eventDay, upcomingOfficialEvents } from "@/lib/connect/events";
import type { Passport } from "@/lib/connect/types";
import { ELCO_ENABLED, elcoHref } from "@/lib/elco";
import { loadOpportunities } from "@/lib/pulse";
import { cn } from "@/lib/utils";
import { CircleCard } from "./CirclesView";
import { reasonsFor } from "./DiscoverView";
import { PulseCard, usePulse } from "./PulseView";
import { RoomCard } from "./RoomsView";
import { PromptActions, promptOfTheWeek } from "./SeaExchangeView";
import { ConnectFrame, LoadGate, PersonCard, useLoad, when } from "./shared";

// Steps that make a Passport useful to others. A checklist, not a percentage.
export function passportGaps(p: Passport) {
  return [
    !p.guidelines_accepted || !p.adult_confirmed ? "Accept the Connect guidelines and confirm you're 18+" : null,
    p.languages_spoken.length === 0 ? "Add the languages you speak" : null,
    p.goals.length === 0 ? "Choose what you're looking for" : null,
    p.topics.length === 0 ? "Pick a few interests" : null,
    !p.discoverable ? "Turn on “Show me in Discover” so others can find you" : null,
  ].filter(Boolean) as string[];
}

export function PassportChecklist({ passport }: { passport: Passport }) {
  const gaps = passportGaps(passport);
  if (!gaps.length) return null;
  return (
    <section data-testid="passport-checklist" className={cn(cardGloss, "flex flex-col gap-4 bg-gradient-to-br from-[#EAEFF5] via-white to-white p-6 md:flex-row md:items-center")}>
      <ElcoMascot mood="wave" size={92} />
      <div className="flex-1">
        <h2 className="text-xl font-bold">{passport.display_name ? "Finish your IELSco Passport" : "Create your IELSco Passport"}</h2>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-base text-[#2F4157]/70">{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
      </div>
      <Link href="/dashboard/connect/passport" className={btnPrimary}>Open Passport</Link>
    </section>
  );
}

function AreaTile({ href, icon: Icon, title, body, accent, count, testId }: { href: string; icon: LucideIcon; title: string; body: string; accent: Accent; count?: number; testId?: string }) {
  const a = ACCENTS[accent];
  return (
    <Link href={href} data-testid={testId} className={cn(cardGloss, "group flex items-start gap-4 bg-gradient-to-br p-5 transition-colors hover:border-[#577E90]", a.gradient, focusRing)}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", a.strong)}><Icon size={22} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-heading text-lg font-semibold">{title}{count ? <span className="rounded-full bg-[#E56668] px-2 py-0.5 text-xs font-bold text-white">{count}</span> : null}</span>
        <span className="block text-base text-[#2F4157]/65">{body}</span>
      </span>
      <ArrowRight size={18} aria-hidden="true" className="mt-1 shrink-0 text-[#2F4157]/40 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </Link>
  );
}

function SectionHead({ title, href, label }: { title: string; href?: string; label?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      {href && <Link href={href} className={cn(btnSecondary, "px-4 py-2 text-sm")}>{label ?? "See all"}</Link>}
    </div>
  );
}

// ── Discover overview ───────────────────────────────────────────────────────────────────────────────────────────────
export function DiscoverHome(ctx: DashboardCtx) {
  const { supabase } = ctx;
  const data = useLoad(async () => {
    const [passport, people, circles] = await Promise.all([
      connectApi.myPassport(supabase),
      connectApi.discover(supabase, { search: "", country: "", speaks: "", learning: "", englishLevel: "", topic: "", goal: "", activity: "", day: "" }, 0, 3).catch(() => []),
      circlesApi.list(supabase).catch(() => []),
    ]);
    return { passport, people, circles };
  }, [supabase]);
  const pulse = usePulse(ctx);
  const week = promptOfTheWeek();

  return (
    <ConnectFrame title="Discover" description="People with shared goals, Circles to join, verified opportunities, useful reads and Southeast Asian perspectives.">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && <PassportChecklist passport={data.state.data.passport} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AreaTile testId="area-people" href="/dashboard/connect/discover" icon={Users} accent="navy" title="People" body="Language partners and members with your goals." />
        <AreaTile testId="area-circles" href="/dashboard/circles" icon={Compass} accent="teal" title="Circles" body="Small groups around shared goals." />
        <AreaTile testId="area-opportunities" href="/dashboard/discover/opportunities" icon={ShieldCheck} accent="amber" title="Opportunities" body="Scholarships, exchanges and programs, source-checked." />
        <AreaTile testId="area-pulse" href="/dashboard/pulse" icon={Inbox} accent="violet" title="IELSco Pulse" body="Stories, guides and videos." />
        <AreaTile testId="area-sea" href="/dashboard/sea-exchange" icon={MessageCircle} accent="coral" title="SEA Cultural Exchange" body="Prompts to talk across borders." />
      </div>

      {data.state.s === "ready" && (
        <section className="space-y-4">
          <SectionHead title="People you might like to meet" href="/dashboard/connect/discover" />
          {data.state.data.people.length === 0 ? (
            <p className="text-base text-[#2F4157]/60" data-testid="discover-no-people">Nobody to suggest yet. As members turn on Discover in their Passport, suggestions appear here with the reason for each.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.state.data.people.map((r) => <PersonCard key={r.person.id} person={r.person} reasons={reasonsFor(r)} footer={<Link href={`/dashboard/connect/people/${r.person.id}`} className={btnPrimary}>Say hi</Link>} />)}
            </div>
          )}
        </section>
      )}

      {data.state.s === "ready" && data.state.data.circles.length > 0 && (
        <section className="space-y-4">
          <SectionHead title="Circles" href="/dashboard/circles" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.state.data.circles.map((c) => <CircleCard key={c.id} circle={c} footer={<Link href={`/dashboard/circles/${c.id}`} className={btnSecondary}>{c.is_member ? "Open" : "View & join"}</Link>} />)}
          </div>
        </section>
      )}

      {pulse.items.length > 0 && (
        <section className="space-y-4">
          <SectionHead title="From IELSco Pulse" href="/dashboard/pulse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{pulse.items.filter((i) => !i.closed).slice(0, 4).map((i) => <PulseCard key={i.id} item={i} compact />)}</div>
        </section>
      )}

      <section className={cn(cardGloss, "space-y-3 bg-gradient-to-br p-6", ACCENTS[week.theme.accent].gradient)}>
        <p className={cn("text-sm font-semibold uppercase tracking-wide", ACCENTS[week.theme.accent].text)}>SEA Cultural Exchange · prompt of the week</p>
        <h2 className="text-2xl font-semibold">{week.prompt}</h2>
        <PromptActions prompt={week.prompt} />
      </section>
    </ConnectFrame>
  );
}

// ── Discover → Opportunities (the public board, inside the dashboard) ──────────────────────────────────────────────
export function DiscoverOpportunities({ supabase }: DashboardCtx) {
  const data = useLoad(() => loadOpportunities(supabase), [supabase]);
  return (
    <ConnectFrame title="Opportunities" description="Scholarships, exchanges, fellowships, internships and programs. Each one links to its official page and says when IELS last checked it."
      actions={<Link href="/dashboard/opportunities" className={btnSecondary}>My saved opportunities</Link>}>
      <LoadGate state={data.state} onRetry={data.reload} label="Loading opportunities…" />
      {data.state.s === "ready" && (data.state.data.length > 0 ? <OpportunityBoard items={data.state.data} /> : (
        <EmptyState title="No opportunities published right now" body="The IELS team checks new programs every week." />
      ))}
    </ConnectFrame>
  );
}

// ── Social overview ─────────────────────────────────────────────────────────────────────────────────────────────────
export function SocialHome({ supabase }: DashboardCtx) {
  const data = useLoad(async () => {
    const [summary, connections] = await Promise.all([connectApi.summary(supabase), connectApi.connections(supabase)]);
    return { summary, recent: connections.filter((c) => !c.blocked).slice(0, 5) };
  }, [supabase]);
  return (
    <ConnectFrame title="Social" description="Introductions, private messages and the people you're connected with. Conversations start only when both of you agree.">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (() => {
        const { summary, recent } = data.state.data;
        return (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <AreaTile testId="social-requests" href="/dashboard/connect/requests" icon={Inbox} accent="coral" title="Intro requests" count={summary.incoming}
                body={summary.incoming ? `${summary.incoming} waiting for your answer` : summary.outgoing ? `${summary.outgoing} sent, waiting` : "No pending intros"} />
              <AreaTile testId="social-messages" href="/dashboard/connect/messages" icon={MessageCircle} accent="violet" title="Messages" count={summary.unread}
                body={summary.unread ? `${summary.unread} unread` : "All caught up"} />
              <AreaTile testId="social-connections" href="/dashboard/connect/connections" icon={Users} accent="teal" title="Connections"
                body={`${summary.connections} connection${summary.connections === 1 ? "" : "s"}`} />
            </div>
            <section className="space-y-3">
              <SectionHead title="Recent conversations" href="/dashboard/connect/messages" />
              {recent.length === 0 ? (
                <div className={cn(cardGloss, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center")} data-testid="social-empty">
                  <ElcoMascot mood="relaxed" size={88} />
                  <div className="flex-1">
                    <p className="font-heading text-lg font-semibold">No conversations yet</p>
                    <p className="text-base text-[#2F4157]/70">Find someone with a shared goal and send a short Letter Intro. If they accept, you can message each other.</p>
                  </div>
                  <Link href="/dashboard/connect/discover" className={btnPrimary}>Discover people</Link>
                </div>
              ) : (
                <ul className={cn(card, "divide-y divide-[#E3E7ED]")}>
                  {recent.map((c) => (
                    <li key={c.person.id}>
                      <Link href={`/dashboard/connect/messages/${c.person.id}`} className={cn("flex items-center gap-3 p-4 hover:bg-[#F7F8FA]", focusRing)}>
                        <Avatar name={c.person.display_name} url={c.person.avatar_url} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate", c.unread ? "font-bold" : "font-semibold")}>{c.person.display_name}</span>
                          <span className="block truncate text-sm text-[#2F4157]/65">{c.last_body ? `${c.last_mine ? "You: " : ""}${c.last_body}` : "Say hello 👋"}</span>
                        </span>
                        <span className="text-sm text-[#2F4157]/50">{when(c.last_at ?? c.connected_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <Notice testId="social-safety">You can block or report anyone from their profile, an intro or a conversation. <Link href="/dashboard/connect/safety" className="font-semibold underline">Safety settings</Link></Notice>
          </>
        );
      })()}
    </ConnectFrame>
  );
}

// ── Connect overview ────────────────────────────────────────────────────────────────────────────────────────────────
export function ConnectHub({ supabase }: DashboardCtx) {
  const data = useLoad(async () => {
    const [qm, rooms, summary] = await Promise.all([connectApi.qmPoll(supabase), connectApi.rooms(supabase, "discover", { limit: 3 }), connectApi.summary(supabase)]);
    return { qm, rooms, summary };
  }, [supabase]);
  const events = upcomingOfficialEvents(3);
  return (
    <ConnectFrame title="Connect" description="Talk to members live, join community rooms and IELS events, and practise English with Elco AI.">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (() => {
        const { qm, rooms, summary } = data.state.data;
        return (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className={cn(cardGloss, "flex flex-col gap-3 bg-gradient-to-br p-6", ACCENTS.violet.gradient)} data-testid="connect-qm">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", ACCENTS.violet.strong)}><Mic size={22} aria-hidden="true" /></span>
                <h2 className="text-xl font-semibold">Quick Match</h2>
                <p className="text-base text-[#2F4157]/70">An 8-minute voice or video chat with another member, with a topic card if you like. Connect afterwards only if you both say yes.</p>
                <p className={cn("text-sm font-semibold", qm.enabled ? "text-[#2E6B4F]" : "text-[#8A5A00]")} data-testid="connect-qm-status">
                  {qm.enabled ? (qm.call_id ? "You have a call in progress." : qm.waiting ? "You're in the queue." : "Open now.") : "Not switched on yet: live calls are still being tested."}
                </p>
                <Link href="/dashboard/connect/quick-match" className={cn(btnPrimary, "mt-auto w-max")}>{qm.enabled ? "Open Quick Match" : "Learn more"}</Link>
              </section>
              <section className={cn(cardGloss, "flex flex-col gap-3 bg-gradient-to-br p-6", ACCENTS.teal.gradient)}>
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", ACCENTS.teal.strong)}><CalendarDays size={22} aria-hidden="true" /></span>
                <h2 className="text-xl font-semibold">Rooms & Events</h2>
                <p className="text-base text-[#2F4157]/70">Member-hosted rooms and official IELS events. {summary.rooms_joined || summary.rooms_hosting ? `You've joined ${summary.rooms_joined} and host ${summary.rooms_hosting}.` : ""}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href="/dashboard/connect/rooms" className={btnPrimary}>Browse</Link>
                  <Link href="/dashboard/connect/rooms/new" className={btnSecondary}>Host a room</Link>
                </div>
              </section>
              <section className={cn(cardGloss, "flex flex-col gap-3 bg-gradient-to-br p-6", ACCENTS.navy.gradient)}>
                <ElcoMascot mood="happy" size={56} />
                <h2 className="text-xl font-semibold">Connect with Elco</h2>
                <p className="text-base text-[#2F4157]/70">Elco AI is IELS&apos;s separate English practice app: speaking practice and feedback. Your IELSco data stays here.</p>
                <Link href="/dashboard/connect/elco" className={cn(btnSecondary, "mt-auto w-max")}>About Elco AI</Link>
              </section>
            </div>
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <SectionHead title="Upcoming community rooms" href="/dashboard/connect/rooms" />
                {rooms.length === 0 ? <p className="text-base text-[#2F4157]/60" data-testid="connect-no-rooms">No upcoming rooms yet. Be the first to host one.</p> : rooms.map((r) => <RoomCard key={r.id} room={r} />)}
              </div>
              <div className="space-y-3">
                <SectionHead title="Official IELS events" href="/dashboard/events" label="All events" />
                {events.length === 0 ? <p className="text-base text-[#2F4157]/60">No upcoming official events are scheduled right now.</p> : events.map((e) => (
                  <Link key={e.id} href={e.href} className={cn(cardGloss, "flex items-center gap-3 p-4 hover:border-[#577E90]", focusRing)}>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENTS.coral.soft, ACCENTS.coral.text)}><CalendarDays size={18} aria-hidden="true" /></span>
                    <span><span className="block font-semibold">{e.title}</span><span className="text-sm text-[#2F4157]/65">{eventDay(e.date)} · official IELS event</span></span>
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

// ── Connect with Elco ───────────────────────────────────────────────────────────────────────────────────────────────
export function ElcoConnectView({ supabase }: DashboardCtx) {
  return (
    <ConnectFrame title="Connect with Elco" description="Elco AI is IELS's English practice app. It is a separate product with its own account and data.">
      <section className={cn(cardGloss, "flex flex-col gap-6 bg-gradient-to-br p-6 md:flex-row md:items-center md:p-8", ACCENTS.navy.gradient)}>
        <ElcoMascot mood="wave" size={140} />
        <div className="flex-1 space-y-3">
          <h2 className="text-2xl font-semibold">Practise English with Elco AI</h2>
          <ul className="list-disc space-y-1 pl-5 text-base text-[#2F4157]/75">
            <li>Speaking practice with feedback, at your own level.</li>
            <li>Lessons and practice built around real situations such as interviews and presentations.</li>
            <li>Free to start. Elco has its own sign-in and keeps its own learning records.</li>
          </ul>
          {ELCO_ENABLED ? (
            <a href={elcoHref("connect")} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="elco-open">
              Open Elco AI <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <p className="text-base font-semibold text-[#8A5A00]" data-testid="elco-not-enabled">Elco AI isn&apos;t available from here yet.</p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Linked account</h2>
        <p className="text-base text-[#2F4157]/70">Optional. Linking lets Elco read your IELSco goals and show a short progress summary here. IELSco never sees your Elco practice history, and you can unlink anytime.</p>
        <ConnectedApps supabase={supabase} />
      </section>
      <p className="text-sm text-[#2F4157]/60">Elco Copilot (the robot button in the corner) is different: it helps you find your way around IELSco.</p>
    </ConnectFrame>
  );
}

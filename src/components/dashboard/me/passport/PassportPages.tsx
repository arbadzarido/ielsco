"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Award, BriefcaseBusiness, CalendarDays, Lock, Mic, Sparkles, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MemberProfile } from "@/lib/dashboard/types";
import type { BadgeState, StampEntry } from "@/lib/me/badges";
import type { JourneyEntry } from "@/lib/me/records";
import { Avatar } from "../../Avatar";
import { EmptyState } from "../../PageStates";
import { btnLink, btnPrimary, btnSecondary, focusRing, tag } from "../../ui";
import { EmptyStampSlot, Stamp, type StampTone } from "./Stamp";
import { cn } from "@/lib/utils";

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
const H = ({ children, id }: { children: ReactNode; id: string }) => <h2 id={id} className="pr-24 text-[24px] font-bold text-[#1A2534]">{children}</h2>;
const LABEL = "text-[12px] font-semibold uppercase tracking-[0.14em] text-[#2F4157]/55";

const STAMP_LOOK: Record<StampEntry["group"], { icon: LucideIcon; tone: StampTone }> = {
  circle: { icon: Mic, tone: "teal" }, events: { icon: CalendarDays, tone: "coral" }, opportunities: { icon: BriefcaseBusiness, tone: "navy" }, elco: { icon: Sparkles, tone: "navy" },
};
const GROUPS: { id: StampEntry["group"]; title: string; rule: string }[] = [
  { id: "circle", title: "IELS Circle", rule: "Your first stamp appears when you check in to an IELS Circle session." },
  { id: "events", title: "Events", rule: "Your first stamp appears when you attend an IELSco event, a community session or a member session." },
  { id: "opportunities", title: "Opportunities", rule: "Your first stamp appears when you mark an opportunity as Applied in your tracker." },
];

export function IdentityPage({ profile, memberSince, goals, record }: { profile: MemberProfile; memberSince?: string; goals: string[]; record: [string, number, string][] }) {
  const name = profile.display_name || "Member";
  const facts = [profile.role_status, profile.origin_country && `From ${profile.origin_country}`, profile.english_level && `English: ${profile.english_level} (self-reported)`].filter(Boolean) as string[];
  return (
    <section aria-labelledby="pp-identity" data-testid="passport-identity" className="space-y-6">
      <H id="pp-identity">Identity</H>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0">
          <div className="inline-block rounded-2xl border border-[#2F4157]/20 bg-white p-1.5 shadow-sm">
            <Avatar name={name} url={profile.avatar_url} size={104} className="!rounded-xl bg-[#2F4157] text-white" />
          </div>
        </div>
        <dl className="min-w-0 flex-1 space-y-3">
          <div><dt className={LABEL}>Name</dt><dd className="text-[26px] font-bold leading-tight text-[#1A2534]">{name}</dd></div>
          <div><dt className={LABEL}>Details</dt>
            <dd className="text-[16px] text-[#2F4157]/80">{facts.join(" · ") || <>Add your details in <Link href="/dashboard/profile" className={btnLink}>your profile</Link>.</>}</dd></div>
          {memberSince && <div><dt className={LABEL}>Member since</dt><dd className="text-[16px] font-semibold">{memberSince}</dd></div>}
          <div><dt className={LABEL}>Origin, destination and goals</dt>
            <dd className="mt-1">{goals.length > 0 ? <span className="flex flex-wrap gap-2">{goals.map((g) => <span key={g} className={tag}>{g}</span>)}</span>
              : <span className="text-[15px]"><Link href="/dashboard/onboarding" className={btnLink}>Set your goals</Link> so IELSco and Elco can suggest what fits.</span>}</dd></div>
        </dl>
      </div>
      <p className="inline-flex items-center gap-2 rounded-full bg-[#2F4157]/10 px-3 py-1 text-[13px] font-semibold text-[#2F4157]" data-testid="passport-private"><Lock size={13} aria-hidden="true" /> Private: only you can see this page</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/profile" className={btnSecondary}>Edit profile</Link>
        <Link href="/dashboard/connect/passport" className={btnSecondary}>Social profile</Link>
        <Link href="/dashboard/my-goals" className={btnSecondary}>Edit goals</Link>
      </div>
      <div>
        <h3 className="text-[16px] font-bold">My record</h3>
        <dl className="mt-2 grid gap-x-8 gap-y-1.5 text-[15px] sm:grid-cols-2">
          {record.map(([label, value, href]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-dotted border-[#2F4157]/20 pb-1">
              <dt><Link href={href} className={cn("rounded hover:underline", focusRing)}>{label}</Link></dt><dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function StampsPage({ stamps }: { stamps: StampEntry[] }) {
  return (
    <section aria-labelledby="pp-stamps" data-testid="passport-stamps" className="space-y-6">
      <H id="pp-stamps">Stamps</H>
      <p className="text-[15px] text-[#2F4157]/70">Each stamp is something you really did, with its date. Nothing is added for you.</p>
      {GROUPS.map((g) => {
        const list = stamps.filter((s) => s.group === g.id);
        return (
          <div key={g.id}>
            <h3 className="text-[16px] font-bold">{g.title} <span className="font-normal text-[#2F4157]/55">· {list.length}</span></h3>
            {list.length === 0 ? <div className="mt-2"><EmptyStampSlot rule={g.rule} /></div> : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {list.slice(0, 24).map((s) => {
                  const l = STAMP_LOOK[s.group];
                  return <li key={s.id}><Stamp id={s.id} icon={l.icon} tone={l.tone} kind={s.label} title={s.title} date={short(s.at)} href={s.href} /></li>;
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function BadgesPage({ badges }: { badges: BadgeState[] }) {
  const earned = badges.filter((b) => b.earned);
  const open = badges.filter((b) => !b.earned);
  return (
    <section aria-labelledby="pp-badges" data-testid="passport-badges" className="space-y-6">
      <H id="pp-badges">Visas &amp; badges</H>
      <p className="text-[15px] text-[#2F4157]/70">{earned.length} of {badges.length} earned. <Link href="/dashboard/passport/milestones" className={btnLink}>Milestone Hall</Link></p>
      {earned.length === 0 ? <EmptyStampSlot rule={`Your first stamp appears when you earn a badge. The closest: ${open[0]?.def.name}. ${open[0]?.def.how}`} /> : (
        <ul className="flex flex-wrap gap-2">{earned.map((b) => <li key={b.def.id}><Stamp id={b.def.id} icon={Award} tone="gold" kind="Badge" title={b.def.name} /></li>)}</ul>
      )}
      {open.length > 0 && (
        <div>
          <h3 className="text-[16px] font-bold">Still to earn</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {open.map((b) => (
              <li key={b.def.id} title={b.def.description} className="rounded-xl border border-dashed border-[#2F4157]/25 p-3">
                <span className="block text-[15px] font-semibold">{b.def.name}</span>
                <span className="block text-[14px] text-[#2F4157]/70">{b.def.how}</span>
                <span className="mt-0.5 block text-[13px] font-semibold text-[#577E90]">{b.value === null ? "Link Elco AI to track this" : `${Math.min(b.value, b.def.target)} of ${b.def.target}`}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const JOURNEY_ICON: Record<JourneyEntry["kind"], LucideIcon> = {
  account: UserRound, event: CalendarDays, circle: Mic, opportunity: BriefcaseBusiness, elco: Sparkles, community: Award,
};

// Oldest first, like pages filled in over time. Built only from dated records (buildJourney).
export function JourneyPage({ journey }: { journey: JourneyEntry[] }) {
  const shown = journey.slice(0, 40).reverse();
  return (
    <section aria-labelledby="pp-journey" data-testid="passport-journey" className="space-y-4">
      <H id="pp-journey">My learning journey</H>
      {journey.length <= 1 ? (
        <EmptyState title="Your journey starts with one step" body="Register for an event, check in to IELS Circle, track an opportunity or link Elco AI. Each one is added here with its date."
          action={<Link href="/dashboard/events" className={btnPrimary}>Find an event</Link>} />
      ) : (
        <ol className="relative ml-4 space-y-4 border-l-2 border-dashed border-[#2F4157]/25 pl-6">
          {shown.map((e) => {
            const Icon = JOURNEY_ICON[e.kind];
            const body = (
              <>
                <span className="block text-[13px] font-semibold text-[#2F4157]/55">{day(e.at)}</span>
                <span className="block text-[16px] font-semibold text-[#1A2534]">{e.title}</span>
                <span className="block text-[14px] text-[#2F4157]/65">{e.detail}</span>
              </>
            );
            return (
              <li key={e.id} className="relative">
                <span aria-hidden="true" className="absolute -left-[42px] top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#2F4157]/25 bg-[#FBF8F1] text-[#2F4157]"><Icon size={15} /></span>
                {e.href ? <Link href={e.href} className={cn("block rounded-lg hover:underline", focusRing)}>{body}</Link> : <div>{body}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

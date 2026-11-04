"use client";

import Link from "next/link";
import { Award, BriefcaseBusiness, CalendarDays, IdCard, Lock, Mic, Sparkles, Trophy, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { Avatar } from "../Avatar";
import { EmptyState, ErrorState, LoadingState } from "../PageStates";
import { useMyRecords } from "../useMyRecords";
import { ElcoProgressCard } from "./ElcoProgressCard";
import { ACCENTS, btnLink, btnPrimary, btnSecondary, cardGloss, focusRing, tag, type Accent } from "../ui";
import { badgeStates } from "@/lib/me/badges";
import { buildJourney, type JourneyEntry } from "@/lib/me/records";
import { destinationLabels } from "@/lib/dashboard/countries";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const JOURNEY_STYLE: Record<JourneyEntry["kind"], { icon: LucideIcon; accent: Accent }> = {
  account: { icon: UserRound, accent: "navy" }, event: { icon: CalendarDays, accent: "coral" }, circle: { icon: Mic, accent: "teal" },
  opportunity: { icon: BriefcaseBusiness, accent: "amber" }, elco: { icon: Sparkles, accent: "violet" }, community: { icon: Award, accent: "green" },
};
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// EL-Passport (docs/IELSCO-PRODUCT-ARCHITECTURE.md §6): one identity across IELSco and Elco AI, built from the same
// auth user id. Everything here is the member's own data, private to them; nothing on this page is shown to others.
export function PassportView({ user, profile }: DashboardCtx) {
  const { t, locale } = useI18n();
  const { state, reload } = useMyRecords(user.id);
  if (state.s === "loading") return <LoadingState label="Loading your EL-Passport…" />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={reload} />;
  if (state.s === "signed-out") return null;
  const r = state.data;
  const journey = buildJourney(r, { joinedAt: user.created_at, goalsSetAt: profile.onboarding_completed_at });
  const badges = badgeStates(r);
  const earned = badges.filter((b) => b.earned);
  const circleCheckins = r.activities.filter((a) => a.kind === "circle_session" && a.past).length;
  const goals = [
    profile.direction && t(`directions.${profile.direction}`),
    ...destinationLabels(profile.destination_countries, profile.destination_other, locale),
    ...profile.interests.filter((i) => i !== "Not sure yet"),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[110rem] space-y-8 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <section data-testid="passport-identity" className={cn(cardGloss, "p-6")}>
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#577E90]"><IdCard size={16} aria-hidden="true" /> EL-Passport · IELSco × Elco AI</p>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
          <Avatar name={profile.display_name || "Member"} url={profile.avatar_url} size={72} className="bg-[#2F4157] text-white" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[30px] font-bold leading-tight">{profile.display_name || "Your passport"}</h1>
            <p className="text-[16px] text-[#2F4157]/70">{[profile.role_status, profile.origin_country && `From ${profile.origin_country}`, profile.english_level && `English: ${profile.english_level} (self-reported)`].filter(Boolean).join(" · ") || "Add your details in your profile."}</p>
            {goals.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">{goals.map((g) => <span key={g} className={tag}>{g}</span>)}</div>
            ) : <p className="mt-3 text-[15px]"><Link href="/dashboard/onboarding" className={btnLink}>Set your goals</Link> so IELSco and Elco can suggest what fits.</p>}
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F1F4F8] px-3 py-1 text-[13px] font-semibold text-[#2F4157]" data-testid="passport-private">
              <Lock size={13} aria-hidden="true" /> Private: only you can see this page
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:flex-col">
            <Link href="/dashboard/profile" className={btnSecondary}>Edit profile</Link>
            <Link href="/dashboard/connect/passport" className={btnSecondary}>Social profile</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <ElcoProgressCard elco={r.elco} />

          <section aria-labelledby="journey-timeline-heading" className="space-y-3" data-testid="passport-journey">
            <h2 id="journey-timeline-heading" className="text-[22px] font-bold">My learning journey</h2>
            {journey.length <= 1 ? (
              <EmptyState title="Your journey starts with one step" body="Register for an event, check in to IELS Circle, track an opportunity or link Elco AI. Each one is added here with its date."
                action={<Link href="/dashboard/events" className={btnPrimary}>Find an event</Link>} />
            ) : (
              <ol className="space-y-2">
                {journey.slice(0, 30).map((e) => {
                  const { icon: Icon, accent } = JOURNEY_STYLE[e.kind];
                  const body = (
                    <>
                      <span className="block text-[13px] font-semibold text-[#2F4157]/55">{day(e.at)}</span>
                      <span className="block text-[16px] font-semibold text-[#1A2534]">{e.title}</span>
                      <span className="block text-[14px] text-[#2F4157]/65">{e.detail}</span>
                    </>
                  );
                  return (
                    <li key={e.id}>
                      {e.href ? (
                        <Link href={e.href} className={cn(cardGloss, "flex items-center gap-3 p-4 hover:border-[#577E90]", focusRing)}>
                          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENTS[accent].soft, ACCENTS[accent].text)}><Icon size={18} aria-hidden="true" /></span>
                          <span className="min-w-0">{body}</span>
                        </Link>
                      ) : (
                        <div className={cn(cardGloss, "flex items-center gap-3 p-4")}>
                          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ACCENTS[accent].soft, ACCENTS[accent].text)}><Icon size={18} aria-hidden="true" /></span>
                          <span className="min-w-0">{body}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section aria-labelledby="passport-badges-heading" className={cn(cardGloss, "p-6")} data-testid="passport-badges">
            <div className="flex items-center justify-between gap-3">
              <h2 id="passport-badges-heading" className="flex items-center gap-2 text-[20px] font-bold"><Trophy size={20} className="text-[#8A5A00]" aria-hidden="true" /> Badges</h2>
              <Link href="/dashboard/passport/milestones" className={btnLink}>Milestone Hall</Link>
            </div>
            <p className="mt-1 text-[15px] text-[#2F4157]/65">{earned.length} of {badges.length} earned</p>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {badges.slice(0, 8).map((b) => (
                <li key={b.def.id} title={b.def.how} className={cn("rounded-xl border p-3", b.earned ? "border-[#8A5A00]/25 bg-[#FDF3E3]" : "border-dashed border-[#E3E7ED] bg-white/60")}>
                  <span className={cn("block text-[14px] font-semibold", !b.earned && "text-[#2F4157]/55")}>{b.def.name}</span>
                  <span className="text-[12px] text-[#2F4157]/60">{b.earned ? "Earned" : b.value === null ? "Link Elco to track" : `${Math.min(b.value, b.def.target)}/${b.def.target}`}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="passport-record-heading" className={cn(cardGloss, "p-6")}>
            <h2 id="passport-record-heading" className="text-[20px] font-bold">My record</h2>
            <dl className="mt-3 space-y-2 text-[15px]">
              {[
                ["IELS Circle check-ins", circleCheckins, "/dashboard/circle"],
                ["Circle groups joined", r.circlesJoined.length, "/dashboard/circles"],
                ["Events taken part in", r.activities.filter((a) => a.past && a.kind !== "circle_session" && a.kind !== "circle_cohort").length, "/dashboard/events"],
                ["Opportunities tracked", r.tracked.length, "/dashboard/opportunities"],
                ["Saved items", r.bookmarks, "/dashboard/shelf"],
                ["Connections", r.connections, "/dashboard/connect/connections"],
                ["Community events hosted", r.roomsHosted, "/dashboard/connect/rooms"],
              ].map(([label, value, href]) => (
                <div key={label as string} className="flex items-center justify-between gap-3">
                  <dt><Link href={href as string} className="hover:underline">{label}</Link></dt><dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="passport-certs-heading" className={cn(cardGloss, "p-6")}>
            <h2 id="passport-certs-heading" className="text-[20px] font-bold">Certificates</h2>
            <p className="mt-1 text-[15px] text-[#2F4157]/65">IELS Circle e-certificates are given at the cohort&apos;s graduation. None are recorded in your account yet; they will be listed here when IELSco issues them online.</p>
          </section>

          <section aria-labelledby="passport-story-heading" className={cn(cardGloss, "p-6")}>
            <h2 id="passport-story-heading" className="text-[20px] font-bold">Beyond the Circle</h2>
            <p className="mt-1 text-[15px] text-[#2F4157]/65">Got into a program, gave your first talk in English, landed a role? Share your story. We publish it only with your consent, and you can ask us to take it down.</p>
            <Link href="/circle/stories/submit" className={cn(btnSecondary, "mt-3")}>Share my story</Link>
          </section>

          <section aria-labelledby="passport-privacy-heading" className="rounded-2xl border border-[#E3E7ED] bg-white/70 p-5 text-[14px] text-[#2F4157]/70">
            <h2 id="passport-privacy-heading" className="text-[16px] font-bold text-[#2F4157]">What syncs, and who sees it</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your IELSco records come from your own account; nobody else can read this page.</li>
              <li>Elco AI shares a short practice summary only after you link accounts, and only with the permissions you approved. <Link href="/dashboard/connect/elco" className="font-semibold underline">Manage or unlink</Link>.</li>
              <li>Your public profile and Social profile have their own visibility settings.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

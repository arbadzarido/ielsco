"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar } from "../Avatar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Check, ExternalLink, MessageCircle, MessagesSquare, Users } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Notice, PageHeader } from "../PageStates";
import { btnPrimary, btnSecondary, cardGloss, focusRing, tag } from "../ui";
import { LINKS } from "@/data/dashboard/config";
import { CIRCLE_COHORT } from "@/data/dashboard/circle";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import { formatSessionWib, upcomingSessions, type CircleSession } from "@/lib/circle/sessions";
import { cancelCheckIn, checkIn, loadCheckins, type CheckinState } from "@/lib/circle/checkins";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { invalidateMyRecords } from "../useMyRecords";

const SESSIONS_SHOWN = 4;

function SessionCard({ session, featured, state, busy, onToggle }: {
  session: CircleSession; featured: boolean; state: CheckinState; busy: boolean; onToggle: () => void;
}) {
  const { day, time } = formatSessionWib(session.start);
  const checked = state.status === "ready" && state.mine.has(session.id);
  const count = state.status === "ready" ? state.counts?.get(session.id) ?? 0 : null;
  return (
    <li
      data-testid="circle-session"
      className={cn(
        "flex flex-col gap-4 rounded-3xl p-6",
        featured ? "bg-[#2F4157] text-white shadow-[0_18px_40px_rgba(47,65,87,0.22)] md:col-span-2 md:flex-row md:items-end md:justify-between md:p-8" : cn(cardGloss, "text-[#2F4157]")
      )}
    >
      <div className="min-w-0">
        <p className={cn("flex flex-wrap items-center gap-2 text-[14px] font-semibold", featured ? "text-white/75" : "text-[#577E90]")}>
          <CalendarClock size={16} aria-hidden="true" />
          {featured && <span className="rounded-full bg-[#E56668] px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wide text-white">Next session</span>}
          <span>{day} · {time}</span>
        </p>
        <h3 className={cn("mt-2 font-bold leading-tight", featured ? "text-[28px] md:text-[34px]" : "text-[20px]")}>{session.topic.title}</h3>
        <p className={cn("mt-2 max-w-2xl text-[15px] leading-relaxed", featured ? "text-white/80" : "text-[#2F4157]/70")}>{session.topic.description}</p>
        <p className="mt-3 flex flex-wrap gap-2">
          <span className={cn(tag, featured && "bg-white/12 text-white")}>{session.topic.theme}</span>
          {count !== null && count > 0 && (
            <span className={cn(tag, featured && "bg-white/12 text-white")} data-testid="circle-session-count">
              <Users size={13} className="mr-1" aria-hidden="true" /> {count} checked in
            </span>
          )}
        </p>
      </div>
      {state.status === "ready" && (
        <button
          type="button"
          data-testid="circle-checkin"
          aria-pressed={checked}
          disabled={busy}
          onClick={onToggle}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors disabled:opacity-60",
            focusRing,
            checked
              ? featured ? "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25" : "bg-[#E8EEF3] text-[#1A2534] hover:bg-[#DCE5EC]"
              : featured ? "bg-white text-[#2F4157] hover:bg-[#F1F4F8]" : "bg-[#2F4157] text-white hover:bg-[#3d5470]"
          )}
        >
          {checked && <Check size={16} aria-hidden="true" />}
          {busy ? "Saving…" : checked ? "Checked in · Cancel" : "Check in"}
        </button>
      )}
    </li>
  );
}

function Stories() {
  const stories = usePublishedStories(3);
  return (
    <section aria-labelledby="stories-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="stories-heading" className="text-[24px] font-bold">IELS Insight: member stories</h2>
          <p className="text-[15px] text-[#2F4157]/65">Real journeys from members across the region.</p>
        </div>
        <Link href="/circle/stories" data-testid="circle-all-stories" className={btnSecondary}>All stories <ArrowRight size={16} /></Link>
      </div>
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {stories.map((s) => (
          <li key={s.slug}>
            <Link href={`/circle/stories/${s.slug}`} className={cn("group block overflow-hidden rounded-3xl bg-white", cardGloss, focusRing)}>
              <span className="flex items-center gap-3 px-5 pb-4 pt-5" data-testid="story-author">
                <Avatar name={s.author.name} url={s.author.avatar} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-[#1A2534]">{s.author.name}</span>
                  {s.author.role && <span className="block truncate text-[13px] text-[#2F4157]/65">{s.author.role}</span>}
                </span>
              </span>
              <span className="block px-5 pb-4 text-[17px] font-bold leading-snug text-[#1A2534]">{s.title}</span>
              <span className="relative block aspect-[16/10] overflow-hidden bg-[#F1F4F8]">
                {s.bannerImage && <Image src={s.bannerImage} alt={`Banner for ${s.title}`} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
              </span>
              <span className="flex flex-col gap-4 p-5">
                <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157] group-hover:text-[#577E90]">Read story <ArrowRight size={15} aria-hidden="true" /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Circle: the ongoing IELS Circle community and speaking club, with its own menu item (Events ▸ Circle). Recurring weekly
// sessions (Wed 19:00 / Sat 13:00 WIB) with check-ins, member stories and community channels. The current cohort's
// agenda stays available as a link. The 2025 IELS Circle event is a past event and is not used as this page's identity.
export function CircleView({ supabase }: { supabase: SupabaseClient }) {
  const { t } = useI18n();
  const sessions = useMemo(() => upcomingSessions(SESSIONS_SHOWN), []);
  const ids = useMemo(() => sessions.map((s) => s.id), [sessions]);
  const [state, setState] = useState<CheckinState>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => setState(await loadCheckins(supabase, ids)), [supabase, ids]);
  useEffect(() => {
    reload();
  }, [reload]);

  const toggle = async (session: CircleSession) => {
    if (state.status !== "ready") return;
    const checked = state.mine.has(session.id);
    setBusy(session.id);
    setMessage(null);
    try {
      if (checked) await cancelCheckIn(supabase, session.id);
      else await checkIn(supabase, session.id);
      invalidateMyRecords();
      await reload();
      const { day, time } = formatSessionWib(session.start);
      setMessage({ ok: true, text: checked ? `Check-in cancelled for ${day}.` : `You're checked in for ${day}, ${time}.` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[110rem] space-y-12 px-4 py-10 md:px-6 md:py-12 lg:px-10">
      <div className="space-y-4">
        <Image src="/images/logos/circle/circle-c-blue.svg" alt="IELS Circle logo" width={212} height={243} priority className="h-auto w-[52px]" data-testid="circle-logo" />
        <PageHeader title={t("pages.circleTitle")} description="IELSco's ongoing English speaking community. Meet members twice a week to practise speaking, swap opportunities and share where you're heading.">
          <Link href="/circle" className={btnSecondary}>About Circle</Link>
        </PageHeader>
      </div>

      <section aria-labelledby="sessions-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sessions-heading" className="text-[24px] font-bold">Weekly sessions</h2>
            <p className="text-[15px] text-[#2F4157]/65">Every Wednesday 19:00 and Saturday 13:00 WIB (Jakarta time). Check in so organisers know you&apos;re coming.</p>
          </div>
          <a href={LINKS.circleDiscord} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
            Sessions run on Discord <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        {state.status === "unavailable" && <Notice testId="circle-checkins-unavailable">Checking in isn&apos;t switched on yet (IELS database update pending). The schedule below is still accurate.</Notice>}
        {state.status === "error" && <Notice testId="circle-checkins-error">{state.message}</Notice>}
        <p aria-live="polite" data-testid="circle-checkin-message" className={cn("min-h-6 text-[15px] font-medium", message?.ok ? "text-[#577E90]" : "text-[#C04C4E]")}>{message?.text ?? ""}</p>
        <ul className="grid gap-5 md:grid-cols-2">
          {sessions.map((s, i) => (
            <SessionCard key={s.id} session={s} featured={i === 0} state={state} busy={busy === s.id} onToggle={() => toggle(s)} />
          ))}
        </ul>
      </section>

      <Stories />

      <section aria-labelledby="join-heading" className="grid gap-5 md:grid-cols-3">
        <h2 id="join-heading" className="sr-only">Community channels</h2>
        <div className={cn(cardGloss, "space-y-3 p-6")}>
          <MessagesSquare size={24} className="text-[#577E90]" aria-hidden="true" />
          <h3 className="text-[19px] font-bold">Discord</h3>
          <p className="text-[15px] text-[#2F4157]/70">Voice rooms for the weekly sessions and community channels. Create a free Discord account, then introduce yourself in the welcome channel.</p>
          <a href={LINKS.circleDiscord} target="_blank" rel="noopener noreferrer" data-testid="circle-discord-link" className={btnPrimary}>Join Discord <ExternalLink size={15} /></a>
        </div>
        <div className={cn(cardGloss, "space-y-3 p-6")}>
          <MessageCircle size={24} className="text-[#577E90]" aria-hidden="true" />
          <h3 className="text-[19px] font-bold">WhatsApp</h3>
          <p className="text-[15px] text-[#2F4157]/70">Announcements and reminders for Circle activities.</p>
          {LINKS.circleWhatsapp ? (
            <a href={LINKS.circleWhatsapp} target="_blank" rel="noopener noreferrer" data-testid="circle-whatsapp-link" className={btnPrimary}>Join WhatsApp <ExternalLink size={15} /></a>
          ) : (
            <p data-testid="circle-whatsapp-link-unavailable" className="text-[15px] font-medium text-[#2F4157]/55">WhatsApp group link coming soon.</p>
          )}
        </div>
        <div className={cn(cardGloss, "space-y-3 p-6")}>
          <Users size={24} className="text-[#577E90]" aria-hidden="true" />
          <h3 className="text-[19px] font-bold">Meet members</h3>
          <p className="text-[15px] text-[#2F4157]/70">Find members with similar goals in People, or read the {CIRCLE_COHORT.name.replace("IELS Circle · ", "")} agenda.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/people" className={btnSecondary}>People</Link>
            <Link href={CIRCLE_COHORT.agendaHref} data-testid="circle-agenda-link" className={btnSecondary}>Current cohort agenda</Link>
          </div>
        </div>
      </section>
      <section aria-labelledby="speaking-club-heading" className={cn(cardGloss, "flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between")} data-testid="circle-speaking-club">
        <div className="max-w-3xl">
          <h2 id="speaking-club-heading" className="text-[20px] font-bold">Speaking Club with Elco AI membership</h2>
          <p className="mt-1 text-[15px] text-[#2F4157]/70">The weekly sessions above are open to everyone. Elco AI Starter includes 12 Speaking Club sessions a month; Elco AI Pro includes Speaking Club without a monthly limit plus 4 mentoring sessions a month. Benefits appear here once your Elco account is linked.</p>
        </div>
        <Link href="/dashboard/membership" className={btnSecondary} data-testid="circle-membership-link">See membership <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <ElcoPractice context="circle_before" refId="circle-before" />
        <ElcoPractice context="circle_after" refId="circle-after" />
      </div>
    </div>
  );
}

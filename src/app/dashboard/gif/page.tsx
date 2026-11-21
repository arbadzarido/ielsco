"use client";

/**
 * GIF workspace (/dashboard/gif) — Global Impact Fellowship Summer 2027 inside the IELSco dashboard.
 *
 * 21 Nov 2026: GIF is an IELSco programme. People use their IELSco account; this page shows their whole GIF journey
 * (status, next action, pathway-specific progress, payments, documents, deadlines, announcements) from
 * /api/gif/workspace, which asks the GIF app over a signed server-to-server call (src/lib/gif/bridge.ts). Forms that
 * live in the GIF app (application, checkout, uploads, phase submissions) open through /api/gif/sso: already signed
 * in, no second login. Partial Funded is a result of the Fully Funded selection, not a registration pathway.
 * GIF Singapore 2026 delegates keep their pages under /dashboard/gif/* (linked below for them).
 *
 * Visual system (21 Nov 2026 redesign): IELSco dashboard tokens (components/dashboard/ui.ts: navy #2F4157, hairline
 * #E3E7ED, glossy cards, pill buttons, Poppins headings / Plus Jakarta body) with the GIF identity used as accents only:
 * Nightfall #304156 for the programme band, Amber #B8862E (ink #8C6420 on white, soft #E0B865 on Nightfall) for the
 * current step, the next deadline and action states. One 12-column grid; every value comes from the workspace API.
 */

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronRight, CreditCard, FileText, Loader2, Megaphone, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useNavAccess } from "@/components/dashboard/useNavAccess";
import { cardGloss, focusRing } from "@/components/dashboard/ui";
import { createClient } from "@/lib/supabase/client";

type Pathway = "fully_funded" | "mentoring" | "self_funded";
type Workspace = {
  cohort: { id: string; name: string; startsOn: string; endsOn: string; destinations: string[] };
  pathways: { pathway: Pathway; label: string; open: boolean; opensAt: string; reason: string | null }[];
  account: { linked: boolean; staffRole: string | null } | null;
  application: null | { code: string; pathway: Pathway; pathwayLabel: string; status: string; statusLabel: string; mode: "individual" | "team"; teamName: string | null; isOwner: boolean; submittedAt: string | null; outcome: string | null };
  steps: { key: string; label: string; detail: string; state: "done" | "current" | "upcoming" }[];
  actions: { label: string; href: string; detail?: string; tone?: "warn" | "info" }[];
  deadlines: { label: string; at: string }[];
  obligations: { label: string; kind: string; amount: number; currency: "IDR" | "USD"; status: string; dueAt: string | null; paidAt: string | null }[];
  payments: { kind: string; amount: number; currency: "IDR" | "USD"; status: string; createdAt: string; paidAt: string | null; receiptNo: string | null }[];
  documents: { kind: string; filename: string; status: string; createdAt: string }[];
  submissions: { phase: number; submittedAt: string | null }[];
  elco: { status: string; activatedAt: string | null }[];
  announcements: { id: string; title: string; body: string; publishedAt: string }[];
};

// GIF identity (accents only).
const NIGHTFALL = "#304156", AMBER = "#B8862E", AMBER_INK = "#8C6420", AMBER_SOFT = "#E0B865";
const PATHWAY_NOTE: Record<Pathway, string> = {
  fully_funded: "Competitive three-phase selection for Fully Funded or Partial Funded places.",
  mentoring: "15 weekly mentoring sessions; mentees go straight to Phase 3 of the selection.",
  self_funded: "Direct registration with a deposit; no essay, deck or video.",
};

// Opens a GIF page with the IELSco session (no second login).
const gif = (path: string) => `/api/gif/sso?next=${encodeURIComponent(path)}`;
const TZ = "Asia/Jakarta";
const fmt = (iso: string | null, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => (iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: TZ, ...o }) : "");
const money = (n: number, c: "IDR" | "USD") => `${c} ${n.toLocaleString("en-US", { maximumFractionDigits: c === "IDR" ? 0 : 2 })}`;
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const inDays = (d: number) => (d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);

// Status tones: amber = something for the participant to do, blue = with the team, green = done/positive, slate = closed.
type Tone = "action" | "review" | "positive" | "closed";
const TONE_OF: Record<string, Tone> = {
  draft: "action", submitted: "review", awaiting_payment: "action", payment_verification: "review", phase_1_completed: "positive",
  phase_2_in_progress: "action", phase_2_submitted: "review", phase_3_in_progress: "action", phase_3_submitted: "review", under_evaluation: "review",
  selected_fully_funded: "positive", selected_partial_funded: "positive", confirmed_participant: "positive", not_selected: "closed", withdrawn: "closed",
};
const TONE_STYLE: Record<Tone, { dot: string; chip: string }> = {
  action: { dot: AMBER, chip: "bg-[#FBF3E4] text-[#8C6420] ring-1 ring-inset ring-[#B8862E]/25" },
  review: { dot: "#577E90", chip: "bg-[#EAF1F4] text-[#3E6475] ring-1 ring-inset ring-[#577E90]/25" },
  positive: { dot: "#2E6B4F", chip: "bg-[#E8F3EE] text-[#2E6B4F] ring-1 ring-inset ring-[#2E6B4F]/20" },
  closed: { dot: "#8A97A8", chip: "bg-[#F1F4F8] text-[#4A5B70] ring-1 ring-inset ring-[#8A97A8]/25" },
};
const ROW_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Due", tone: "action" }, paid: { label: "Paid", tone: "positive" }, waived: { label: "Waived", tone: "positive" },
  refunded: { label: "Refunded", tone: "closed" }, partially_refunded: { label: "Part refunded", tone: "closed" }, cancelled: { label: "Cancelled", tone: "closed" },
  pending: { label: "Awaiting payment", tone: "action" }, created: { label: "Awaiting payment", tone: "action" }, failed: { label: "Failed", tone: "closed" }, expired: { label: "Expired", tone: "closed" },
  submitted: { label: "Submitted", tone: "review" }, accepted: { label: "Accepted", tone: "positive" }, approved: { label: "Approved", tone: "positive" },
  needs_attention: { label: "Needs attention", tone: "action" }, rejected: { label: "Not accepted", tone: "closed" }, draft: { label: "Draft", tone: "action" },
};

function Chip({ status }: { status: string }) {
  const s = ROW_STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "closed" as Tone };
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${TONE_STYLE[s.tone].chip}`}>{s.label}</span>;
}

// Section card: one header pattern (icon tile, title, optional meta/action) for every panel on the page.
function Panel({ title, icon: Icon, meta, action, children, className = "" }: { title: string; icon: LucideIcon; meta?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardGloss} flex flex-col p-5 md:p-6 ${className}`}>
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] text-[#2F4157]"><Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[17px] font-semibold leading-tight text-[#1A2534]">{title}</h2>
          {meta && <p className="mt-0.5 text-[13px] text-[#6B7A8F]">{meta}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

// Entry card to a GIF page (Payments, Documents, programme management): whole card is the link.
function EntryCard({ href, icon: Icon, title, summary, children, testId }: { href: string; icon: LucideIcon; title: string; summary: ReactNode; children?: ReactNode; testId?: string }) {
  return (
    <a href={href} data-testid={testId} className={`${cardGloss} group flex h-full flex-col p-5 transition-[border-color,box-shadow] hover:border-[#CBD3DD] hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_14px_34px_rgba(47,65,87,0.10)] md:p-6 ${focusRing}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBF3E4]" style={{ color: AMBER_INK }}><Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[17px] font-semibold leading-tight text-[#1A2534]">{title}</h2>
          <p className="mt-1 text-[14px] text-[#4A5B70]">{summary}</p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#8A97A8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2F4157]" aria-hidden="true" />
      </div>
      {children && <div className="mt-4 border-t border-[#EEF1F5] pt-4">{children}</div>}
    </a>
  );
}

export default function GifWorkspacePage() {
  return <Suspense fallback={null}><GifWorkspace /></Suspense>;
}

function GifWorkspace() {
  const params = useSearchParams();
  const { gifDelegate } = useNavAccess();
  const [profile, setProfile] = useState<{ name?: string; avatar?: string }>({});
  const [ws, setWs] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(params.get("gif"));

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
      setProfile({ name: data?.full_name || user.user_metadata?.full_name, avatar: data?.avatar_url || user.user_metadata?.avatar_url });
    });
    fetch("/api/gif/workspace", { cache: "no-store" })
      .then(async (r) => (r.ok ? setWs(await r.json()) : setError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "unavailable")))
      .catch(() => setError("unavailable"));
  }, []);

  const app = ws?.application ?? null;

  return (
    <DashboardLayout userName={profile.name} userAvatar={profile.avatar}>
      <div className="mx-auto w-full max-w-[1120px] space-y-6 px-4 pb-16 pt-4 md:px-6 md:pt-8 lg:px-10">
        <Hero ws={ws} />

        {!ws && !error && (
          <div className={`${cardGloss} flex items-center gap-3 p-6 text-[15px] text-[#4A5B70]`}><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Loading your GIF journey…</div>
        )}

        {error && !ws && (
          <div role="alert" className="rounded-2xl border border-[#EBD9B4] bg-[#FDF8EE] p-5 text-[15px] leading-relaxed text-[#5B4512]">
            {error === "confirm_email" ? "Confirm your IELSco email address first (check your inbox), then come back here."
              : error === "not_configured" ? <>Your GIF workspace is being connected. Meanwhile you can apply and track your application on <a className="font-semibold underline" href="https://gif.ielsco.com">gif.ielsco.com</a>.</>
              : <>We couldn&rsquo;t load your GIF journey right now. Please refresh in a minute, or open <a className="font-semibold underline" href="https://gif.ielsco.com/portal">gif.ielsco.com</a>.</>}
          </div>
        )}

        {ws && (
          <>
            <NextStep ws={ws} />

            {app ? (
              <div className="grid gap-6 lg:grid-cols-12">
                <Progress ws={ws} className="lg:col-span-7" />
                <div className="flex flex-col gap-6 lg:col-span-5">
                  <Deadlines ws={ws} className="flex-1" />
                  {ws.elco.length > 0 && <ElcoPro ws={ws} />}
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-12">
                <Pathways ws={ws} className={ws.deadlines.length ? "lg:col-span-7" : "lg:col-span-12"} />
                {ws.deadlines.length > 0 && <Deadlines ws={ws} className="lg:col-span-5" />}
              </div>
            )}

            {app && (
              <div className="grid gap-6 md:grid-cols-2">
                <PaymentsCard ws={ws} />
                <DocumentsCard ws={ws} />
              </div>
            )}

            {ws.announcements.length > 0 && (
              <Panel title="Announcements" icon={Megaphone} meta={`${ws.announcements.length} from the GIF team`}>
                <ul className="divide-y divide-[#EEF1F5]">
                  {ws.announcements.slice(0, 4).map((a) => (
                    <li key={a.id} className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:gap-6">
                      <p className="text-[13px] font-medium text-[#6B7A8F]">{fmt(a.publishedAt, { day: "numeric", month: "short", year: "numeric" })}</p>
                      <div><p className="font-semibold text-[#1A2534]">{a.title}</p><p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#4A5B70]">{a.body}</p></div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {(ws.account?.staffRole || gifDelegate) && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Shown only to GIF staff (gif.staff); participants never see it. */}
                {ws.account?.staffRole && <EntryCard href={gif("/admin")} icon={ShieldCheck} title="Programme management" summary={`Applicants, evaluation, payments, mentoring and announcements for ${ws.cohort.name}.`} />}
                {gifDelegate && <DelegateCard />}
              </div>
            )}
          </>
        )}

        {!ws && gifDelegate && <DelegateCard />}
      </div>
    </DashboardLayout>
  );
}

function DelegateCard() {
  return (
    <Link href="/dashboard/gif/delegates" className={`${cardGloss} group flex h-full items-start gap-3 p-5 md:p-6 hover:border-[#CBD3DD] ${focusRing}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] text-[#2F4157]"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block font-heading text-[17px] font-semibold text-[#1A2534]">GIF Singapore 2026 delegate portal</span>
        <span className="mt-1 block text-[14px] text-[#4A5B70]">Assignments, essay project, video submission and report.</span></span>
      <ChevronRight className="mt-1 h-5 w-5 text-[#8A97A8]" aria-hidden="true" />
    </Link>
  );
}

// ── Programme band ──────────────────────────────────────────────────────────────────────────────────────────────────
function Hero({ ws }: { ws: Workspace | null }) {
  const app = ws?.application ?? null;
  const destinations = ws?.cohort.destinations ?? ["Singapore", "Malaysia", "Thailand"];
  const tone = app ? TONE_OF[app.status] ?? "review" : null;
  // "27 Jul – 3 Aug 2027 · 8 days" from the cohort's own dates (fallback while loading).
  const start = ws?.cohort.startsOn, end = ws?.cohort.endsOn;
  const dates = start && end
    ? `${fmt(start, { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })} · ${Math.floor((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1} days`
    : "27 Jul – 3 Aug 2027";
  return (
    <section className="relative overflow-hidden rounded-[24px] text-white shadow-[0_18px_40px_rgba(48,65,86,0.22)]" style={{ background: NIGHTFALL }}>
      {/* Layered light: a soft amber glow behind the status card and a faint top sheen. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"
        style={{ background: `radial-gradient(520px 260px at 88% 110%, rgba(184,134,46,0.30), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%)` }} />
      <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_300px] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
              <Image src="/images/logos/gif/gif-icon.png" alt="Global Impact Fellowship" width={40} height={40} priority />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: AMBER_SOFT }}>Global Impact Fellowship<span className="hidden sm:inline"> · IELSco</span></p>
              <h1 className="font-heading text-[26px] font-bold leading-tight sm:text-[30px]">{ws?.cohort.name ?? "GIF Summer 2027"}</h1>
            </div>
          </div>
          {/* Itinerary: the programme route in order, with the dates. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ol className="flex items-center" aria-label="Programme route">
              {destinations.map((d, i) => (
                <li key={d} className="flex items-center">
                  {i > 0 && <span className="mx-2.5 h-px w-6 sm:w-10" style={{ background: "rgba(224,184,101,0.55)" }} aria-hidden="true" />}
                  <span className="flex items-center gap-2 text-[14px] font-medium text-white/90">
                    <span className="h-2 w-2 rounded-full" style={{ background: AMBER_SOFT }} aria-hidden="true" />{d}
                  </span>
                </li>
              ))}
            </ol>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[13px] text-white/85">{dates}</span>
          </div>
        </div>

        {/* Status card: pathway, application ID and status, or the registration state for people without an application. */}
        <div className="rounded-2xl bg-white p-4 text-[#1A2534] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          {app ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7A8F]">Your application</p>
                <span className="font-mono text-[12px] text-[#6B7A8F]">{app.code}</span>
              </div>
              <p className="mt-2 font-heading text-[16px] font-semibold leading-snug">{app.pathwayLabel}</p>
              {app.mode === "team" && <p className="text-[13px] text-[#6B7A8F]">Team {app.teamName}{!app.isOwner && " · member"}</p>}
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F7F8FA] px-3 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  {tone === "action" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 motion-reduce:hidden" style={{ background: TONE_STYLE[tone].dot }} />}
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: TONE_STYLE[tone ?? "review"].dot }} />
                </span>
                <span className="text-[14px] font-semibold">{app.statusLabel}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B7A8F]">Registration</p>
              <ul className="mt-2 space-y-1.5">
                {(ws?.pathways ?? []).map((p) => (
                  <li key={p.pathway} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="truncate">{p.label.replace(" application", "")}</span>
                    <span className={`shrink-0 text-[12px] font-semibold ${p.open ? "text-[#2E6B4F]" : ""}`} style={p.open ? undefined : { color: AMBER_INK }}>
                      {p.open ? "Open" : daysUntil(p.opensAt) > 0 ? `Opens ${fmt(p.opensAt, { day: "numeric", month: "short" })}` : "Closed"}
                    </span>
                  </li>
                ))}
                {!ws && <li className="h-16 animate-pulse rounded-lg bg-[#F1F4F8]" />}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Next step: what to do, how much, by when ────────────────────────────────────────────────────────────────────────
function NextStep({ ws }: { ws: Workspace }) {
  const next = ws.actions[0];
  if (!next) {
    return (
      <div className={`${cardGloss} flex items-center gap-3 p-5 text-[15px] text-[#4A5B70] md:px-6`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F3EE] text-[#2E6B4F]"><Check className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        Nothing needs your attention right now. We&rsquo;ll email you when something changes.
      </div>
    );
  }
  // A payment step: show the amount and the deadline from the obligation itself.
  const pay = next.href.startsWith("/portal/payments") ? ws.obligations.find((o) => o.status === "open" && next.label === `Pay: ${o.label}`) : undefined;
  const days = pay?.dueAt ? daysUntil(pay.dueAt) : null;
  const urgent = next.tone === "warn" || (days !== null && days <= 7);
  return (
    <section className={`${cardGloss} relative overflow-hidden`} aria-label="Next step">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: urgent ? AMBER : "#577E90" }} aria-hidden="true" />
      <div className="grid gap-5 p-5 pl-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:p-6 md:pl-8">
        <div className="flex min-w-0 items-start gap-4">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBF3E4] sm:flex" style={{ color: AMBER_INK }}>
            {pay ? <CreditCard className="h-5 w-5" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: AMBER_INK }}>Next step</p>
            <h2 className="mt-1 font-heading text-[19px] font-semibold leading-snug text-[#1A2534]">{pay ? `Pay your ${pay.label.replace(/^Self-Funded |^Partial Funded /, "").toLowerCase()}` : next.label}</h2>
            {pay ? <p className="mt-0.5 text-[14px] text-[#6B7A8F]">{pay.label}</p> : next.detail && <p className="mt-0.5 text-[14px] text-[#6B7A8F]">{next.detail}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:justify-end md:gap-8">
          {pay && (
            <dl className="flex gap-8">
              <div><dt className="text-[12px] font-medium text-[#6B7A8F]">Amount</dt><dd className="font-heading text-[22px] font-bold leading-tight text-[#1A2534]">{money(pay.amount, pay.currency)}</dd></div>
              {pay.dueAt && <div><dt className="text-[12px] font-medium text-[#6B7A8F]">Due</dt>
                <dd className="text-[15px] font-semibold leading-tight text-[#1A2534]">{fmt(pay.dueAt, { day: "numeric", month: "short", year: "numeric" })}
                  <span className="block text-[12px] font-semibold" style={{ color: days !== null && days <= 7 ? AMBER_INK : "#6B7A8F" }}>{days !== null && days < 0 ? "Overdue" : inDays(days ?? 0)}</span></dd></div>}
            </dl>
          )}
          <a href={gif(next.href)} className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#2F4157] px-6 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_rgba(47,65,87,0.2)] transition-colors hover:bg-[#3d5470] ${focusRing}`}>
            {pay ? "Pay now" : "Continue"}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      {ws.actions.length > 1 && (
        <ul className="flex flex-wrap gap-2 border-t border-[#EEF1F5] px-6 py-3 md:px-8">
          <li className="py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8A97A8]">Also to do</li>
          {ws.actions.slice(1).map((a) => (
            <li key={a.label + a.href}><a href={gif(a.href)} className={`inline-flex items-center gap-1 rounded-full border border-[#E3E7ED] bg-white px-3 py-1 text-[13px] font-medium text-[#2F4157] hover:border-[#577E90] ${focusRing}`}>{a.label}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></a></li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Progress: the pathway's own milestones, as a timeline ───────────────────────────────────────────────────────────
function Progress({ ws, className }: { ws: Workspace; className?: string }) {
  const steps = ws.steps;
  const done = steps.filter((s) => s.state === "done").length;
  const currentIdx = steps.findIndex((s) => s.state === "current");
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  return (
    <Panel title="Your progress" icon={Check} className={className}
      meta={`${done} of ${steps.length} stages complete${currentIdx >= 0 ? ` · now: ${steps[currentIdx].label}` : ""}`}>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-[#EEF1F5]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Programme progress">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, background: `linear-gradient(90deg, ${NIGHTFALL}, ${AMBER})` }} />
      </div>
      <ol className="relative">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={s.key} className="relative flex gap-4 pb-5 last:pb-0">
              {!last && <span className={`absolute left-[15px] top-8 bottom-0 w-px ${s.state === "done" ? "bg-[#2F4157]" : "bg-[#E3E7ED]"}`} aria-hidden="true" />}
              <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                style={s.state === "done" ? { background: NIGHTFALL, color: "#fff" }
                  : s.state === "current" ? { background: "#FBF3E4", color: AMBER_INK, boxShadow: `0 0 0 2px ${AMBER}` }
                  : { background: "#fff", color: "#8A97A8", boxShadow: "inset 0 0 0 1.5px #D5DCE4" }}>
                {s.state === "done" ? <Check className="h-4 w-4" strokeWidth={2.5} aria-label="Done" /> : i + 1}
              </span>
              <div className={`min-w-0 flex-1 ${s.state === "current" ? "rounded-xl bg-[#FDF8EE] px-3 py-2 -mt-1" : "pt-1"}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className={`text-[15px] leading-tight ${s.state === "upcoming" ? "font-medium text-[#6B7A8F]" : "font-semibold text-[#1A2534]"}`}>{s.label}</p>
                  {s.state === "current" && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white" style={{ background: AMBER }}>Now</span>}
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-[#6B7A8F]">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ── Deadlines: date tiles, nearest first and highlighted ────────────────────────────────────────────────────────────
function Deadlines({ ws, className }: { ws: Workspace; className?: string }) {
  // Nearest first: the list from the engine is grouped by kind, not by date.
  const list = [...ws.deadlines].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(0, 5);
  return (
    <Panel title="Upcoming deadlines" icon={CalendarIcon as unknown as LucideIcon} meta="All times WIB (UTC+7)" className={className}>
      {list.length === 0 ? <p className="text-[14px] text-[#6B7A8F]">No upcoming deadlines.</p> : (
        <ol className="divide-y divide-[#EEF1F5]">
          {list.map((d, i) => {
            const first = i === 0;
            return (
              <li key={d.label} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${first ? "text-white" : "bg-[#F1F4F8] text-[#2F4157]"}`} style={first ? { background: AMBER } : undefined}>
                  <span className="text-[17px] font-bold">{fmt(d.at, { day: "numeric" })}</span>
                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{fmt(d.at, { month: "short" })}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[14px] ${first ? "font-semibold text-[#1A2534]" : "font-medium text-[#1A2534]"}`}>{d.label}</p>
                  <p className="text-[12px] text-[#6B7A8F]">{fmt(d.at, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {inDays(daysUntil(d.at))}</p>
                </div>
                {first && <span className="rounded-full bg-[#FBF3E4] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: AMBER_INK }}>Next</span>}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M8 3v3M16 3v3M3 9.5h18" /><path d="M12 13v3l2 1" />
    </svg>
  );
}

function ElcoPro({ ws }: { ws: Workspace }) {
  const active = ws.elco.find((e) => e.status === "activated");
  return (
    <section className={`${cardGloss} flex items-center gap-3 p-5 md:px-6`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] text-[#2F4157]"><ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><p className="font-heading text-[15px] font-semibold text-[#1A2534]">Elco Pro</p>
        <p className="text-[13px] text-[#6B7A8F]">{active ? `Active since ${fmt(active.activatedAt)}` : ws.elco.some((e) => e.status === "pending_activation") ? "Paid · activation in progress" : "Activated after the Phase 1 payment"}</p></div>
      <Chip status={active ? "approved" : ws.elco.some((e) => e.status === "pending_activation") ? "submitted" : "draft"} />
    </section>
  );
}

// ── Payments and documents entry cards ──────────────────────────────────────────────────────────────────────────────
function PaymentsCard({ ws }: { ws: Workspace }) {
  const open = ws.obligations.filter((o) => o.status === "open");
  const summary = open.length === 0 ? (ws.obligations.length ? "Everything is paid." : "No payments yet.")
    : `${open.length} due · ${open.map((o) => money(o.amount, o.currency)).join(" + ")}`;
  return (
    <EntryCard href={gif("/portal/payments")} icon={CreditCard} title="Payments" summary={summary} testId="gif-payments-card">
      <ul className="space-y-2.5">
        {ws.obligations.slice(0, 3).map((o, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-[14px]">
            <span className="min-w-0"><span className="block truncate font-medium text-[#1A2534]">{o.label}</span>
              <span className="text-[12px] text-[#6B7A8F]">{money(o.amount, o.currency)}{o.status === "open" && o.dueAt ? ` · due ${fmt(o.dueAt, { day: "numeric", month: "short" })}` : o.paidAt ? ` · paid ${fmt(o.paidAt, { day: "numeric", month: "short" })}` : ""}</span></span>
            <Chip status={o.status} />
          </li>
        ))}
      </ul>
      {ws.payments.length > 0 && <p className="mt-3 text-[12px] text-[#6B7A8F]">{ws.payments.length} transaction{ws.payments.length === 1 ? "" : "s"} · receipts in the payment history</p>}
    </EntryCard>
  );
}

function DocumentsCard({ ws }: { ws: Workspace }) {
  const subs = ws.submissions.filter((s) => s.submittedAt).length;
  const attention = ws.documents.filter((d) => d.status === "needs_attention").length;
  const summary = ws.documents.length === 0 && ws.submissions.length === 0 ? "Nothing uploaded yet. We only ask for what your pathway and stage need."
    : [`${ws.documents.length} file${ws.documents.length === 1 ? "" : "s"}`, subs ? `${subs} submission${subs === 1 ? "" : "s"}` : null, attention ? `${attention} need${attention === 1 ? "s" : ""} attention` : null].filter(Boolean).join(" · ");
  const rows: { name: string; status: string }[] = [
    ...ws.submissions.map((s) => ({ name: `Phase ${s.phase} ${s.phase === 2 ? "essay and pitch deck" : "video presentation"}`, status: s.submittedAt ? "submitted" : "draft" })),
    ...ws.documents.map((d) => ({ name: d.filename, status: d.status })),
  ].slice(0, 3);
  return (
    <EntryCard href={gif("/portal/documents")} icon={FileText} title="Documents and submissions" summary={summary} testId="gif-documents-card">
      {rows.length > 0 && (
        <ul className="space-y-2.5">
          {rows.map((r, i) => <li key={i} className="flex items-center justify-between gap-3 text-[14px]"><span className="min-w-0 truncate font-medium text-[#1A2534]">{r.name}</span><Chip status={r.status} /></li>)}
        </ul>
      )}
    </EntryCard>
  );
}

// ── No application yet: choose a pathway ────────────────────────────────────────────────────────────────────────────
function Pathways({ ws, className }: { ws: Workspace; className?: string }) {
  return (
    <Panel title="Choose your pathway" icon={Sparkles} meta="Partial Funded places are awarded through the Fully Funded selection." className={className}
      action={<a href="https://gif.ielsco.com/opportunities" className="text-[13px] font-semibold text-[#2F4157] hover:underline">Compare</a>}>
      <ul className="grid gap-3">
        {ws.pathways.map((p) => {
          const future = !p.open && daysUntil(p.opensAt) > 0;
          return (
            <li key={p.pathway} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${p.open ? "border-[#E3E7ED] bg-white" : "border-dashed border-[#D5DCE4] bg-[#FAFBFC]"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-[15px] font-semibold text-[#1A2534]">{p.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.open ? "bg-[#E8F3EE] text-[#2E6B4F]" : "bg-[#FBF3E4]"}`} style={p.open ? undefined : { color: AMBER_INK }}>
                    {p.open ? "Open now" : future ? `Opens ${fmt(p.opensAt, { day: "numeric", month: "short" })}` : "Closed"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[#6B7A8F]">{PATHWAY_NOTE[p.pathway]}</p>
              </div>
              {p.open
                ? <a href={gif(`/apply?pathway=${p.pathway}`)} className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-[#2F4157] px-5 text-[14px] font-semibold text-white hover:bg-[#3d5470] ${focusRing}`}>Start<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                : <span className="text-[13px] text-[#6B7A8F] sm:text-right">{future ? inDays(daysUntil(p.opensAt)) : p.reason}</span>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

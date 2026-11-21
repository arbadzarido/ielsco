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
 */

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, Circle, CircleDot, CreditCard, FileText, Loader2, Megaphone, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useNavAccess } from "@/components/dashboard/useNavAccess";
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

const NIGHTFALL = "#304156", AMBER = "#B8862E", AMBER_INK = "#8C6420";
const PATHWAY_NOTE: Record<Pathway, string> = {
  fully_funded: "Competitive three-phase selection: Fully Funded or Partial Funded places.",
  mentoring: "15 weekly mentoring sessions; mentees go straight to Phase 3 of the selection.",
  self_funded: "Direct registration with a deposit; no essay, deck or video.",
};

// Opens a GIF page with the IELSco session (no second login).
const gif = (path: string) => `/api/gif/sso?next=${encodeURIComponent(path)}`;
const date = (iso: string | null, withTime = false) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }) + (withTime ? " WIB" : "") : "");
const money = (n: number, c: "IDR" | "USD") => `${c} ${n.toLocaleString("en-US")}`;
const STATUS_TONE: Record<string, string> = { paid: "bg-[#E7F4EC] text-[#1F6B3A]", waived: "bg-[#E7F4EC] text-[#1F6B3A]", open: "bg-[#FFF4E0] text-[#8C6420]", pending: "bg-[#FFF4E0] text-[#8C6420]", created: "bg-[#FFF4E0] text-[#8C6420]", cancelling: "bg-[#F1F4F8] text-[#4A5B70]" };

function Card({ title, icon: Icon, children, action }: { title: string; icon: typeof Megaphone; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-[#E3E7ED] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#F6F1E7]" style={{ color: AMBER_INK }}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <h2 className="flex-1 font-heading text-[18px] font-semibold text-[#1A2534]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const Pill = ({ s }: { s: string }) => <span className={`rounded-full px-[10px] py-[2px] text-[12px] font-semibold capitalize ${STATUS_TONE[s] ?? "bg-[#F1F4F8] text-[#4A5B70]"}`}>{s.replace(/_/g, " ")}</span>;
const GoLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#2F4157] hover:underline">{children}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
);

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
  const next = ws?.actions[0];

  return (
    <DashboardLayout userName={profile.name} userAvatar={profile.avatar}>
      <div className="mx-auto w-full max-w-[1100px] space-y-6 pb-16">
        {/* Programme header in the GIF identity (Nightfall → Amber), inside the IELSco layout. */}
        <section className="relative overflow-hidden rounded-[24px] p-6 text-white md:p-8" style={{ background: `linear-gradient(135deg, ${NIGHTFALL} 0%, #3B4A60 55%, ${AMBER} 140%)` }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-25" style={{ background: `radial-gradient(circle, ${AMBER} 0%, transparent 70%)` }} aria-hidden="true" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[18px] bg-white p-2 shadow-sm">
              <Image src="/images/logos/gif/gif-icon.png" alt="Global Impact Fellowship" width={48} height={48} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#E0B865]">Global Impact Fellowship</p>
              <h1 className="font-heading text-[28px] font-bold leading-tight md:text-[34px]">{ws?.cohort.name ?? "GIF Summer 2027"}</h1>
              <p className="mt-1 text-[15px] text-white/85">27 July – 3 August 2027 · Singapore · Malaysia · Thailand</p>
            </div>
            {app && (
              <div className="rounded-[16px] bg-white/10 px-4 py-3 text-[14px] backdrop-blur">
                <p className="text-white/70">{app.pathwayLabel} · {app.code}</p>
                <p className="font-heading text-[16px] font-semibold">{app.statusLabel}</p>
                {app.mode === "team" && <p className="text-white/70">Team {app.teamName}{!app.isOwner && " · member"}</p>}
              </div>
            )}
          </div>
        </section>

        {!ws && !error && <div className="flex items-center gap-3 rounded-[20px] border border-[#E3E7ED] bg-white p-6 text-[#4A5B70]"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Loading your GIF journey…</div>}

        {error && !ws && (
          <div role="alert" className="rounded-[20px] border border-[#F1D9A8] bg-[#FFF8EC] p-5 text-[15px] text-[#5B4512]">
            {error === "confirm_email" ? "Confirm your IELSco email address first (check your inbox), then come back here."
              : error === "not_configured" ? <>Your GIF workspace is being connected. Meanwhile you can apply and track your application on <a className="font-semibold underline" href="https://gif.ielsco.com">gif.ielsco.com</a>.</>
              : <>We couldn&rsquo;t load your GIF journey right now. Please refresh in a minute, or open <a className="font-semibold underline" href="https://gif.ielsco.com/portal">gif.ielsco.com</a>.</>}
          </div>
        )}

        {ws && (
          <>
            {/* 1. What do I need to do next? */}
            {next && (
              <section className="flex flex-col gap-4 rounded-[20px] border-2 bg-white p-5 md:flex-row md:items-center md:p-6" style={{ borderColor: next.tone === "warn" ? AMBER : "#E3E7ED" }}>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: AMBER_INK }}>Next step</p>
                  <p className="font-heading text-[20px] font-semibold text-[#1A2534]">{next.label}</p>
                  {next.detail && <p className="text-[14px] text-[#4A5B70]">{next.detail}</p>}
                </div>
                <a href={gif(next.href)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#2F4157] px-6 text-[15px] font-semibold text-white hover:bg-[#24344A]">
                  Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </section>
            )}

            <div className={`grid gap-6 ${ws.deadlines.length || ws.elco.length ? "lg:grid-cols-[1.25fr_1fr]" : ""}`}>
              {/* 2. Status and what I have completed: the pathway's own milestones only. */}
              {app ? (
                <Card title="Your progress" icon={CheckCircle2}>
                  <ol className="space-y-3">
                    {ws.steps.map((s) => (
                      <li key={s.key} className="flex gap-3">
                        {s.state === "done" ? <CheckCircle2 className="mt-[2px] h-5 w-5 shrink-0 text-[#1F6B3A]" aria-label="Done" />
                          : s.state === "current" ? <CircleDot className="mt-[2px] h-5 w-5 shrink-0" style={{ color: AMBER }} aria-label="Current" />
                          : <Circle className="mt-[2px] h-5 w-5 shrink-0 text-[#C4CCD8]" aria-label="Upcoming" />}
                        <div><p className={`text-[15px] ${s.state === "upcoming" ? "text-[#6B7A8F]" : "font-semibold text-[#1A2534]"}`}>{s.label}</p><p className="text-[13px] text-[#6B7A8F]">{s.detail}</p></div>
                      </li>
                    ))}
                  </ol>
                  {ws.actions.length > 1 && (
                    <div className="mt-5 border-t border-[#E3E7ED] pt-4">
                      <p className="mb-2 text-[13px] font-semibold text-[#4A5B70]">Also to do</p>
                      <ul className="space-y-2">{ws.actions.slice(1).map((a) => <li key={a.label + a.href}><GoLink href={gif(a.href)}>{a.label}</GoLink>{a.detail && <span className="block text-[13px] text-[#6B7A8F]">{a.detail}</span>}</li>)}</ul>
                    </div>
                  )}
                </Card>
              ) : (
                <Card title="Choose your pathway" icon={CheckCircle2}>
                  <div className="space-y-3">
                    {ws.pathways.map((p) => (
                      <div key={p.pathway} className="flex flex-col gap-3 rounded-[16px] border border-[#E3E7ED] p-4 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <p className="font-heading text-[16px] font-semibold text-[#1A2534]">{p.label}</p>
                          <p className="text-[13px] text-[#6B7A8F]">{PATHWAY_NOTE[p.pathway]}</p>
                          <p className={`mt-1 text-[13px] font-semibold ${p.open ? "text-[#1F6B3A]" : ""}`} style={p.open ? undefined : { color: AMBER_INK }}>{p.open ? "Open now" : new Date(p.opensAt).getTime() > Date.now() ? `Opens ${date(p.opensAt)}` : p.reason ?? "Not open"}</p>
                        </div>
                        {p.open
                          ? <a href={gif(`/apply?pathway=${p.pathway}`)} className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#2F4157] px-5 text-[14px] font-semibold text-white hover:bg-[#24344A]">Start</a>
                          : <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#E3E7ED] px-5 text-[14px] text-[#6B7A8F]">{new Date(p.opensAt).getTime() > Date.now() ? "Not open yet" : "Closed"}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[13px] text-[#6B7A8F]">Partial Funded places are awarded through the Fully Funded selection. <a className="font-semibold underline" href="https://gif.ielsco.com/opportunities">Compare pathways</a></p>
                </Card>
              )}

              <div className="space-y-6">
                {ws.deadlines.length > 0 && (
                  <Card title="Upcoming deadlines" icon={CalendarClock}>
                    <ul className="space-y-2">{ws.deadlines.slice(0, 5).map((d) => <li key={d.label} className="flex justify-between gap-3 text-[14px]"><span className="text-[#1A2534]">{d.label}</span><span className="shrink-0 text-[#6B7A8F]">{date(d.at)}</span></li>)}</ul>
                  </Card>
                )}
                {ws.elco.length > 0 && (
                  <Card title="Elco Pro" icon={ShieldCheck}>
                    <ul className="space-y-1 text-[14px]">{ws.elco.map((e, i) => <li key={i}>{e.status === "activated" ? `Active since ${date(e.activatedAt)}` : e.status === "pending_activation" ? "Paid · activation in progress" : e.status.replace(/_/g, " ")}</li>)}</ul>
                  </Card>
                )}
              </div>
            </div>

            {app && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Payments" icon={CreditCard} action={<GoLink href={gif("/portal/payments")}>Open</GoLink>}>
                  {ws.obligations.length === 0 ? <p className="text-[14px] text-[#6B7A8F]">No payments due.</p> : (
                    <ul className="space-y-3">{ws.obligations.map((o, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 text-[14px]">
                        <div><p className="font-semibold text-[#1A2534]">{o.label}</p><p className="text-[13px] text-[#6B7A8F]">{money(o.amount, o.currency)}{o.status === "open" && o.dueAt ? ` · due ${date(o.dueAt)}` : ""}{o.paidAt ? ` · paid ${date(o.paidAt)}` : ""}</p></div>
                        <Pill s={o.status} />
                      </li>))}</ul>
                  )}
                  {ws.payments.length > 0 && (
                    <details className="mt-4 border-t border-[#E3E7ED] pt-3 text-[14px]">
                      <summary className="cursor-pointer font-semibold text-[#4A5B70]">Payment history ({ws.payments.length})</summary>
                      <ul className="mt-2 space-y-2">{ws.payments.map((p, i) => <li key={i} className="flex justify-between gap-3"><span>{money(p.amount, p.currency)} · {date(p.createdAt)}{p.receiptNo ? ` · ${p.receiptNo}` : ""}</span><Pill s={p.status} /></li>)}</ul>
                      <div className="mt-3"><GoLink href={gif("/portal/receipts")}>Receipts</GoLink></div>
                    </details>
                  )}
                </Card>
                <Card title="Documents and submissions" icon={FileText} action={<GoLink href={gif("/portal/documents")}>Open</GoLink>}>
                  {ws.documents.length === 0 && ws.submissions.length === 0 ? <p className="text-[14px] text-[#6B7A8F]">Nothing uploaded yet. We only ask for what your pathway and stage need.</p> : (
                    <ul className="space-y-2 text-[14px]">
                      {ws.submissions.map((s) => <li key={`p${s.phase}`} className="flex justify-between gap-3"><span>Phase {s.phase} {s.phase === 2 ? "essay and pitch deck" : "video"}</span><Pill s={s.submittedAt ? "submitted" : "draft"} /></li>)}
                      {ws.documents.slice(0, 8).map((d, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate">{d.filename}</span><Pill s={d.status} /></li>)}
                    </ul>
                  )}
                </Card>
              </div>
            )}

            {ws.announcements.length > 0 && (
              <Card title="Announcements" icon={Megaphone}>
                <ul className="space-y-4">{ws.announcements.slice(0, 5).map((a) => <li key={a.id}><p className="font-semibold text-[#1A2534]">{a.title}</p><p className="whitespace-pre-line text-[14px] text-[#4A5B70]">{a.body}</p><p className="text-[12px] text-[#8A97A8]">{date(a.publishedAt)}</p></li>)}</ul>
              </Card>
            )}

            {/* Shown only to GIF staff (gif.staff); participants never see it. */}
            {ws.account?.staffRole && (
              <Card title="Programme management" icon={ShieldCheck} action={<GoLink href={gif("/admin")}>Open</GoLink>}>
                <p className="text-[14px] text-[#4A5B70]">Applicants, evaluation, payments, mentoring, announcements and programme settings for {ws.cohort.name}.</p>
              </Card>
            )}
          </>
        )}

        {gifDelegate && (
          <Link href="/dashboard/gif/delegates" className="flex items-center justify-between rounded-[20px] border border-[#E3E7ED] bg-white p-5 text-[15px] hover:bg-[#F8FAFC]">
            <span><span className="font-semibold text-[#1A2534]">GIF Singapore 2026 delegate portal</span><span className="block text-[13px] text-[#6B7A8F]">Assignments, essay project, video submission and report.</span></span>
            <ArrowRight className="h-5 w-5 text-[#2F4157]" aria-hidden="true" />
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
}

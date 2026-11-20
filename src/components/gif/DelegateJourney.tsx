"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ExternalLink, Info, Loader2, ShieldCheck } from "lucide-react";
import { btnLink, btnPrimary, btnSecondary, card, cardGloss, inputClass } from "@/components/dashboard/ui";
import { ErrorState, LoadingState } from "@/components/dashboard/PageStates";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, fmtDateTime } from "@/lib/gif/portal";
import {
  SCHOLARSHIP_NOTE, computeEligibility, fmtPts, passChecks, round1, statusWording,
  type CategoryState, type RequirementState, type Source,
} from "@/lib/gif/eligibility";
import { StatusPill } from "./shared";
import { Part } from "./DelegateAssignments";
import { useDelegatePortal, type PortalData } from "./useDelegatePortal";
import { WordsWeLeaveBehind } from "./messages/WordsWeLeaveBehind";

export function DelegateJourney({ supabase, delegateId, delegateName, view, onView, onOpenDay }: {
  supabase: SupabaseClient; delegateId: string; delegateName: string;
  view: string | null; onView: (v: string | null) => void; onOpenDay: (day: number) => void;
}) {
  const { state, reload } = useDelegatePortal(supabase, delegateId);
  const elig = useMemo(() => state.s === "ready" ? computeEligibility({
    categories: state.data.categories, requirements: state.data.requirements, assignments: state.data.allAssignments, submissions: state.data.submissions,
    delegateId, teamId: state.data.teamId, reviews: state.data.reviews, requests: state.data.requests, signals: state.data.signals,
  }) : null, [state, delegateId]);
  if (state.s === "loading") return <LoadingState label="Loading your journey…" />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={reload} />;
  const d = state.data;
  const items = elig!.categories.flatMap((c) => c.items);
  const current = view ? items.find((i) => i.r.key === view) : null;
  const first = delegateName.split(" ")[0] || delegateName;

  if (current) {
    return (
      <div className="min-w-0 space-y-5" data-testid={`gif-req-${current.r.key}`}>
        <button type="button" onClick={() => onView(null)} className={btnLink}><ArrowLeft size={16} /> Your Summer 2027 journey</button>
        <RequirementHeader it={current} />
        {current.r.source === "assignment" && (() => {
          const a = d.allAssignments.find((x) => x.id === current.r.assignment_id);
          if (!a) return null;
          if (a.day_number) return (
            <div className={cn(card, "p-5")}>
              <p className="text-[15px] text-[#2F4157]/80">This is your Day {a.day_number} {a.submission_type === "group" ? "team project" : "reflection"}. It counts here once Arba approves it.</p>
              <button type="button" className={cn(btnPrimary, "mt-3")} onClick={() => onOpenDay(a.day_number!)}>Open Day {a.day_number} <ArrowRight size={16} /></button>
            </div>
          );
          return <Part supabase={supabase} data={d} a={a} onChanged={reload} />;
        })()}
        {current.r.source === "messages" && <WordsWeLeaveBehind supabase={supabase} myFirstName={first} onChanged={reload} />}
        {(current.r.source === "elco_ai" || current.r.source === "elco_pass" || current.r.source === "public_profile") &&
          <Verification supabase={supabase} data={d} it={current} onChanged={reload} />}
      </div>
    );
  }

  const e = elig!;
  const pct = round1(e.percent);
  return (
    <div className="min-w-0 space-y-6" data-testid="gif-journey">
      <section className={cn(cardGloss, "overflow-hidden")}>
        <div className="space-y-5 p-5 sm:p-7">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#577E90]">Your GIF Summer 2027 Journey</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">GIF Summer 2027 · USD 1,000 Fully Funded opportunity</h2>
            <p className="mt-2 max-w-2xl text-[16px] text-[#2F4157]/70">Your journey doesn&apos;t end in Singapore. Keep contributing, creating, and growing with the IELSco community.</p>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Ring pct={pct} />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[15px]"><strong>Eligibility progress: <span data-testid="gif-elig-percent">{pct}%</span></strong> verified · {fmtPts(e.earned)} of {fmtPts(e.totalWeight)} points</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([["Verified", e.approved], ["Awaiting review", e.pendingReview], ["To do", e.incomplete], ["Needs revision", e.revision]] as const).map(([l, n]) => (
                  <div key={l} className={cn("rounded-xl border border-[#E3E7ED] bg-white px-3 py-2", l === "Needs revision" && n > 0 && "border-[#B4383A]/30 bg-[#FDEDED]")}>
                    <dt className="text-[12px] font-semibold text-[#2F4157]/60">{l}</dt><dd className="text-lg font-bold">{n}<span className="text-[13px] font-medium text-[#2F4157]/50">/{e.total}</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-[#F7F8FA] p-3 text-[13px] leading-relaxed text-[#2F4157]/75" data-testid="gif-scholarship-note">
            <Info size={16} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
            <span>{SCHOLARSHIP_NOTE} Only requirements Arba has approved count; submitted work shows as awaiting review. Reaching 100% means every listed requirement is complete and approved, not that the scholarship has been awarded.</span>
          </p>
        </div>
      </section>

      {e.categories.map((c, i) => <CategoryCard key={c.c.key} n={i + 1} c={c} onOpen={(k) => onView(k)} />)}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 52, len = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0" role="img" aria-label={`${pct}% verified`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#EAEFF5" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#gifRing)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(len * pct) / 100} ${len}`} />
        <defs><linearGradient id="gifRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2F4157" /><stop offset="1" stopColor="#577E90" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{pct}%</span><span className="text-[12px] text-[#2F4157]/60">verified</span>
      </div>
    </div>
  );
}

function CategoryCard({ n, c, onOpen }: { n: number; c: CategoryState; onOpen: (key: string) => void }) {
  return (
    <section className={cn(cardGloss, "min-w-0 p-5 sm:p-6")} data-testid={`gif-cat-${c.c.key}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#577E90]">{n} · {fmtPts(c.weight)}% of your eligibility</p>
          <h3 className="mt-0.5 text-lg font-bold leading-snug">{c.c.title}</h3>
          {c.c.description && <p className="text-[14px] text-[#2F4157]/65">{c.c.description}</p>}
        </div>
        <p className="shrink-0 text-[15px] font-semibold sm:text-right"><span className="text-xl font-bold">{fmtPts(c.earned)}</span>/{fmtPts(c.weight)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EAEFF5]" role="progressbar" aria-valuenow={round1(c.percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.c.title} progress`}>
        <div className="h-full rounded-full bg-[#2F4157] transition-all" style={{ width: `${c.percent}%` }} />
      </div>
      <ul className="mt-4 divide-y divide-[#EEF1F5]">
        {c.items.map((it) => (
          <li key={it.r.id}>
            <button type="button" onClick={() => onOpen(it.r.key)} className="flex w-full min-w-0 items-center gap-3 py-3 text-left hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] sm:px-2" data-testid={`gif-req-row-${it.r.key}`}>
              {it.verified ? <CheckCircle2 size={20} className="shrink-0 text-[#2E6B4F]" /> : <Circle size={20} className="shrink-0 text-[#C9D2DD]" />}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{it.r.title}</span>
                <span className="block truncate text-[13px] text-[#2F4157]/60">{it.r.window_label ? `${it.r.window_label} · ` : ""}{fmtPts(it.maxPoints)} pts</span>
              </span>
              <span className="flex shrink-0 items-center gap-1"><StatusPill status={it.status} className="hidden min-[400px]:inline-flex" /><StatusDot it={it} /><ArrowRight size={16} className="text-[#2F4157]/40" /></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
// On very narrow phones the pill is replaced by a short label so rows never overflow.
function StatusDot({ it }: { it: RequirementState }) {
  return <span className="text-[12px] font-semibold text-[#2F4157]/70 min-[400px]:hidden">{STATUS_LABEL[it.status]}</span>;
}

function RequirementHeader({ it }: { it: RequirementState }) {
  const word = it.r.source !== "assignment" && it.r.source !== "messages" ? statusWording(it.r.source, it.status, it.conditionMet) : null;
  return (
    <header className={cn(cardGloss, "space-y-2 p-5")}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={it.status} testId="gif-req-status" />
        {word && <span className="text-[13px] font-semibold text-[#2F4157]/70" data-testid="gif-req-wording">{word}</span>}
        <span className="text-[13px] text-[#2F4157]/60">{fmtPts(it.points)}/{fmtPts(it.maxPoints)} pts{it.r.window_label ? ` · ${it.r.window_label}` : ""}</span>
      </div>
      <h2 className="text-2xl font-bold">{it.r.title}</h2>
      {it.r.description && <p className="text-[15px] text-[#2F4157]/75">{it.r.description}</p>}
      {it.review && (it.review.feedback || it.review.status !== "under_review") && (
        <div className={cn("rounded-xl p-3 text-[14px]", it.review.status === "approved" ? "bg-[#E8F3EE]" : it.review.status === "revision_required" ? "bg-[#FDEDED]" : "bg-[#F7F8FA]")} data-testid="gif-req-review">
          <p className="font-semibold">Arba · {STATUS_LABEL[it.review.status]} · {fmtDateTime(it.review.created_at)}</p>
          {it.review.feedback && <p className="mt-1 whitespace-pre-line">{it.review.feedback}</p>}
        </div>
      )}
    </header>
  );
}

const ELCO_SITE = "https://www.elcoai.com";

function Verification({ supabase, data: d, it, onChanged }: { supabase: SupabaseClient; data: PortalData; it: RequirementState; onChanged: () => Promise<void> }) {
  const s = d.signals;
  const src = it.r.source as Source;
  const [url, setUrl] = useState(it.request?.url ?? (src === "public_profile" ? s?.profile_url ?? "" : ""));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const ask = async () => {
    setMsg(null);
    if (url && !/^https?:\/\//.test(url)) { setMsg({ ok: false, text: "Links must start with https://" }); return; }
    setBusy(true);
    const { error } = await supabase.from("gif_verification_requests").insert({ requirement_id: it.r.id, delegate_id: d.delegateId, url: url || null, note: note.trim() || null });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: "Sent to Arba for verification." }); setNote("");
    await onChanged();
  };

  const checks: { label: string; ok: boolean; hint?: React.ReactNode }[] =
    src === "elco_ai" ? [
      { label: "Elco AI account created", ok: !!s?.elco_linked, hint: <>Sign up at <a className="font-semibold underline" href={ELCO_SITE} target="_blank" rel="noopener noreferrer">elcoai.com</a> and complete the onboarding.</> },
      { label: "Linked to your IELSco account", ok: !!s?.elco_linked, hint: <>Link it securely in <Link className="font-semibold underline" href="/dashboard/connect/elco">Connect → Elco AI</Link>. We never match accounts by email.</> },
      { label: "Started practising (dashboard explored)", ok: (s?.elco_practice_30d ?? 0) > 0 || !!s?.elco_last_active, hint: "Do at least one practice in Elco AI. Activity appears after Elco syncs your summary." },
    ]
    : src === "elco_pass" ? passChecks(s).map((c) => ({ label: c.label, ok: c.ok, hint: c.ok ? undefined : <>Complete it in <Link className="font-semibold underline" href="/dashboard/passport">your Elco-Pass</Link> / <Link className="font-semibold underline" href="/dashboard/profile">profile</Link>.</> }))
    : [
      { label: "Elco-Pass complete", ok: passChecks(s).every((c) => c.ok), hint: "See the Elco-Pass requirement." },
      { label: "Profile visibility set to Public", ok: !!s?.profile_public, hint: <>Turn on public visibility in <Link className="font-semibold underline" href="/dashboard/profile">your profile settings</Link>.</> },
    ];

  return (
    <div className="space-y-4" data-testid={`gif-verify-${src}`}>
      <section className={cn(card, "p-5")}>
        <h3 className="mb-3 font-bold">{src === "elco_ai" ? "Activate Elco AI" : src === "elco_pass" ? "Activate your Elco-Pass" : "Make your profile public"}</h3>
        <ol className="space-y-3">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3">
              {c.ok ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2E6B4F]" /> : <Circle size={20} className="mt-0.5 shrink-0 text-[#C9D2DD]" />}
              <span className="min-w-0"><span className="block font-medium">{c.label}</span>{!c.ok && c.hint && <span className="block text-[14px] text-[#2F4157]/65">{c.hint}</span>}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-[#2F4157]/65"><ShieldCheck size={16} className="mt-0.5 shrink-0" /> These checks read your own IELSco records automatically. Arba then verifies them; nothing counts from a typed link alone.</p>
        {src === "elco_ai" && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a href={ELCO_SITE} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "w-full sm:w-auto")}>Open Elco AI <ExternalLink size={16} /></a>
            <Link href="/dashboard/connect/elco" className={cn(btnPrimary, "w-full sm:w-auto")}>Link Elco AI to IELSco</Link>
          </div>
        )}
        {src === "public_profile" && s?.profile_url && s.profile_public && (
          <p className="mt-3 break-all text-[14px]">Your public profile: <a className="font-semibold text-[#577E90] underline" href={s.profile_url.replace("https://ielsco.com", "")}>{s.profile_url}</a></p>
        )}
      </section>

      <section className={cn(card, "space-y-3 p-5")}>
        <h3 className="font-bold">{it.status === "revision_required" ? "Fixed it? Ask Arba to check again" : "Ask Arba to verify"}</h3>
        {src === "public_profile" && (
          <label className="block"><span className="mb-1 block text-[14px] font-semibold">Public profile URL</span>
            <input type="url" inputMode="url" className={cn(inputClass, "text-base")} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ielsco.com/dashboard/connect/people/…" /></label>
        )}
        <label className="block"><span className="mb-1 block text-[14px] font-semibold">Note for Arba (optional)</span>
          <textarea rows={2} maxLength={1000} className={cn(inputClass, "text-base")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={src === "elco_ai" ? "e.g. the email you used on Elco AI, if linking didn't work" : ""} /></label>
        <button type="button" className={cn(btnPrimary, "w-full sm:w-auto")} disabled={busy || it.status === "approved"} onClick={() => void ask()} data-testid="gif-ask-verify">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Request verification
        </button>
        {it.request && <p className="text-[13px] text-[#2F4157]/60">Last request {fmtDateTime(it.request.created_at)}</p>}
        {msg && <p role="status" className={cn("text-[14px] font-medium", msg.ok ? "text-[#2E6B4F]" : "text-[#B4383A]")}>{msg.text}</p>}
      </section>
    </div>
  );
}


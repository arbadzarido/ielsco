"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AlertTriangle, ArrowLeft, ArrowRight, Download, EyeOff, Loader2, Save, Search, Sparkles } from "lucide-react";
import { btnLink, btnPrimary, btnSecondary, card, cardGloss, focusRing, inputClass, labelClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, fmtDateTime } from "@/lib/gif/portal";
import {
  band, computeEligibility, fmtPts, messageProgress, passChecks, round1, statusWording,
  type Category, type Eligibility, type Requirement, type RequirementState, type Review, type Signals, type VerificationRequest,
} from "@/lib/gif/eligibility";
import type { RosterRow } from "@/lib/gif/report";
import { ProgressBar, StatusPill } from "../shared";
import { CardStudio } from "../messages/CardStudio";
import type { AdminData } from "./GifAdmin";
import { SkeletonList, SkeletonRegion } from "@/components/feedback/Skeleton";

interface AdminMessage { id: string; sender_delegate_id: string; sender_name: string; recipient_delegate_id: string | null; recipient_name: string | null; recipient_staff: string | null;
  body: string; sender_allows_wall: boolean; wall_status: string; read_at: string | null; hidden_at: string | null; hidden_reason: string | null; created_at: string }
interface EData { categories: Category[]; requirements: Requirement[]; reviews: Review[]; requests: VerificationRequest[]; signals: Signals[]; messages: AdminMessage[] }
type Sub = "overview" | "weights" | "messages";

export function EligibilityAdmin({ supabase, user, data: d, openSubmission }: { supabase: SupabaseClient; user: User; data: AdminData; openSubmission: (id: string) => void }) {
  const [e, setE] = useState<EData | null>(null);
  const [err, setErr] = useState("");
  const [sub, setSub] = useState<Sub>("overview");
  const [delegate, setDelegate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, r, rv, rq, s, m] = await Promise.all([
      supabase.from("gif_eligibility_categories").select("*").order("sort_order"),
      supabase.from("gif_eligibility_requirements").select("*").order("sort_order"),
      supabase.from("gif_eligibility_reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("gif_verification_requests").select("*").order("created_at", { ascending: false }),
      supabase.rpc("gif_admin_eligibility_signals"),
      supabase.rpc("gif_admin_messages"),
    ]);
    const x = c.error || r.error || rv.error || rq.error || s.error || m.error;
    if (x) { setErr(x.message); return; }
    setE({ categories: c.data as Category[], requirements: r.data as Requirement[], reviews: rv.data as Review[], requests: rq.data as VerificationRequest[],
      signals: s.data as Signals[], messages: m.data as AdminMessage[] });
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  const team = useMemo(() => d.roster.filter((r) => r.team_id), [d.roster]);
  const rows = useMemo(() => !e ? [] : team.map((r) => ({
    r, el: computeEligibility({ categories: e.categories, requirements: e.requirements, assignments: d.allAssignments, submissions: d.submissions,
      delegateId: r.delegate_id, teamId: r.team_id, reviews: e.reviews, requests: e.requests, signals: e.signals.find((s) => s.delegate_id === r.delegate_id) ?? null }),
  })), [e, team, d.allAssignments, d.submissions]);

  if (err) return <p className="text-[#B4383A]">{err}</p>;
  if (!e) return <SkeletonRegion label="Loading eligibility"><SkeletonList rows={2} /></SkeletonRegion>;

  if (delegate) {
    const row = rows.find((x) => x.r.delegate_id === delegate);
    if (row) return <DelegateEligibility supabase={supabase} user={user} row={row} signals={e.signals.find((s) => s.delegate_id === delegate) ?? null} data={e}
      onBack={() => setDelegate(null)} onSaved={load} openSubmission={openSubmission} />;
  }

  return (
    <section className="min-w-0 space-y-5" data-testid="gif-eligibility-admin">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fully Funded sections">
          {([["overview", "Delegates"], ["weights", "Weights & requirements"], ["messages", "Messages"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={sub === k} onClick={() => setSub(k)} data-testid={`gif-elig-sub-${k}`}
              className={cn("rounded-full border px-4 py-2 text-[14px] font-semibold", focusRing, sub === k ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white")}>{l}</button>
          ))}
        </div>
        <a href="/api/gif/admin/export?report=eligibility" className={cn(btnSecondary, "px-4 py-2 text-[14px]")} data-testid="gif-export-eligibility"><Download size={16} /> Eligibility CSV</a>
      </div>
      {sub === "overview" && <Overview rows={rows} onOpen={setDelegate} />}
      {sub === "weights" && <Weights supabase={supabase} data={e} onSaved={load} />}
      {sub === "messages" && <Messages supabase={supabase} data={e} onSaved={load} />}
    </section>
  );
}

type Row = { r: RosterRow; el: Eligibility };

function Overview({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState(""); const [teamF, setTeamF] = useState("all"); const [bandF, setBandF] = useState("all"); const [stateF, setStateF] = useState("all");
  const pcts = rows.map((x) => x.el.percent);
  const pendingIds = new Set<string>();
  for (const x of rows) for (const c of x.el.categories) for (const it of c.items) if (it.status === "submitted" || it.status === "under_review") pendingIds.add(it.submission ? `s:${it.submission.id}` : `r:${it.r.id}:${x.r.delegate_id}`);
  const kpi: [string, string | number][] = [
    ["Total delegates", rows.length], ["Average eligibility", `${round1(pcts.reduce((a, b) => a + b, 0) / (rows.length || 1))}%`],
    ["At 100%", pcts.filter((p) => band(p) === "100").length], ["75–99%", pcts.filter((p) => band(p) === "75").length],
    ["50–74%", pcts.filter((p) => band(p) === "50").length], ["Below 50%", pcts.filter((p) => band(p) === "below").length], ["Pending assessments", pendingIds.size],
  ];
  const teams = Array.from(new Map(rows.map((x) => [x.r.team_id!, x.r.team_name!])).entries());
  const shown = rows.filter((x) => x.r.full_name.toLowerCase().includes(q.trim().toLowerCase()) && (teamF === "all" || x.r.team_id === teamF)
    && (bandF === "all" || band(x.el.percent) === bandF)
    && (stateF === "all" || (stateF === "pending" ? x.el.pendingReview > 0 : stateF === "incomplete" ? x.el.incomplete > 0 : stateF === "complete" ? round1(x.el.percent) >= 100 : x.el.revision > 0)))
    .sort((a, b) => (a.r.team_number ?? 0) - (b.r.team_number ?? 0) || a.r.full_name.localeCompare(b.r.full_name));
  const sel = cn(inputClass, "py-2.5 text-base");
  const cats = rows[0]?.el.categories ?? [];
  return (
    <div className="min-w-0 space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7" data-testid="gif-readiness">
        {kpi.map(([l, v]) => <div key={l} className={cn(cardGloss, "p-4")}><dt className="text-[13px] font-semibold text-[#2F4157]/65">{l}</dt><dd className="mt-1 text-2xl font-bold">{v}</dd></div>)}
      </dl>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(180px,1fr)_auto_auto_auto]">
        <label className="relative col-span-2 lg:col-span-1"><span className="sr-only">Search</span>
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F4157]/40" aria-hidden="true" />
          <input className={cn(sel, "pl-10")} placeholder="Search delegates" value={q} onChange={(ev) => setQ(ev.target.value)} /></label>
        <select className={sel} value={teamF} onChange={(ev) => setTeamF(ev.target.value)} aria-label="Team"><option value="all">All teams</option>{teams.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <select className={sel} value={bandF} onChange={(ev) => setBandF(ev.target.value)} aria-label="Eligibility"><option value="all">Any %</option><option value="100">100%</option><option value="75">75–99%</option><option value="50">50–74%</option><option value="below">Below 50%</option></select>
        <select className={cn(sel, "col-span-2 lg:col-span-1")} value={stateF} onChange={(ev) => setStateF(ev.target.value)} aria-label="State" data-testid="gif-elig-state">
          <option value="all">Any state</option><option value="pending">Pending review</option><option value="incomplete">Incomplete requirements</option><option value="complete">Fully completed</option><option value="revision">Revision required</option></select>
      </div>
      {/* phones: cards; md+: table with its own horizontal scroll */}
      <ul className="space-y-2 md:hidden">
        {shown.map((x) => (
          <li key={x.r.delegate_id}>
            <button type="button" onClick={() => onOpen(x.r.delegate_id)} className={cn(card, focusRing, "w-full p-4 text-left")} data-testid="gif-elig-card">
              <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate font-semibold">{x.r.full_name}</span><span className="shrink-0 text-lg font-bold">{round1(x.el.percent)}%</span></div>
              <p className="mb-2 text-[13px] text-[#2F4157]/60">{x.r.team_name}{x.el.pendingReview ? ` · ${x.el.pendingReview} to review` : ""}{x.el.revision ? ` · ${x.el.revision} revision` : ""}</p>
              <ProgressBar percent={round1(x.el.percent)} label={`${x.r.full_name} eligibility`} />
            </button>
          </li>
        ))}
      </ul>
      <div className={cn(card, "hidden overflow-x-auto md:block")}>
        <table className="w-full min-w-[820px] text-left text-[14px]" data-testid="gif-elig-table">
          <thead className="border-b border-[#E3E7ED] bg-[#F7F8FA] text-[12px] uppercase tracking-wide text-[#2F4157]/60">
            <tr><th className="px-4 py-3">Delegate</th><th className="px-3 py-3">Team</th>{cats.map((c) => <th key={c.c.key} className="px-3 py-3">{c.c.key === "content" ? "Content" : c.c.key === "assignments" ? "Assignments" : c.c.key === "community" ? "Feedback" : c.c.key === "elco_ai" ? "Elco AI" : c.c.key === "elco_pass" ? "Elco-Pass" : c.c.title}</th>)}<th className="px-4 py-3">Overall</th></tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.r.delegate_id} className="cursor-pointer border-b border-[#E3E7ED] last:border-0 hover:bg-[#F7F8FA]" onClick={() => onOpen(x.r.delegate_id)} data-testid="gif-elig-row">
                <td className="px-4 py-3 font-semibold">{x.r.full_name}{x.el.pendingReview > 0 && <span className="ml-2 rounded-full bg-[#F0ECFD] px-2 py-0.5 text-[11px] font-semibold text-[#5A3DC4]">{x.el.pendingReview} to review</span>}</td>
                <td className="whitespace-nowrap px-3 py-3">{x.r.team_name}</td>
                {x.el.categories.map((c) => <td key={c.c.key} className="whitespace-nowrap px-3 py-3">{fmtPts(c.earned)}/{fmtPts(c.weight)}</td>)}
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-20"><ProgressBar percent={round1(x.el.percent)} /></div><span className="font-bold">{round1(x.el.percent)}%</span></div></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={cats.length + 3} className="px-4 py-8 text-center text-[#2F4157]/60">No delegates match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DelegateEligibility({ supabase, user, row, signals, data, onBack, onSaved, openSubmission }: {
  supabase: SupabaseClient; user: User; row: Row; signals: Signals | null; data: EData; onBack: () => void; onSaved: () => Promise<void>; openSubmission: (id: string) => void;
}) {
  const m = messageProgress(signals);
  const stories = signals?.story_by_day ?? {};
  return (
    <div className="min-w-0 space-y-5" data-testid="gif-elig-delegate">
      <button type="button" className={btnLink} onClick={onBack}><ArrowLeft size={16} /> All delegates</button>
      <header className={cn(cardGloss, "p-5")}>
        <h2 className="text-2xl font-bold">{row.r.full_name}</h2>
        <p className="text-[15px] text-[#2F4157]/70">{row.r.team_name} · {round1(row.el.percent)}% verified · {row.el.approved}/{row.el.total} requirements approved</p>
        <div className="mt-3"><ProgressBar percent={round1(row.el.percent)} /></div>
        <dl className="mt-4 grid gap-2 text-[14px] sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="font-semibold">Messages</dt><dd>{m.counted}/5 (delegates {m.delegates}/3, Arba {m.arba}, Farrel {m.farrel})</dd></div>
          <div><dt className="font-semibold">Story proofs by day</dt><dd>{[1, 2, 3, 4].map((n) => `D${n}: ${stories[String(n)] ?? 0}`).join(" · ")}</dd></div>
          <div><dt className="font-semibold">Elco AI</dt><dd>{signals?.elco_linked ? `Linked ${fmtDateTime(signals.elco_linked_at)} · ${signals.elco_practice_30d} practices (30 d)` : "Not linked"}</dd></div>
          <div><dt className="font-semibold">Elco-Pass / profile</dt><dd>{passChecks(signals).filter((c) => c.ok).length}/{passChecks(signals).length} fields · {signals?.profile_public ? "Public" : "Private"}</dd></div>
        </dl>
      </header>
      {row.el.categories.map((c) => (
        <section key={c.c.key} className={cn(card, "min-w-0 p-4 sm:p-5")}>
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-bold">{c.c.title}</h3><span className="shrink-0 font-semibold">{fmtPts(c.earned)}/{fmtPts(c.weight)}</span></div>
          <ul className="space-y-3">
            {c.items.map((it) => <ReqAdmin key={it.r.id} supabase={supabase} user={user} delegateId={row.r.delegate_id} it={it} signals={signals}
              history={data.reviews.filter((x) => x.requirement_id === it.r.id && x.delegate_id === row.r.delegate_id)}
              requests={data.requests.filter((x) => x.requirement_id === it.r.id && x.delegate_id === row.r.delegate_id)}
              onSaved={onSaved} openSubmission={openSubmission} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ReqAdmin({ supabase, user, delegateId, it, signals, history, requests, onSaved, openSubmission }: {
  supabase: SupabaseClient; user: User; delegateId: string; it: RequirementState; signals: Signals | null; history: Review[]; requests: VerificationRequest[];
  onSaved: () => Promise<void>; openSubmission: (id: string) => void;
}) {
  const [status, setStatus] = useState<Review["status"]>("approved");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const reviewable = it.r.source !== "assignment";
  const save = async () => {
    setMsg("");
    if (status === "revision_required" && !feedback.trim()) { setMsg("Add a note so the delegate knows what to fix."); return; }
    setBusy(true);
    const { error } = await supabase.from("gif_eligibility_reviews").insert({ requirement_id: it.r.id, delegate_id: delegateId, assessor_id: user.id, status, feedback: feedback.trim() || null });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setFeedback(""); setMsg("Saved. The delegate sees it now.");
    await onSaved();
  };
  return (
    <li className="rounded-xl bg-[#F7F8FA] p-3" data-testid={`gif-elig-req-${it.r.key}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 font-semibold">{it.r.title} <span className="font-normal text-[#2F4157]/60">· {fmtPts(it.points)}/{fmtPts(it.maxPoints)}</span></span>
        <span className="flex items-center gap-2"><StatusPill status={it.status} />
          {it.submission && <button type="button" className={btnLink} onClick={() => openSubmission(it.submission!.id)}>Review submission <ArrowRight size={14} /></button>}</span>
      </div>
      {!reviewable && !it.submission && <p className="mt-1 text-[13px] text-[#2F4157]/60">No submission yet.</p>}
      {reviewable && (
        <div className="mt-2 space-y-2">
          <p className="text-[13px] text-[#2F4157]/70">Auto-check: {it.conditionMet ? "✓ condition met" : "✗ not met yet"} · {statusWording(it.r.source, it.status, it.conditionMet) || STATUS_LABEL[it.status]}</p>
          {it.r.source === "public_profile" && signals?.profile_url && <p className="break-all text-[13px]">Profile: <a className="font-semibold text-[#577E90] underline" href={signals.profile_url.replace("https://ielsco.com", "")} target="_blank" rel="noopener noreferrer">{signals.profile_url}</a></p>}
          {requests.slice(0, 3).map((q) => (
            <p key={q.id} className="break-words text-[13px] text-[#2F4157]/75">Request {fmtDateTime(q.created_at)}{q.url ? ` · ${q.url}` : ""}{q.note ? ` · “${q.note}”` : ""}</p>
          ))}
          {!it.conditionMet && status === "approved" && <p className="flex items-center gap-1 text-[13px] font-semibold text-[#8A5A00]"><AlertTriangle size={14} /> The automatic check isn&apos;t met; approve only if you verified it another way.</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr_auto]">
            <select className={cn(inputClass, "py-2 text-[14px]")} value={status} onChange={(ev) => setStatus(ev.target.value as Review["status"])} aria-label="Decision">
              <option value="approved">Verify / approve</option><option value="revision_required">Revision required</option><option value="under_review">Under review</option></select>
            <input className={cn(inputClass, "py-2 text-[14px]")} placeholder="Note for the delegate" value={feedback} onChange={(ev) => setFeedback(ev.target.value)} maxLength={3000} />
            <button type="button" className={cn(btnPrimary, "px-4 py-2 text-[14px]")} disabled={busy} onClick={() => void save()} data-testid={`gif-elig-save-${it.r.key}`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save</button>
          </div>
          {msg && <p role="status" className="text-[13px]">{msg}</p>}
          {history.length > 0 && (
            <details className="text-[13px]"><summary className="cursor-pointer font-semibold text-[#577E90]">History ({history.length})</summary>
              <ul className="mt-1 space-y-1">{history.map((h) => <li key={h.id}>{STATUS_LABEL[h.status]} · {fmtDateTime(h.created_at)}{h.feedback ? ` · ${h.feedback}` : ""}</li>)}</ul></details>
          )}
        </div>
      )}
    </li>
  );
}

function Weights({ supabase, data, onSaved }: { supabase: SupabaseClient; data: EData; onSaved: () => Promise<void> }) {
  const [cats, setCats] = useState(() => data.categories.map((c) => ({ ...c, weight: String(Number(c.weight)) })));
  const [reqs, setReqs] = useState(() => data.requirements.map((r) => ({ ...r, share: String(Number(r.share)), window_label: r.window_label ?? "" })));
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const sum = cats.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const save = async () => {
    setMsg("");
    if (cats.some((c) => !(Number(c.weight) >= 0 && Number(c.weight) <= 100)) || reqs.some((r) => !(Number(r.share) > 0))) { setMsg("Weights must be 0–100 and shares above 0."); return; }
    setBusy(true);
    for (const c of cats) {
      const { error } = await supabase.from("gif_eligibility_categories").update({ weight: Number(c.weight), title: c.title }).eq("edition", c.edition).eq("key", c.key);
      if (error) { setBusy(false); setMsg(error.message); return; }
    }
    for (const r of reqs) {
      const { error } = await supabase.from("gif_eligibility_requirements").update({ share: Number(r.share), window_label: r.window_label || null, is_active: r.is_active, title: r.title }).eq("id", r.id);
      if (error) { setBusy(false); setMsg(error.message); return; }
    }
    setBusy(false); setMsg("Saved. Every delegate's progress is recalculated from the new weights."); await onSaved();
  };
  const inp = cn(inputClass, "py-2 text-[14px]");
  return (
    <div className="min-w-0 space-y-4" data-testid="gif-elig-weights">
      <p className={cn(card, "p-4 text-[14px] text-[#2F4157]/80")}>Category weights should add up to 100 (now <strong data-testid="gif-weight-sum">{round1(sum)}</strong>{round1(sum) !== 100 ? " · progress is scaled to the total" : " ✓"}). Inside a category, each requirement gets weight × its share ÷ all shares. Reels dates are set in Assignments → GIF Summer 2027 tasks.</p>
      {cats.map((c, i) => (
        <section key={c.key} className={cn(card, "min-w-0 space-y-3 p-4")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
            <label><span className={labelClass}>Category</span><input className={inp} value={c.title} onChange={(ev) => setCats((p) => p.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} /></label>
            <label><span className={labelClass}>Weight %</span><input type="number" min={0} max={100} step="0.5" className={inp} value={c.weight} onChange={(ev) => setCats((p) => p.map((x, j) => j === i ? { ...x, weight: ev.target.value } : x))} data-testid={`gif-weight-${c.key}`} /></label>
          </div>
          <ul className="space-y-2">
            {reqs.filter((r) => r.category_key === c.key).map((r) => {
              const set = (patch: Partial<typeof r>) => setReqs((p) => p.map((x) => x.id === r.id ? { ...x, ...patch } : x));
              return (
                <li key={r.id} className="grid grid-cols-1 gap-2 rounded-xl bg-[#F7F8FA] p-3 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end">
                  <label><span className="mb-1 block text-[12px] font-semibold">Requirement</span><input className={inp} value={r.title} onChange={(ev) => set({ title: ev.target.value })} /></label>
                  <label><span className="mb-1 block text-[12px] font-semibold">Window label</span><input className={inp} value={r.window_label} onChange={(ev) => set({ window_label: ev.target.value })} placeholder="e.g. Week 2 · December 2026" /></label>
                  <label><span className="mb-1 block text-[12px] font-semibold">Share</span><input type="number" min={0.1} step="0.5" className={inp} value={r.share} onChange={(ev) => set({ share: ev.target.value })} /></label>
                  <label className="flex items-center gap-2 pb-2 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[#2F4157]" checked={r.is_active} onChange={(ev) => set({ is_active: ev.target.checked })} /> Active</label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()} data-testid="gif-weights-save">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save weights</button>
        {msg && <p role="status" className="text-[14px]">{msg}</p>}
      </div>
    </div>
  );
}

function Messages({ supabase, data, onSaved }: { supabase: SupabaseClient; data: EData; onSaved: () => Promise<void> }) {
  const [show, setShow] = useState<"staff" | "wall" | "all">("staff");
  const [reveal, setReveal] = useState(false);
  const [studio, setStudio] = useState<AdminMessage | null>(null);
  const act = async (m: AdminMessage, p: { hidden?: boolean; wall?: string }) => {
    let reason: string | null = null;
    if (p.hidden) { reason = prompt("Why hide this message? (kept for the audit trail)") ?? null; if (reason === null) return; }
    const { error } = await supabase.rpc("gif_admin_moderate_message", { p_id: m.id, p_hidden: p.hidden ?? null, p_reason: reason, p_wall_status: p.wall ?? null });
    if (error) alert(error.message); else await onSaved();
  };
  const list = data.messages.filter((m) => show === "all" || (show === "staff" ? !!m.recipient_staff : m.wall_status === "requested" || m.wall_status === "approved"));
  return (
    <div className="min-w-0 space-y-3" data-testid="gif-admin-messages">
      <div className="flex flex-wrap items-center gap-2">
        {([["staff", "For Arba & Farrel"], ["wall", "Community wall requests"], ["all", "All messages (moderation)"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", focusRing, show === k ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white")}>{l}</button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[#2F4157]" checked={reveal} onChange={(ev) => setReveal(ev.target.checked)} /> Show senders (moderation only)</label>
      </div>
      {!list.length && <p className={cn(card, "p-6 text-center text-[#2F4157]/60")}>Nothing here yet.</p>}
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {list.map((m) => (
          <li key={m.id} className={cn("min-w-0 rounded-2xl border p-4", m.hidden_at ? "border-[#B4383A]/30 bg-[#FDEDED]/50" : "border-[#EFE6DA] bg-[#FFFCF7]")}>
            <p className="text-[12px] text-[#8A7766]">To <strong>{m.recipient_staff === "arba" ? "Arba" : m.recipient_staff === "farrel" ? "Farrel" : m.recipient_name}</strong>{reveal ? ` · from ${m.sender_name}` : " · anonymous"} · {fmtDateTime(m.created_at)}</p>
            <p className="mt-2 whitespace-pre-line break-words font-serif text-[16px] leading-relaxed">{m.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
              {m.recipient_staff && <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[13px]")} onClick={() => setStudio(m)}><Sparkles size={14} /> Story card</button>}
              {m.wall_status === "requested" && m.sender_allows_wall && <>
                <button type="button" className={cn(btnPrimary, "px-3 py-1.5 text-[13px]")} onClick={() => void act(m, { wall: "approved" })}>Approve for wall</button>
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[13px]")} onClick={() => void act(m, { wall: "declined" })}>Decline</button></>}
              {m.wall_status === "approved" && <button type="button" className={btnLink} onClick={() => void act(m, { wall: "none" })}>Remove from wall</button>}
              {m.hidden_at ? <button type="button" className={btnLink} onClick={() => void act(m, { hidden: false })}>Unhide</button>
                : <button type="button" className={cn(btnLink, "text-[#B4383A]")} onClick={() => void act(m, { hidden: true })}><EyeOff size={14} /> Hide</button>}
              <span className="text-[#2F4157]/55">wall: {m.wall_status}{m.sender_allows_wall ? "" : " (sender didn't allow)"}{m.hidden_reason ? ` · hidden: ${m.hidden_reason}` : ""}</span>
            </div>
          </li>
        ))}
      </ul>
      {studio && <CardStudio input={{ message: studio.body, seed: studio.id, heading: `For ${studio.recipient_staff === "arba" ? "Arba" : "Farrel"}` }} onClose={() => setStudio(null)} />}
    </div>
  );
}

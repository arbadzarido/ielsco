"use client";

import { useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { btnPrimary, card, cardGloss, focusRing, inputClass, labelClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, fmtDateTime, fmtScore, isHttpUrl, retentionInfo, rubricTotal, type Assessment, type Submission } from "@/lib/gif/portal";
import { FileTile, StatusPill, TypeBadge, useSignedUrls } from "../shared";
import type { AdminData } from "./GifAdmin";

type AStatus = Assessment["status"];

export function SubmissionReview({ supabase, user, data: d, submission: s, onSaved }: {
  supabase: SupabaseClient; user: User; data: AdminData; submission: Submission; onSaved: () => Promise<void>;
}) {
  const a = d.assignments.find((x) => x.id === s.assignment_id)!;
  const day = d.days.find((x) => x.day_number === a.day_number);
  const files = d.files.filter((f) => f.submission_id === s.id);
  const history = d.assessments.filter((x) => x.submission_id === s.id);
  const urls = useSignedUrls(supabase, files);
  const latest = history[0];
  const [status, setStatus] = useState<AStatus>(latest?.status === "under_review" || !latest ? "approved" : latest.status);
  const [scores, setScores] = useState<Record<string, number>>(() => ({ ...(latest?.rubric_scores ?? {}) }));
  const [feedback, setFeedback] = useState(latest?.feedback ?? "");
  const [revision, setRevision] = useState(latest?.revision_instructions ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const target = s.team_id
    ? { label: d.roster.find((r) => r.team_id === s.team_id)?.team_name ?? "Team", members: d.roster.filter((r) => r.team_id === s.team_id).map((r) => r.full_name) }
    : { label: d.roster.find((r) => r.delegate_id === s.delegate_id)?.full_name ?? "Delegate", members: [d.roster.find((r) => r.delegate_id === s.delegate_id)?.team_name ?? "No team"] };
  const submitter = d.roster.find((r) => r.delegate_id === s.submitted_by_delegate_id)?.full_name;
  const total = rubricTotal(a.rubric, scores);
  const expiring = files.filter((f) => retentionInfo(f)?.state === "warning");

  const save = async (st: AStatus) => {
    setMsg(null);
    if (st === "revision_required" && !revision.trim() && !feedback.trim()) { setMsg({ ok: false, text: "Add feedback or revision instructions so the delegate knows what to change." }); return; }
    setBusy(st);
    const { error } = await supabase.from("gif_assessments").insert({
      submission_id: s.id, submission_version: s.version, assessor_id: user.id, status: st,
      rubric_scores: st === "under_review" ? {} : scores,
      feedback: st === "under_review" ? null : feedback.trim() || null,
      revision_instructions: st === "revision_required" ? revision.trim() || null : null,
    });
    setBusy(null);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: st === "under_review" ? "Marked as under review. The delegate sees it now." : `Assessment saved: ${STATUS_LABEL[st]}. The delegate sees it now.` });
    await onSaved();
  };

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_380px]" data-testid="gif-review">
      <div className="space-y-5">
        <header className={cn(cardGloss, "space-y-2 p-5")}>
          <p className="text-[13px] font-bold uppercase tracking-wider text-[#577E90]">Day {a.day_number}{day ? ` · ${day.title}` : ""}</p>
          <h1 className="text-2xl font-bold">{a.title}</h1>
          <div className="flex flex-wrap items-center gap-2"><TypeBadge type={a.submission_type} /><StatusPill status={s.status} testId="gif-review-status" /><span className="text-[14px] font-semibold">{target.label}</span></div>
          <p className="text-[14px] text-[#2F4157]/70">{target.members.join(" · ")}</p>
          <p className="text-[14px] text-[#2F4157]/70">Submitted {fmtDateTime(s.submitted_at)}{submitter ? ` by ${submitter}` : ""} · first submitted {fmtDateTime(s.first_submitted_at)} · version {s.version} · last edit {fmtDateTime(s.updated_at)}</p>
          <details className="pt-1 text-[15px]">
            <summary className="cursor-pointer font-semibold text-[#577E90]">Assignment instructions</summary>
            {a.purpose && <p className="mt-2 font-medium">{a.purpose}</p>}
            <p className="mt-1 whitespace-pre-line text-[#2F4157]/80">{a.instructions}</p>
            {a.deliverables.length > 0 && <ul className="mt-2 list-disc pl-5">{a.deliverables.map((x) => <li key={x}>{x}</li>)}</ul>}
          </details>
        </header>

        {expiring.length > 0 && (
          <p className="flex items-center gap-2 rounded-2xl border border-[#8A5A00]/25 bg-[#FDF3E3] p-4 text-[15px] font-semibold text-[#8A5A00]" data-testid="gif-expiry-warning">
            <AlertTriangle size={18} /> {expiring.length} Story screenshot{expiring.length > 1 ? "s" : ""} will be deleted within 48 hours. Review them now; retention is not extended.
          </p>
        )}

        <section className={cn(card, "divide-y divide-[#E3E7ED]")}>
          {a.fields.map((f) => {
            if (f.type === "members") return null;
            if (f.type === "files" || f.type === "story_proof") {
              const list = files.filter((x) => x.field_key === f.key);
              return (
                <div key={f.key} className="space-y-2 p-4">
                  <p className="text-[14px] font-semibold text-[#2F4157]/70">{f.label} ({list.length})</p>
                  {list.length ? <div className="grid gap-2 sm:grid-cols-2">{list.map((x) => <FileTile key={x.id} file={x} url={urls[x.id]} admin />)}</div> : <p className="text-[15px] text-[#2F4157]/50">No files</p>}
                  {f.type === "story_proof" && list.some((x) => x.deleted_at) && <p className="text-[13px] text-[#2F4157]/60">Removed screenshots were deleted by the 7-day retention policy; the record of the upload remains.</p>}
                </div>
              );
            }
            const v = s.responses[f.key];
            return (
              <div key={f.key} className="p-4">
                <p className="text-[14px] font-semibold text-[#2F4157]/70">{f.label}</p>
                {f.type === "checkbox" ? <p className="mt-1 text-[15px]">{v === true ? "✓ Confirmed" : "Not confirmed"}</p>
                  : typeof v === "string" && v ? (f.type === "url" && isHttpUrl(v)
                    ? <a href={v} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 break-all font-semibold text-[#577E90] underline">{v} <ExternalLink size={14} /></a>
                    : <p className="mt-1 whitespace-pre-line text-[15px]">{v}</p>)
                  : <p className="mt-1 text-[15px] text-[#2F4157]/40">—</p>}
              </div>
            );
          })}
        </section>

        <section className={cn(card, "p-4")}>
          <h2 className="mb-2 font-bold">Assessment history</h2>
          {history.length ? (
            <ol className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-xl bg-[#F7F8FA] p-3 text-[14px]">
                  <div className="flex flex-wrap items-center gap-2"><StatusPill status={h.status} />{h.score != null && <strong>{fmtScore(h.score, h.max_score)}</strong>}
                    <span className="text-[#2F4157]/60">{fmtDateTime(h.created_at)} · v{h.submission_version} · by {h.assessor_id === user.id ? `you (${user.email})` : h.assessor_id}</span></div>
                  {h.feedback && <p className="mt-1 whitespace-pre-line">{h.feedback}</p>}
                  {h.revision_instructions && <p className="mt-1 whitespace-pre-line"><strong>Revise:</strong> {h.revision_instructions}</p>}
                </li>
              ))}
            </ol>
          ) : <p className="text-[14px] text-[#2F4157]/60">Not reviewed yet.</p>}
        </section>
      </div>

      <aside className={cn(cardGloss, "h-fit space-y-4 p-5 lg:sticky lg:top-24")} data-testid="gif-assessment-panel">
        <h2 className="text-lg font-bold">Assess</h2>
        {s.status === "in_progress" ? <p className="text-[15px] text-[#2F4157]/70">This is still a draft. You can assess it once it has been submitted.</p> : (<>
          {s.status === "submitted" && (
            <button type="button" className={cn("w-full rounded-full border border-[#5A3DC4]/30 bg-[#F0ECFD] px-4 py-2.5 text-[15px] font-semibold text-[#5A3DC4]", focusRing)} disabled={busy !== null} onClick={() => void save("under_review")} data-testid="gif-start-review">
              {busy === "under_review" ? <Loader2 size={16} className="mr-1 inline animate-spin" /> : null} Mark as Under Review
            </button>
          )}
          {a.rubric.length > 0 && (
            <fieldset className="space-y-3">
              <legend className={labelClass}>Rubric (1–5) · {total.score}/{total.max}</legend>
              {a.rubric.map((c) => (
                <div key={c.key}>
                  <p className="mb-1 text-[14px] font-medium">{c.label}</p>
                  <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={scores[c.key] === n} onClick={() => setScores((p) => ({ ...p, [c.key]: n }))} data-testid={`gif-score-${c.key}-${n}`}
                        className={cn("h-10 flex-1 rounded-lg border text-[15px] font-semibold", focusRing, scores[c.key] === n ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white hover:border-[#577E90]")}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>
          )}
          <div>
            <label htmlFor="gif-status" className={labelClass}>Decision</label>
            <select id="gif-status" className={cn(inputClass, "py-2.5 text-base")} value={status} onChange={(e) => setStatus(e.target.value as AStatus)} data-testid="gif-decision">
              <option value="approved">Approved</option>
              <option value="revision_required">Revision Required</option>
              <option value="under_review">Under Review (no decision yet)</option>
            </select>
          </div>
          <div>
            <label htmlFor="gif-feedback" className={labelClass}>Feedback</label>
            <textarea id="gif-feedback" rows={4} maxLength={5000} className={cn(inputClass, "text-base")} value={feedback} onChange={(e) => setFeedback(e.target.value)} data-testid="gif-feedback-input" />
          </div>
          {status === "revision_required" && (
            <div>
              <label htmlFor="gif-revision" className={labelClass}>Revision instructions</label>
              <textarea id="gif-revision" rows={3} maxLength={5000} className={cn(inputClass, "text-base")} value={revision} onChange={(e) => setRevision(e.target.value)} />
            </div>
          )}
          <p className="text-[13px] text-[#2F4157]/60">Assessor: {user.email} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Each save is kept in the history.</p>
          <button type="button" className={cn(btnPrimary, "w-full")} disabled={busy !== null} onClick={() => void save(status)} data-testid="gif-save-assessment">
            {busy && busy !== "under_review" ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Save assessment
          </button>
          {msg && <p role="status" className={cn("text-[14px] font-medium", msg.ok ? "text-[#2E6B4F]" : "text-[#B4383A]")}>{msg.text}</p>}
        </>)}
      </aside>
    </div>
  );
}

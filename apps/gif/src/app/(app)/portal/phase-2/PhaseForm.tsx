"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePhaseAction } from "@/app/actions/portal";
import Uploader from "@/components/Uploader";
import { UPLOAD_RULES } from "@/lib/validation";

type Doc = { id: string; filename: string; kind: string };
type Initial = { essayText?: string | null; essayDocId?: string | null; deckDocId?: string | null; videoUrl?: string | null; videoDocId?: string | null; notes?: string | null };

export default function PhaseForm({ phase, initial, docs, canEdit }: { phase: 2 | 3; initial: Initial; docs: Doc[]; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ essayText: initial.essayText ?? "", essayDocId: initial.essayDocId ?? "", deckDocId: initial.deckDocId ?? "", videoUrl: initial.videoUrl ?? "", videoDocId: initial.videoDocId ?? "", notes: initial.notes ?? "" });
  const [msg, setMsg] = useState<{ t: string; err: boolean } | null>(null);
  const [pending, start] = useTransition();
  const opts = (kind: string) => docs.filter((d) => d.kind === kind);
  const run = (submit: boolean) => start(async () => {
    if (submit && !confirm(`Submit Phase ${phase}? You can't change it afterwards.`)) return;
    const r = await savePhaseAction(phase, { ...v, essayDocId: v.essayDocId || null, deckDocId: v.deckDocId || null, videoDocId: v.videoDocId || null }, submit);
    if ("error" in r && r.error) setMsg({ t: r.error, err: true });
    else { setMsg({ t: submit ? "Submitted. We have emailed you a confirmation." : "Draft saved.", err: false }); router.refresh(); }
  });
  const pick = (kind: string, key: "essayDocId" | "deckDocId" | "videoDocId", label: string) => (
    <div className="field">
      <label className="label" htmlFor={key}>{label}</label>
      <select id={key} value={v[key]} disabled={!canEdit} onChange={(e) => setV({ ...v, [key]: e.target.value })}>
        <option value="">{opts(kind).length ? "Choose an uploaded file…" : "Upload a file below first"}</option>
        {opts(kind).map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
      </select>
    </div>
  );
  return (
    <div className="form">
      {phase === 2 && <>
        {pick("phase2_essay", "essayDocId", "Project essay (PDF)")}
        {canEdit && <Uploader kind="phase2_essay" label="Upload essay PDF" maxMb={UPLOAD_RULES.phase2_essay.maxMb} accept={UPLOAD_RULES.phase2_essay.mimes.join(",")} onUploaded={(id) => setV((x) => ({ ...x, essayDocId: id }))} />}
        <label className="field"><span className="label">…or write your essay here</span><textarea rows={12} maxLength={20000} value={v.essayText} disabled={!canEdit} onChange={(e) => setV({ ...v, essayText: e.target.value })} /><span className="hint">{v.essayText.length.toLocaleString()} / 20,000</span></label>
        {pick("phase2_deck", "deckDocId", "Pitch deck (PDF or PPTX)")}
        {canEdit && <Uploader kind="phase2_deck" label="Upload pitch deck" maxMb={UPLOAD_RULES.phase2_deck.maxMb} accept={UPLOAD_RULES.phase2_deck.mimes.join(",") + ",.pptx"} onUploaded={(id) => setV((x) => ({ ...x, deckDocId: id }))} />}
      </>}
      {phase === 3 && <>
        <label className="field"><span className="label">Video link</span><input type="url" placeholder="https://youtu.be/…" value={v.videoUrl} disabled={!canEdit} onChange={(e) => setV({ ...v, videoUrl: e.target.value })} /><span className="hint">Unlisted YouTube, Vimeo, Loom or Google Drive (shared so anyone with the link can view).</span></label>
        {pick("phase3_video", "videoDocId", "…or an uploaded video")}
        {canEdit && <Uploader kind="phase3_video" label="Upload video (MP4 or MOV)" maxMb={UPLOAD_RULES.phase3_video.maxMb} accept={UPLOAD_RULES.phase3_video.mimes.join(",")} onUploaded={(id) => setV((x) => ({ ...x, videoDocId: id }))} />}
      </>}
      <label className="field"><span className="label">Notes for evaluators (optional)</span><textarea rows={3} maxLength={2000} value={v.notes} disabled={!canEdit} onChange={(e) => setV({ ...v, notes: e.target.value })} /></label>
      {msg && <div className={`notice ${msg.err ? "err" : "ok"}`} role={msg.err ? "alert" : "status"}><p>{msg.t}</p></div>}
      {canEdit && <div className="btn-row"><button type="button" className="btn btn-secondary" disabled={pending} onClick={() => run(false)}>Save draft</button><button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(true)}>{pending ? "Working…" : `Submit Phase ${phase}`}</button></div>}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, ImagePlus, Info, Loader2, Lock, Paperclip, Send, Save, Star } from "lucide-react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import {
  RETENTION_NOTE, acceptList, canDelegateEdit, describeTypes, isHttpUrl, missingRequired, sniffType, storagePath, validateUpload,
  type Assignment, type FieldDef, type Submission, type SubmissionFile,
} from "@/lib/gif/portal";
import { FileTile, useSignedUrls } from "./shared";
import type { TeamMember } from "./useDelegatePortal";

type Msg = { ok: boolean; text: string } | null;
const fieldInput = cn(inputClass, "text-base");

export function SubmissionForm({
  supabase, assignment, submission, files, team, delegateId, teamId, onChanged,
}: {
  supabase: SupabaseClient;
  assignment: Assignment;
  submission: Submission | null;
  files: SubmissionFile[];
  team: TeamMember[];
  delegateId: string;
  teamId: string | null;
  onChanged: () => Promise<void> | void;
}) {
  const [responses, setResponses] = useState<Record<string, unknown>>(() => ({ ...(submission?.responses ?? {}) }));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [fieldMsg, setFieldMsg] = useState<Record<string, Msg>>({});
  const subRef = useRef<Submission | null>(submission);
  subRef.current = submission ?? subRef.current;

  const editable = canDelegateEdit(assignment, submission);
  const noTeam = assignment.submission_type === "group" && !teamId;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of files) c[f.field_key] = (c[f.field_key] ?? 0) + 1;
    return c;
  }, [files]);
  const urls = useSignedUrls(supabase, files);
  const missing = missingRequired(assignment.fields, responses, counts);
  const status = submission?.status ?? null;

  const set = (k: string, v: unknown) => setResponses((p) => ({ ...p, [k]: v }));
  const clean = () => {
    const out: Record<string, unknown> = {};
    for (const f of assignment.fields) {
      if (f.type === "members" || f.type === "files" || f.type === "story_proof") continue;
      const v = responses[f.key];
      if (f.type === "checkbox") out[f.key] = v === true;
      else if (f.type === "rating") { if (typeof v === "number" && v >= 1 && v <= 5) out[f.key] = v; }
      else if (typeof v === "string" && v.trim()) out[f.key] = v.trim().slice(0, f.max ?? 5000);
    }
    return out;
  };

  // Create the draft row the first time something is saved or uploaded.
  const ensureSubmission = async (): Promise<Submission> => {
    if (subRef.current) return subRef.current;
    const row = assignment.submission_type === "group"
      ? { assignment_id: assignment.id, team_id: teamId, responses: clean() }
      : { assignment_id: assignment.id, delegate_id: delegateId, responses: clean() };
    const { data, error } = await supabase.from("gif_submissions").insert(row).select("*").single();
    if (error) {
      // a teammate may have just created the group draft: use theirs
      if (error.code === "23505") {
        const q = supabase.from("gif_submissions").select("*").eq("assignment_id", assignment.id);
        const { data: existing } = await (assignment.submission_type === "group" ? q.eq("team_id", teamId!) : q.eq("delegate_id", delegateId)).maybeSingle();
        if (existing) { subRef.current = existing as Submission; return subRef.current; }
      }
      throw error;
    }
    subRef.current = data as Submission;
    return subRef.current;
  };

  const save = async (submit: boolean) => {
    setMsg(null);
    const payload = clean();
    for (const f of assignment.fields) {
      const v = payload[f.key];
      if (f.type === "url" && typeof v === "string" && !isHttpUrl(v)) { setMsg({ ok: false, text: `"${f.label}" must be a full link starting with https://` }); return; }
    }
    if (submit && missing.length) {
      const labels = assignment.fields.filter((f) => missing.includes(f.key)).map((f) => f.label);
      setMsg({ ok: false, text: `Please complete: ${labels.join(" · ")}` });
      return;
    }
    setBusy(submit ? "submit" : "save");
    try {
      const sub = await ensureSubmission();
      const current = subRef.current?.status ?? "in_progress";
      const nextStatus = submit ? "submitted" : current === "submitted" ? "submitted" : current === "revision_required" ? "revision_required" : "in_progress";
      const { data, error } = await supabase.from("gif_submissions").update({ responses: payload, status: nextStatus }).eq("id", sub.id).select("*").single();
      if (error) throw error;
      subRef.current = data as Submission;
      setMsg({ ok: true, text: submit ? (current === "revision_required" ? "Resubmitted. Arba will review it again." : "Submitted. Arba will review it soon.") : nextStatus === "submitted" ? "Submission updated." : "Draft saved." });
      await onChanged();
    } catch (e) {
      setMsg({ ok: false, text: (e as { message?: string })?.message || "Couldn't save. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const upload = async (field: FieldDef, list: FileList | null, description: string, storyDay?: number) => {
    if (!list?.length) return;
    const kind = field.type === "story_proof" ? "story_proof" : "file";
    const max = field.max_files ?? (kind === "story_proof" ? 20 : 5);
    const room = max - (counts[field.key] ?? 0);
    const picked = Array.from(list).slice(0, Math.max(room, 0));
    if (!picked.length) { setFieldMsg((p) => ({ ...p, [field.key]: { ok: false, text: `You can upload at most ${max} here.` } })); return; }
    setBusy(`upload-${field.key}`);
    setFieldMsg((p) => ({ ...p, [field.key]: null }));
    let done = 0;
    const errors: string[] = [];
    try {
      const sub = await ensureSubmission();
      for (const file of picked) {
        const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
        const sniffed = sniffType(head, file.name);
        const invalid = validateUpload({ size: file.size, sniffed }, kind, field.accept);
        if (invalid) { errors.push(`${file.name}: ${invalid}`); continue; }
        const path = storagePath(kind, { delegateId, submissionId: sub.id }, sniffed!, crypto.randomUUID());
        const bucket = kind === "story_proof" ? "gif-story-proofs" : "gif-submission-files";
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { contentType: sniffed!, upsert: false });
        if (upErr) { errors.push(`${file.name}: ${upErr.message}`); continue; }
        const res = await fetch("/api/gif/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId: sub.id, fieldKey: field.key, path, originalName: file.name, description, storyDay }),
        });
        if (!res.ok) { errors.push(`${file.name}: ${((await res.json().catch(() => ({}))) as { error?: string }).error || "upload failed"}`); continue; }
        done++;
      }
      setFieldMsg((p) => ({ ...p, [field.key]: errors.length ? { ok: false, text: errors.join(" ") } : { ok: true, text: `${done} file${done === 1 ? "" : "s"} uploaded.` } }));
      await onChanged();
    } catch (e) {
      setFieldMsg((p) => ({ ...p, [field.key]: { ok: false, text: (e as { message?: string })?.message || "Upload failed." } }));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (f: SubmissionFile) => {
    if (!confirm("Remove this file from your submission?")) return;
    setBusy(`remove-${f.id}`);
    const { error: rmErr } = await supabase.storage.from(f.bucket).remove([f.storage_path]);
    const { error } = rmErr ? { error: rmErr } : await supabase.from("gif_submission_files").delete().eq("id", f.id);
    setFieldMsg((p) => ({ ...p, [f.field_key]: error ? { ok: false, text: error.message } : { ok: true, text: "File removed." } }));
    setBusy(null);
    await onChanged();
  };

  if (noTeam) {
    return <p className="rounded-xl bg-[#F7F8FA] p-4 text-[15px] text-[#2F4157]/70">Group work is submitted by team members. You are not in a GIF 2026 team, so this part doesn&apos;t apply to you.</p>;
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save(true); }} data-testid={`gif-form-${assignment.slug}`}>
      {!editable && status && (
        <p className="flex items-start gap-2 rounded-xl bg-[#F7F8FA] p-3 text-[14px] text-[#2F4157]/80">
          <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {status === "approved" ? "Approved. This submission is final." : status === "under_review" ? "Arba is reviewing this submission, so it is locked for now. If changes are needed you'll be asked to revise it." : "This assignment is closed."}
        </p>
      )}
      {assignment.submission_type === "group" && editable && (
        <p className="flex items-start gap-2 rounded-xl border border-[#577E90]/30 bg-[#577E90]/10 p-3 text-[14px] text-[#2F4157]">
          <Info size={16} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
          One submission for the whole team. Any team member can fill it in and submit; everyone sees the same answers, files and Arba&apos;s assessment.
        </p>
      )}

      <fieldset disabled={!editable || busy !== null} className="m-0 min-w-0 space-y-5 border-0 p-0">
        {assignment.fields.map((f) => {
          const id = `${assignment.slug}-${f.key}`;
          const req = f.required ? <span className="text-[#B4383A]"> *</span> : null;
          const isMissing = missing.includes(f.key) && status !== null;
          if (f.type === "members") {
            return (
              <div key={f.key}>
                <p className="mb-2 text-[15px] font-semibold text-[#2F4157]">{f.label}</p>
                <ul className="flex flex-wrap gap-2">
                  {team.map((m) => <li key={m.delegate_id} className="rounded-full bg-[#EAEFF5] px-3 py-1 text-[14px] font-medium">{m.full_name}{m.is_me ? " (you)" : ""}</li>)}
                </ul>
              </div>
            );
          }
          if (f.type === "rating") {
            const v = typeof responses[f.key] === "number" ? (responses[f.key] as number) : 0;
            return (
              <fieldset key={f.key} className="min-w-0">
                <legend className="mb-2 text-[15px] font-semibold text-[#2F4157]">{f.label}{req}</legend>
                <div className="flex gap-1" role="radiogroup" aria-label={f.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={v === n} aria-label={`${n} of 5`} onClick={() => set(f.key, n)} data-testid={`gif-rating-${f.key}-${n}`}
                      className="rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90]">
                      <Star size={30} className={n <= v ? "fill-[#E5A13A] text-[#E5A13A]" : "text-[#C9D2DD]"} aria-hidden="true" />
                    </button>
                  ))}
                  {v > 0 && <span className="self-center pl-2 text-[14px] text-[#2F4157]/70">{v}/5</span>}
                </div>
              </fieldset>
            );
          }
          if (f.type === "checkbox") {
            return (
              <label key={f.key} htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E3E7ED] p-4">
                <input id={id} type="checkbox" className="mt-1 h-5 w-5 accent-[#2F4157]" checked={responses[f.key] === true} onChange={(e) => set(f.key, e.target.checked)} />
                <span className="text-[15px] leading-relaxed">{f.label}{req}</span>
              </label>
            );
          }
          if (f.type === "files" || f.type === "story_proof") {
            const mine = files.filter((x) => x.field_key === f.key);
            const story = f.type === "story_proof";
            const accept = acceptList(f.accept, story ? "story_proof" : "file");
            const max = f.max_files ?? (story ? 20 : 5);
            return (
              <UploadField key={f.key} id={id} field={f} story={story} files={mine} urls={urls} accept={accept} max={max}
                busy={busy === `upload-${f.key}`} editable={editable} msg={fieldMsg[f.key] ?? null} missing={isMissing}
                onUpload={(list, desc, day) => upload(f, list, desc, day)} onRemove={remove} />
            );
          }
          return (
            <div key={f.key}>
              <label htmlFor={id} className="mb-1.5 block text-[15px] font-semibold text-[#2F4157]">{f.label}{req}</label>
              {f.help && <p className="mb-2 text-[13px] text-[#2F4157]/60">{f.help}</p>}
              {f.type === "textarea" ? (
                <textarea id={id} rows={4} maxLength={f.max ?? 5000} className={cn(fieldInput, isMissing && "border-[#B4383A]/40")} value={String(responses[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "select" ? (
                <select id={id} className={cn(fieldInput, isMissing && "border-[#B4383A]/40")} value={String(responses[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Select…</option>
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input id={id} type={f.type === "url" ? "url" : "text"} inputMode={f.type === "url" ? "url" : undefined} maxLength={f.max ?? 500}
                  placeholder={f.placeholder} className={cn(fieldInput, isMissing && "border-[#B4383A]/40")} value={String(responses[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.type === "textarea" && f.max && <p className="mt-1 text-right text-[12px] text-[#2F4157]/50">{String(responses[f.key] ?? "").length}/{f.max}</p>}
            </div>
          );
        })}
      </fieldset>

      {editable && (
        <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-[#E3E7ED] bg-white/95 p-3 shadow-[0_10px_30px_rgba(47,65,87,0.12)] supports-[backdrop-filter]:backdrop-blur sm:static sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button type="submit" className={cn(btnPrimary, "w-full sm:w-auto")} disabled={busy !== null} data-testid="gif-submit">
            {busy === "submit" ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {status === "revision_required" ? "Resubmit" : status === "submitted" ? "Update submission" : "Submit"}
          </button>
          {status !== "submitted" && (
            <button type="button" className={cn(btnSecondary, "w-full sm:w-auto")} disabled={busy !== null} onClick={() => void save(false)} data-testid="gif-save-draft">
              {busy === "save" ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save draft
            </button>
          )}
          {msg && (
            <p role="status" className={cn("flex items-start gap-1.5 text-[14px] font-medium", msg.ok ? "text-[#2E6B4F]" : "text-[#B4383A]")}>
              {msg.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />} {msg.text}
            </p>
          )}
        </div>
      )}
      {!editable && msg && <p className="text-[14px] text-[#2F4157]/70">{msg.text}</p>}
    </form>
  );
}

function UploadField({ id, field, story, files, urls, accept, max, busy, editable, msg, missing, onUpload, onRemove }: {
  id: string; field: FieldDef; story: boolean; files: SubmissionFile[]; urls: Record<string, string>; accept: string[]; max: number;
  busy: boolean; editable: boolean; msg: Msg; missing: boolean;
  onUpload: (list: FileList | null, description: string, storyDay?: number) => void; onRemove: (f: SubmissionFile) => void;
}) {
  const [desc, setDesc] = useState("");
  const [day, setDay] = useState<number>(field.day_options?.[0] ?? 0);
  const Icon = story ? ImagePlus : Paperclip;
  const live = files.filter((f) => !f.deleted_at).length;
  return (
    <div className={cn("space-y-3 rounded-2xl border border-dashed p-4", missing ? "border-[#B4383A]/40 bg-[#FDEDED]/40" : "border-[#C9D2DD] bg-[#F7F8FA]")} data-testid={`gif-upload-${field.key}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-[#2F4157]">{field.label}{field.required ? <span className="text-[#B4383A]"> *</span> : null}</p>
          {field.help && <p className="mt-0.5 text-[13px] text-[#2F4157]/60">{field.help}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#2F4157]/70">{files.length}{field.min_files ? ` / ${field.min_files} min` : ""}</span>
      </div>
      {story && (
        <p className="flex items-start gap-2 rounded-xl bg-white p-3 text-[13px] leading-relaxed text-[#2F4157]/80" data-testid="gif-retention-note">
          <Info size={15} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" /> {RETENTION_NOTE}
        </p>
      )}
      {field.day_options && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Screenshots per day">
          {field.day_options.map((n) => {
            const c = files.filter((f) => f.story_day === n).length;
            return <li key={n} className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold", c >= 2 ? "bg-[#E8F3EE] text-[#2E6B4F]" : "bg-white text-[#2F4157]/70")}>Day {n}: {c}{c >= 2 ? " ✓" : "/2"}</li>;
          })}
        </ul>
      )}
      {files.length > 0 && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{files.map((f) => <FileTile key={f.id} file={f} url={urls[f.id]} onRemove={editable ? () => onRemove(f) : undefined} />)}</div>}
      {editable && live < max && (
        <div className="space-y-2">
          {field.day_options && (
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[#2F4157]">Posted on</span>
              <select className={cn(fieldInput, "py-2.5")} value={day} onChange={(e) => setDay(Number(e.target.value))} data-testid={`gif-story-day-${field.key}`}>
                {field.day_options.map((n) => <option key={n} value={n}>Day {n}</option>)}
              </select>
            </label>
          )}
          {story && (
            <input type="text" maxLength={200} className={cn(fieldInput, "py-2.5")} placeholder="Optional: what is this Story about?" value={desc}
              onChange={(e) => setDesc(e.target.value)} aria-label="Short description for the screenshots you upload next" />
          )}
          <label htmlFor={id} className={cn(btnSecondary, "w-full cursor-pointer sm:w-auto", busy && "pointer-events-none opacity-60")}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
            {busy ? "Uploading…" : story ? "Add screenshots" : "Upload file"}
            <input id={id} type="file" className="sr-only" accept={accept.join(",")} multiple={max - live > 1}
              onChange={(e) => { const l = e.target.files; onUpload(l, desc, field.day_options ? day : undefined); e.target.value = ""; setDesc(""); }} />
          </label>
          <p className="text-[12px] text-[#2F4157]/55">{describeTypes(accept)} · max {story ? 10 : 50} MB each · up to {max}</p>
        </div>
      )}
      {msg && <p role="status" className={cn("text-[13px] font-medium", msg.ok ? "text-[#2E6B4F]" : "text-[#B4383A]")}>{msg.text}</p>}
    </div>
  );
}

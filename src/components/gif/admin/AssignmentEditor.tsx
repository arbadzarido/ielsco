"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2, Plus, Save } from "lucide-react";
import { btnPrimary, btnSecondary, card, cardGloss, inputClass, labelClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { validateFieldsConfig, validateRubricConfig, type Assignment, type ProgrammeDay } from "@/lib/gif/portal";
import { TypeBadge } from "../shared";
import type { AdminData } from "./GifAdmin";

// Times are entered and shown in Singapore time (UTC+8), where the programme runs.
const toSgtInput = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0, 16) : "");
const fromSgtInput = (v: string) => (v ? new Date(`${v}:00+08:00`).toISOString() : null);
const input = cn(inputClass, "py-2.5 text-base");

export function AssignmentEditor({ supabase, data: d, onSaved }: { supabase: SupabaseClient; data: AdminData; onSaved: () => Promise<void> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  return (
    <div className="space-y-6" data-testid="gif-assignment-editor">
      <p className={cn(card, "p-4 text-[15px] text-[#2F4157]/80")}>
        Assignment content lives in the database, so you can change instructions, deadlines, fields and rubrics here without a code change
        (for example Day 4). Deactivate an assignment instead of deleting it; submissions are always kept.
      </p>
      {d.days.map((day) => (
        <section key={day.day_number} className="space-y-3">
          <DayEditor supabase={supabase} day={day} onSaved={onSaved} />
          {d.assignments.filter((a) => a.day_number === day.day_number).map((a) => (
            <div key={a.id} className={cn(card, "p-4")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={a.submission_type} /><span className="font-semibold">{a.title}</span>
                  {!a.is_active && <span className="rounded-full bg-[#F1F4F8] px-2 py-0.5 text-[12px] font-semibold">Inactive</span>}
                </span>
                <button type="button" className={btnSecondary} onClick={() => setOpenId(openId === a.id ? null : a.id)} data-testid={`gif-edit-${a.slug}`}>{openId === a.id ? "Close" : "Edit"}</button>
              </div>
              {openId === a.id && <AssignmentForm supabase={supabase} a={a} hasSubmissions={d.submissions.some((s) => s.assignment_id === a.id)} onSaved={onSaved} />}
            </div>
          ))}
          {adding === day.day_number
            ? <NewAssignment supabase={supabase} day={day} order={d.assignments.filter((a) => a.day_number === day.day_number).length + 1} onDone={async () => { setAdding(null); await onSaved(); }} />
            : <button type="button" className={cn(btnSecondary, "text-[14px]")} onClick={() => setAdding(day.day_number)}><Plus size={16} /> Add a task to Day {day.day_number}</button>}
        </section>
      ))}
    </div>
  );
}

function DayEditor({ supabase, day, onSaved }: { supabase: SupabaseClient; day: ProgrammeDay; onSaved: () => Promise<void> }) {
  const [v, setV] = useState({ title: day.title, theme: day.theme ?? "", summary: day.summary ?? "" });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const dirty = v.title !== day.title || v.theme !== (day.theme ?? "") || v.summary !== (day.summary ?? "");
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("gif_programme_days").update({ title: v.title.trim(), theme: v.theme.trim() || null, summary: v.summary.trim() || null, updated_at: new Date().toISOString() })
      .eq("edition", day.edition).eq("day_number", day.day_number);
    setBusy(false); setMsg(error ? error.message : "Saved.");
    if (!error) await onSaved();
  };
  return (
    <div className={cn(cardGloss, "space-y-3 p-4")}>
      <p className="text-[13px] font-bold uppercase tracking-wider text-[#577E90]">Day {day.day_number}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={labelClass}>Title</span><input className={input} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></label>
        <label><span className={labelClass}>Theme</span><input className={input} value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value })} /></label>
      </div>
      <label className="block"><span className={labelClass}>Short description</span><textarea rows={2} className={input} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></label>
      {dirty && <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save day</button>}
      {msg && <p className="text-[14px]">{msg}</p>}
    </div>
  );
}

function AssignmentForm({ supabase, a, hasSubmissions, onSaved }: { supabase: SupabaseClient; a: Assignment; hasSubmissions: boolean; onSaved: () => Promise<void> }) {
  const [v, setV] = useState({
    title: a.title, purpose: a.purpose ?? "", instructions: a.instructions ?? "", deliverables: a.deliverables.join("\n"),
    submission_format: a.submission_format ?? "", submission_type: a.submission_type, opens_at: toSgtInput(a.opens_at), due_at: toSgtInput(a.due_at),
    allow_late: a.allow_late, is_active: a.is_active, fields: JSON.stringify(a.fields, null, 2), rubric: JSON.stringify(a.rubric, null, 2),
  });
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async () => {
    setMsg(null);
    let fields: unknown, rubric: unknown;
    try { fields = JSON.parse(v.fields); } catch { setMsg({ ok: false, text: "Fields: invalid JSON." }); return; }
    try { rubric = JSON.parse(v.rubric); } catch { setMsg({ ok: false, text: "Rubric: invalid JSON." }); return; }
    const fv = validateFieldsConfig(fields); if (!fv.ok) { setMsg({ ok: false, text: fv.error }); return; }
    const rv = validateRubricConfig(rubric); if (!rv.ok) { setMsg({ ok: false, text: rv.error }); return; }
    if (!v.title.trim()) { setMsg({ ok: false, text: "Title is required." }); return; }
    setBusy(true);
    const { error } = await supabase.from("gif_assignments").update({
      title: v.title.trim(), purpose: v.purpose.trim() || null, instructions: v.instructions.trim() || null,
      deliverables: v.deliverables.split("\n").map((x) => x.trim()).filter(Boolean), submission_format: v.submission_format.trim() || null,
      submission_type: v.submission_type, opens_at: fromSgtInput(v.opens_at), due_at: fromSgtInput(v.due_at), allow_late: v.allow_late, is_active: v.is_active,
      fields: fv.value, rubric: rv.value,
    }).eq("id", a.id);
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved. Delegates see the change immediately." });
    if (!error) await onSaved();
  };
  return (
    <div className="mt-4 space-y-3 border-t border-[#E3E7ED] pt-4" data-testid="gif-assignment-form">
      <div className="grid gap-3 md:grid-cols-2">
        <label><span className={labelClass}>Title</span><input className={input} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></label>
        <label><span className={labelClass}>Submission type</span>
          <select className={input} value={v.submission_type} disabled={hasSubmissions} onChange={(e) => setV({ ...v, submission_type: e.target.value as Assignment["submission_type"] })}>
            <option value="group">Group (one per team)</option><option value="individual">Individual (one per delegate)</option>
          </select>
          {hasSubmissions && <span className="mt-1 block text-[12px] text-[#2F4157]/60">Locked: submissions already exist.</span>}
        </label>
        <label><span className={labelClass}>Opens (Singapore time)</span><input type="datetime-local" className={input} value={v.opens_at} onChange={(e) => setV({ ...v, opens_at: e.target.value })} /></label>
        <label><span className={labelClass}>Deadline (Singapore time)</span><input type="datetime-local" className={input} value={v.due_at} onChange={(e) => setV({ ...v, due_at: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-[#2F4157]" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /> Active (visible to delegates)</label>
        <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-[#2F4157]" checked={v.allow_late} onChange={(e) => setV({ ...v, allow_late: e.target.checked })} /> Accept late submissions</label>
      </div>
      <label className="block"><span className={labelClass}>Purpose</span><input className={input} value={v.purpose} onChange={(e) => setV({ ...v, purpose: e.target.value })} /></label>
      <label className="block"><span className={labelClass}>Instructions</span><textarea rows={4} className={input} value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} /></label>
      <label className="block"><span className={labelClass}>Required deliverables (one per line)</span><textarea rows={4} className={input} value={v.deliverables} onChange={(e) => setV({ ...v, deliverables: e.target.value })} /></label>
      <label className="block"><span className={labelClass}>Submission format</span><input className={input} value={v.submission_format} onChange={(e) => setV({ ...v, submission_format: e.target.value })} /></label>
      <details>
        <summary className="cursor-pointer text-[15px] font-semibold text-[#577E90]">Submission fields and rubric (JSON)</summary>
        <p className="mt-2 text-[13px] text-[#2F4157]/65">
          Field types: text, textarea, url, select (options), checkbox, members, files (accept, max_files), story_proof (min_files, story_day; 7-day retention).
          Options: required, help, placeholder, max, or_field (a link field that can stand in for an upload). Rubric: [{"{"}&quot;key&quot;, &quot;label&quot;{"}"}], each scored 1–5.
          Renaming a field key hides answers already saved under the old key.
        </p>
        <label className="mt-2 block"><span className={labelClass}>Fields</span><textarea rows={12} spellCheck={false} className={cn(input, "font-mono text-[13px]")} value={v.fields} onChange={(e) => setV({ ...v, fields: e.target.value })} /></label>
        <label className="mt-2 block"><span className={labelClass}>Rubric</span><textarea rows={6} spellCheck={false} className={cn(input, "font-mono text-[13px]")} value={v.rubric} onChange={(e) => setV({ ...v, rubric: e.target.value })} /></label>
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()} data-testid="gif-save-assignment">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save assignment</button>
        {msg && <p role="status" className={cn("text-[14px] font-medium", msg.ok ? "text-[#2E6B4F]" : "text-[#B4383A]")}>{msg.text}</p>}
      </div>
    </div>
  );
}

function NewAssignment({ supabase, day, order, onDone }: { supabase: SupabaseClient; day: ProgrammeDay; order: number; onDone: () => Promise<void> }) {
  const [title, setTitle] = useState(""); const [type, setType] = useState<"group" | "individual">("individual");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const create = async () => {
    if (!title.trim()) { setErr("Give the task a title."); return; }
    setBusy(true);
    const slug = `day${day.day_number}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("gif_assignments").insert({
      edition: day.edition, day_number: day.day_number, slug, title: title.trim(), submission_type: type, sort_order: order, is_active: false,
      fields: [{ key: "response", label: "Your response", type: "textarea", required: true, max: 2000 }], rubric: [],
    });
    setBusy(false);
    if (error) setErr(error.message); else await onDone();
  };
  return (
    <div className={cn(card, "space-y-3 p-4")}>
      <p className="text-[14px] text-[#2F4157]/70">New tasks start inactive with one text field; edit them, then tick “Active”.</p>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input className={input} placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className={input} value={type} onChange={(e) => setType(e.target.value as "group" | "individual")}><option value="individual">Individual</option><option value="group">Group</option></select>
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void create()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create</button>
      </div>
      {err && <p className="text-[14px] text-[#B4383A]">{err}</p>}
    </div>
  );
}

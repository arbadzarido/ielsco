"use client";

// =============================================================================
// app/school/dashboard/mentor/page.tsx
// Private course management dashboard
// Features: overview all students → expand per student → manage sessions
//           (topic, links, score, feedback, contract approval, direct scheduling, custom delete modal)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  GraduationCap, Users, Calendar, CheckCircle2, Clock,
  AlertTriangle, ChevronDown, ChevronUp, Star, PenTool,
  ClipboardCheck, Download, ExternalLink, X, Check,
  Plus, Save, RefreshCw, MessageCircle, ScrollText,
  FileText, Lock, ArrowRight, Loader2, BookOpen, Trash2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseSession {
  id: string;
  enrollment_id: string;
  session_number: number;
  topic: string | null;
  student_booked_date: string | null;
  pre_test_url: string | null;
  post_test_url: string | null;
  task_url: string | null;
  mentor_score: number | null;
  mentor_feedback: string | null;
  journal_submitted: boolean;
  feedback_submitted: boolean;
  created_at: string;
}

interface StudentEnrollment {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  is_onboarded: boolean;
  course_name: string;
  enrollment_status: "active" | "completed";
  total_sessions: number;
  contract_signed: boolean;
  contract_url: string | null;
  class_name: string;
  enrolled_at: string;
  sessions_total: number;
  sessions_completed: number; 
  sessions_booked_pending: number;
  sessions_not_booked: number;
  post_work_pending: number;
  latest_score: number | null;
  next_session_number: number | null;
  next_session_date: string | null;
  sessions?: CourseSession[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} WIB`;
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function toLocalDatetimeInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const color = pct >= 75 ? "#34d399" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#E56668";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#1A2534]">
        {pct}
      </span>
    </div>
  );
}

// ── Editable session row ──────────────────────────────────────────────────────
function SessionEditorRow({
  session,
  onSave,
  onDelete,
}: {
  session: CourseSession;
  onSave: (id: string, patch: Partial<CourseSession>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [topic,       setTopic]       = useState(session.topic ?? "");
  const [preTestUrl,  setPreTestUrl]  = useState(session.pre_test_url ?? "");
  const [postTestUrl, setPostTestUrl] = useState(session.post_test_url ?? "");
  const [taskUrl,     setTaskUrl]     = useState(session.task_url ?? "");
  const [score,       setScore]       = useState<string>(session.mentor_score !== null ? String(session.mentor_score) : "");
  const [feedback,    setFeedback]    = useState(session.mentor_feedback ?? "");
  const [bookedDate,  setBookedDate]  = useState(toLocalDatetimeInput(session.student_booked_date));

  const isDone     = session.mentor_score !== null;
  const isBooked   = !!session.student_booked_date;
  const daysAway   = daysUntil(session.student_booked_date);

  const handleSave = async () => {
    setSaving(true);
    const patch: Partial<CourseSession> = {
      topic:           topic || "",
      pre_test_url:    preTestUrl  || null,
      post_test_url:   postTestUrl || null,
      task_url:        taskUrl     || null,
      mentor_score:    score !== "" ? Number(score) : null,
      mentor_feedback: feedback || null,
      student_booked_date: bookedDate ? new Date(bookedDate).toISOString() : null,
    };
    await onSave(session.id, patch);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setShowDeleteModal(false);
    await onDelete(session.id);
  };

  const statusTag = isDone
    ? { label: "Graded", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    : isBooked
    ? { label: `Scheduled${daysAway !== null ? ` · ${daysAway}d` : ""}`, bg: "bg-blue-50 text-blue-700 border-blue-200" }
    : { label: "Awaiting Booking", bg: "bg-slate-100 text-slate-600 border-slate-200" };

  return (
    <>
      <div className={`rounded-[16px] border overflow-hidden transition-all ${isDone ? "border-emerald-200 bg-emerald-50/30" : isBooked ? "border-blue-200 bg-blue-50/20" : "border-gray-200 bg-white"}`}>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] transition-colors"
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${isDone ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
            {isDone ? <Check size={13} /> : session.session_number}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1A2534] truncate">
              Session {session.session_number}{session.topic ? ` · ${session.topic}` : ""}
            </p>
            {isBooked && (
              <p className="text-[10px] text-slate-400">{fmtDateTime(session.student_booked_date)}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {session.mentor_score !== null && (
              <span className="text-[12px] font-black text-[#1A2534] bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                {session.mentor_score}/100
              </span>
            )}
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border hidden sm:inline-flex ${statusTag.bg}`}>
              {statusTag.label}
            </span>
            {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-white cursor-default">
            <div className="flex gap-2 flex-wrap items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Journal",  done: session.journal_submitted  },
                  { label: "Feedback", done: session.feedback_submitted },
                ].map(({ label, done }) => (
                  <span key={label} className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    {done ? <Check size={10} /> : <Clock size={10} />} Student {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Topic</label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Speaking: Fluency & Pronunciation"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-[#1A2534] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A2534]/10 focus:border-[#1A2534]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Schedule (Date & Time)</label>
                <input 
                  type="datetime-local" 
                  value={bookedDate} 
                  onChange={(e) => setBookedDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-[#1A2534] focus:outline-none focus:ring-2 focus:ring-[#1A2534]/10 focus:border-[#1A2534]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Materials / Drive URL</label>
                <input value={taskUrl} onChange={(e) => setTaskUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-[#1A2534] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A2534]/10 focus:border-[#1A2534]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Pre-Test URL</label>
                <input value={preTestUrl} onChange={(e) => setPreTestUrl(e.target.value)}
                  placeholder="https://forms.gle/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-[#1A2534] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A2534]/10 focus:border-[#1A2534]/30" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Score (0–100)</label>
                <input
                  type="number" min="0" max="100"
                  value={score} onChange={(e) => setScore(e.target.value)}
                  placeholder="e.g. 82"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-[#1A2534] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A2534]/10 focus:border-[#1A2534]/30" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Mentor Feedback</label>
                <textarea
                  value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Write your personalized feedback for this student..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-[#1A2534] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A2534]/10 focus:border-[#1A2534]/30 resize-none" />
              </div>
            </div>

            {/* Save & Custom Delete Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting || saving}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-bold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span className="hidden sm:inline">Delete Session</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
                  saved
                    ? "bg-emerald-500 text-white"
                    : "bg-[#1A2534] hover:bg-[#2F4157] text-white"
                } disabled:opacity-50`}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
                {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom IELS Style Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#1A2534]/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-[#E56668] mb-4 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-[18px] font-black text-center text-[#1A2534] mb-2">Delete Session?</h3>
            <p className="text-[13px] text-slate-500 text-center mb-6">
              Are you sure you want to delete <strong>Session {session.session_number}</strong>? This action cannot be undone and will permanently remove this data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#E56668] hover:bg-red-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Student card ──────────────────────────────────────────────────────────────
function StudentCard({
  student,
  supabase,
  onRefresh,
}: {
  student: StudentEnrollment;
  supabase: ReturnType<typeof createBrowserClient>;
  onRefresh: () => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [sessions,  setSessions]  = useState<CourseSession[]>(student.sessions ?? []);
  const [loading,   setLoading]   = useState(false);
  const [approving, setApproving] = useState(false);
  const [adding,    setAdding]    = useState(false);

  // Progress calculates strictly based on mentor_score existing
  const realtimeCompleted = sessions.length > 0 
    ? sessions.filter(s => s.mentor_score !== null).length 
    : student.sessions_completed;

  const progressPct = student.total_sessions > 0
    ? Math.round((realtimeCompleted / student.total_sessions) * 100)
    : 0;

  const loadSessions = useCallback(async () => {
    if (sessions.length > 0) return; 
    setLoading(true);
    const { data } = await supabase
      .from("course_sessions")
      .select("*")
      .eq("enrollment_id", student.enrollment_id)
      .order("session_number", { ascending: true });
    setSessions((data as CourseSession[]) ?? []);
    setLoading(false);
  }, [student.enrollment_id, sessions.length, supabase]);

  const handleExpand = async () => {
    setExpanded((p) => !p);
    if (!expanded) await loadSessions();
  };

  const handleSaveSession = async (id: string, patch: Partial<CourseSession>) => {
    await supabase.from("course_sessions").update(patch).eq("id", id);
    const { data } = await supabase
      .from("course_sessions")
      .select("*")
      .eq("enrollment_id", student.enrollment_id)
      .order("session_number", { ascending: true });
    setSessions((data as CourseSession[]) ?? []);
    onRefresh(); 
  };

  const handleDeleteSession = async (id: string) => {
    await supabase.from("course_sessions").delete().eq("id", id);
    const { data } = await supabase
      .from("course_sessions")
      .select("*")
      .eq("enrollment_id", student.enrollment_id)
      .order("session_number", { ascending: true });
    setSessions((data as CourseSession[]) ?? []);
    onRefresh();
  };

  const handleApproveContract = async () => {
    setApproving(true);
    await supabase
      .from("course_enrollments")
      .update({ contract_signed: true })
      .eq("id", student.enrollment_id);
    setApproving(false);
    onRefresh();
  };

  const handleMarkComplete = async () => {
    await supabase
      .from("course_enrollments")
      .update({ status: "completed" })
      .eq("id", student.enrollment_id);
    onRefresh();
  };

  const handleAddSession = async () => {
    setAdding(true);
    const nextNum = (sessions.length ?? 0) + 1;
    
    const { error } = await supabase.from("course_sessions").insert({
      enrollment_id: student.enrollment_id,
      session_number: nextNum,
      topic: "", 
      journal_submitted: false,
      feedback_submitted: false,
    });

    if (error) {
      console.error("Failed to add session:", error.message);
      alert("Failed to add session: " + error.message);
    } else {
      const { data } = await supabase
        .from("course_sessions")
        .select("*")
        .eq("enrollment_id", student.enrollment_id)
        .order("session_number", { ascending: true });
      setSessions((data as CourseSession[]) ?? []);
    }
    
    setAdding(false);
  };

  const initials = student.student_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className={`h-1 ${student.enrollment_status === "completed" ? "bg-emerald-400" : student.sessions_booked_pending > 0 ? "bg-blue-400" : "bg-[#1A2534]"}`} />

      <button onClick={handleExpand} className="w-full text-left px-5 py-4 hover:bg-[#F7F8FA] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1A2534] flex-shrink-0 flex items-center justify-center text-white text-[12px] font-black">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[14px] font-black text-[#1A2534] truncate">{student.student_name}</p>
              {!student.contract_signed && (
                <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Contract Pending
                </span>
              )}
              {student.post_work_pending > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-widest bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                  Post-work due
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">{student.student_email} · {student.class_name}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Progress</p>
              <p className="text-[13px] font-black text-[#1A2534]">{realtimeCompleted}/{student.total_sessions}</p>
            </div>
            <ScoreRing pct={progressPct} size={40} />
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>

        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1A2534] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="mt-2.5 flex gap-4 flex-wrap">
          {[
            { label: "Booked", value: student.sessions_booked_pending, color: "text-blue-600"  },
            { label: "Not Booked", value: student.sessions_not_booked, color: "text-slate-500" },
            { label: "Post-work Due", value: student.post_work_pending, color: "text-amber-600" },
            { label: "Latest Score", value: student.latest_score !== null ? `${student.latest_score}/100` : "—", color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">{label} </span>
              <span className={`text-[11px] font-black ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-5">
          <div className={`rounded-xl p-4 border ${student.contract_signed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ScrollText size={15} className={student.contract_signed ? "text-emerald-600 mt-0.5" : "text-amber-600 mt-0.5"} />
                <div>
                  <p className={`text-[12px] font-black ${student.contract_signed ? "text-emerald-700" : "text-amber-700"}`}>
                    Learning Contract
                  </p>
                  {student.contract_url ? (
                    <Link href={student.contract_url} target="_blank"
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink size={10} /> View signed document
                    </Link>
                  ) : (
                    <p className="text-[11px] text-amber-600/70 mt-0.5">Student has not submitted contract yet</p>
                  )}
                </div>
              </div>
              {!student.contract_signed && student.contract_url && (
                <button
                  onClick={handleApproveContract}
                  disabled={approving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition-all disabled:opacity-50"
                >
                  {approving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Approve
                </button>
              )}
            </div>
          </div>

          {student.next_session_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Calendar size={14} className="text-blue-600 flex-shrink-0" />
              <p className="text-[12px] font-semibold text-blue-700">
                Next session booked: <strong>{fmtDateTime(student.next_session_date)}</strong>
                {daysUntil(student.next_session_date) !== null && (
                  <span className="text-blue-500 font-normal ml-1">
                    ({daysUntil(student.next_session_date)} days away)
                  </span>
                )}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Sessions ({sessions.length}/{student.total_sessions})
              </p>
              <div className="flex gap-2">
                {sessions.length < student.total_sessions && (
                  <button
                    onClick={handleAddSession}
                    disabled={adding}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1A2534] hover:text-[#E56668] transition-colors disabled:opacity-50"
                  >
                    {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Add Session
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-[12px] py-4">
                <Loader2 size={14} className="animate-spin" /> Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-[#F7F8FA] rounded-xl p-4 text-center">
                <p className="text-[12px] text-slate-400">No sessions yet.</p>
                <button onClick={handleAddSession}
                  className="mt-2 text-[12px] font-bold text-[#1A2534] hover:text-[#E56668] transition-colors">
                  + Add first session
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <SessionEditorRow 
                    key={session.id} 
                    session={session} 
                    onSave={handleSaveSession} 
                    onDelete={handleDeleteSession} 
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
            <Link
              href={`https://wa.me/6288297253491`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-[#1A2534] bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
            >
              <MessageCircle size={12} /> WhatsApp
            </Link>
            {student.enrollment_status === "active" && sessions.every((s) => s.mentor_score !== null) && (
              <button
                onClick={handleMarkComplete}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
              >
                <CheckCircle2 size={12} /> Mark as Completed
              </button>
            )}
            <span className="text-[10px] text-slate-400 ml-auto self-center">
              Enrolled {fmtDate(student.enrolled_at)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MentorDashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [students,    setStudents]    = useState<StudentEnrollment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<"all" | "active" | "completed" | "pending_contract">("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sessionFilter, setSessionFilter] = useState<number | "all">("all");
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchStudents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/school/sign-in"); return; }

    const { data, error } = await supabase
      .from("private_student_overview")
      .select("*")
      .order("enrolled_at", { ascending: false });

    if (!error && data) setStudents(data as StudentEnrollment[]);
    setLoading(false);
    setRefreshing(false);
  }, [supabase, router]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
  };

  const allClasses = Array.from(new Set(students.map((s) => s.class_name))).filter(Boolean);
  const allSessionCounts = Array.from(new Set(students.map((s) => s.total_sessions))).sort((a, b) => a - b);

  const filtered = students.filter((s) => {
    const matchStatus =
      filter === "all" ? true
      : filter === "active" ? s.enrollment_status === "active"
      : filter === "completed" ? s.enrollment_status === "completed"
      : !s.contract_signed;
    
    const matchClass = classFilter === "all" || s.class_name === classFilter;
    const matchSessionCount = sessionFilter === "all" || s.total_sessions === sessionFilter;
    
    return matchStatus && matchClass && matchSessionCount;
  });

  const active    = students.filter((s) => s.enrollment_status === "active").length;
  const pending   = students.filter((s) => !s.contract_signed).length;
  const postDue   = students.reduce((acc, s) => acc + s.post_work_pending, 0);
  const booked    = students.reduce((acc, s) => acc + s.sessions_booked_pending, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-[#1A2534]" />
        <span className="ml-2 text-slate-400 text-sm">Loading private students…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Geologica', sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={13} className="text-[#E56668]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">
              Private Course Portal
            </p>
          </div>
          <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">
            Mentor Dashboard
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            Manage all private students, sessions, scores & feedback
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#1A2534] font-bold text-[12px] px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Students",  value: active,   color: "text-[#1A2534]", bg: "bg-[#1A2534]", accent: true },
          { label: "Upcoming Sessions", value: booked,  color: "text-blue-700",  bg: "bg-white" },
          { label: "Contract Pending", value: pending,  color: "text-amber-600", bg: "bg-white" },
          { label: "Post-work Due",    value: postDue,  color: "text-[#E56668]", bg: "bg-white" },
        ].map(({ label, value, color, bg, accent }) => (
          <div key={label} className={`rounded-[18px] p-4 border ${accent ? "border-[#1A2534] bg-[#1A2534]" : "border-gray-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${accent ? "text-white/40" : "text-slate-400"}`}>{label}</p>
            <p className={`text-3xl font-black leading-none ${accent ? "text-white" : color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all","active","completed","pending_contract"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] font-bold px-3.5 py-2 rounded-full border transition-all capitalize ${
              filter === f
                ? "bg-[#1A2534] text-white border-[#1A2534]"
                : "bg-white text-slate-500 border-gray-200 hover:border-[#1A2534]/30"
            }`}
          >
            {f === "pending_contract" ? "Contract Pending" : f === "all" ? `All (${students.length})` : f}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          {allClasses.length > 1 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-[11px] font-bold border border-gray-200 rounded-full px-3.5 py-2 bg-white text-slate-500 focus:outline-none hover:border-[#1A2534]/30 cursor-pointer"
            >
              <option value="all">All Programs</option>
              {allClasses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {allSessionCounts.length > 1 && (
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="text-[11px] font-bold border border-gray-200 rounded-full px-3.5 py-2 bg-white text-slate-500 focus:outline-none hover:border-[#1A2534]/30 cursor-pointer"
            >
              <option value="all">All Packages</option>
              {allSessionCounts.map((count) => (
                <option key={count} value={count}>{count} Sessions</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-gray-100 p-12 text-center">
          <p className="text-slate-400 text-[14px]">No students match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => (
            <StudentCard
              key={student.enrollment_id}
              student={student}
              supabase={supabase}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
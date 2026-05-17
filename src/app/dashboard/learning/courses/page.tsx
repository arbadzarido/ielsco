"use client";
// src/app/dashboard/learning/courses/page.tsx

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  BookOpen, Award, CheckCircle2, Calendar, ArrowRight,
  GraduationCap, MessageCircle, Clock, Lock, AlertCircle,
  ExternalLink, ChevronDown, ChevronUp, FileText,
  ClipboardCheck, Download, PenTool, Star, Copy, Check,
  RefreshCw, ScrollText, Info, Users, Target, Video,
  X, AlertTriangle
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BOOKING_URL         = "https://calendar.app.google/EjfzbJCDbM4QDosC7";
const MENTOR_WA           = "https://wa.me/6288297253491";
const PRODUCTS_URL        = "https://ielsco.com/products/courses";
const CONTRACT_TEMPLATE   = "https://docs.google.com/document/d/1WxaKlpgik-INOJNri-0FAQOUeYK8nts0MhEjHqUfZ-M/edit?usp=sharing";
const CONTRACT_EMAIL      = "course@ielsco.com";
const JOURNAL_FORM_BASE   = "https://forms.gle/JOURNAL_FORM_ID";
const FEEDBACK_FORM_BASE  = "https://forms.gle/FEEDBACK_FORM_ID";
const SESSION_PRICE       = 90000;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type UserTier = "explorer" | "insider" | "visionary";

interface CourseSession {
  id: string;
  enrollment_id: string;
  session_number: number;
  topic: string;
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

interface CourseEnrollment {
  id: string;
  user_id: string;
  course_name: string;
  track_id: string | null;
  mentor_id: string | null;
  status: "active" | "completed";
  total_sessions: number;
  contract_signed: boolean;
  contract_url: string | null;
  created_at: string;
  sessions: CourseSession[];
}

interface AlertConfig {
  type: "success" | "warning";
  title: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

// Format date + time
function formatDateTime(iso: string | null) {
  if (!iso) return "–";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  // if time is exactly 00:00 and we didn't explicitly set it, we could hide it, but we force time input now.
  return `${datePart} at ${timePart} WIB`;
}

function formatDateOnly(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isSessionCompleted(s: CourseSession) {
  return !!s.mentor_feedback || s.mentor_score !== null;
}
function isPostWorkDone(s: CourseSession) {
  return s.journal_submitted && s.feedback_submitted && !!s.post_test_url !== !s.post_test_url; 
}
function canUnlockNext(s: CourseSession) {
  return s.journal_submitted && s.feedback_submitted;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL ALERT MODAL (CUSTOM POP UP)
// ═══════════════════════════════════════════════════════════════════════════

function IelsAlertModal({ config, onClose }: { config: AlertConfig, onClose: () => void }) {
  const isSuccess = config.type === "success";
  
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#304156]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className={`h-2 ${isSuccess ? "bg-[#25D366]" : "bg-[#F5A623]"}`} />
        <div className="p-6 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isSuccess ? "bg-[#25D366]/10" : "bg-[#F5A623]/10"}`}>
            {isSuccess ? (
              <CheckCircle2 size={32} className="text-[#25D366]" />
            ) : (
              <AlertTriangle size={32} className="text-[#F5A623]" />
            )}
          </div>
          <div>
            <p className="text-xl font-black text-[#304156] mb-2">{config.title}</p>
            <p className="text-sm text-[#304156]/70 leading-relaxed">
              {config.message}
            </p>
          </div>
          <button onClick={onClose}
            className="w-full py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm transition-all mt-2">
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING CONTRACT MODAL
// ═══════════════════════════════════════════════════════════════════════════

function LearningContractModal({
  enrollment,
  onClose,
}: {
  enrollment: CourseEnrollment;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#304156]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#304156]/10 bg-[#304156] shrink-0">
          <div className="flex items-center gap-4">
            <ScrollText size={20} className="text-white" />
            <div>
              <p className="font-black text-white text-base">Learning Contract & Guidelines</p>
              <p className="text-white/60 text-xs mt-0.5">Signed & submitted · {enrollment.course_name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
          {enrollment.contract_url && (
            <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-2.5">Your Signed Contract</p>
              <Link href={enrollment.contract_url} target="_blank"
                className="flex items-center gap-2.5 text-sm font-bold text-[#304156] hover:underline break-all">
                <ExternalLink size={14} className="shrink-0 text-[#577E90]" />
                {enrollment.contract_url}
              </Link>
            </div>
          )}

          {/* ── LEARNING WORKFLOW ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-4">📋 The Learning Workflow & Timeline</p>
            <p className="text-xs text-[#304156]/70 mb-4 leading-relaxed">
              Every session follows a strict timeline to ensure structured growth and allow your mentor adequate time to personalize materials.
            </p>
            <div className="space-y-3">
              {[
                { day: "D-5",      color: "bg-[#304156]",    label: "Book Your Session",      desc: "Book via the official Google Calendar link at least 5 days before your desired date." },
                { day: "D-1",      color: "bg-[#577E90]",    label: "Complete the Pre-Test",      desc: "Submit the Pre-Test or pre-session assignments on your dashboard before the session." },
                { day: "Session",  color: "bg-[#304156]",    label: "Attend the 90-min Session",  desc: "Show up on time. Arriving 20+ minutes late counts as a forfeiture." },
                { day: "D+1",      color: "bg-[#577E90]",    label: "Access Materials & Post-Test", desc: "Session materials, recordings, and Post-Test unlock on your dashboard the day after." },
                { day: "D+1–D+2",  color: "bg-[#304156]/70", label: "Learning Journal & Feedback", desc: "Submit your Learning Journal and Session Feedback via the Google Forms provided." },
                { day: "D+3",      color: "bg-[#577E90]",    label: "Receive Mentor Evaluation",   desc: "Your mentor releases your comprehensive score and written feedback." },
                { day: "D+5",      color: "bg-[#304156]",    label: "Book Your Next Session",      desc: "You may now book the next session — this triggers the H-5 for the upcoming class." },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`text-[10px] font-black text-white px-3 py-1.5 rounded-lg shrink-0 min-w-[60px] text-center ${step.color}`}>
                    {step.day}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#304156] mb-1">{step.label}</p>
                    <p className="text-xs text-[#304156]/60 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── BOOKING RULES ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-4">📌 Booking & Rescheduling Rules</p>
            <div className="space-y-3">
              {[
                { rule: "H-5 Booking Deadline",    detail: "You must book at least 5 days before your session to allow your mentor time for lesson planning." },
                { rule: "H-2 Reschedule Deadline", detail: "Rescheduling must be requested at least 2 days (48 hours) before the session. Late reschedules forfeit the session." },
                { rule: "Punctuality",             detail: "Sessions are 90 minutes. Arriving 20+ minutes late = session forfeiture with no refund." },
                { rule: "Pacing",                  detail: "Maintain 10–20 day gaps between sessions. Sessions not booked within 20 days may be converted to public class format." },
                { rule: "Post-Session Gate",        detail: "You cannot book your next session until your Learning Journal, Post-Test, and Feedback Form for the previous session have been submitted." },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-4 bg-[#304156]/4 border border-[#304156]/8 rounded-xl px-4 py-4">
                  <span className="w-6 h-6 rounded-full bg-[#304156] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-black text-[#304156] mb-1">{r.rule}</p>
                    <p className="text-xs text-[#304156]/60 leading-relaxed">{r.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── COMMITMENTS ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-4">✍️ Student Commitments</p>
            <div className="space-y-2.5">
              {[
                "Attend minimum 1 session per week for the duration of the enrolled package.",
                "Book sessions at least H-5 (5 days in advance) via the provided Google Calendar link.",
                "Confirm each booking directly with Arba via WhatsApp (088297253491).",
                "Complete all pre-session and post-session work within the specified deadlines.",
                "Not record, redistribute, or share session content without written consent from IELS.",
                "Communicate proactively for rescheduling — minimum H-2 (48 hours notice).",
                "Refunds are not provided after sessions have commenced, except extraordinary circumstances.",
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-[#304156]/70 leading-relaxed">
                  <CheckCircle2 size={14} className="text-[#577E90] mt-0.5 shrink-0" />
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[#304156]/8 shrink-0 flex items-center justify-between">
          <p className="text-xs text-[#304156]/50">Contract verified · {formatDateOnly(enrollment.created_at)}</p>
          {enrollment.contract_url && (
            <Link href={enrollment.contract_url} target="_blank"
              className="flex items-center gap-2 text-xs font-black text-[#577E90] hover:text-[#304156] transition-colors">
              <ExternalLink size={14} /> Open Full Contract
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: BOOKING MODAL
// ═══════════════════════════════════════════════════════════════════════════

function BookingModal({
  session,
  onClose,
  onSaved,
}: {
  session: CourseSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newDate, setNewDate]     = useState("");
  const [newTime, setNewTime]     = useState("");
  const [saving, setSaving]       = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const minNewDate = new Date(Date.now() + 5 * 86_400_000).toISOString().split("T")[0];

  const handleSave = async () => {
    if (!newDate || !newTime) return;
    setSaving(true);
    
    // Combine date and time
    const combinedDateTime = new Date(`${newDate}T${newTime}:00`).toISOString();

    await supabase
      .from("course_sessions")
      .update({ student_booked_date: combinedDateTime })
      .eq("id", session.id);
    
    setSaving(false);
    onSaved(); // Closes modal & triggers success popup
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#304156]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#304156]/10 bg-[#304156] shrink-0">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-white" />
            <p className="font-black text-white text-base">Book Session {session.session_number}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="bg-[#304156]/5 border border-[#304156]/8 rounded-xl p-5 space-y-4">
            <p className="text-xs text-[#304156]/60 leading-relaxed">
              <strong>Step 1:</strong> Secure your slot on the official IELS Google Calendar first (minimum H-5).
            </p>
            <Link href={BOOKING_URL} target="_blank"
              className="px-4 py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all">
              <Calendar size={16} /> Open Google Calendar
            </Link>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50 mb-4">
              Step 2: Sync Your Booked Details
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#304156]/70 block mb-2">
                  Date (H-5 minimum)
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  min={minNewDate}
                  className="w-full border border-[#304156]/15 rounded-xl px-4 py-3 text-base outline-none focus:border-[#304156]/40 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#304156]/70 block mb-2">
                  Time (WIB)
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="w-full border border-[#304156]/15 rounded-xl px-4 py-3 text-base outline-none focus:border-[#304156]/40 bg-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!newDate || !newTime || saving}
            className="w-full py-3 bg-[#577E90] hover:bg-[#304156] disabled:bg-[#304156]/25 text-white rounded-xl font-black text-sm transition-all"
          >
            {saving ? "Saving…" : "Save Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// RESCHEDULE MODAL
// ═══════════════════════════════════════════════════════════════════════════

function RescheduleModal({
  session,
  onClose,
  onSaved,
}: {
  session: CourseSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newDate, setNewDate]     = useState("");
  const [newTime, setNewTime]     = useState("");
  const [reason, setReason]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [sent, setSent]           = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const today        = new Date();
  const bookedDate   = session.student_booked_date ? new Date(session.student_booked_date) : null;
  const diffDays     = bookedDate ? Math.ceil((bookedDate.getTime() - today.getTime()) / 86_400_000) : 0;
  const canReschedule = diffDays > 2;
  const minNewDate = new Date(Date.now() + 5 * 86_400_000).toISOString().split("T")[0];

  const handleSave = async () => {
    if (!newDate || !newTime || !reason) return;
    setSaving(true);
    
    const combinedDateTime = new Date(`${newDate}T${newTime}:00`).toISOString();

    await supabase
      .from("course_sessions")
      .update({ student_booked_date: combinedDateTime })
      .eq("id", session.id);
    setSaving(false);
    setSent(true);
  };

  const formattedNewDate = newDate && newTime ? formatDateTime(new Date(`${newDate}T${newTime}:00`).toISOString()) : "[pending]";
  const waMsg = encodeURIComponent(
    `Hi Arba! I need to reschedule Session ${session.session_number} (${session.topic}).\n\nOriginal schedule: ${formatDateTime(session.student_booked_date)}\nNew requested schedule: ${formattedNewDate}\nReason: ${reason || "–"}\n\nPlease confirm. 🙏`
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#304156]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#304156]/10 bg-[#304156] shrink-0">
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="text-white" />
            <p className="font-black text-white text-base">Reschedule Session {session.session_number}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {!canReschedule && (
            <div className="bg-[#304156]/8 border border-[#304156]/15 rounded-xl px-5 py-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-[#304156] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-[#304156] mb-1">Reschedule not available</p>
                <p className="text-xs text-[#304156]/70 leading-relaxed">
                  Your session is in <strong>{diffDays} day{diffDays !== 1 ? "s" : ""}</strong>. Rescheduling requires at least <strong>H-2 (48 hours)</strong> notice. Late reschedule requests forfeit the session.
                </p>
              </div>
            </div>
          )}

          {canReschedule && !sent && (
            <>
              {/* INSTRUCTION CARD */}
              <div className="bg-[#304156]/5 border border-[#304156]/8 rounded-xl px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#304156]/60 mb-1">Current schedule</p>
                  <p className="text-sm font-black text-[#304156]">{formatDateTime(session.student_booked_date)}</p>
                </div>
                
                <div className="pt-3 border-t border-[#304156]/10 space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#F5A623] flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Mandatory Steps
                  </p>
                  <p className="text-xs text-[#304156]/70 leading-relaxed">
                    <strong>Step 1:</strong> Go to your Google Calendar and <strong>delete/cancel</strong> your previous booking.
                  </p>
                  <p className="text-xs text-[#304156]/70 leading-relaxed">
                    <strong>Step 2:</strong> Book your new slot on the official IELS Calendar.
                  </p>
                  <Link href={BOOKING_URL} target="_blank"
                    className="w-full mt-1 py-2.5 bg-[#304156]/10 hover:bg-[#304156]/20 text-[#304156] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all">
                    <Calendar size={14} /> Open Google Calendar
                  </Link>
                </div>
              </div>

              {/* INPUT FORM */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50 mb-3">
                  Step 3: Sync Your New Details
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#304156]/70 block mb-2">New Date</label>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={minNewDate}
                        className="w-full border border-[#304156]/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#304156]/40 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#304156]/70 block mb-2">New Time (WIB)</label>
                      <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                        className="w-full border border-[#304156]/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#304156]/40 bg-white" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#304156]/70 block mb-2">Reason for Rescheduling</label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. Conflict with university schedule..."
                      className="w-full border border-[#304156]/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#304156]/40 bg-white resize-none placeholder-[#304156]/30"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!newDate || !newTime || !reason || saving}
                className="w-full py-3 mt-2 bg-[#304156] hover:bg-[#1e2a38] disabled:bg-[#304156]/25 text-white rounded-xl font-black text-sm transition-all"
              >
                {saving ? "Saving…" : "Save New Schedule"}
              </button>
            </>
          )}

          {sent && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#304156]/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} className="text-[#304156]" />
              </div>
              <div>
                <p className="text-xl font-black text-[#304156] mb-2">Date updated!</p>
                <p className="text-sm text-[#304156]/60 leading-relaxed px-4">
                  Please notify Arba immediately so he can approve the change on his end.
                </p>
              </div>
              
              <Link
                href={`${MENTOR_WA}?text=${waMsg}`}
                target="_blank"
                className="w-full py-3 mt-4 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle size={16} /> Notify Arba via WhatsApp
              </Link>
              
              <button onClick={() => { onClose(); onSaved(); }} className="mt-4 text-xs font-bold text-[#304156]/50 hover:text-[#304156]">
                Return to Dashboard
              </button>
            </div>
          )}

          {!canReschedule && (
            <Link href={MENTOR_WA} target="_blank"
              className="w-full py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all">
              <MessageCircle size={14} /> Contact Arba for Emergency
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING POLICY BANNER
// ═══════════════════════════════════════════════════════════════════════════

function BookingPolicyBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#304156]/5 transition-colors">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-[#577E90]" />
          <span className="text-sm font-black text-[#304156]">📌 Booking Policy & Session Timeline</span>
        </div>
        {open ? <ChevronUp size={16} className="text-[#304156]/40" /> : <ChevronDown size={16} className="text-[#304156]/40" />}
      </button>
      {open && (
        <div className="border-t border-[#304156]/8 px-5 pb-5 pt-4 space-y-3 text-xs text-[#304156]/70 leading-relaxed">
          {[
            { tag: "D-5",      text: "Book via Google Calendar — minimum 5 days before the session." },
            { tag: "D-1",      text: "Submit your Pre-Test or pre-session assignments on the dashboard." },
            { tag: "Session",  text: "Attend the 90-minute 1-on-1 session. 20+ min late = forfeiture." },
            { tag: "D+1",      text: "Session materials and Post-Test unlock on your dashboard." },
            { tag: "D+1–D+2",  text: "Complete your Learning Journal & Session Feedback form." },
            { tag: "D+3",      text: "Mentor releases your evaluation score and written feedback." },
            { tag: "D+5",      text: "You may book the next session once all post-work is submitted." },
          ].map(r => (
            <div key={r.tag} className="flex items-start gap-3">
              <span className="text-[10px] font-black text-white bg-[#304156] px-2 py-1 rounded-md shrink-0 min-w-[50px] text-center">{r.tag}</span>
              <span className="pt-0.5">{r.text}</span>
            </div>
          ))}
          <p className="pt-2 text-[#304156]/60">
            <strong className="text-[#304156]">Reschedule:</strong> H-2 (48 hrs) minimum. Late = session forfeited.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT GATE
// ═══════════════════════════════════════════════════════════════════════════

function ContractGate({ enrollment, onSigned }: { enrollment: CourseEnrollment; onSigned: () => void }) {
  const [link, setLink]       = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSubmit = async () => {
    if (!link.trim()) return;
    setLoading(true);
    await supabase.from("course_enrollments")
      .update({ contract_signed: true, contract_url: link.trim() })
      .eq("id", enrollment.id);
    setLoading(false);
    onSigned();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/15 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#304156]" />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
            <AlertCircle size={20} className="text-[#304156]" />
          </div>
          <div>
            <p className="text-base font-black text-[#304156] mb-1">Action Required: Sign Your Learning Contract</p>
            <p className="text-xs text-[#304156]/60 leading-relaxed">
              Your curriculum is locked until you submit a signed student agreement. This ensures mutual commitment to your learning journey.
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { n: 1, title: "Open the contract template", sub: null, link: { label: "Open Google Docs Template", href: CONTRACT_TEMPLATE } },
            { n: 2, title: "Make a copy & sign", sub: "Click File → Make a copy. Fill your details and type your full name in the signature field.", link: null },
            { n: 3, title: "Paste your link below or email the PDF", sub: null, link: null },
          ].map(s => (
            <div key={s.n} className="bg-[#304156]/4 border border-[#304156]/8 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-6 h-6 rounded-full bg-[#304156] text-white text-[10px] font-black flex items-center justify-center shrink-0">{s.n}</span>
                <p className="text-sm font-black text-[#304156]">{s.title}</p>
              </div>
              {s.sub && <p className="text-xs text-[#304156]/60 ml-9">{s.sub}</p>}
              {s.link && (
                <Link href={s.link.href} target="_blank"
                  className="ml-9 inline-flex items-center gap-2 text-xs font-bold text-[#577E90] hover:underline">
                  <ExternalLink size={12} /> {s.link.label}
                </Link>
              )}
              {s.n === 3 && (
                <div className="ml-9 flex items-center gap-3 mt-2">
                  <div className="flex-1 flex items-center gap-2 bg-[#304156]/5 border border-[#304156]/10 rounded-lg px-3 py-2">
                    <FileText size={14} className="text-[#577E90] shrink-0" />
                    <span className="text-xs text-[#304156]/60 truncate">{CONTRACT_EMAIL}</span>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(CONTRACT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="px-3 py-2 bg-[#304156]/8 hover:bg-[#304156]/15 rounded-lg text-xs font-bold text-[#304156] flex items-center gap-1.5 transition-all">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <input type="url" placeholder="Paste your signed Google Docs link here…"
            value={link} onChange={e => setLink(e.target.value)}
            className="flex-1 border border-[#304156]/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#304156]/40 bg-white placeholder-[#304156]/30" />
          <button onClick={handleSubmit} disabled={!link.trim() || loading}
            className="px-5 py-3 bg-[#304156] hover:bg-[#1e2a38] disabled:bg-[#304156]/25 text-white rounded-xl font-black text-sm transition-all whitespace-nowrap">
            {loading ? "Submitting…" : "Submit Contract"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION CARD
// ═══════════════════════════════════════════════════════════════════════════

function SessionCard({
  session,
  idx,
  allSessions,
  onRefresh,
  onOpenReschedule,
  onOpenBooking
}: {
  session: CourseSession;
  idx: number;
  allSessions: CourseSession[];
  onRefresh: () => void;
  onOpenReschedule: (session: CourseSession) => void;
  onOpenBooking: (session: CourseSession) => void;
}) {
  const [expanded, setExpanded]         = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const done       = isSessionCompleted(session);
  const booked     = !!session.student_booked_date;
  const prevSession = idx > 0 ? allSessions[idx - 1] : null;
  const prevCompleted = !prevSession || isSessionCompleted(prevSession);
  const unlocked   = prevCompleted;

  const markSubmitted = async (type: "journal" | "feedback") => {
    await supabase.from("course_sessions")
      .update(type === "journal" ? { journal_submitted: true } : { feedback_submitted: true })
      .eq("id", session.id);
    onRefresh();
  };

  const waBookMsg = (date: string) => encodeURIComponent(
    `Hi Arba! I've booked Session ${session.session_number} (${session.topic}) for ${date}. Please confirm 🙏`
  );

  const ResourceRow = () => (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50 mb-3">Session Resources</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pre-Test",  href: session.pre_test_url,  Icon: PenTool },
          { label: "Materials", href: session.task_url,       Icon: Download },
          { label: "Post-Test", href: session.post_test_url,  Icon: ClipboardCheck },
        ].map(r => (
          r.href ? (
            <Link key={r.label} href={r.href} target="_blank"
              className="flex flex-col items-center gap-2 p-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl text-[10px] font-black transition-all">
              <r.Icon size={16} /> {r.label}
            </Link>
          ) : (
            <div key={r.label}
              className="flex flex-col items-center gap-2 p-3 bg-[#304156]/6 text-[#304156]/30 rounded-xl text-[10px] font-black cursor-not-allowed">
              <r.Icon size={16} /> {r.label}
            </div>
          )
        ))}
      </div>
    </div>
  );

  // ── LOCKED (prev not done) ────────────────────────────────────────────────
  if (!unlocked) return (
    <div className="flex items-center gap-4 bg-[#304156]/4 rounded-2xl border border-[#304156]/6 px-5 py-4 opacity-50">
      <div className="w-8 h-8 rounded-full bg-[#304156]/10 flex items-center justify-center shrink-0">
        <Lock size={14} className="text-[#304156]/50" />
      </div>
      <div>
        <p className="text-sm font-black text-[#304156]/60 mb-0.5">Session {session.session_number} · {session.topic || "Topic TBA"}</p>
        <p className="text-xs text-[#304156]/40">Unlocks after completing Session {idx}.</p>
      </div>
    </div>
  );

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (done) {
    const allPostDone = session.journal_submitted && session.feedback_submitted;
    return (
      <div className="bg-white rounded-2xl border border-[#304156]/15 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#577E90]" />
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-[#304156]/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#304156] flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#577E90]">Completed · {formatDateOnly(session.student_booked_date)}</span>
              {!allPostDone && (
                <span className="text-[10px] font-black text-white bg-[#304156] px-2.5 py-1 rounded-md">Action needed</span>
              )}
            </div>
            <p className="text-base font-black text-[#304156] truncate">Session {session.session_number} · {session.topic}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {session.mentor_score !== null && (
              <div className="text-center">
                <div className="text-lg font-black text-[#304156]">{session.mentor_score}</div>
                <div className="text-[9px] text-[#304156]/50 uppercase tracking-widest mt-0.5">Score</div>
              </div>
            )}
            {expanded ? <ChevronUp size={18} className="text-[#304156]/40" /> : <ChevronDown size={18} className="text-[#304156]/40" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-[#304156]/10 px-6 py-5 space-y-5">
            {(session.mentor_score !== null || session.mentor_feedback) && (
              <div className="bg-[#304156]/4 rounded-xl p-5 border border-[#304156]/8">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={14} className="text-[#577E90]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/70">Mentor Evaluation</p>
                </div>
                <div className="flex gap-5">
                  {session.mentor_score !== null && (
                    <div className="text-center shrink-0 pr-5 border-r border-[#304156]/10">
                      <p className="text-4xl font-black text-[#304156]">{session.mentor_score}</p>
                      <p className="text-[10px] font-bold text-[#304156]/50 mt-1 uppercase tracking-widest">Score</p>
                    </div>
                  )}
                  {session.mentor_feedback && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-2">Detailed Feedback</p>
                      <p className="text-sm text-[#304156]/80 leading-relaxed whitespace-pre-wrap">{session.mentor_feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <ResourceRow />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50 mb-3">📝 Post-Session Requirements</p>
              <div className="space-y-3">
                {[
                  { key: "journal"  as const, label: "Learning Journal", sub: session.journal_submitted ? "Submitted ✓" : "Required to unlock next session", done: session.journal_submitted, formHref: `${JOURNAL_FORM_BASE}?entry.session=${session.session_number}`, btnLabel: "Fill Journal" },
                  { key: "feedback" as const, label: "Session Feedback",  sub: session.feedback_submitted ? "Submitted ✓" : "Help us improve your experience",  done: session.feedback_submitted, formHref: `${FEEDBACK_FORM_BASE}?entry.session=${session.session_number}`, btnLabel: "Give Feedback" },
                ].map(item => (
                  <div key={item.key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${item.done ? "bg-[#304156]/5 border-[#304156]/10" : "bg-[#304156]/4 border-[#304156]/15"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-[#304156]" : "bg-[#304156]/20"}`}>
                        {item.done ? <Check size={14} className="text-white" /> : <span className="text-[#304156] text-xs font-black">!</span>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#304156] mb-0.5">{item.label}</p>
                        <p className="text-xs text-[#304156]/60">{item.sub}</p>
                      </div>
                    </div>
                    {!item.done && (
                      <div className="flex gap-2">
                        <Link href={item.formHref} target="_blank"
                          className="px-4 py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-lg text-xs font-black transition-all">
                          {item.btnLabel}
                        </Link>
                        <button onClick={() => markSubmitted(item.key)}
                          className="px-4 py-3 bg-[#304156]/10 hover:bg-[#304156]/20 text-[#304156] rounded-lg text-xs font-bold transition-all">
                          Mark Done
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── BOOKED — waiting for mentor feedback ──────────────────────────────────
  if (booked) {
    const bookedDate = new Date(session.student_booked_date!);
    const daysLeft   = Math.ceil((bookedDate.getTime() - Date.now()) / 86_400_000);
    const canStillReschedule = daysLeft > 2;

    return (
      <div className="bg-white rounded-2xl border border-[#577E90]/30 shadow-sm overflow-hidden">
        <div className="h-1 bg-[#577E90]" />
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-[#304156]/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#577E90] flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-1">
              Scheduled · {formatDateTime(session.student_booked_date)}
              {daysLeft > 0 && <span className="ml-2 text-[#304156]/50">({daysLeft}d away)</span>}
            </p>
            <p className="text-base font-black text-[#304156] truncate">Session {session.session_number} · {session.topic}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onOpenReschedule(session); }}
              className={`px-3 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                canStillReschedule
                  ? "bg-[#304156]/10 hover:bg-[#304156]/20 text-[#304156]"
                  : "bg-[#304156]/5 text-[#304156]/40 cursor-not-allowed"
              }`}
              title={canStillReschedule ? "Reschedule this session" : "Reschedule window closed (H-2 passed)"}
            >
              <RefreshCw size={12} />
              {canStillReschedule ? "Reschedule" : "No Reschedule"}
            </button>
            {expanded ? <ChevronUp size={18} className="text-[#304156]/40" /> : <ChevronDown size={18} className="text-[#304156]/40" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-[#304156]/10 px-6 py-5 space-y-5">
            {session.pre_test_url && (
              <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/60 mb-2.5">📝 D-1 Task — Complete Before Session</p>
                <Link href={session.pre_test_url} target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl text-xs font-black transition-all">
                  <PenTool size={14} /> Open Pre-Test
                </Link>
              </div>
            )}
            <div className="bg-[#304156]/4 border border-[#304156]/10 rounded-xl px-5 py-4 flex items-center gap-3">
              <Lock size={16} className="text-[#304156]/50 shrink-0" />
              <p className="text-xs text-[#304156]/60 leading-relaxed">
                Session materials, recordings, and Post-Test unlock on your dashboard the day after you attend (<strong>D+1</strong>).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#577E90]/10 border border-[#577E90]/20 rounded-xl px-5 py-4">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-[#577E90] shrink-0" />
                <p className="text-xs font-bold text-[#304156]/70">Scheduled. Waiting for mentor to release feedback and score after the session.</p>
              </div>
              <Link href={`${MENTOR_WA}?text=${waBookMsg(formatDateTime(session.student_booked_date!))}`} target="_blank"
                className="shrink-0 px-4 py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap">
                <MessageCircle size={14} /> Notify Arba
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── NOT BOOKED ────────────────────────────────────────────────────────────
  const postWorkGate = prevSession && isSessionCompleted(prevSession) && !canUnlockNext(prevSession);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${postWorkGate ? "border-[#304156]/15" : "border-[#304156]/25"}`}>
      <div className={`h-1 ${postWorkGate ? "bg-[#304156]/30" : "bg-[#304156]"}`} />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            postWorkGate ? "bg-[#304156]/10 opacity-60" : "bg-[#304156]/10 ring-2 ring-[#304156]/20"
          }`}>
            {postWorkGate
              ? <Lock size={16} className="text-[#304156]/50" />
              : <span className="text-sm font-black text-[#304156]">{session.session_number}</span>}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50 mb-1">
              {postWorkGate ? "🔒 Complete previous post-work first" : "🎯 Up Next — Book This Session"}
            </p>
            <p className={`text-base font-black ${postWorkGate ? "text-[#304156]/50" : "text-[#304156]"}`}>
              Session {session.session_number} · {session.topic || "Topic TBA"}
            </p>
          </div>
        </div>

        {postWorkGate ? (
          <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-xl px-5 py-4 text-center">
            <p className="text-xs font-bold text-[#304156]/60 leading-relaxed">
              Submit your <strong>Learning Journal</strong>, <strong>Post-Test</strong>, and <strong>Feedback Form</strong> for Session {idx} before booking this session.
            </p>
          </div>
        ) : (
          <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-xl p-5 text-center space-y-4">
            <p className="text-xs text-[#304156]/60 leading-relaxed">
              Click below to select your desired schedule for this session. Make sure to book via Google Calendar first!
            </p>
            <button onClick={() => onOpenBooking(session)}
              className="w-full py-3 bg-[#577E90] hover:bg-[#304156] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all">
              <Calendar size={16} /> Input Booking Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE COURSE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

function ActiveCourseSummary({
  enrollment,
  onViewContract,
  onBookAction,
}: {
  enrollment: CourseEnrollment;
  onViewContract: () => void;
  onBookAction: (enrollment: CourseEnrollment) => void;
}) {
  const completedCount = enrollment.sessions.filter(isSessionCompleted).length;
  const progressPct    = Math.round((completedCount / enrollment.total_sessions) * 100);

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/15 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#304156]" />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-[#304156] leading-tight mb-1">{enrollment.course_name}</h3>
            <p className="text-xs font-bold text-[#577E90]">Started {formatDateOnly(enrollment.created_at)}</p>
          </div>
          <div className="text-center shrink-0">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" fill="none" stroke="#F0F2F5" strokeWidth="4" />
                <circle cx="24" cy="24" r="19" fill="none" stroke="#304156" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 19}`}
                  strokeDashoffset={`${2 * Math.PI * 19 * (1 - progressPct / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-xs text-[#304156]">{progressPct}%</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-[#304156]/50 mt-1">{completedCount}/{enrollment.total_sessions} Done</p>
          </div>
        </div>

        <div className="h-2 bg-[#304156]/10 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-[#304156] rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {Array.from({ length: enrollment.total_sessions }, (_, i) => {
            const s      = enrollment.sessions[i];
            const isDone = s && isSessionCompleted(s);
            const isBook = s && !!s.student_booked_date && !isDone;
            const isNext = !isDone && !isBook && (i === 0 || (enrollment.sessions[i - 1] && isSessionCompleted(enrollment.sessions[i - 1])));
            return (
              <div key={i} title={`Session ${i + 1}${s?.topic ? ` · ${s.topic}` : ""}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black select-none transition-all
                  ${isDone ? "bg-[#304156] text-white" : isBook ? "bg-[#577E90] text-white" : isNext ? "bg-white text-[#304156] ring-2 ring-[#304156] ring-offset-2" : "bg-[#304156]/10 text-[#304156]/30"}`}>
                {isDone ? "✓" : i + 1}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onBookAction(enrollment)}
            className="py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all">
            <Calendar size={14} /> Book Session
          </button>
          <Link href={MENTOR_WA} target="_blank"
            className="py-3 bg-[#304156]/10 hover:bg-[#304156]/20 text-[#304156] rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all">
            <MessageCircle size={14} /> Contact Arba
          </Link>
          {enrollment.contract_signed && (
            <button onClick={onViewContract}
              className="col-span-2 py-3 bg-[#304156]/5 hover:bg-[#304156]/10 text-[#304156]/70 hover:text-[#304156] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-[#304156]/10">
              <ScrollText size={14} /> Check Guidelines & Learning Contract
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ userName }: { userName: string }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#304156] px-6 pt-12 pb-24 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 55%)" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <GraduationCap size={14} /> Private Mentorship
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            Hi {userName.split(" ")[0]},<br />
            <span className="text-[#577E90]">master English with IELS.</span>
          </h1>
          <p className="text-white/60 text-base max-w-lg leading-relaxed mt-4">
            Personalized 1-on-1 sessions, a curriculum built around your specific goals, and detailed feedback after every class.
          </p>
          <div className="flex flex-wrap gap-8 mt-8">
            {[
              { v: "1-on-1",  l: "Private Sessions" },
              { v: "Rp 90K",  l: "Per Session" },
              { v: "H-5",     l: "Booking Rule" },
              { v: "✓ Cert",  l: "On Completion" },
            ].map(s => (
              <div key={s.l}>
                <p className="font-black text-xl mb-1">{s.v}</p>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20 pb-20 space-y-6">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { sessions: 4,  label: "Quick Start", feats: ["4 private 1-on-1 sessions", "Personalized curriculum", "Pre & post-tests", "IELS Lounge access"] },
            { sessions: 8,  label: "Intensive",   feats: ["8 private 1-on-1 sessions", "Deep curriculum mapping", "Pre & post-tests", "Mentor score + feedback", "Verified certificate"] },
            { sessions: 21, label: "Extensive",   feats: ["21 private 1-on-1 sessions", "Complete master curriculum", "All 21 targeted topics", "Priority mentor support", "Premium certificate"] },
          ].map(pkg => (
            <div key={pkg.sessions} className="bg-white rounded-2xl border border-[#304156]/15 shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all">
              <div className="h-1 bg-[#304156]" />
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#577E90] mb-1">{pkg.label}</p>
                <p className="font-black text-[#304156] text-2xl mb-1">{pkg.sessions} Sessions</p>
                <p className="text-2xl font-black text-[#304156] mb-5 opacity-80">{formatIDR(pkg.sessions * SESSION_PRICE)}</p>
                <ul className="space-y-2.5 text-xs text-[#304156]/70 mb-6 flex-1">
                  {pkg.feats.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-[#577E90] shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href={PRODUCTS_URL} target="_blank"
                  className="py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all">
                  View Details <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#304156] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1">
            <p className="font-black text-lg">Ready to enroll?</p>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">Register via Google Form. After payment, your syllabus and contract unlock here.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <Link href={PRODUCTS_URL} target="_blank"
              className="px-6 py-3 bg-white text-[#304156] rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
              View Packages <ArrowRight size={14} />
            </Link>
            <Link href={MENTOR_WA} target="_blank"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 border border-white/20 transition-all">
              <MessageCircle size={14} /> Ask Arba
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function CoursesPage() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [userData, setUserData]               = useState({ id: "", name: "Member", avatar: "", tier: "explorer" as UserTier });
  const [loading, setLoading]                 = useState(true);
  const [enrollments, setEnrollments]         = useState<CourseEnrollment[]>([]);
  
  // Custom Alert Modal state
  const [alertConfig, setAlertConfig]         = useState<AlertConfig | null>(null);

  // Modals state
  const [contractEnrollment, setContractEnr]  = useState<CourseEnrollment | null>(null);
  const [rescheduleSession, setRescheduleSession] = useState<CourseSession | null>(null);
  const [bookingSession, setBookingSession]   = useState<CourseSession | null>(null);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/sign-in"); return; }

    const [{ data: dbUser }, { data: membership }, { data: dbEnrollments }] = await Promise.all([
      supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("memberships").select("tier").eq("user_id", user.id).maybeSingle(),
      supabase.from("course_enrollments").select("*, course_sessions(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const tier = membership?.tier === "visionary" || membership?.tier === "premium" ? "visionary"
               : membership?.tier === "pro" ? "insider" : "explorer";

    setUserData({
      id:     user.id,
      name:   dbUser?.full_name || user.user_metadata?.full_name || "Member",
      avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || "",
      tier,
    });

    if (dbEnrollments) {
      setEnrollments(dbEnrollments.map((e: any) => ({
        ...e,
        sessions: (e.course_sessions ?? []).sort((a: any, b: any) => a.session_number - b.session_number),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const { active, completed } = useMemo(() => ({
    active:    enrollments.filter(e => e.status === "active"),
    completed: enrollments.filter(e => e.status === "completed"),
  }), [enrollments]);

  // Handler for global "Book" clicks
  const handleGlobalBookAction = (enrollment: CourseEnrollment) => {
    if (!enrollment.contract_signed) {
      setAlertConfig({
        type: "warning",
        title: "Contract Required",
        message: "Action required: Please sign and submit your Learning Contract first before booking a session.",
      });
    } else {
      window.open(BOOKING_URL, '_blank');
    }
  };

  if (loading) return (
    <DashboardLayout userTier="explorer" userName="Loading…" userAvatar="">
      <div className="p-8 space-y-5 animate-pulse max-w-4xl mx-auto">
        <div className="h-48 bg-[#304156]/10 rounded-3xl" />
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#304156]/8 rounded-2xl" />)}</div>
        <div className="h-72 bg-[#304156]/8 rounded-2xl" />
      </div>
    </DashboardLayout>
  );

  if (!enrollments.length) return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <EmptyState userName={userData.name} />
    </DashboardLayout>
  );

  return (
    <>
      <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
        <div className="min-h-screen bg-[#F7F8FA]">
          {/* Header */}
          <div className="bg-[#304156] px-6 pt-12 pb-20 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, #ffffff 0%, transparent 50%)" }} />
            <div className="max-w-4xl mx-auto relative z-10">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-widest mb-5">
                <GraduationCap size={14} /> My Learning Hub
              </span>
              <h1 className="text-3xl md:text-4xl font-black mb-2">Hi {userData.name.split(" ")[0]} 👋</h1>
              <p className="text-white/60 text-base">
                {active.length > 0 ? `${active.length} active course${active.length > 1 ? "s" : ""} — keep consistent!` : "All courses completed. Well done! 🎓"}
              </p>
              <div className="flex items-center gap-6 mt-6 flex-wrap">
                {[
                  { v: enrollments.length, l: "Enrolled" },
                  { v: active.length,      l: "Active" },
                  { v: enrollments.reduce((a, e) => a + e.sessions.filter(isSessionCompleted).length, 0), l: "Sessions Done" },
                  { v: completed.length,   l: "Completed" },
                ].map(s => (
                  <div key={s.l} className="flex items-center gap-2">
                    <span className="font-black text-2xl">{s.v}</span>
                    <span className="text-white/50 text-xs font-bold uppercase tracking-wide">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-10 pb-20 space-y-12">
            {active.map(enrollment => (
              <div key={enrollment.id} className="space-y-5">
                <ActiveCourseSummary 
                  enrollment={enrollment} 
                  onViewContract={() => setContractEnr(enrollment)} 
                  onBookAction={handleGlobalBookAction}
                />

                {!enrollment.contract_signed && (
                  <ContractGate 
                    enrollment={enrollment} 
                    onSigned={() => {
                      fetchAll();
                      setAlertConfig({
                        type: "success",
                        title: "Contract Submitted!",
                        message: "Awesome! Your curriculum is now unlocked. You can now start booking your sessions."
                      });
                    }} 
                  />
                )}

                {enrollment.contract_signed && (
                  <>
                    <BookingPolicyBanner />

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50">
                        📚 Your Syllabus — {enrollment.total_sessions} Sessions
                      </p>
                      {enrollment.sessions.map((session, idx) => (
                        <SessionCard 
                          key={session.id} 
                          session={session} 
                          idx={idx} 
                          allSessions={enrollment.sessions} 
                          onRefresh={fetchAll}
                          onOpenReschedule={(s) => setRescheduleSession(s)}
                          onOpenBooking={(s) => setBookingSession(s)}
                        />
                      ))}
                      {enrollment.sessions.length < enrollment.total_sessions && (
                        <div className="bg-[#304156]/5 rounded-2xl border border-[#304156]/10 p-5 text-center">
                          <p className="text-sm font-bold text-[#304156]/50">
                            {enrollment.total_sessions - enrollment.sessions.length} more session{enrollment.total_sessions - enrollment.sessions.length > 1 ? "s" : ""} will appear once your mentor adds them.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="bg-[#304156] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-5">
                  <div className="flex-1">
                    <p className="font-black text-base">Need to book or reschedule?</p>
                    <p className="text-white/60 text-xs mt-1 leading-relaxed">Google Calendar · Confirm with Arba · Min H-5 · Reschedule H-2</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
                    <button onClick={() => handleGlobalBookAction(enrollment)}
                      className="px-6 py-3 bg-white text-[#304156] rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                      <Calendar size={14} /> Book Now
                    </button>
                    <Link href={MENTOR_WA} target="_blank"
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 border border-white/20 transition-all">
                      <MessageCircle size={14} /> WhatsApp
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {completed.length > 0 && (
              <section className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#304156]/50 flex items-center gap-2">
                  <Award size={14} /> Completed
                </p>
                {completed.map(enrollment => (
                  <div key={enrollment.id} className="bg-white rounded-2xl border border-[#304156]/10 shadow-sm p-5 flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-[#304156]/10 flex items-center justify-center shrink-0">
                      <GraduationCap size={20} className="text-[#304156]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#304156] text-base truncate mb-1">{enrollment.course_name}</p>
                      <p className="text-xs font-bold text-[#577E90]">
                        {enrollment.sessions.filter(isSessionCompleted).length} sessions · {formatDateOnly(enrollment.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {enrollment.contract_url && (
                        <button onClick={() => setContractEnr(enrollment)}
                          className="p-2 bg-[#304156]/10 hover:bg-[#304156]/20 rounded-lg transition-all" title="View contract">
                          <ScrollText size={16} className="text-[#304156]" />
                        </button>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md bg-[#304156]/10 text-[#304156] border border-[#304156]/15">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </DashboardLayout>

      {/* Render Modals OUTSIDE DashboardLayout to bypass internal stacking contexts */}
      {alertConfig && (
        <IelsAlertModal config={alertConfig} onClose={() => setAlertConfig(null)} />
      )}

      {contractEnrollment && (
        <LearningContractModal enrollment={contractEnrollment} onClose={() => setContractEnr(null)} />
      )}
      
      {rescheduleSession && (
        <RescheduleModal session={rescheduleSession} onClose={() => setRescheduleSession(null)} onSaved={() => { setRescheduleSession(null); fetchAll(); }} />
      )}

      {bookingSession && (
        <BookingModal 
          session={bookingSession} 
          onClose={() => setBookingSession(null)} 
          onSaved={() => { 
            setBookingSession(null); 
            fetchAll(); 
            setAlertConfig({
              type: "success",
              title: "Booking Successful!",
              message: "Your session is securely locked in. Please check your email for the Google Calendar invite and reminders."
            });
          }} 
        />
      )}
    </>
  );
}
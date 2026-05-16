"use client";
// src/app/dashboard/learning/courses/page.tsx

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CurriculumModal from "@/components/courses/CurriculumModal";
import {
  MENTORS, COURSE_PACKAGES, TRACK_META, GOOGLE_FORM_URL,
  CourseTrack, PRICE_PER_SESSION,
} from "@/data/courses";
import {
  BookOpen, Award, CheckCircle2, Calendar, ArrowRight,
  GraduationCap, MessageCircle, Clock, Lock, AlertCircle,
  ExternalLink, ChevronDown, ChevronUp,
  FileText, ClipboardCheck, Download, PenTool,
  Star, Copy, Check,
} from "lucide-react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const BOOKING_URL       = "https://calendar.app.google/EjfzbJCDbM4QDosC7";
const MENTOR_WA         = "https://wa.me/6288297253491";
const PRODUCTS_URL      = "https://ielsco.com/products/courses";
const CONTRACT_TEMPLATE = "https://docs.google.com/document/d/1_PLACEHOLDER/copy";
const CONTRACT_EMAIL    = "course@ielsco.com";

// ─── TYPES ───────────────────────────────────────────────────────────────────

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

// ─── UTILS ───────────────────────────────────────────────────────────────────

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isSessionCompleted(s: CourseSession) {
  return !!s.mentor_feedback || s.mentor_score !== null;
}

// ─── BOOKING POLICY BANNER ────────────────────────────────────────────────────

function BookingPolicyBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-[#577E90]" />
          <span className="text-xs font-black text-[#304156]">📌 Class Booking Policy</span>
        </div>
        {open
          ? <ChevronUp size={13} className="text-[#304156]/40" />
          : <ChevronDown size={13} className="text-[#304156]/40" />}
      </button>
      {open && (
        <div className="border-t border-[#304156]/8 px-4 pb-4 pt-3 space-y-1.5 text-xs text-[#304156]/70">
          <p><strong className="text-[#304156]">H-3 Rule:</strong> Book at least 3 days before your session.</p>
          <p><strong className="text-[#304156]">Confirm:</strong> After booking, notify Arba on WhatsApp at{" "}
            <Link href={MENTOR_WA} target="_blank" className="text-[#577E90] font-bold">088297253491</Link>.
          </p>
          <p><strong className="text-[#304156]">Reschedule:</strong> Must be requested at least 24 hours in advance.</p>
          <p><strong className="text-[#304156]">No-show:</strong> Missing without notice may count toward your session tally.</p>
        </div>
      )}
    </div>
  );
}

// ─── CONTRACT GATE ────────────────────────────────────────────────────────────

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
    await supabase
      .from("course_enrollments")
      .update({ contract_signed: true, contract_url: link.trim() })
      .eq("id", enrollment.id);
    setLoading(false);
    onSigned();
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(CONTRACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/15 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#304156]" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-[#304156]" />
          </div>
          <div>
            <p className="font-black text-[#304156]">Action Required: Sign Your Contract</p>
            <p className="text-[10px] text-[#304156]/50 mt-0.5">
              Your syllabus is locked until you submit a signed copy of the student agreement.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          {/* Step 1 */}
          <div className="bg-[#304156]/4 border border-[#304156]/8 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#304156] text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
              <p className="text-xs font-black text-[#304156]">Open the contract template</p>
            </div>
            <Link href={CONTRACT_TEMPLATE} target="_blank"
              className="ml-7 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#577E90] hover:underline">
              <ExternalLink size={9} /> Open Google Docs Template
            </Link>
          </div>
          {/* Step 2 */}
          <div className="bg-[#304156]/4 border border-[#304156]/8 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#304156] text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
              <p className="text-xs font-black text-[#304156]">Make a copy — fill in your details & sign</p>
            </div>
            <p className="text-[10px] text-[#304156]/50 ml-7">File → Make a copy. Type your full name in the signature field.</p>
          </div>
          {/* Step 3 */}
          <div className="bg-[#304156]/4 border border-[#304156]/8 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#304156] text-white text-[9px] font-black flex items-center justify-center shrink-0">3</span>
              <p className="text-xs font-black text-[#304156]">Paste your Google Docs link below</p>
            </div>
            <div className="ml-7 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-[#304156]/5 border border-[#304156]/10 rounded-lg px-2.5 py-1.5">
                <FileText size={10} className="text-[#577E90] shrink-0" />
                <span className="text-[10px] text-[#304156]/50 truncate">{CONTRACT_EMAIL}</span>
              </div>
              <button onClick={copyEmail}
                className="px-2.5 py-1.5 bg-[#304156]/8 hover:bg-[#304156]/15 rounded-lg text-[10px] font-bold text-[#304156] flex items-center gap-1 transition-all">
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[10px] text-[#304156]/35 ml-7 mt-1.5">Or email the PDF to the address above.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste your signed Google Docs link here…"
            value={link}
            onChange={e => setLink(e.target.value)}
            className="flex-1 border border-[#304156]/15 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#304156]/40 bg-white placeholder-[#304156]/25"
          />
          <button
            onClick={handleSubmit}
            disabled={!link.trim() || loading}
            className="px-4 py-2.5 bg-[#304156] hover:bg-[#1e2a38] disabled:bg-[#304156]/25 text-white rounded-xl font-black text-xs transition-all whitespace-nowrap"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  idx,
  allSessions,
  onRefresh,
}: {
  session: CourseSession;
  idx: number;
  allSessions: CourseSession[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [dateInput, setDateInput] = useState(session.student_booked_date ?? "");
  const [saving, setSaving]       = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const done      = isSessionCompleted(session);
  const booked    = !!session.student_booked_date;
  const prevDone  = idx === 0 || isSessionCompleted(allSessions[idx - 1]);
  const unlocked  = prevDone;

  const saveDate = async () => {
    if (!dateInput) return;
    setSaving(true);
    await supabase.from("course_sessions").update({ student_booked_date: dateInput }).eq("id", session.id);
    setSaving(false);
    onRefresh();
  };

  const waMsg = (date: string) => encodeURIComponent(
    `Hi Arba! I've booked Session ${session.session_number} (${session.topic}) for ${date}. Please confirm 🙏`
  );

  const ResourceGrid = ({ prefix = "" }: { prefix?: string }) => (
    <div className="grid grid-cols-3 gap-2">
      {([
        { label: "Pre-Test",  href: session.pre_test_url,  Icon: PenTool },
        { label: "Materials", href: session.task_url,       Icon: Download },
        { label: "Post-Test", href: session.post_test_url,  Icon: ClipboardCheck },
      ] as const).map(r => (
        r.href ? (
          <Link key={r.label} href={r.href} target="_blank"
            className="flex flex-col items-center gap-1.5 p-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl text-[9px] font-black transition-all">
            <r.Icon size={14} />
            {r.label}
          </Link>
        ) : (
          <div key={r.label}
            className="flex flex-col items-center gap-1.5 p-2.5 bg-[#304156]/6 text-[#304156]/25 rounded-xl text-[9px] font-black cursor-not-allowed">
            <r.Icon size={14} />
            {r.label}
          </div>
        )
      ))}
    </div>
  );

  // ── LOCKED ────────────────────────────────────────────────────────────────
  if (!unlocked) return (
    <div className="flex items-center gap-3 bg-[#304156]/4 rounded-2xl border border-[#304156]/6 px-4 py-3.5 opacity-45">
      <div className="w-7 h-7 rounded-full bg-[#304156]/10 flex items-center justify-center shrink-0">
        <Lock size={11} className="text-[#304156]/40" />
      </div>
      <div>
        <p className="text-xs font-black text-[#304156]/50">Session {session.session_number} · {session.topic || "Topic TBA"}</p>
        <p className="text-[10px] text-[#304156]/30">Unlocks after completing the previous session.</p>
      </div>
    </div>
  );

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (done) return (
    <div className="bg-white rounded-2xl border border-[#304156]/12 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#577E90]" />
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className="w-8 h-8 rounded-full bg-[#304156] flex items-center justify-center shrink-0">
          <CheckCircle2 size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-0.5">
            Completed · {formatDate(session.student_booked_date)}
          </p>
          <p className="text-sm font-black text-[#304156] truncate">
            Session {session.session_number} · {session.topic}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.mentor_score !== null && (
            <span className="text-sm font-black text-[#304156] bg-[#304156]/8 px-2.5 py-1 rounded-lg">
              {session.mentor_score}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-[#304156]/40" /> : <ChevronDown size={14} className="text-[#304156]/40" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[#304156]/8 px-5 py-4 space-y-4">
          {(session.mentor_score !== null || session.mentor_feedback) && (
            <div className="flex gap-5">
              {session.mentor_score !== null && (
                <div className="text-center shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#304156]/40 mb-1">Score</p>
                  <p className="text-3xl font-black text-[#304156]">{session.mentor_score}</p>
                </div>
              )}
              {session.mentor_feedback && (
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-1.5">
                    <Star size={9} className="inline mr-1" /> Mentor Feedback
                  </p>
                  <p className="text-xs text-[#304156]/75 leading-relaxed whitespace-pre-wrap">{session.mentor_feedback}</p>
                </div>
              )}
            </div>
          )}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#304156]/40 mb-2">Session Resources</p>
            <ResourceGrid />
          </div>
        </div>
      )}
    </div>
  );

  // ── BOOKED — waiting for mentor feedback ──────────────────────────────────
  if (booked) return (
    <div className="bg-white rounded-2xl border border-[#577E90]/20 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#577E90]" />
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className="w-8 h-8 rounded-full bg-[#577E90] flex items-center justify-center shrink-0">
          <Calendar size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-0.5">
            Scheduled · {formatDate(session.student_booked_date)}
          </p>
          <p className="text-sm font-black text-[#304156] truncate">
            Session {session.session_number} · {session.topic}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#304156]/40" /> : <ChevronDown size={14} className="text-[#304156]/40" />}
      </button>
      {expanded && (
        <div className="border-t border-[#304156]/8 px-5 py-4 space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#304156]/40 mb-2">Available Resources</p>
            <ResourceGrid />
          </div>
          <div className="flex items-center justify-between gap-3 bg-[#577E90]/8 border border-[#577E90]/15 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-[#577E90] shrink-0" />
              <p className="text-[10px] text-[#304156]/65">Scheduled. Waiting for mentor to release feedback and score.</p>
            </div>
            <Link href={`${MENTOR_WA}?text=${waMsg(session.student_booked_date!)}`} target="_blank"
              className="shrink-0 px-3 py-1.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap">
              <MessageCircle size={10} /> Notify Arba
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  // ── NOT BOOKED — student needs to book ────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-[#304156]/20 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#304156]" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#304156]/10 ring-2 ring-[#304156]/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-[#304156]">{session.session_number}</span>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#304156]/40 mb-0.5">Up Next — Book This Session</p>
            <p className="text-sm font-black text-[#304156]">Session {session.session_number} · {session.topic || "Topic TBA"}</p>
          </div>
        </div>

        <div className="bg-[#304156]/4 border border-[#304156]/8 rounded-xl p-4 space-y-3">
          <p className="text-[10px] text-[#304156]/55 leading-relaxed">
            1. Pick a date from Google Calendar (H-3 minimum) → 2. Enter date below → 3. Notify Arba on WhatsApp.
          </p>
          <div className="flex gap-2">
            <Link href={BOOKING_URL} target="_blank"
              className="px-3 py-2 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap">
              <Calendar size={11} /> Open Calendar
            </Link>
            <input
              type="date"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              min={new Date(Date.now() + 3 * 86_400_000).toISOString().split("T")[0]}
              className="flex-1 border border-[#304156]/15 rounded-lg px-3 text-xs outline-none focus:border-[#304156]/40 bg-white"
            />
            <button
              onClick={saveDate}
              disabled={!dateInput || saving}
              className="px-3 py-2 bg-[#577E90] hover:bg-[#304156] disabled:bg-[#304156]/20 text-white rounded-lg text-[10px] font-black transition-all whitespace-nowrap"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <Link href={`${MENTOR_WA}?text=${waMsg(dateInput || "[your date]")}`} target="_blank"
            className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-lg text-[10px] font-black transition-all">
            <MessageCircle size={11} /> Confirm with Arba on WhatsApp
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVE COURSE SUMMARY ────────────────────────────────────────────────────

function ActiveCourseSummary({
  enrollment,
  onOpenCurriculum,
}: {
  enrollment: CourseEnrollment;
  onOpenCurriculum?: (t: CourseTrack) => void;
}) {
  const completedCount = enrollment.sessions.filter(isSessionCompleted).length;
  const progressPct    = Math.round((completedCount / enrollment.total_sessions) * 100);
  const mentor         = MENTORS.find(m => m.id === enrollment.mentor_id);
  const track          = enrollment.track_id ? TRACK_META[enrollment.track_id as CourseTrack] : null;

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/10 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#304156]" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {track && (
              <span className="inline-block text-[9px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#304156]/8 text-[#304156] mb-1.5">
                {track.emoji} {track.label}
              </span>
            )}
            <h3 className="font-black text-[#304156] leading-tight">{enrollment.course_name}</h3>
            {mentor && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-4 h-4 rounded-full overflow-hidden relative border border-[#304156]/10">
                  <Image src={mentor.image} alt={mentor.name} fill className="object-cover object-top" />
                </div>
                <p className="text-[10px] text-[#577E90]">{mentor.name}</p>
              </div>
            )}
          </div>
          {/* Progress ring */}
          <div className="text-center shrink-0">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" fill="none" stroke="#F0F2F5" strokeWidth="4" />
                <circle cx="24" cy="24" r="19" fill="none" stroke="#304156" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 19}`}
                  strokeDashoffset={`${2 * Math.PI * 19 * (1 - progressPct / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-[10px] text-[#304156]">{progressPct}%</span>
              </div>
            </div>
            <p className="text-[9px] text-[#304156]/40 mt-0.5">{completedCount}/{enrollment.total_sessions}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#304156]/8 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-[#304156] rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }} />
        </div>

        {/* Session dots */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Array.from({ length: enrollment.total_sessions }, (_, i) => {
            const s      = enrollment.sessions[i];
            const isDone = s && isSessionCompleted(s);
            const isBook = s && !!s.student_booked_date && !isDone;
            const isNext = !isDone && !isBook && (i === 0 || (enrollment.sessions[i - 1] && isSessionCompleted(enrollment.sessions[i - 1])));
            return (
              <div key={i} title={`Session ${i + 1}${s?.topic ? ` · ${s.topic}` : ""}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black transition-all select-none
                  ${isDone ? "bg-[#304156] text-white" :
                    isBook  ? "bg-[#577E90] text-white" :
                    isNext  ? "bg-white text-[#304156] ring-2 ring-[#304156] ring-offset-1" :
                    "bg-[#304156]/8 text-[#304156]/25"}`}
              >
                {isDone ? "✓" : i + 1}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link href={BOOKING_URL} target="_blank"
            className="py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 transition-all">
            <Calendar size={11} /> Book Session
          </Link>
          <Link href={MENTOR_WA} target="_blank"
            className="py-2.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 transition-all">
            <MessageCircle size={11} /> Contact Arba
          </Link>
          {onOpenCurriculum && enrollment.track_id && (
            <button onClick={() => onOpenCurriculum(enrollment.track_id as CourseTrack)}
              className="col-span-2 py-2 bg-[#304156]/5 hover:bg-[#304156]/10 text-[#304156]/55 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all">
              <BookOpen size={11} /> View Full Curriculum
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyState({ userName, onOpenTrack }: { userName: string; onOpenTrack: (t: CourseTrack) => void }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Hero */}
      <div className="bg-[#304156] px-6 pt-10 pb-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 55%)" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-widest mb-5">
            <GraduationCap size={12} /> Private Mentorship
          </span>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Hi {userName.split(" ")[0]},<br />
            <span className="text-[#577E90]">master English with IELS.</span>
          </h1>
          <p className="text-white/50 text-sm max-w-md leading-relaxed mt-2">
            Personalized 1-on-1 sessions, a curriculum built around your goals, and a mentor who gives real feedback after every class.
          </p>
          <div className="flex flex-wrap gap-6 mt-6">
            {[
              { v: "1-on-1",  l: "Private Sessions" },
              { v: "Rp 90K",  l: "Per Session" },
              { v: "H-3",     l: "Booking Policy" },
              { v: "✓ Cert",  l: "On Completion" },
            ].map(s => (
              <div key={s.l}>
                <p className="font-black text-base">{s.v}</p>
                <p className="text-white/35 text-[10px] uppercase tracking-widest">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-20 pb-16 space-y-5">

        {/* Mentor cards */}
        <div className="grid grid-cols-3 gap-3">
          {MENTORS.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-[#304156]/8 p-3 flex items-center gap-2.5 shadow-sm">
              <div className="w-9 h-9 rounded-full overflow-hidden relative border border-[#304156]/10 shrink-0">
                <Image src={m.image} alt={m.name} fill className="object-cover object-top" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-[#304156] text-xs truncate">{m.name.split(" ")[0]}</p>
                <p className="text-[9px] text-[#577E90] font-bold truncate">{m.tagline}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Package cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { sessions: 8,  label: "Intensive", tag: "Most Popular", feats: ["8 private 1-on-1 sessions", "Personalized curriculum & materials", "Pre-test & Post-test per session", "Mentor score + written feedback", "IELS Lounge Premium access"] },
            { sessions: 21, label: "Extensive", tag: "Best Value",   feats: ["21 private 1-on-1 sessions", "Full curriculum — all 21 topics", "Pre-test & Post-test per session", "Mentor score + written feedback", "IELS Lounge Premium access", "Verified certificate of completion"] },
          ].map(pkg => (
            <div key={pkg.sessions} className="bg-white rounded-2xl border border-[#304156]/10 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
              <div className="h-0.5 bg-[#304156]" />
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#577E90]">{pkg.label}</p>
                    <p className="font-black text-[#304156] text-xl">{pkg.sessions} Sessions</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-[#304156]/8 text-[#304156]">
                    {pkg.tag}
                  </span>
                </div>
                <p className="text-2xl font-black text-[#304156] mb-4">{formatIDR(pkg.sessions * PRICE_PER_SESSION)}</p>
                <ul className="space-y-1.5 text-xs text-[#304156]/60 mb-5 flex-1">
                  {pkg.feats.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 size={11} className="text-[#304156]/40 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={PRODUCTS_URL} target="_blank"
                    className="py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1 transition-all">
                    Details <ExternalLink size={9} />
                  </Link>
                  <Link href={GOOGLE_FORM_URL} target="_blank"
                    className="py-2.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-black text-[10px] flex items-center justify-center gap-1 transition-all">
                    Register <ArrowRight size={9} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Track grid */}
        <div className="bg-white rounded-2xl border border-[#304156]/8 shadow-sm p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-3">Available Tracks — click to explore curriculum</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(TRACK_META).map(([id, track]) => {
              const mentor = MENTORS.find(m => m.id === track.mentorId);
              return (
                <button key={id} onClick={() => onOpenTrack(id as CourseTrack)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#304156]/5 hover:bg-[#304156]/10 text-left group transition-all border border-transparent hover:border-[#304156]/10">
                  <span className="text-lg">{track.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#304156] leading-tight truncate">{track.label}</p>
                    <p className="text-[9px] text-[#577E90] mt-0.5">{mentor?.name.split(" ")[0]}</p>
                  </div>
                  <ArrowRight size={10} className="text-[#304156]/20 group-hover:text-[#304156]/50 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#304156] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-black">Ready to enroll?</p>
            <p className="text-white/45 text-xs mt-0.5">Fill the registration form. After payment, your syllabus unlocks here.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={GOOGLE_FORM_URL} target="_blank"
              className="px-4 py-2 bg-white text-[#304156] rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-white/90 transition-all">
              Register <ArrowRight size={11} />
            </Link>
            <Link href={MENTOR_WA} target="_blank"
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-black text-xs flex items-center gap-1.5 border border-white/15 transition-all">
              <MessageCircle size={11} /> Ask Arba
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DashboardCoursesPage() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [userData, setUserData]           = useState({ id: "", name: "Member", avatar: "", tier: "explorer" as UserTier });
  const [loading, setLoading]             = useState(true);
  const [enrollments, setEnrollments]     = useState<CourseEnrollment[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<CourseTrack | null>(null);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const [{ data: dbUser }, { data: dbMembership }, { data: dbEnrollments }] = await Promise.all([
      supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("memberships").select("tier").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("course_enrollments")
        .select(`*, course_sessions(*)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const dbTier = dbMembership?.tier;
    setUserData({
      id:     user.id,
      name:   dbUser?.full_name || user.user_metadata?.full_name || "Member",
      avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || "",
      tier:   dbTier === "visionary" || dbTier === "premium" ? "visionary" :
              dbTier === "pro" ? "insider" : "explorer",
    });

    if (dbEnrollments) {
      setEnrollments(dbEnrollments.map((e: any) => ({
        ...e,
        sessions: (e.course_sessions ?? []).sort((a: any, b: any) => a.session_number - b.session_number),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [supabase, router]);

  const { active, completed } = useMemo(() => ({
    active:    enrollments.filter(e => e.status === "active"),
    completed: enrollments.filter(e => e.status === "completed"),
  }), [enrollments]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <DashboardLayout userTier="explorer" userName="Loading…" userAvatar="">
      <div className="p-8 space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-44 bg-[#304156]/10 rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#304156]/8 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-[#304156]/8 rounded-2xl" />
      </div>
    </DashboardLayout>
  );

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!enrollments.length) return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <EmptyState userName={userData.name} onOpenTrack={setSelectedTrack} />
      <CurriculumModal trackId={selectedTrack} onClose={() => setSelectedTrack(null)} isDashboard={false} />
    </DashboardLayout>
  );

  // ── Has enrollments ───────────────────────────────────────────────────────
  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F7F8FA]">

        {/* Header */}
        <div className="bg-[#304156] px-6 pt-10 pb-14 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle at 85% 15%, #ffffff 0%, transparent 50%)" }} />
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/12 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <GraduationCap size={12} /> My Learning Hub
            </span>
            <h1 className="text-2xl font-black mb-1">Hi {userData.name.split(" ")[0]} 👋</h1>
            <p className="text-white/45 text-sm">
              {active.length > 0
                ? `${active.length} active course${active.length > 1 ? "s" : ""} — keep consistent!`
                : "All courses completed. Well done! 🎓"}
            </p>
            <div className="flex items-center gap-5 mt-4 flex-wrap">
              {[
                { v: enrollments.length,                                                              l: "Enrolled" },
                { v: active.length,                                                                   l: "Active" },
                { v: enrollments.reduce((a, e) => a + e.sessions.filter(isSessionCompleted).length, 0), l: "Sessions Done" },
                { v: completed.length,                                                                l: "Completed" },
              ].map(s => (
                <div key={s.l} className="flex items-center gap-1.5">
                  <span className="font-black text-lg">{s.v}</span>
                  <span className="text-white/35 text-[10px]">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 -mt-5 relative z-10 pb-16 space-y-10">

          {/* Active courses */}
          {active.map(enrollment => (
            <div key={enrollment.id} className="space-y-4">

              {/* Course summary */}
              <ActiveCourseSummary enrollment={enrollment} onOpenCurriculum={setSelectedTrack} />

              {/* CONTRACT GATE — locked if not signed */}
              {!enrollment.contract_signed && (
                <ContractGate enrollment={enrollment} onSigned={fetchAll} />
              )}

              {/* SIGNED — show full syllabus */}
              {enrollment.contract_signed && (
                <>
                  <BookingPolicyBanner />

                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#304156]/50">
                      Your Syllabus — {enrollment.total_sessions} Sessions
                    </p>
                    {enrollment.sessions.map((session, idx) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        idx={idx}
                        allSessions={enrollment.sessions}
                        onRefresh={fetchAll}
                      />
                    ))}
                    {enrollment.sessions.length < enrollment.total_sessions && (
                      <div className="bg-[#304156]/4 rounded-2xl border border-[#304156]/6 p-4 text-center">
                        <p className="text-xs text-[#304156]/40">
                          {enrollment.total_sessions - enrollment.sessions.length} more session{enrollment.total_sessions - enrollment.sessions.length > 1 ? "s" : ""} will appear once your mentor adds them.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Bottom CTA */}
              <div className="bg-[#304156] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-black text-sm">Book or reschedule?</p>
                  <p className="text-white/45 text-[10px] mt-0.5">Google Calendar · Confirm with Arba · Min H-3</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={BOOKING_URL} target="_blank"
                    className="px-4 py-2 bg-white text-[#304156] rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-white/90 transition-all">
                    <Calendar size={11} /> Book Now
                  </Link>
                  <Link href={MENTOR_WA} target="_blank"
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-black text-xs flex items-center gap-1.5 border border-white/15 transition-all">
                    <MessageCircle size={11} /> WhatsApp
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Completed courses */}
          {completed.length > 0 && (
            <section className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#304156]/50 flex items-center gap-2">
                <Award size={11} /> Completed
              </p>
              {completed.map(enrollment => (
                <div key={enrollment.id} className="bg-white rounded-2xl border border-[#304156]/8 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
                    <GraduationCap size={16} className="text-[#304156]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#304156] text-sm truncate">{enrollment.course_name}</p>
                    <p className="text-[10px] text-[#577E90] mt-0.5">
                      {enrollment.sessions.filter(isSessionCompleted).length} sessions · {formatDate(enrollment.created_at)}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#304156]/8 text-[#304156] border border-[#304156]/12 shrink-0">
                    Completed
                  </span>
                </div>
              ))}
            </section>
          )}

        </div>
      </div>

      <CurriculumModal trackId={selectedTrack} onClose={() => setSelectedTrack(null)} isDashboard={false} />
    </DashboardLayout>
  );
}
"use client";
// src/app/dashboard/learning/courses/page.tsx

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { createBrowserClient } from "@supabase/ssr";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CurriculumModal from "@/components/courses/CurriculumModal";
import {
  MENTORS, COURSE_PACKAGES, TRACK_META, WHATSAPP_URL,
  CourseTrack, PRICE_PER_SESSION,
} from "@/data/courses";
import {
  BookOpen, Award, CheckCircle2, Calendar, ArrowRight,
  GraduationCap, MessageCircle, Layers, Clock, Lock,
  AlertCircle, ExternalLink, PlayCircle, Sparkles,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type UserTier = "explorer" | "insider" | "visionary";

type EnrollmentStatus =
  | "registered"        // form submitted, awaiting payment confirmation
  | "payment_confirmed" // admin confirmed, awaiting onboarding
  | "onboarding"        // payment ok, first session not yet booked
  | "in_progress"       // at least one session attended
  | "completed";        // all sessions attended

interface SessionRow {
  id: string;
  session_number: number;
  status: "scheduled" | "attended" | "missed" | "rescheduled" | "cancelled";
  scheduled_at: string | null;
  attended_at: string | null;
  materials_unlocked: boolean;
  assignment_url: string | null;
  mentor_notes: string | null;
}

interface EnrollmentRow {
  id: string;
  package_id: string;
  track_id: string;
  mentor_id: string;
  package_type: "intensive" | "extensive" | "custom";
  total_sessions: number;
  payment_status: "pending" | "confirmed" | "refunded";
  status: EnrollmentStatus;
  enrolled_at: string;
  confirmed_at: string | null;
  started_at: string | null;
  current_session: number;
  sessions: SessionRow[];
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ─── STATUS BADGE ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const map: Record<EnrollmentStatus, { label: string; cls: string }> = {
    registered:        { label: "⏳ Awaiting Payment", cls: "bg-amber-100 text-amber-700" },
    payment_confirmed: { label: "✓ Payment Confirmed", cls: "bg-blue-100 text-blue-700" },
    onboarding:        { label: "🚀 Ready to Start", cls: "bg-[#577E90]/15 text-[#304156]" },
    in_progress:       { label: "● In Progress", cls: "bg-emerald-100 text-emerald-700" },
    completed:         { label: "🎓 Completed", cls: "bg-[#304156]/10 text-[#304156]" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ─── PENDING PAYMENT BANNER ──────────────────────────────────────────────────

function PendingPaymentCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const pkg = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  if (!pkg) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-amber-400" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="font-black text-[#304156]">{pkg.name} · {pkg.type === "intensive" ? "Intensive" : "Extensive"}</p>
            <p className="text-xs text-gray-400 mt-0.5">Enrolled on {formatDate(enrollment.enrolled_at)}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={enrollment.status} />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm">
          <p className="font-bold text-amber-800 mb-1">Next steps:</p>
          <ol className="space-y-1.5 text-amber-700 text-xs">
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">1</span>
              Transfer <strong>{formatIDR(pkg.sessions * PRICE_PER_SESSION)}</strong> to Bank Jago · 103196849968 (Arbadza Rido)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">2</span>
              Confirm payment via WhatsApp with proof of transfer
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">3</span>
              Admin will confirm within 1×24 business hours
            </li>
          </ol>
        </div>

        <div className="mt-3">
          <Link href={WHATSAPP_URL} target="_blank"
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
            <MessageCircle size={13} /> Confirm Payment via WhatsApp
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING CARD ─────────────────────────────────────────────────────────

function OnboardingCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const pkg = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  const mentor = MENTORS.find(m => m.id === enrollment.mentor_id);
  if (!pkg || !mentor) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/20 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#304156]" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-[#304156]" />
          </div>
          <div className="flex-1">
            <p className="font-black text-[#304156]">{pkg.name} · {pkg.type === "intensive" ? "Intensive" : "Extensive"}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pkg.sessions} sessions · with {mentor.name.split(" ")[0]}
            </p>
          </div>
          <StatusBadge status={enrollment.status} />
        </div>

        {/* Checklist */}
        <div className="space-y-2 mb-5">
          {[
            { done: true,  label: "Registration form submitted" },
            { done: true,  label: "Payment confirmed" },
            { done: false, label: "Complete onboarding & book first session" },
            { done: false, label: "Access materials & start learning" },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm ${item.done ? "text-gray-500" : "text-[#304156] font-bold"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                item.done ? "bg-emerald-100" : "bg-[#304156]/10 ring-2 ring-[#304156]/20"
              }`}>
                {item.done
                  ? <CheckCircle2 size={12} className="text-emerald-600" />
                  : <span className="text-[9px] font-black text-[#304156]">{i + 1}</span>
                }
              </div>
              {item.label}
            </div>
          ))}
        </div>

        <Link href="/dashboard/learning/courses/start"
          className="w-full py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm">
          Start Onboarding <ArrowRight size={15} />
        </Link>

        <p className="text-center text-xs text-gray-400 mt-2.5">
          You will select your first session schedule there
        </p>
      </div>
    </div>
  );
}

// ─── ACTIVE COURSE CARD ──────────────────────────────────────────────────────

function ActiveCourseCard({
  enrollment,
  onOpenCurriculum,
}: {
  enrollment: EnrollmentRow;
  onOpenCurriculum: (t: CourseTrack) => void;
}) {
  const pkg = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  const mentor = MENTORS.find(m => m.id === enrollment.mentor_id);
  if (!pkg || !mentor) return null;

  const track = TRACK_META[pkg.trackId as CourseTrack];
  const attendedSessions = enrollment.sessions.filter(s => s.status === "attended");
  const scheduledSessions = enrollment.sessions.filter(s => s.status === "scheduled");
  const nextScheduled = scheduledSessions.sort((a, b) =>
    (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")
  )[0];
  const progressPct = Math.round((attendedSessions.length / enrollment.total_sessions) * 100);

  // Next unlockable session: first session where number = attended+1
  const nextSessionNumber = enrollment.current_session;
  const curriculumSession = pkg.curriculum.find(s => s.session === nextSessionNumber);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1 bg-[#304156]" />
      <div className="p-5">

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#304156]/8 text-[#304156]">
                {track.emoji} {track.label}
              </span>
              <StatusBadge status={enrollment.status} />
            </div>
            <h3 className="font-black text-[#304156]">{pkg.name} · {pkg.type === "intensive" ? "Intensive" : "Extensive"}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded-full overflow-hidden relative border border-gray-100 shrink-0">
                <Image src={mentor.image} alt={mentor.name} fill className="object-cover object-top" />
              </div>
              <p className="text-xs text-gray-400">{mentor.name}</p>
            </div>
          </div>

          {/* Circular progress */}
          <div className="text-center shrink-0">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#F3F4F6" strokeWidth="4.5" />
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke="#304156" strokeWidth="4.5"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressPct / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-xs text-[#304156]">{progressPct}%</span>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 font-medium mt-0.5">
              {attendedSessions.length}/{enrollment.total_sessions}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-[#304156] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>

        {/* Session dot tracker */}
        <div className="flex flex-wrap gap-1 mb-4">
          {Array.from({ length: enrollment.total_sessions }, (_, i) => {
            const n = i + 1;
            const session = enrollment.sessions.find(s => s.session_number === n);
            const isAttended  = session?.status === "attended";
            const isScheduled = session?.status === "scheduled";
            const isCurrent   = n === enrollment.current_session;
            const isLocked    = n > enrollment.current_session && !session;

            return (
              <div key={n} title={`Session ${n}${session?.scheduled_at ? ` · ${formatDate(session.scheduled_at)}` : ""}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                  isAttended  ? "bg-[#304156] text-white" :
                  isScheduled ? "bg-[#577E90] text-white ring-2 ring-[#577E90]/30 ring-offset-1" :
                  isCurrent   ? "bg-[#304156]/10 text-[#304156] ring-2 ring-[#304156]/25 ring-offset-1" :
                  "bg-gray-100 text-gray-300"
                }`}>
                {isAttended ? "✓" : isLocked ? <Lock size={8} /> : n}
              </div>
            );
          })}
        </div>

        {/* Next session info */}
        {nextScheduled && (
          <div className="bg-[#577E90]/10 border border-[#577E90]/20 rounded-xl p-3 mb-3 flex items-center gap-3">
            <Calendar size={14} className="text-[#304156] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#304156]">
                Session {nextScheduled.session_number} scheduled
              </p>
              <p className="text-[10px] text-gray-500">{formatDate(nextScheduled.scheduled_at)}</p>
            </div>
          </div>
        )}

        {/* Up next curriculum preview */}
        {curriculumSession && enrollment.status === "in_progress" && (
          <div className="bg-[#304156]/5 rounded-xl p-3 mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-[#577E90] mb-1">
              Up Next — Session {curriculumSession.session}
            </p>
            <p className="font-bold text-[#304156] text-xs leading-snug">{curriculumSession.title}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {enrollment.status === "onboarding" ? (
            <Link href="/dashboard/learning/courses/start"
              className="flex-1 py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
              <PlayCircle size={13} /> Book First Session
            </Link>
          ) : (
            <Link href={`/dashboard/learning/courses/${enrollment.id}/session/${enrollment.current_session}`}
              className="flex-1 py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
              <PlayCircle size={13} />
              {enrollment.status === "in_progress" ? `Continue Session ${enrollment.current_session}` : "View Progress"}
            </Link>
          )}
          <button onClick={() => onOpenCurriculum(pkg.trackId as CourseTrack)}
            className="py-2.5 px-3.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all">
            <BookOpen size={13} /> Curriculum
          </button>
          <Link href={WHATSAPP_URL} target="_blank"
            className="py-2.5 px-3.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all">
            <MessageCircle size={13} /> Mentor
          </Link>
        </div>

        {/* Session materials — show completed sessions with materials */}
        {attendedSessions.filter(s => s.materials_unlocked).length > 0 && (
          <details className="mt-3">
            <summary className="text-[10px] font-black uppercase tracking-widest text-[#577E90] cursor-pointer select-none">
              Unlocked Materials ({attendedSessions.filter(s => s.materials_unlocked).length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {attendedSessions
                .filter(s => s.materials_unlocked)
                .sort((a, b) => a.session_number - b.session_number)
                .map(s => {
                  const cSess = pkg.curriculum.find(c => c.session === s.session_number);
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                      <span className="w-5 h-5 rounded-full bg-[#304156] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                        {s.session_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#304156] truncate">{cSess?.title ?? `Session ${s.session_number}`}</p>
                        {s.mentor_notes && <p className="text-[10px] text-gray-400 truncate">{s.mentor_notes}</p>}
                      </div>
                      {s.assignment_url && (
                        <Link href={s.assignment_url} target="_blank"
                          className="text-[10px] font-bold text-[#577E90] flex items-center gap-1 shrink-0 hover:underline">
                          Assignment <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  );
                })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ─── COMPLETED COURSE CARD ───────────────────────────────────────────────────

function CompletedCourseCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const pkg = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  if (!pkg) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden opacity-80">
      <div className="h-1 bg-[#577E90]" />
      <div className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
          <GraduationCap size={18} className="text-[#304156]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#304156] text-sm">{pkg.name}</p>
          <p className="text-xs text-gray-400">{enrollment.total_sessions} sessions completed · {formatDate(enrollment.started_at)}</p>
        </div>
        <StatusBadge status="completed" />
      </div>
    </div>
  );
}

// ─── BROWSE TRACKS ───────────────────────────────────────────────────────────

function BrowseTracks({ onOpenTrack }: { onOpenTrack: (t: CourseTrack) => void }) {
  const [filterMentor, setFilterMentor] = useState("all");

  const tracks = Object.entries(TRACK_META).filter(([, t]) =>
    filterMentor === "all" ? true : t.mentorId === filterMentor
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-black text-[#304156] flex items-center gap-2">
          <Layers size={15} className="text-[#577E90]" /> Explore More Programs
        </h3>
        <div className="flex gap-1.5">
          <button onClick={() => setFilterMentor("all")}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${filterMentor === "all" ? "bg-[#304156] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            All
          </button>
          {MENTORS.map(m => (
            <button key={m.id} onClick={() => setFilterMentor(filterMentor === m.id ? "all" : m.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${filterMentor === m.id ? "bg-[#304156] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {m.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {tracks.map(([id, track]) => {
          const mentor = MENTORS.find(m => m.id === track.mentorId)!;
          const intensive = COURSE_PACKAGES.find(p => p.trackId === id && p.type === "intensive");
          return (
            <button key={id} onClick={() => onOpenTrack(id as CourseTrack)}
              className="flex items-start gap-2.5 p-3 bg-[#304156]/5 hover:bg-[#304156]/10 rounded-xl border border-transparent hover:border-[#304156]/10 transition-all text-left group">
              <span className="text-xl shrink-0">{track.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-[#304156] leading-tight">{track.label}</p>
                <p className="text-[9px] text-[#577E90] font-medium mt-0.5">{mentor.name.split(" ")[0]}</p>
                {intensive && (
                  <p className="text-[9px] text-gray-400 mt-0.5">from {formatIDR(intensive.sessions * PRICE_PER_SESSION)}</p>
                )}
              </div>
              <ArrowRight size={12} className="text-gray-300 group-hover:text-[#304156] transition-colors shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── EMPTY STATE (no enrollments at all) ─────────────────────────────────────

function EmptyState({
  userName,
  onOpenTrack,
}: {
  userName: string;
  onOpenTrack: (t: CourseTrack) => void;
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Hero */}
      <div className="bg-[#304156] px-6 pt-10 pb-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-full text-xs font-black uppercase tracking-widest mb-5">
            <GraduationCap size={13} /> Learning Hub
          </span>
          <h1 className="text-3xl lg:text-4xl font-black mb-2">
            Hi {userName.split(" ")[0]}, start<br />
            <span className="text-[#577E90]">your English journey.</span>
          </h1>
          <p className="text-white/55 text-sm max-w-lg leading-relaxed mt-2">
            Choose a track, view the full curriculum (intensive or extensive), and register via the form. A mentor will confirm within 1×24 business hours.
          </p>

          {/* How it works */}
          <div className="mt-6 grid sm:grid-cols-4 gap-3">
            {[
              { n: "1", title: "Choose Course", desc: "Browse 6 tracks below" },
              { n: "2", title: "Register & Pay", desc: "Via Google Form + transfer" },
              { n: "3", title: "Book Session", desc: "Pick a schedule with mentor" },
              { n: "4", title: "Start Learning", desc: "Materials unlock after attendance" },
            ].map(s => (
              <div key={s.n} className="bg-white/8 border border-white/10 rounded-xl p-3">
                <span className="text-3xl font-black text-white/15 block leading-none mb-1">{s.n}</span>
                <p className="font-black text-white text-xs">{s.title}</p>
                <p className="text-white/45 text-[10px] mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mentor filter + track grid */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-20 pb-16 space-y-5">

        {/* Mentor pills */}
        <div className="grid grid-cols-3 gap-3">
          {MENTORS.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full overflow-hidden relative border border-gray-100 shrink-0">
                <Image src={m.image} alt={m.name} fill className="object-cover object-top" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-[#304156] text-xs truncate">{m.name.split(" ")[0]}</p>
                <p className="text-[9px] text-[#577E90] font-bold truncate">{m.tagline}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Track cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(TRACK_META).map(([id, track]) => {
            const mentor = MENTORS.find(m => m.id === track.mentorId)!;
            const intensive = COURSE_PACKAGES.find(p => p.trackId === id && p.type === "intensive");
            const extensive = COURSE_PACKAGES.find(p => p.trackId === id && p.type === "extensive");

            return (
              <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                <div className="h-1 bg-[#304156]" />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{track.emoji}</span>
                    <div>
                      <p className="font-black text-[#304156] text-sm leading-tight">{track.label}</p>
                      <p className="text-[10px] text-[#577E90] font-bold mt-0.5">{mentor.name.split(" ")[0]}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 mb-4 text-xs">
                    {intensive && (
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                        <span className="font-bold text-[#304156]">⚡ Intensive · {intensive.sessions} sessions</span>
                        <span className="font-bold text-[#304156]">{formatIDR(intensive.sessions * PRICE_PER_SESSION)}</span>
                      </div>
                    )}
                    {extensive && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="font-bold text-[#304156]">🏅 Extensive · {extensive.sessions} sessions</span>
                        <span className="font-bold text-[#304156]">{formatIDR(extensive.sessions * PRICE_PER_SESSION)}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => onOpenTrack(id as CourseTrack)}
                    className="w-full py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                    View Curriculum <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom */}
        <div className="bg-[#304156] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-black">Need a Custom Package?</p>
            <p className="text-white/50 text-xs mt-1">Consult your goals, timeline, and budget — let's build it together.</p>
          </div>
          <Link href={WHATSAPP_URL} target="_blank"
            className="px-5 py-2.5 bg-white text-[#304156] rounded-xl font-black text-sm flex items-center gap-2 shrink-0 hover:bg-white/90 transition-all">
            <MessageCircle size={15} /> Custom Consult
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DashboardCoursesPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userData, setUserData] = useState({
    id: "", name: "Member", avatar: "", tier: "explorer" as UserTier,
  });
  const [loading, setLoading]       = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<CourseTrack | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: dbUser }, { data: dbMembership }, { data: dbEnrollments }] = await Promise.all([
        supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("memberships").select("tier").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("course_enrollments")
          .select(`
            id, package_id, track_id, mentor_id, package_type,
            total_sessions, payment_status, status,
            enrolled_at, confirmed_at, started_at, current_session,
            course_sessions (
              id, session_number, status, scheduled_at, attended_at,
              materials_unlocked, assignment_url, mentor_notes
            )
          `)
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
      ]);

      const dbTier = dbMembership?.tier;
      const uiTier: UserTier =
        dbTier === "visionary" || dbTier === "premium" ? "visionary" :
        dbTier === "pro" ? "insider" : "explorer";

      setUserData({
        id: user.id,
        name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
        avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || "",
        tier: uiTier,
      });

      if (dbEnrollments) {
        const mapped: EnrollmentRow[] = dbEnrollments.map((e: any) => ({
          ...e,
          sessions: e.course_sessions ?? [],
        }));
        setEnrollments(mapped);
      }

      setLoading(false);
    };
    init();
  }, [supabase, router]);

  // Partition enrollments by state
  const { pending, onboarding, active, completed } = useMemo(() => ({
    pending:    enrollments.filter(e => e.status === "registered"),
    onboarding: enrollments.filter(e => e.status === "payment_confirmed" || e.status === "onboarding"),
    active:     enrollments.filter(e => e.status === "in_progress"),
    completed:  enrollments.filter(e => e.status === "completed"),
  }), [enrollments]);

  const hasAny = enrollments.length > 0;

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-3xl" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAny) {
    return (
      <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
        <EmptyState
          userName={userData.name}
          onOpenTrack={setSelectedTrack}
        />
        <CurriculumModal
          trackId={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          isDashboard={false} // from dashboard empty state → redirect to gform
        />
      </DashboardLayout>
    );
  }

  // ── Has enrollments ─────────────────────────────────────────────────────────
  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F7F8FA]">

        {/* Header */}
        <div className="bg-[#304156] px-6 pt-10 pb-16 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffffff 0%, transparent 40%)" }} />
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-full text-xs font-black uppercase tracking-widest mb-5">
              <GraduationCap size={13} /> Learning Hub
            </span>
            <h1 className="text-2xl font-black mb-1">
              Hi {userData.name.split(" ")[0]} 👋
            </h1>
            <p className="text-white/50 text-sm">
              {active.length > 0
                ? `${active.length} active courses · keep it up!`
                : onboarding.length > 0
                ? "Payment confirmed — let's book your first session."
                : "Your registration is in — complete your payment to start."}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-5 mt-4 flex-wrap">
              {[
                { label: "Total Enrolled",  value: enrollments.length },
                { label: "In Progress",     value: active.length },
                { label: "Sessions Done",   value: enrollments.reduce((a, e) => a + e.sessions.filter(s => s.status === "attended").length, 0) },
                { label: "Courses Done",    value: completed.length },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="font-black text-lg text-white">{s.value}</span>
                  <span className="text-white/40 text-xs">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 -mt-6 relative z-10 pb-16 space-y-6">

          {/* 1. Pending payment */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-[#304156] text-sm flex items-center gap-2">
                <Clock size={15} className="text-amber-500" /> Awaiting Payment Confirmation
              </h2>
              {pending.map(e => <PendingPaymentCard key={e.id} enrollment={e} />)}
            </section>
          )}

          {/* 2. Ready to onboard */}
          {onboarding.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-[#304156] text-sm flex items-center gap-2">
                <Sparkles size={15} className="text-[#304156]" /> Ready to Start — Book First Session
              </h2>
              {onboarding.map(e => <OnboardingCard key={e.id} enrollment={e} />)}
            </section>
          )}

          {/* 3. Active courses */}
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-[#304156] text-sm flex items-center gap-2">
                <PlayCircle size={15} className="text-[#577E90]" /> Active Courses
              </h2>
              {active.map(e => (
                <ActiveCourseCard key={e.id} enrollment={e}
                  onOpenCurriculum={setSelectedTrack} />
              ))}
            </section>
          )}

          {/* 4. Completed */}
          {completed.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-black text-[#304156] text-sm flex items-center gap-2">
                <Award size={15} className="text-[#577E90]" /> Completed
              </h2>
              {completed.map(e => <CompletedCourseCard key={e.id} enrollment={e} />)}
            </section>
          )}

          {/* 5. Browse more */}
          <BrowseTracks onOpenTrack={setSelectedTrack} />

          {/* 6. Scheduling rules info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-black text-[#304156] text-sm mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-[#577E90]" /> Session Scheduling Rules
            </h3>
            <div className="space-y-2 text-xs text-gray-500">
              {[
                { icon: "✓", text: "Minimum of 1 session per week" },
                { icon: "✓", text: "Maximum of 2 sessions per week" },
                { icon: "✓", text: "Minimum 5-day gap between sessions" },
                { icon: "✓", text: "Materials & assignments accessible only after attending the session" },
                { icon: "✓", text: "Reschedule requests must be made at least 24 hours prior via WhatsApp" },
              ].map((r, i) => (
                <p key={i} className="flex items-start gap-2">
                  <span className="text-[#577E90] font-bold">{r.icon}</span> {r.text}
                </p>
              ))}
            </div>
          </div>

        </div>
      </div>

      <CurriculumModal
        trackId={selectedTrack}
        onClose={() => setSelectedTrack(null)}
        isDashboard={false}
      />
    </DashboardLayout>
  );
}
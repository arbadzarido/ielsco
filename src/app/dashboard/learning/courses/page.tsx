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
  MENTORS, COURSE_PACKAGES, TRACK_META, GOOGLE_FORM_URL, WHATSAPP_URL,
  CourseTrack, PRICE_PER_SESSION, CoursePackage, CurriculumSession,
} from "@/data/courses";
import {
  BookOpen, Award, CheckCircle2, Calendar, ArrowRight,
  GraduationCap, MessageCircle, Clock, Lock, AlertCircle,
  ExternalLink, PlayCircle, Sparkles, ChevronDown, ChevronUp,
  FileText, ClipboardCheck, Video, Download,
} from "lucide-react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const BOOKING_URL  = "https://calendar.app.google/EjfzbJCDbM4QDosC7";
const MENTOR_WA    = "https://wa.me/6288297253491"; // Arba
const PRODUCTS_URL = "https://ielsco.com/products/courses";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type UserTier = "explorer" | "insider" | "visionary";

type EnrollmentStatus =
  | "registered"
  | "payment_confirmed"
  | "onboarding"
  | "in_progress"
  | "completed";

interface SessionRow {
  id: string;
  session_number: number;
  status: "scheduled" | "attended" | "missed" | "rescheduled" | "cancelled";
  scheduled_at: string | null;
  attended_at: string | null;
  materials_unlocked: boolean;
  assignment_url: string | null;
  materials_url: string | null;
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

// ─── UTILS ───────────────────────────────────────────────────────────────────

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── PALETTE (IELS only, no random colors) ───────────────────────────────────
// #304156 — main navy
// #577E90 — muted teal
// #F7F8FA — bg
// white   — contrast
// Semantic only: amber for pending payment (warning), emerald for completed (success)

// ─── STATUS BADGE ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: EnrollmentStatus }) {
  const cfg = {
    registered:        { label: "Awaiting Payment",   cls: "bg-[#304156]/8 text-[#304156] border border-[#304156]/15" },
    payment_confirmed: { label: "Payment Confirmed",  cls: "bg-[#577E90]/15 text-[#304156] border border-[#577E90]/25" },
    onboarding:        { label: "Ready to Start",     cls: "bg-[#577E90]/15 text-[#304156] border border-[#577E90]/25" },
    in_progress:       { label: "In Progress",        cls: "bg-[#304156] text-white border border-[#304156]" },
    completed:         { label: "Completed",          cls: "bg-[#304156]/8 text-[#304156] border border-[#304156]/15" },
  }[status];
  return (
    <span className={`text-[9px] font-black uppercase tracking-[0.12em] px-2.5 py-1 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── SESSION DOT ─────────────────────────────────────────────────────────────

function SessionDot({ n, session, currentSession }: { n: number; session?: SessionRow; currentSession: number }) {
  const isAttended  = session?.status === "attended";
  const isScheduled = session?.status === "scheduled";
  const isCurrent   = n === currentSession && !isAttended;
  const isLocked    = n > currentSession && !session;

  return (
    <div
      title={`Session ${n}${session?.scheduled_at ? ` · ${formatDate(session.scheduled_at)}` : ""}`}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black transition-all select-none
        ${isAttended  ? "bg-[#304156] text-white shadow-sm" :
          isScheduled ? "bg-[#577E90] text-white ring-2 ring-[#577E90]/30 ring-offset-1" :
          isCurrent   ? "bg-white text-[#304156] ring-2 ring-[#304156] ring-offset-1 shadow-sm" :
          "bg-[#304156]/8 text-[#304156]/30"}`}
    >
      {isAttended ? "✓" : isLocked ? <Lock size={8} /> : n}
    </div>
  );
}

// ─── BOOKING POLICY MODAL ─────────────────────────────────────────────────────

function BookingPolicyBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Calendar size={14} className="text-[#577E90] shrink-0" />
          <span className="text-xs font-black text-[#304156]">📌 Class Booking Policy</span>
        </div>
        {open ? <ChevronUp size={14} className="text-[#577E90]" /> : <ChevronDown size={14} className="text-[#577E90]" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-xs text-[#304156]/70 space-y-2 border-t border-[#304156]/8">
          <p className="pt-3 font-bold text-[#304156]">Welcome to your English learning journey with IELS! 🌍✨</p>
          <ol className="space-y-2">
            <li><strong className="text-[#304156]">1. Booking Deadline:</strong> Classes must be booked at least <strong>H-3</strong> (3 days before the session).</li>
            <li><strong className="text-[#304156]">2. Confirmation:</strong> Once booked, notify Arba directly via WhatsApp at{" "}
              <Link href={MENTOR_WA} target="_blank" className="text-[#577E90] font-bold hover:underline">088297253491</Link> for confirmation.
            </li>
            <li><strong className="text-[#304156]">3. Respect the Schedule:</strong> Booking late or missing the deadline may result in your session being rescheduled.</li>
            <li><strong className="text-[#304156]">4. Be Ready to Grow! 🚀</strong> Each session is designed to sharpen your English skills in a practical and engaging way.</li>
          </ol>
          <p className="text-[#577E90] font-bold pt-1">Let's make every class productive — secure your spot early and stay consistent!</p>
        </div>
      )}
    </div>
  );
}

// ─── MATERIALS PANEL ─────────────────────────────────────────────────────────

function MaterialsPanel({ enrollment, pkg }: { enrollment: EnrollmentRow; pkg: CoursePackage }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {pkg.curriculum.map((cs: CurriculumSession) => {
        const sessionRow = enrollment.sessions.find(s => s.session_number === cs.session);
        const isAttended  = sessionRow?.status === "attended";
        const isScheduled = sessionRow?.status === "scheduled";
        const isUnlocked  = sessionRow?.materials_unlocked === true;
        const isCurrent   = cs.session === enrollment.current_session;
        const isLocked    = !isAttended && !isScheduled && !isCurrent;
        const isOpen      = expanded === cs.session;

        return (
          <div key={cs.session}
            className={`rounded-xl border overflow-hidden transition-all ${
              isAttended  ? "border-[#304156]/20 bg-white" :
              isCurrent   ? "border-[#304156]/30 bg-white shadow-sm" :
              isScheduled ? "border-[#577E90]/20 bg-white" :
              "border-[#304156]/8 bg-[#304156]/3 opacity-60"
            }`}
          >
            <button
              onClick={() => !isLocked && setExpanded(isOpen ? null : cs.session)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              disabled={isLocked}
            >
              {/* Session dot */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                isAttended  ? "bg-[#304156] text-white" :
                isCurrent   ? "ring-2 ring-[#304156] bg-white text-[#304156]" :
                isScheduled ? "bg-[#577E90] text-white" :
                "bg-[#304156]/10 text-[#304156]/30"
              }`}>
                {isAttended ? "✓" : isLocked ? <Lock size={8} /> : cs.session}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black leading-snug truncate ${isLocked ? "text-[#304156]/30" : "text-[#304156]"}`}>
                  Session {cs.session} · {cs.title}
                </p>
                <p className="text-[10px] mt-0.5 text-[#577E90]/80">
                  {isAttended ? `Attended${sessionRow?.attended_at ? ` · ${formatDate(sessionRow.attended_at)}` : ""}` :
                   isScheduled ? `Scheduled · ${formatDate(sessionRow?.scheduled_at ?? null)}` :
                   isCurrent   ? "Up next" :
                   "Locked — attend previous session"}
                </p>
              </div>

              {/* Status icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isAttended && isUnlocked && (
                  <>
                    {sessionRow?.materials_url && <Download size={12} className="text-[#577E90]" />}
                    {sessionRow?.assignment_url && <ClipboardCheck size={12} className="text-[#304156]" />}
                  </>
                )}
                {!isLocked && (
                  isOpen
                    ? <ChevronUp size={13} className="text-[#304156]/40" />
                    : <ChevronDown size={13} className="text-[#304156]/40" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-[#304156]/8 px-4 py-4 space-y-4">
                {/* Objectives */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-2">Objectives</p>
                  <ul className="space-y-1.5">
                    {cs.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#304156]/80">
                        <span className="text-[#577E90] font-bold mt-0.5">→</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Activities */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-2">Activities</p>
                  <ul className="space-y-1.5">
                    {cs.activities.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#304156]/80">
                        <CheckCircle2 size={11} className="text-[#304156]/40 mt-0.5 shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Materials info */}
                <div className="flex items-center gap-2 bg-[#304156]/5 rounded-lg px-3 py-2">
                  <FileText size={12} className="text-[#577E90] shrink-0" />
                  <p className="text-[10px] text-[#304156]/70 leading-snug">{cs.materials}</p>
                </div>

                {/* Unlocked resources — only if attended */}
                {isAttended && isUnlocked && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#304156]">Your Resources</p>
                    <div className="grid grid-cols-2 gap-2">
                      {sessionRow?.materials_url ? (
                        <Link href={sessionRow.materials_url} target="_blank"
                          className="flex items-center gap-2 p-2.5 bg-[#304156] text-white rounded-xl text-[10px] font-bold hover:bg-[#1e2a38] transition-all">
                          <Download size={12} /> Session Materials
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 bg-[#304156]/8 text-[#304156]/40 rounded-xl text-[10px] font-bold cursor-not-allowed">
                          <Download size={12} /> Materials (soon)
                        </div>
                      )}
                      {sessionRow?.assignment_url ? (
                        <Link href={sessionRow.assignment_url} target="_blank"
                          className="flex items-center gap-2 p-2.5 bg-[#577E90] text-white rounded-xl text-[10px] font-bold hover:bg-[#304156] transition-all">
                          <ClipboardCheck size={12} /> Do Assignment
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 bg-[#304156]/8 text-[#304156]/40 rounded-xl text-[10px] font-bold cursor-not-allowed">
                          <ClipboardCheck size={12} /> Assignment (soon)
                        </div>
                      )}
                    </div>
                    {sessionRow?.mentor_notes && (
                      <div className="bg-[#577E90]/10 border border-[#577E90]/20 rounded-xl px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#577E90] mb-1">Mentor Notes</p>
                        <p className="text-xs text-[#304156]/80">{sessionRow.mentor_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Locked resources */}
                {!isAttended && !isLocked && (
                  <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Lock size={13} className="text-[#304156]/30 shrink-0" />
                    <p className="text-[10px] text-[#304156]/50">
                      Materials & assignment unlock after you attend this session.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PENDING PAYMENT CARD ────────────────────────────────────────────────────

function PendingPaymentCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const pkg = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  if (!pkg) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/15 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#304156]" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-[#304156]" />
          </div>
          <div className="flex-1">
            <p className="font-black text-[#304156] text-sm">{pkg.name} — {pkg.type === "intensive" ? "Intensive" : "Extensive"}</p>
            <p className="text-[10px] text-[#577E90] mt-0.5">{pkg.sessions} sessions · Registered {formatDate(enrollment.enrolled_at)}</p>
          </div>
          <StatusPill status={enrollment.status} />
        </div>

        <div className="bg-[#304156]/5 border border-[#304156]/8 rounded-xl p-4 mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-2.5">Complete your payment</p>
          <div className="space-y-2">
            {[
              { n: 1, text: <>Transfer <strong className="text-[#304156]">{formatIDR(pkg.sessions * PRICE_PER_SESSION)}</strong> → Bank Jago · 103196849968 (Arbadza Rido)</> },
              { n: 2, text: "Send proof of transfer via WhatsApp for confirmation" },
              { n: 3, text: "Admin confirms within 1×24 business hours" },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-2.5 text-xs text-[#304156]/75">
                <span className="w-5 h-5 rounded-full bg-[#304156] text-white flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">{s.n}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href={MENTOR_WA} target="_blank"
          className="w-full py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
          <MessageCircle size={13} /> Confirm Payment via WhatsApp
        </Link>
      </div>
    </div>
  );
}

// ─── ONBOARDING CARD ─────────────────────────────────────────────────────────

function OnboardingCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const pkg    = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  const mentor = MENTORS.find(m => m.id === enrollment.mentor_id);
  if (!pkg || !mentor) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/15 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#304156]" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-[#304156]" />
          </div>
          <div className="flex-1">
            <p className="font-black text-[#304156]">{pkg.name} — {pkg.type === "intensive" ? "Intensive" : "Extensive"}</p>
            <p className="text-[10px] text-[#577E90] mt-0.5">{pkg.sessions} sessions · with {mentor.name.split(" ")[0]}</p>
          </div>
          <StatusPill status={enrollment.status} />
        </div>

        {/* Progress checklist */}
        <div className="space-y-2.5 mb-5">
          {[
            { done: true,  label: "Registration form submitted" },
            { done: true,  label: "Payment confirmed" },
            { done: false, label: "Book your first session via Google Calendar" },
            { done: false, label: "Attend session → materials unlock" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                item.done ? "bg-[#304156]" : "bg-[#304156]/10 ring-2 ring-[#304156]/20"
              }`}>
                {item.done
                  ? <CheckCircle2 size={11} className="text-white" />
                  : <span className="text-[9px] font-black text-[#304156]/40">{i + 1}</span>
                }
              </div>
              <span className={`text-xs ${item.done ? "text-[#304156]/50 line-through" : "text-[#304156] font-bold"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <BookingPolicyBanner />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link href={BOOKING_URL} target="_blank"
            className="py-3 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm">
            <Calendar size={13} /> Book a Session
          </Link>
          <Link href={MENTOR_WA} target="_blank"
            className="py-3 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all">
            <MessageCircle size={13} /> Contact Arba
          </Link>
        </div>
        <p className="text-center text-[10px] text-[#304156]/40 mt-3">
          Book at least 3 days before your preferred session date
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
  const [showMaterials, setShowMaterials] = useState(false);
  const pkg    = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  const mentor = MENTORS.find(m => m.id === enrollment.mentor_id);
  if (!pkg || !mentor) return null;

  const track           = TRACK_META[pkg.trackId as CourseTrack];
  const attended        = enrollment.sessions.filter(s => s.status === "attended");
  const scheduled       = enrollment.sessions.filter(s => s.status === "scheduled");
  const nextScheduled   = [...scheduled].sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))[0];
  const progressPct     = Math.round((attended.length / enrollment.total_sessions) * 100);
  const currSession     = pkg.curriculum.find(s => s.session === enrollment.current_session);
  const unlockedCount   = enrollment.sessions.filter(s => s.materials_unlocked).length;

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/12 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#304156]" />
      <div className="p-5">

        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#304156]/8 text-[#304156]">
                {track.emoji} {track.label}
              </span>
              <StatusPill status={enrollment.status} />
            </div>
            <h3 className="font-black text-[#304156] leading-tight">
              {pkg.name} — {pkg.type === "intensive" ? "Intensive" : "Extensive"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded-full overflow-hidden relative border border-[#304156]/10 shrink-0">
                <Image src={mentor.image} alt={mentor.name} fill className="object-cover object-top" />
              </div>
              <p className="text-[10px] text-[#577E90]">{mentor.name}</p>
            </div>
          </div>

          {/* Progress ring */}
          <div className="text-center shrink-0">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#F0F2F5" strokeWidth="4" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#304156" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressPct / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black text-xs text-[#304156]">{progressPct}%</span>
              </div>
            </div>
            <p className="text-[9px] text-[#304156]/40 font-medium mt-0.5">
              {attended.length}/{enrollment.total_sessions}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#304156]/8 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-[#304156] rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }} />
        </div>

        {/* Session dots */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Array.from({ length: enrollment.total_sessions }, (_, i) => (
            <SessionDot key={i + 1} n={i + 1}
              session={enrollment.sessions.find(s => s.session_number === i + 1)}
              currentSession={enrollment.current_session} />
          ))}
        </div>

        {/* Next scheduled */}
        {nextScheduled && (
          <div className="flex items-center gap-3 bg-[#577E90]/10 border border-[#577E90]/15 rounded-xl px-3.5 py-2.5 mb-3">
            <Calendar size={13} className="text-[#304156] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#304156]">Session {nextScheduled.session_number} scheduled</p>
              <p className="text-[10px] text-[#577E90]">{formatDate(nextScheduled.scheduled_at)}</p>
            </div>
          </div>
        )}

        {/* Up next curriculum */}
        {currSession && (
          <div className="bg-[#304156]/5 rounded-xl px-3.5 py-3 mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-1">
              Up Next — Session {currSession.session}
            </p>
            <p className="font-bold text-[#304156] text-xs leading-snug">{currSession.title}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Link href={BOOKING_URL} target="_blank"
            className="py-2.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <Calendar size={12} /> Book Next Session
          </Link>
          <Link href={MENTOR_WA} target="_blank"
            className="py-2.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <MessageCircle size={12} /> Contact Arba
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowMaterials(!showMaterials)}
            className="py-2.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <BookOpen size={12} />
            Learning Journey
            {unlockedCount > 0 && (
              <span className="bg-[#304156] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                {unlockedCount}
              </span>
            )}
          </button>
          <button onClick={() => onOpenCurriculum(pkg.trackId as CourseTrack)}
            className="py-2.5 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <FileText size={12} /> Full Curriculum
          </button>
        </div>

        {/* Booking policy */}
        <div className="mt-3">
          <BookingPolicyBanner />
        </div>

        {/* Materials panel */}
        {showMaterials && (
          <div className="mt-4 border-t border-[#304156]/8 pt-4">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#577E90] mb-3">
              Your Learning Journey — {pkg.sessions} Sessions
            </p>
            <MaterialsPanel enrollment={enrollment} pkg={pkg} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPLETED CARD ───────────────────────────────────────────────────────────

function CompletedCard({ enrollment }: { enrollment: EnrollmentRow }) {
  const [showMaterials, setShowMaterials] = useState(false);
  const pkg = COURSE_PACKAGES.find(p => p.id === enrollment.package_id);
  if (!pkg) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#304156]/10 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-[#577E90]" />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#304156]/8 flex items-center justify-center shrink-0">
            <GraduationCap size={16} className="text-[#304156]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[#304156] text-sm leading-tight">{pkg.name} — {pkg.type === "intensive" ? "Intensive" : "Extensive"}</p>
            <p className="text-[10px] text-[#577E90] mt-0.5">{enrollment.total_sessions} sessions · {formatDate(enrollment.started_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="completed" />
            <button onClick={() => setShowMaterials(!showMaterials)}
              className="w-7 h-7 rounded-lg bg-[#304156]/8 hover:bg-[#304156]/15 flex items-center justify-center transition-all">
              <BookOpen size={12} className="text-[#304156]" />
            </button>
          </div>
        </div>
        {showMaterials && (
          <div className="mt-4 border-t border-[#304156]/8 pt-4">
            <MaterialsPanel enrollment={enrollment} pkg={pkg} />
          </div>
        )}
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
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-full text-xs font-black uppercase tracking-widest mb-5">
            <GraduationCap size={13} /> Learning Hub
          </span>
          <h1 className="text-3xl lg:text-4xl font-black mb-2">
            Hi {userName.split(" ")[0]},<br />
            <span className="text-[#577E90]">start your English journey.</span>
          </h1>
          <p className="text-white/50 text-sm max-w-md leading-relaxed mt-2">
            Choose a track, explore the full curriculum, and register. A mentor confirms within 1×24 business hours.
          </p>

          {/* Steps */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { n: "1", t: "Choose Track", d: "Browse 6 programs" },
              { n: "2", t: "Register & Pay", d: "Google Form + transfer" },
              { n: "3", t: "Book Session", d: "Via Google Calendar" },
              { n: "4", t: "Attend & Learn", d: "Materials unlock after" },
            ].map(s => (
              <div key={s.n} className="bg-white/6 border border-white/8 rounded-xl p-3">
                <span className="text-2xl font-black text-white/10 block leading-none mb-1">{s.n}</span>
                <p className="font-black text-white text-xs">{s.t}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-20 pb-16 space-y-5">

        {/* Mentor cards */}
        <div className="grid grid-cols-3 gap-3">
          {MENTORS.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-[#304156]/8 p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full overflow-hidden relative border border-[#304156]/10 shrink-0">
                <Image src={m.image} alt={m.name} fill className="object-cover object-top" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-[#304156] text-xs truncate">{m.name.split(" ")[0]}</p>
                <p className="text-[9px] text-[#577E90] font-bold truncate">{m.tagline}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Track grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(TRACK_META).map(([id, track]) => {
            const mentor    = MENTORS.find(m => m.id === track.mentorId)!;
            const intensive = COURSE_PACKAGES.find(p => p.trackId === id && p.type === "intensive");
            const extensive = COURSE_PACKAGES.find(p => p.trackId === id && p.type === "extensive");
            return (
              <div key={id} className="bg-white rounded-2xl border border-[#304156]/8 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-[#304156]/20 transition-all">
                <div className="h-0.5 bg-[#304156]" />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start gap-2.5 mb-3">
                    <span className="text-xl">{track.emoji}</span>
                    <div>
                      <p className="font-black text-[#304156] text-sm leading-tight">{track.label}</p>
                      <p className="text-[10px] text-[#577E90] font-bold mt-0.5">{mentor.name.split(" ")[0]}</p>
                    </div>
                  </div>
                  <div className="space-y-1 flex-1 mb-3 text-xs">
                    {intensive && (
                      <div className="flex justify-between py-1 border-b border-[#304156]/6">
                        <span className="text-[#304156]/70 font-bold">⚡ {intensive.sessions} sessions</span>
                        <span className="font-black text-[#304156]">{formatIDR(intensive.sessions * PRICE_PER_SESSION)}</span>
                      </div>
                    )}
                    {extensive && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#304156]/70 font-bold">🏅 {extensive.sessions} sessions</span>
                        <span className="font-black text-[#304156]">{formatIDR(extensive.sessions * PRICE_PER_SESSION)}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => onOpenTrack(id as CourseTrack)}
                      className="py-2 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all">
                      Curriculum <ArrowRight size={10} />
                    </button>
                    <Link href={PRODUCTS_URL} target="_blank"
                      className="py-2 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all">
                      Details <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Register CTA */}
        <div className="bg-[#304156] rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-black text-base">Ready to enroll?</p>
              <p className="text-white/50 text-xs mt-1">Register via the form. After payment is confirmed, you'll book your first session directly with your mentor.</p>
            </div>
            <div className="flex gap-2.5 shrink-0">
              <Link href={GOOGLE_FORM_URL} target="_blank"
                className="px-4 py-2.5 bg-white text-[#304156] rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-white/90 transition-all">
                Register Now <ArrowRight size={12} />
              </Link>
              <Link href={MENTOR_WA} target="_blank"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-black text-xs flex items-center gap-1.5 border border-white/15 transition-all">
                <MessageCircle size={12} /> Ask Arba
              </Link>
            </div>
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

  const [userData, setUserData]       = useState({ id: "", name: "Member", avatar: "", tier: "explorer" as UserTier });
  const [loading, setLoading]         = useState(true);
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
              materials_unlocked, assignment_url, materials_url, mentor_notes
            )
          `)
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
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
          sessions: e.course_sessions ?? [],
        })));
      }

      setLoading(false);
    };
    init();
  }, [supabase, router]);

  const { pending, onboarding, active, completed } = useMemo(() => ({
    pending:    enrollments.filter(e => e.status === "registered"),
    onboarding: enrollments.filter(e => e.status === "payment_confirmed" || e.status === "onboarding"),
    active:     enrollments.filter(e => e.status === "in_progress"),
    completed:  enrollments.filter(e => e.status === "completed"),
  }), [enrollments]);

  const hasActive   = pending.length + onboarding.length + active.length + completed.length > 0;
  const hasOnlyDone = !pending.length && !onboarding.length && !active.length && completed.length > 0;

  if (loading) return (
    <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-44 bg-[#304156]/10 rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#304156]/8 rounded-2xl" />)}</div>
        <div className="h-64 bg-[#304156]/8 rounded-2xl" />
      </div>
    </DashboardLayout>
  );

  if (!hasActive) return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <EmptyState userName={userData.name} onOpenTrack={setSelectedTrack} />
      <CurriculumModal trackId={selectedTrack} onClose={() => setSelectedTrack(null)} isDashboard={false} />
    </DashboardLayout>
  );

  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F7F8FA]">

        {/* Header */}
        <div className="bg-[#304156] px-6 pt-10 pb-14 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle at 85% 15%, #ffffff 0%, transparent 50%)" }} />
          <div className="max-w-4xl mx-auto relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/12 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <GraduationCap size={12} /> Learning Hub
            </span>
            <h1 className="text-2xl font-black mb-1">Hi {userData.name.split(" ")[0]} 👋</h1>
            <p className="text-white/45 text-sm">
              {active.length > 0
                ? `${active.length} active course${active.length > 1 ? "s" : ""} — keep consistent!`
                : onboarding.length > 0
                ? "Payment confirmed — book your first session."
                : hasOnlyDone
                ? "All courses completed. Well done! 🎓"
                : "Registration received — complete your payment to start."}
            </p>
            {/* Stats */}
            <div className="flex items-center gap-5 mt-4 flex-wrap">
              {[
                { label: "Enrolled",      value: enrollments.length },
                { label: "In Progress",   value: active.length },
                { label: "Sessions Done", value: enrollments.reduce((a, e) => a + e.sessions.filter(s => s.status === "attended").length, 0) },
                { label: "Completed",     value: completed.length },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="font-black text-lg">{s.value}</span>
                  <span className="text-white/35 text-xs">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 -mt-5 relative z-10 pb-16 space-y-6">

          {/* Pending payment */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-[#304156] text-xs uppercase tracking-[0.12em] flex items-center gap-2">
                <Clock size={13} className="text-[#304156]/50" /> Awaiting Payment
              </h2>
              {pending.map(e => <PendingPaymentCard key={e.id} enrollment={e} />)}
            </section>
          )}

          {/* Onboarding */}
          {onboarding.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-[#304156] text-xs uppercase tracking-[0.12em] flex items-center gap-2">
                <Sparkles size={13} className="text-[#304156]/50" /> Ready to Book
              </h2>
              {onboarding.map(e => <OnboardingCard key={e.id} enrollment={e} />)}
            </section>
          )}

          {/* Active courses */}
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-[#304156] text-xs uppercase tracking-[0.12em] flex items-center gap-2">
                <PlayCircle size={13} className="text-[#304156]/50" /> Active Courses
              </h2>
              {active.map(e => (
                <ActiveCourseCard key={e.id} enrollment={e} onOpenCurriculum={setSelectedTrack} />
              ))}
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-black text-[#304156] text-xs uppercase tracking-[0.12em] flex items-center gap-2">
                <Award size={13} className="text-[#304156]/50" /> Completed
              </h2>
              {completed.map(e => <CompletedCard key={e.id} enrollment={e} />)}
            </section>
          )}

          {/* Explore more — ONLY shown when user has no active/pending/onboarding enrollments */}
          {hasOnlyDone && (
            <section>
              <h2 className="font-black text-[#304156] text-xs uppercase tracking-[0.12em] mb-3">
                Explore More Programs
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(TRACK_META)
                  .filter(([id]) => !enrollments.find(e => e.track_id === id))
                  .map(([id, track]) => {
                    const intensive = COURSE_PACKAGES.find(p => p.trackId === id && p.type === "intensive");
                    return (
                      <button key={id} onClick={() => setSelectedTrack(id as CourseTrack)}
                        className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[#304156]/8 hover:border-[#304156]/20 hover:shadow-sm transition-all text-left group">
                        <span className="text-xl">{track.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-[#304156] truncate">{track.label}</p>
                          {intensive && <p className="text-[9px] text-[#577E90] mt-0.5">from {formatIDR(intensive.sessions * PRICE_PER_SESSION)}</p>}
                        </div>
                        <ArrowRight size={12} className="text-[#304156]/20 group-hover:text-[#304156]/50 transition-colors" />
                      </button>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Bottom CTA for active users */}
          {!hasOnlyDone && (
            <div className="bg-[#304156] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="font-black">Need to book or reschedule?</p>
                <p className="text-white/45 text-xs mt-0.5">Book via Google Calendar · Confirm with Arba (088297253491) · Min H-3</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={BOOKING_URL} target="_blank"
                  className="px-4 py-2 bg-white text-[#304156] rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-white/90 transition-all">
                  <Calendar size={12} /> Book Now
                </Link>
                <Link href={MENTOR_WA} target="_blank"
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl font-black text-xs flex items-center gap-1.5 border border-white/15 transition-all">
                  <MessageCircle size={12} /> WhatsApp
                </Link>
              </div>
            </div>
          )}

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
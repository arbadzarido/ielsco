"use client";
// src/components/courses/CurriculumModal.tsx

import { createPortal } from "react-dom";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X, ChevronDown, ChevronUp, BookOpen,
  CheckCircle2, Clock, Award, Star, ArrowRight,
  ExternalLink, MessageCircle,
} from "lucide-react";
import {
  CoursePackage, MENTORS, COURSE_PACKAGES,
  GOOGLE_FORM_URL, WHATSAPP_URL, PRICE_PER_SESSION, LOUNGE_VALUE, CourseTrack,
} from "@/data/courses";

interface CurriculumModalProps {
  /** Pass the track ID to open the modal for that track */
  trackId: CourseTrack | null;
  onClose: () => void;
  isDashboard?: boolean;
  onEnroll?: (pkg: CoursePackage) => void;
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── TOGGLE ──────────────────────────────────────────────────────────────────

function PackageToggle({
  value,
  onChange,
  intensiveSessions,
  extensiveSessions,
}: {
  value: "intensive" | "extensive";
  onChange: (v: "intensive" | "extensive") => void;
  intensiveSessions: number;
  extensiveSessions: number;
}) {
  const isExtensive = value === "extensive";

  return (
    <div className="flex items-center justify-center gap-3 py-1">
      {/* Intensive label */}
      <button
        onClick={() => onChange("intensive")}
        className={`text-sm font-bold transition-colors text-right ${
          !isExtensive ? "text-white" : "text-white/40"
        }`}
      >
        Intensive
        <span className={`ml-1.5 text-[10px] font-medium transition-colors ${!isExtensive ? "text-white/60" : "text-white/25"}`}>
          {intensiveSessions} sessions
        </span>
      </button>

      {/* Pill toggle */}
      <button
        onClick={() => onChange(isExtensive ? "intensive" : "extensive")}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 border-2 ${
          isExtensive
            ? "bg-white/20 border-white/30"
            : "bg-white/10 border-white/20"
        }`}
        aria-label="Toggle package type"
      >
        <span
          className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-300 ${
            isExtensive ? "left-[22px]" : "left-[3px]"
          }`}
        />
      </button>

      {/* Extensive label */}
      <button
        onClick={() => onChange("extensive")}
        className={`text-sm font-bold transition-colors flex items-center gap-2 ${
          isExtensive ? "text-white" : "text-white/40"
        }`}
      >
        Extensive
        <span className={`text-[10px] font-medium transition-colors ${isExtensive ? "text-white/60" : "text-white/25"}`}>
          {extensiveSessions} sessions
        </span>
        <span className="bg-white/15 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
          Most Complete
        </span>
      </button>
    </div>
  );
}

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────

export default function CurriculumModal({
  trackId,
  onClose,
  isDashboard,
  onEnroll,
}: CurriculumModalProps) {
  const [packageType, setPackageType] = useState<"intensive" | "extensive">("intensive");
  const [expandedSession, setExpandedSession] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<"overview" | "curriculum">("overview");

  if (!trackId) return null;

  const intensivePkg = COURSE_PACKAGES.find(
    (p) => p.trackId === trackId && p.type === "intensive"
  );
  const extensivePkg = COURSE_PACKAGES.find(
    (p) => p.trackId === trackId && p.type === "extensive"
  );

  const pkg = packageType === "intensive" ? intensivePkg : (extensivePkg ?? intensivePkg);
  if (!pkg) return null;

  const hasExtensive = !!extensivePkg;

  const mentor = MENTORS.find((m) => m.id === pkg.mentorId)!;

  const handleTypeChange = (v: "intensive" | "extensive") => {
    setPackageType(v);
    setExpandedSession(1);
    setActiveTab("overview");
  };

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: "iels-fadeIn 0.2s ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#304156]/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        style={{ animation: "iels-slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* ── HEADER ── */}
        <div className="shrink-0 bg-[#304156] px-6 pt-6 pb-0 text-white">

          {/* Top: title + close */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-1.5">
                IELS Course Program
              </p>
              <h2 className="text-xl font-black leading-tight">
                {/* Strip "Intensive" / "Extensive" from name since we show toggle */}
                {pkg.name.replace(/ Intensive| Extensive/gi, "").trim()}
              </h2>
              <p className="text-sm text-white/50 mt-1">
                with {mentor.name} &nbsp;·&nbsp; Level {pkg.level}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white shrink-0 ml-3 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Toggle — only show if extensive version exists */}
          {hasExtensive && (
            <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-3 mb-5">
              <PackageToggle
                value={packageType}
                onChange={handleTypeChange}
                intensiveSessions={intensivePkg!.sessions}
                extensiveSessions={extensivePkg!.sessions}
              />
            </div>
          )}

          {/* Quick stats */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/10 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <Clock size={11} /> {pkg.sessions} sessions
            </span>
            <span className="flex items-center gap-1.5">
              <Award size={11} /> Certificate
            </span>
            <span className="flex items-center gap-1.5">
              <Star size={11} /> IELS Lounge 1yr
            </span>
            <span className="ml-auto font-black text-white text-base">
              {formatIDR(pkg.sessions * PRICE_PER_SESSION)}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-[1px]">
            {(["overview", "curriculum"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${
                  activeTab === tab
                    ? "bg-white text-[#304156]"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {tab === "overview" ? "Overview" : `Curriculum (${pkg.curriculum.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="overflow-y-auto flex-1 bg-[#F7F8FA]">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" ? (
            <div className="p-6 space-y-5">

              <p className="text-gray-500 leading-relaxed text-sm">{pkg.description}</p>

              {/* Outcomes */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h4 className="font-black text-[#304156] text-sm mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#577E90]" />
                  What You'll Achieve
                </h4>
                <ul className="space-y-2.5">
                  {pkg.outcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-[#577E90]/15 text-[#304156] flex items-center justify-center text-[9px] font-black shrink-0">
                        {i + 1}
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm text-center">
                  <p className="font-black text-2xl text-[#304156]">{pkg.sessions}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Sessions</p>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm text-center">
                  <p className="font-black text-sm text-[#304156] mt-1">{pkg.level}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Level</p>
                </div>
                <div className="bg-[#304156] rounded-xl p-3.5 text-center">
                  <p className="text-white text-lg font-black">✓</p>
                  <p className="text-[10px] text-white/60 font-medium mt-0.5">Certificate</p>
                </div>
              </div>

                 {/* Mentor */}
              <div className="bg-[#304156] rounded-2xl p-5 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                  Your Mentor
                </p>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <Image src={mentor.image} alt={mentor.name} fill className="object-cover object-top" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black">{mentor.name}</p>
                    <p className="text-xs text-white/50 mb-2">{mentor.role}</p>
                    <ul className="mt-1 space-y-1">
                      {mentor.highlights.map((h, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-white/65 leading-relaxed">
                          <span>{h.emoji}</span> {h.text}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 mt-3">
                      <Link href={mentor.instagram} target="_blank"
                        className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors">
                        Instagram
                      </Link>
                      <Link href={mentor.linkedin} target="_blank"
                        className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors">
                        LinkedIn
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h4 className="font-black text-[#304156] text-sm mb-4">Pricing Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{pkg.sessions} sessions × {formatIDR(PRICE_PER_SESSION)}</span>
                    <span className="font-bold text-[#304156]">{formatIDR(pkg.sessions * PRICE_PER_SESSION)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <span className="text-[9px] bg-[#577E90]/15 text-[#304156] px-1.5 py-0.5 rounded font-black uppercase">Free</span>
                      IELS Lounge Premium (1 Year)
                    </span>
                    <span className="text-gray-300 line-through text-xs">{formatIDR(LOUNGE_VALUE)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <span className="text-[9px] bg-[#577E90]/15 text-[#304156] px-1.5 py-0.5 rounded font-black uppercase">Free</span>
                      Placement Test + Certificate
                    </span>
                    <span className="text-gray-300 line-through text-xs">Rp 150.000</span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
                    <span className="font-black text-[#304156]">Total Investment</span>
                    <div className="text-right">
                      <p className="font-black text-2xl text-[#304156]">
                        {formatIDR(pkg.sessions * PRICE_PER_SESSION)}
                      </p>
                      <p className="text-[10px] text-gray-400">Lounge & Certificate included</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Payment via Bank Transfer</p>
                  <div className="bg-[#304156]/5 rounded-xl p-3">
                    <p className="font-bold text-[#304156] text-sm">Bank Jago · 103196849968</p>
                    <p className="text-gray-400 text-xs mt-0.5">a.n. Arbadza Rido Adzariyat</p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-[#577E90]/8 border border-[#577E90]/20 rounded-xl text-xs text-[#304156] font-medium">
                  Want a custom number of sessions?{" "}
                  <Link href={WHATSAPP_URL} target="_blank" className="underline font-black">
                    Chat with us →
                  </Link>
                </div>
              </div>
            </div>

          ) : (
            /* ── CURRICULUM ── */
            <div className="p-5 space-y-2">
              <p className="text-xs text-gray-400 font-medium px-1 pb-1">
                {pkg.curriculum.length} sessions · personalized after placement test
              </p>

              {pkg.curriculum.map((session) => {
                const isOpen = expandedSession === session.session;
                const isFinal = session.session === pkg.curriculum.length;

                return (
                  <div key={session.session} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedSession(isOpen ? null : session.session)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                          isFinal
                            ? "bg-[#304156] text-white"
                            : "bg-[#304156]/8 text-[#304156]"
                        }`}
                      >
                        {session.session}
                      </span>
                      <span className="flex-1 font-semibold text-sm text-[#304156] leading-snug pr-2">
                        {session.title}
                      </span>
                      {isOpen
                        ? <ChevronUp size={14} className="text-[#577E90] shrink-0" />
                        : <ChevronDown size={14} className="text-gray-300 shrink-0" />
                      }
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-2">
                            Learning Objectives
                          </p>
                          <ul className="space-y-1.5">
                            {session.objectives.map((o, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                                <span className="text-[#304156]/60 font-bold mt-0.5 shrink-0">→</span>
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#577E90] mb-2">
                            Activities
                          </p>
                          <ul className="space-y-1.5">
                            {session.activities.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                                <span className="w-4 h-4 rounded-full border border-[#577E90]/30 text-[#304156] flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-start gap-2 bg-[#304156]/5 rounded-lg px-3 py-2.5">
                          <BookOpen size={11} className="text-[#577E90] mt-0.5 shrink-0" />
                          <p className="text-xs text-[#304156]/80 font-medium leading-relaxed">
                            {session.materials}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="shrink-0 p-4 bg-white border-t border-gray-100 flex gap-3">
          {isDashboard ? (
            <button
              onClick={() => onEnroll?.(pkg)}
              className="flex-1 py-3.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Enroll & Start Pathway <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <Link
                href={GOOGLE_FORM_URL}
                target="_blank"
                className="flex-1 py-3.5 bg-[#304156] hover:bg-[#1e2a38] text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm text-center"
              >
                Register for This Course <ExternalLink size={13} />
              </Link>
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                className="py-3.5 px-4 bg-[#304156]/8 hover:bg-[#304156]/15 text-[#304156] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={15} /> Ask
              </Link>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes iels-fadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes iels-slideUp {
          from { transform: translateY(40px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
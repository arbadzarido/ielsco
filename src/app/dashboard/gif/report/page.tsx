"use client";

/**
 * ============================================================
 * GIF SINGAPORE 2026 — PHASE 3 EVALUATION REPORT (v2)
 * /app/dashboard/gif/report/page.tsx
 * ============================================================
 *
 * This page is an "Actionable Roadmap & Appreciation" for all
 * Phase 3 participants — not just a report card.
 *
 * DYNAMIC RENDERING BY RANK:
 *   Rank  1–10  → Fully Funded Delegate banner (Gold/Maroon)
 *   Rank 11–20  → Partial Funded Delegate banner (Navy/Silver)
 *   Rank 21+    → Top 60 GIF Finalist banner (warm/appreciative)
 *                 + Waitlist Opt-In card
 *
 * PDF PRINT:
 *   Only the printable zone (#gif-report-print) is rendered in
 *   @media print — includes scores, breakdown, and feedback only.
 *   The status banner, waitlist card, mentor match, and CTAs
 *   are excluded from print via .no-print / .print-only classes.
 *
 * SUPABASE COLUMNS (gif_phase3_evaluations):
 *   score_impact, score_deck, score_delivery  — SMALLINT 0–100
 *   total_score                               — GENERATED NUMERIC(5,2)
 *   rank, total_participants                  — SMALLINT
 *   project_title                             — TEXT
 *   feedback_strengths                        — TEXT
 *   feedback_improvements                     — TEXT
 *   actionable_next_step                      — TEXT  (NEW)
 *   mentor_match                              — TEXT  (NEW, e.g. "Fadhila - Principal of Growth")
 *   waitlist_status                           — VARCHAR ('pending'|'interested'|'declined') (NEW)
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import Link                    from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti"; // Taruh di barisan import atas
import {
  ArrowLeft,
  Download,
  Trophy,
  Crown,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  FileText,
  Sparkles,
  Award,
  BarChart3,
  MessageSquare,
  Lightbulb,
  Rocket,
  Map,
  Star,
  CalendarDays,
  Gift,
  BookOpen,
  Target,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Mail,
  Medal,
  Clock,
  Info,
  ChevronRight,
  UserCheck,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button }      from "@/components/ui/button";
import { cn }          from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================
// Ubah di bagian deklarasi prop komponen (di file yang berisi komponen Card)

type UserProfile = {
  full_name: string;
  email:     string;
  avatar_url?: string;
  tier?: "explorer" | "insider" | "visionary";
};

type WaitlistStatus = "pending" | "interested" | "declined";

type Phase3Evaluation = {
  id:                    string;
  registration_id:       string;
  user_id:               string;
  score_impact:          number;
  score_deck:            number;
  score_delivery:        number;
  total_score:           number;
  rank:                  number | null;
  total_participants:    number | null;
  project_title:         string | null;
  feedback_strengths:    string | null;
  feedback_improvements: string | null;
  actionable_next_step:  string | null;
  mentor_match:          string | null;
  waitlist_status:       WaitlistStatus;
  created_at:            string;
  updated_at:            string;
};

// ============================================================
// HELPERS
// ============================================================

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

type RankTier = "fully_funded" | "partial_funded" | "waitlist";

function getRankTier(rank: number | null): RankTier {
  if (!rank)       return "waitlist";
  if (rank <= 10)  return "fully_funded";
  if (rank <= 20)  return "partial_funded";
  return "waitlist";
}

// ============================================================
// SCORE BAR
// ============================================================

function ScoreBar({
  label, sublabel, score, weight, barClass, delay = 0,
}: {
  label: string; sublabel: string; score: number;
  weight: string; barClass: string; delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 300 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#304156]">{label}</span>
            <span className="text-[10px] font-bold text-white bg-[#914D4D]/80 px-2 py-0.5 rounded-full">{weight}</span>
          </div>
          <span className="text-xs text-gray-400">{sublabel}</span>
        </div>
        <span className={cn("text-3xl font-black tabular-nums", barClass.replace("bg-", "text-"))}>{score}</span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out", barClass)}
          style={{ width: `${width}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
      </div>
      <div className="flex justify-between">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v} className="text-[9px] text-gray-300 font-medium">{v}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DYNAMIC STATUS BANNER
// ============================================================

function StatusBanner({ tier, rank, totalParticipants, participantName, projectTitle }: {
  tier: RankTier; rank: number | null;
  totalParticipants: number | null; participantName: string; projectTitle: string | null;
}) {
  if (tier === "fully_funded") {
    return (
      <div className="relative overflow-hidden rounded-3xl shadow-2xl text-white print-hide"
        style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #4A1A1A 50%, #7A3030 100%)" }}>
        {/* Gold shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-yellow-600/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500 rounded-full blur-[150px] opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Trophy icon */}
            <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 rounded-2xl p-5 shrink-0">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 px-4 py-1.5 rounded-full">
                <Crown className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-200">
                  Fully Funded — Top 10 Delegate
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black leading-tight">
                You've made it, <br />
                <span className="text-yellow-300">{participantName.split(" ")[0]}! 🏆</span>
              </h1>

              <p className="text-white/80 text-lg font-light max-w-2xl leading-relaxed">
                You ranked <strong className="text-yellow-300">#{rank}</strong> among all participants — placing you in the{" "}
                <strong className="text-white">Top 10 Fully Funded Delegates</strong> of GIF Singapore 2026.
                Your travel, program fees, and accommodation are fully covered. Welcome to the GIF Family.
              </p>

              {projectTitle && (
                <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 max-w-lg">
                  <FileText className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span className="text-sm font-semibold text-white/90">{projectTitle}</span>
                </div>
              )}
            </div>

            {/* Rank badge */}
            <div className="bg-yellow-400/15 border border-yellow-400/30 rounded-2xl px-6 py-5 text-center shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-300/70 mb-1">Your Rank</div>
              <div className="text-5xl font-black text-yellow-300 tabular-nums">#{rank}</div>
              {totalParticipants && (
                <div className="text-xs text-white/50 mt-1">of {totalParticipants}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tier === "partial_funded") {
    return (
      <div className="relative overflow-hidden rounded-3xl shadow-2xl text-white print-hide"
        style={{ background: "linear-gradient(135deg, #1C2B3A 0%, #2F4055 60%, #3d506b 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C0C0C0] rounded-full blur-[150px] opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 shrink-0">
              <Medal className="w-12 h-12 text-[#C0C0C0]" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full">
                <Award className="w-4 h-4 text-[#C0C0C0]" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                  Partial Funded — Top 20 Delegate
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black leading-tight">
                Congratulations, <br />
                <span className="text-[#C0C0C0]">{participantName.split(" ")[0]}! 🎉</span>
              </h1>

              <p className="text-white/80 text-lg font-light max-w-2xl leading-relaxed">
                You ranked <strong className="text-[#C0C0C0]">#{rank}</strong> — securing a{" "}
                <strong className="text-white">Partial Funded Scholarship</strong> to GIF Singapore 2026.
                A portion of your program costs is covered. Our team will reach out with the full scholarship breakdown shortly.
              </p>

              {projectTitle && (
                <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 max-w-lg">
                  <FileText className="w-4 h-4 text-[#C0C0C0] shrink-0" />
                  <span className="text-sm font-semibold text-white/90">{projectTitle}</span>
                </div>
              )}
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl px-6 py-5 text-center shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Your Rank</div>
              <div className="text-5xl font-black text-[#C0C0C0] tabular-nums">#{rank}</div>
              {totalParticipants && (
                <div className="text-xs text-white/40 mt-1">of {totalParticipants}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waitlist / Top 60 Finalist
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-xl text-white print-hide"
      style={{ background: "linear-gradient(135deg, #2F4055 0%, #3d5068 50%, #4a5e70 100%)" }}>
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#914D4D] rounded-full blur-[120px] opacity-15 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="bg-white/10 border border-white/15 rounded-2xl p-5 shrink-0">
            <Star className="w-12 h-12 text-[#FFD1D1]" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-[#FFD1D1]" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                Top 60 GIF Finalist
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black leading-tight">
              Thank you for everything,{" "}
              <span className="text-[#FFD1D1]">{participantName.split(" ")[0]}. 💪</span>
            </h1>

            <p className="text-white/80 text-lg font-light max-w-2xl leading-relaxed">
              You reached <strong className="text-white">Phase 3 of GIF 2026</strong> out of hundreds of applicants —
              that places you in the <strong className="text-[#FFD1D1]">Top {totalParticipants ?? 60} finalists</strong>.
              You conducted field research, built a real project, and stood in front of a panel of judges.
              That effort is extraordinary, and it doesn't go unnoticed.
            </p>

            {projectTitle && (
              <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 max-w-lg">
                <FileText className="w-4 h-4 text-[#FFD1D1] shrink-0" />
                <span className="text-sm font-semibold text-white/90">{projectTitle}</span>
              </div>
            )}
          </div>

          <div className="bg-white/10 border border-white/15 rounded-2xl px-6 py-5 text-center shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Your Rank</div>
            <div className="text-5xl font-black text-[#FFD1D1] tabular-nums">#{rank ?? "—"}</div>
            {totalParticipants && (
              <div className="text-xs text-white/40 mt-1">of {totalParticipants}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// FULLY FUNDED ACTION CARD
// ============================================================
function FullyFundedActionCard({
  status, onAccept, onDecline, onReset
}: {
  status: WaitlistStatus;
  onAccept?: () => void | Promise<void>; 
  onDecline?: () => void | Promise<void>;
  onInterested?: () => void | Promise<void>;
  onReset: () => void | Promise<void>; // <-- Sesuaikan typenya agar menerima Promise
}) {
  if (status === "interested") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#304156]/5 border border-[#304156]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between print-hide">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-[#304156] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#304156] mb-1">Fully Funded Slot Accepted! ✅</p>
            <p className="text-sm text-[#304156]/70 leading-relaxed mb-2">
              Please complete the commitment fee payment of <strong>Rp 799.000</strong> (Includes Flight Ticket) by <strong>June 29, 2026</strong>. Join the official WhatsApp group below to stay updated!
            </p>
            <p className="text-xs text-[#304156]/60">
              * Full details will be briefed soon. Questions? Email <a href="mailto:events@ielsco.com" className="font-bold underline hover:text-[#304156]">events@ielsco.com</a>
            </p>
            <button onClick={onReset} className="text-xs font-medium text-red-500 hover:text-red-700 underline mt-3 inline-block">
              Missclicked? Change your decision
            </button>
          </div>
        </div>
        <Link href="https://chat.whatsapp.com/HeyNfvIcIuC8Kb8VfKV0rs?s=cl&p=i&ilr=2&amv=0" target="_blank" className="w-full sm:w-auto">
          <Button className="w-full py-2.5 px-6 rounded-xl font-bold bg-[#25D366] hover:bg-[#1DA851] text-white shadow-sm flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Join WA Group
          </Button>
        </Link>
      </motion.div>
    );
  }

  if (status === "declined") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex items-start gap-4 print-hide">
        <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-500 leading-relaxed">
            You have declined the Fully Funded slot. This slot will be passed to the next highest-ranking candidate.
          </p>
          <button onClick={onReset} className="text-xs font-medium text-gray-400 hover:text-gray-600 underline mt-2 inline-block">
            Missclicked? Change your decision
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-yellow-400/50 rounded-2xl p-6 md:p-8 shadow-sm print-hide">
      <div className="flex items-start gap-4 mb-4">
        <div className="bg-yellow-400/20 p-3 rounded-xl shrink-0">
          <Clock className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h3 className="font-bold text-[#304156] text-lg mb-1">Action Required: Secure Your Fully Funded Slot</h3>
          <p className="text-sm text-[#304156]/70 leading-relaxed">
            Welcome to the Top 10! You must confirm your attendance by <strong>June 19, 2026</strong> to secure your spot and get access to the exclusive cohort communication group.
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 leading-relaxed">
            <strong>Important Notice regarding SGD Rate:</strong> Due to the recent significant increase in the Singapore Dollar exchange rate, we have adjusted our budget allocation. To ensure we maintain the highest quality of your abroad experience without compromises, Fully Funded delegates are subject to a minor commitment fee of <strong>Rp 799.000 <span className="underline decoration-yellow-600/50">(Includes Flight Ticket)</span></strong>. Payment deadline is <strong>June 29, 2026</strong>.
            <div className="mt-3 text-xs bg-yellow-100/50 p-2 rounded-lg inline-block">
              * Full terms and benefit details will be briefed soon. For inquiries: <a href="mailto:events@ielsco.com" className="font-bold underline hover:text-yellow-600">events@ielsco.com</a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onAccept} className="flex-1 py-3 rounded-xl font-bold bg-[#304156] hover:bg-[#2F4055] text-white shadow-md flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> I Accept & Proceed
        </Button>
        <Button onClick={onDecline} className="flex-1 py-3 rounded-xl font-bold bg-white border-2 border-[#304156]/20 text-[#304156]/70 hover:bg-gray-50 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> No, Pass to Waitlist
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================
// PARTIAL FUNDED ACTION CARD
// ============================================================
function PartialFundedActionCard({
  status, onAccept, onDecline, onReset
}: {
  status: WaitlistStatus;
  onAccept?: () => void | Promise<void>; 
  onDecline?: () => void | Promise<void>;
  onInterested?: () => void | Promise<void>;
  onReset: () => void | Promise<void>; // <-- Sesuaikan typenya agar menerima Promise
}) {
  if (status === "interested") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#304156]/5 border border-[#304156]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between print-hide">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-[#304156] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#304156] mb-1">Slot Accepted! ✅</p>
            <p className="text-sm text-[#304156]/70 leading-relaxed mb-2">
              You have successfully claimed your Partial Funded slot. Please complete your payment of <strong>Rp 4.999.000</strong> by <strong>June 29, 2026</strong>. Join our official WhatsApp group below!
            </p>
            <p className="text-xs text-[#304156]/60">
              * Full details will be briefed soon. Questions? Email <a href="mailto:events@ielsco.com" className="font-bold underline hover:text-[#304156]">events@ielsco.com</a>
            </p>
            <button onClick={onReset} className="text-xs font-medium text-red-500 hover:text-red-700 underline mt-3 inline-block">
              Missclicked? Change your decision
            </button>
          </div>
        </div>
        <Link href="https://chat.whatsapp.com/HeyNfvIcIuC8Kb8VfKV0rs?s=cl&p=i&ilr=2&amv=0" target="_blank" className="w-full sm:w-auto">
          <Button className="w-full py-2.5 px-6 rounded-xl font-bold bg-[#25D366] hover:bg-[#1DA851] text-white shadow-sm flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Join WA Group
          </Button>
        </Link>
      </motion.div>
    );
  }

  if (status === "declined") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex items-start gap-4 print-hide">
        <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-500 leading-relaxed">
            You have declined the Partial Funded slot. This slot will be passed to the next candidate on the waitlist.
          </p>
          <button onClick={onReset} className="text-xs font-medium text-gray-400 hover:text-gray-600 underline mt-2 inline-block">
            Missclicked? Change your decision
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-[#914D4D]/20 rounded-2xl p-6 md:p-8 shadow-sm print-hide">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-[#914D4D]/10 p-3 rounded-xl shrink-0">
          <Clock className="w-6 h-6 text-[#914D4D]" />
        </div>
        <div>
          <h3 className="font-bold text-[#304156] text-lg mb-1">Action Required: Claim Your Slot</h3>
          <p className="text-sm text-[#304156]/70 leading-relaxed mb-3">
            You must confirm your intention to take this Partial Funded slot by <strong>June 19, 2026</strong>. 
            If you accept, your payment deadline will be <strong>June 29, 2026</strong>. If you decline or miss the deadline, your slot will be transferred to the waitlist.
          </p>
          
          <div className="bg-[#914D4D]/5 rounded-lg p-3 border border-[#914D4D]/10 inline-block">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Program Fee</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-[#914D4D]">Rp 4.999.000</span>
              <span className="text-xs text-gray-400 line-through">Rp 8.999.000</span>
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">* Excludes Flight Ticket</p>
          </div>

          <div className="mt-3 text-xs bg-gray-50 p-2 rounded-lg text-gray-600">
            * Full payment & benefit details will be briefed soon. For inquiries: <a href="mailto:events@ielsco.com" className="font-bold underline hover:text-[#914D4D]">events@ielsco.com</a>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onAccept} className="flex-1 py-3 rounded-xl font-bold bg-[#304156] hover:bg-[#2F4055] text-white shadow-md flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Yes, I Claim This Slot
        </Button>
        <Button onClick={onDecline} className="flex-1 py-3 rounded-xl font-bold bg-white border-2 border-[#304156]/20 text-[#304156]/70 hover:bg-gray-50 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> No, Pass to Waitlist
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================
// WAITLIST ACTION CARD
// ============================================================
function WaitlistActionCard({
  status, onInterested, onDecline, onReset
}: {
 status: WaitlistStatus;
  onAccept?: () => void | Promise<void>; 
  onDecline?: () => void | Promise<void>;
  onInterested?: () => void | Promise<void>;
  onReset: () => void | Promise<void>; // <-- Sesuaikan typenya agar menerima Promise
}) {
  if (status === "interested") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#304156]/5 border border-[#304156]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between print-hide">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-[#304156] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#304156] mb-1">You're on the Waitlist — We'll be in touch! ✅</p>
            <p className="text-sm text-[#304156]/70 leading-relaxed mb-2">
              If a Partial Funded slot opens up, we will notify you via email by <strong>June 19, 2026</strong>. If selected, your payment deadline will be <strong>June 29, 2026</strong>. 
            </p>
            <p className="text-xs text-[#304156]/60">
              * Full details will be briefed soon. Questions? Email <a href="mailto:events@ielsco.com" className="font-bold underline hover:text-[#304156]">events@ielsco.com</a>
            </p>
            <button onClick={onReset} className="text-xs font-medium text-red-500 hover:text-red-700 underline mt-3 inline-block">
              Missclicked? Change your decision
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "declined") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex items-start gap-4 print-hide">
        <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-500 leading-relaxed">
            You have opted out of the Partial Funded waitlist. You can still participate as a Self-Funded delegate below.
          </p>
          <button onClick={onReset} className="text-xs font-medium text-gray-400 hover:text-gray-600 underline mt-2 inline-block">
            Missclicked? Change your decision
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-[#914D4D]/20 rounded-2xl p-6 md:p-8 shadow-sm print-hide">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-[#914D4D]/10 p-3 rounded-xl shrink-0">
          <Clock className="w-6 h-6 text-[#914D4D]" />
        </div>
        <div>
          <h3 className="font-bold text-[#304156] text-lg mb-1">You're on the Partial Funded Waitlist</h3>
          <p className="text-sm text-[#304156]/70 leading-relaxed mb-3">
            Some Top 20 candidates may not take their slot. If one opens, we'll offer it to you based on rank. 
            We will send a follow-up email by <strong>June 19, 2026</strong> if you are selected. 
            (Payment deadline if selected: <strong>June 29, 2026</strong>).
          </p>

          <div className="bg-[#914D4D]/5 rounded-lg p-3 border border-[#914D4D]/10 inline-block">
             <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Expected Fee (If Selected)</p>
             <div className="flex items-baseline gap-2">
               <span className="text-lg font-black text-[#914D4D]">Rp 4.999.000</span>
               <span className="text-xs text-gray-400 line-through">Rp 8.999.000</span>
             </div>
             <p className="text-[11px] font-medium text-gray-500 mt-0.5">* Excludes Flight Ticket</p>
          </div>

          <div className="mt-3 text-xs bg-gray-50 p-2 rounded-lg text-gray-600">
            * Full payment & benefit details will be briefed soon. For inquiries: <a href="mailto:events@ielsco.com" className="font-bold underline hover:text-[#914D4D]">events@ielsco.com</a>
          </div>
        </div>
      </div>

      <div className="bg-[#914D4D]/5 border border-[#914D4D]/10 rounded-xl p-4 mb-6 text-sm text-[#914D4D]/80 leading-relaxed">
        <strong>Are you willing to take a Partial Funded slot if one becomes available?</strong>{" "}
        Please confirm your interest so we can reach you quickly.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onInterested} className="flex-1 py-3 rounded-xl font-bold bg-[#304156] hover:bg-[#2F4055] text-white shadow-md flex items-center justify-center gap-2">
          <ThumbsUp className="w-4 h-4" /> Yes, I'm Interested
        </Button>
        <Button onClick={onDecline} className="flex-1 py-3 rounded-xl font-bold bg-white border-2 border-[#304156]/20 text-[#304156]/70 hover:bg-gray-50 flex items-center justify-center gap-2">
          <ThumbsDown className="w-4 h-4" /> No, I'll Pass
        </Button>
      </div>
    </motion.div>
  );
}


// ============================================================
// LOADING / EMPTY STATES
// ============================================================

function ReportSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-52 bg-gray-100 rounded-3xl" />
      <div className="grid md:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="h-72 bg-gray-100 rounded-2xl" />
      <div className="h-56 bg-gray-100 rounded-2xl" />
    </div>
  );
}

function NotEvaluatedState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-20 h-20 bg-[#914D4D]/10 rounded-full flex items-center justify-center mb-6">
        <BarChart3 className="w-9 h-9 text-[#914D4D]/60" />
      </div>
      <h2 className="text-2xl font-black text-[#304156] mb-3">Report Not Available Yet</h2>
      <p className="text-gray-500 max-w-md leading-relaxed mb-8">
        Your Phase 3 evaluation is currently being reviewed by our judges. Results will appear here once scoring is complete — usually within 5–7 business days after the submission deadline.
      </p>
      <Link href="/dashboard/gif">
        <Button className="px-8 py-3 bg-[#304156] hover:bg-[#2F4055] text-white font-bold rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Phase3ReportPage() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading,      setLoading]      = useState(true);
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);
  const [evaluation,   setEvaluation]   = useState<Phase3Evaluation | null>(null);
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatus>("pending");

// ── TAMBAHKAN STATE INI ──
const [suspenseLoading, setSuspenseLoading] = useState(true);
const [loadingText, setLoadingText] = useState("Unlocking the vault...");

const suspensePhrases = [
  "Gathering the judges' scores...",
  "Reviewing your pitch deck...",
  "Calculating final ranks...",
  "Preparing your evaluation report...",
  "Moment of truth..."
];
// ── TAMBAHKAN EFFECT INI ──
  useEffect(() => {
    // Tunggu sampai data asli dari DB selesai di-load
    if (loading) return; 

    // Ganti teks setiap 1 detik
    let step = 0;
    const textInterval = setInterval(() => {
      step++;
      if (step < suspensePhrases.length) {
        setLoadingText(suspensePhrases[step]);
      }
    }, 1000);

    // Selesai deg-degan setelah 5 detik, matikan suspense & tembak confetti
    const timer = setTimeout(() => {
      setSuspenseLoading(false);
      
      const rank = evaluation?.rank;
      if (rank && rank <= 20) {
        // RANK 1-20: PARTY POPPER HEBOH (Gold/Maroon)
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#FFD1D1', '#914D4D', '#FBBF24', '#304156']
        });
      } else if (rank && rank > 20) {
        // RANK 21-60: APPRECIATION STARS (Elegan & Menyemangati)
        confetti({
          particleCount: 60,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#FFFFFF', '#FFD1D1', '#914D4D'],
          shapes: ['star'],
          gravity: 0.8
        });
      }
    }, 5000); // 5 Detik

    return () => {
      clearInterval(textInterval);
      clearTimeout(timer);
    };
  }, [loading, evaluation]);
  // Load user + evaluation
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/sign-in"); return; }

        const [membershipRes, userRes, gifRegRes] = await Promise.all([
          supabase.from("memberships").select("tier").eq("user_id", user.id).maybeSingle(),
          supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
          supabase.from("gif_registrations").select("id").eq("user_id", user.id).maybeSingle(),
        ]);

        const dbTier = membershipRes.data?.tier;
        let uiTier: "explorer" | "insider" | "visionary" = "explorer";
        if (dbTier === "pro") uiTier = "insider";
        else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";

        setUserProfile({
          full_name:  userRes.data?.full_name || user.user_metadata?.full_name || "Learner",
          email:      user.email || "",
          avatar_url: userRes.data?.avatar_url || user.user_metadata?.avatar_url,
          tier:       uiTier,
        });

        if (gifRegRes.data?.id) {
          const { data: evalData } = await supabase
            .from("gif_phase3_evaluations")
            .select("*")
            .eq("registration_id", gifRegRes.data.id)
            .maybeSingle();

          if (evalData) {
            setEvaluation(evalData as Phase3Evaluation);
            setWaitlistStatus((evalData.waitlist_status as WaitlistStatus) ?? "pending");
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
// Waitlist handlers — optimistic UI + Supabase sync
  const handleWaitlistInterested = async () => {
    setWaitlistStatus("interested"); // Optimistic UI
    
    if (evaluation?.id) {
      const { error } = await supabase
        .from("gif_phase3_evaluations")
        .update({ waitlist_status: "interested" })
        .eq("id", evaluation.id);
        
      if (error) {
        console.error("Gagal update status:", error);
        alert(`Gagal menyimpan pilihan: ${error.message}`);
        setWaitlistStatus("pending"); // Revert UI kalau gagal di database
      }
    }
  };

  const handleWaitlistDecline = async () => {
    setWaitlistStatus("declined"); // Optimistic UI
    
    if (evaluation?.id) {
      const { error } = await supabase
        .from("gif_phase3_evaluations")
        .update({ waitlist_status: "declined" })
        .eq("id", evaluation.id);
        
      if (error) {
        console.error("Gagal update status:", error);
        alert(`Gagal menyimpan pilihan: ${error.message}`);
        setWaitlistStatus("pending"); // Revert UI kalau gagal di database
      }
    }
  };  
  // Contoh implementasi fungsi reset di dalam komponen utama kamu
const handleResetStatus = async () => {
  // 1. Optimistic UI: Balikin tampilannya ke awal (biasanya "pending")
  setWaitlistStatus("pending"); 
  
  // 2. Update Database via Supabase
  if (evaluation?.id) {
    const { error } = await supabase
      .from("gif_phase3_evaluations")
      .update({ waitlist_status: "pending" }) // Balikin status di database jadi pending
      .eq("id", evaluation.id);
      
    if (error) {
      console.error("Gagal mereset status:", error);
      alert(`Gagal mereset pilihan: ${error.message}`);
      // (Opsional) Kalau mau aman, panggil ulang data dari database di sini
    }
  }
};
  const handleDownloadPDF = async () => {
  const name = userProfile?.full_name;
  
  if (!name) {
    alert("Data profil belum lengkap, tunggu sebentar ya...");
    return;
  }

  // 1. Load library secara dinamis biar gak bentrok SSR Next.js
  const { toPng } = await import('html-to-image');
  const { default: jsPDF } = await import('jspdf');

  // 2. Sanitasi nama file
  const safeName = name.replace(/[^a-z0-9]/gi, '_');
  const fileName = `${safeName}_GIF_Report.pdf`;

  const element = document.getElementById('gif-report-print');
  if (!element) {
    console.error("Elemen #gif-report-print tidak ditemukan!");
    return;
  }

  // Ambil elemen Halaman 1 dan Halaman 2
  const page1 = document.getElementById('print-page-1');
  const page2 = document.getElementById('print-page-2');

  if (!page1 || !page2) {
    console.error("Elemen halaman tidak ditemukan!");
    return;
  }

  try {
   // Setting kualitas gambar
    const opt = {
      quality: 0.98,
      pixelRatio: 2, // Biar tetep jernih
      style: { 
        display: 'block',
        width: '800px' // PAKSA LEBAR DESKTOP SAAT DIFOTO DARI HP
      }
    };

    // 1. Potret kedua halaman menjadi PNG
    const dataUrl1 = await toPng(page1, opt);
    const dataUrl2 = await toPng(page2, opt);

    // 2. Setup PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15; // Margin kiri-kanan-atas
    const imgWidth = pdfPageWidth - (margin * 2);

    // --- PROSES HALAMAN 1 ---
    const imgProps1 = pdf.getImageProperties(dataUrl1);
    const imgHeight1 = (imgProps1.height * imgWidth) / imgProps1.width;
    pdf.addImage(dataUrl1, 'PNG', margin, margin, imgWidth, imgHeight1);

    // --- PROSES HALAMAN 2 ---
    pdf.addPage(); // Memaksa buat halaman A4 baru
    const imgProps2 = pdf.getImageProperties(dataUrl2);
    const imgHeight2 = (imgProps2.height * imgWidth) / imgProps2.width;
    pdf.addImage(dataUrl2, 'PNG', margin, margin, imgWidth, imgHeight2);

    // 6. AUTO DOWNLOAD
    pdf.save(fileName);

  } catch (error) {
    console.error("Gagal mengunduh PDF:", error);
    alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
  }
};
  // ── render guards ──
  if (loading || suspenseLoading) {
    return (
      <DashboardLayout userName={userProfile?.full_name} userAvatar={userProfile?.avatar_url} userTier={userProfile?.tier as any}>
        <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center space-y-8 font-geologica">
          
          {/* Lingkaran Loading Dramatis */}
          <div className="relative">
            <div className="w-24 h-24 border-4 border-[#914D4D]/20 border-t-[#914D4D] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[#914D4D] animate-pulse" />
            </div>
          </div>

          {/* Teks yang berganti-ganti */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-black text-[#304156] transition-all duration-300">
              {loadingText}
            </h2>
            <p className="text-gray-400 text-sm font-medium animate-pulse">
              Hold tight! Your results are almost ready...
            </p>
          </div>

        </div>
      </DashboardLayout>
    );
  }

  if (!evaluation) {
  // ... (sisanya biarin persis kayak kodingan lu sebelumnya)
    return (
      <DashboardLayout userName={userProfile?.full_name} userAvatar={userProfile?.avatar_url} userTier={userProfile?.tier as any}>
        <NotEvaluatedState />
      </DashboardLayout>
    );
  }

  // ── Derived ──
  const tier         = getRankTier(evaluation.rank);
  const weighted     = evaluation.total_score;
  const rankDisplay  = evaluation.rank ? ordinal(evaluation.rank) : "—";
  const evalDate     = new Date(evaluation.updated_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const metrics = [
    {
      label:    "Project Feasibility & SDG Impact",
      sublabel: "Realism, sustainability, and alignment with SDG 4",
      score:    evaluation.score_impact,
      weight:   "40%",
      barClass: "bg-[#914D4D]",
      delay:    0,
    },
    {
      label:    "Pitch Deck Structure & Visuals",
      sublabel: "Design quality, data clarity, and narrative flow",
      score:    evaluation.score_deck,
      weight:   "30%",
      barClass: "bg-[#4A6480]",
      delay:    150,
    },
    {
      label:    "Presentation & Delivery",
      sublabel: "Vocal pacing, body language, and persuasiveness",
      score:    evaluation.score_delivery,
      weight:   "30%",
      barClass: "bg-[#2F4055]",
      delay:    300,
    },
  ];

  return (
    <DashboardLayout
      userName={userProfile?.full_name}
      userAvatar={userProfile?.avatar_url}
      userTier={userProfile?.tier as any}
    >
    <style>{`
  @media print {
    /* 1. Reset body dan html agar warna dan ukuran bersih */
    html, body {
      background-color: white !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
      height: auto !important;
      overflow: visible !important;
    }

    /* 2. Sembunyikan semua elemen di layar */
    body * { 
      visibility: hidden; 
    }
    
    /* 3. Munculkan hanya area print beserta semua anak elemennya */
    #gif-report-print, #gif-report-print * { 
      visibility: visible; 
    }
    
    /* 4. Bawa area print ke pojok kiri atas untuk menutupi blank space elemen lain */
    #gif-report-print {
      position: absolute; 
      left: 0; 
      top: 0; 
      width: 100%;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* 5. Paksa warna background, gradient, dan border muncul di kertas */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* 6. MENCEGAH ELEMEN TERPOTONG HALAMAN (Page Breaks) */
    .avoid-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Pastikan judul tidak terpisah dari konten bawahnya di beda halaman */
    h1, h2, h3, h4, .print-header {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* 7. Utility untuk menyembunyikan yg tidak perlu diprint */
    .print-hide { 
      display: none !important; 
    }
    
    /* 8. Setup ukuran kertas & margin */
    @page { 
      size: A4 portrait; 
      margin: 1.2cm 1.5cm; /* Atas/bawah 1.2cm, Kiri/kanan 1.5cm */
    }
      /* Tambahkan di dalam blok @media print yang sebelumnya kita buat */
#gif-report-print * {
  /* Paksa html2canvas mengabaikan variabel warna aneh */
  color-profile: sRGB !important;
}

/* Jika errornya masih ada, paksa background & text color default untuk area print */
#gif-report-print {
  background-color: #ffffff !important;
  color: #304156 !important; 
}
  }
`}</style>
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-20 font-geologica">

        {/* ── Nav bar ── */}
        <div className="flex items-center justify-between mb-8 print-hide">
          <Link href="/dashboard/gif">
            <Button className="rounded-xl bg-white text-[#304156] border border-[#304156]/20 hover:bg-[#304156]/5 shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <Button
            onClick={handleDownloadPDF}
            className="rounded-xl bg-[#304156] hover:bg-[#2F4055] text-white font-bold shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>

     {/* ══════════════════════════════════════════════
            DYNAMIC STATUS BANNER  (excluded from PDF)
        ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-8">
          <StatusBanner
            tier={tier}
            rank={evaluation.rank}
            totalParticipants={evaluation.total_participants}
            participantName={userProfile?.full_name ?? "Participant"}
            projectTitle={evaluation.project_title}
          />
        </motion.div>

        {/* ══════════════════════════════════════════════
            DYNAMIC NEXT STEPS (Based on Tier)
        ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-8">
          
          {tier === "fully_funded" && (
            <FullyFundedActionCard
            status={waitlistStatus} // Kita reuse waitlistStatus untuk logic claim/decline partial funded
              onAccept={handleWaitlistInterested}
              onDecline={handleWaitlistDecline}
              onReset={handleResetStatus} />
          )}

          {tier === "partial_funded" && (
            <PartialFundedActionCard
              status={waitlistStatus} // Kita reuse waitlistStatus untuk logic claim/decline partial funded
              onAccept={handleWaitlistInterested}
              onDecline={handleWaitlistDecline}
              onReset={handleResetStatus}
            />
          )}

          {tier === "waitlist" && (
            <WaitlistActionCard
              status={waitlistStatus}
              onInterested={handleWaitlistInterested}
              onDecline={handleWaitlistDecline}
              onReset={handleResetStatus}
            />
          )}
        </motion.div>

        {/* Self-Funded Nudge for Waitlist/Partial Funded that Declined */}
        {(tier === "waitlist" || tier === "partial_funded") && waitlistStatus === "declined" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-[#914D4D]/5 border border-[#914D4D]/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 print-hide">
            <div className="flex-1">
              <p className="font-bold text-[#914D4D] mb-1">Still want to go to Singapore?</p>
              <p className="text-sm text-[#914D4D]/70 leading-relaxed">
                You can join GIF 2026 as a Self-Funded delegate and experience everything — NUS benchmarking, industry visits, and the full fellowship program.
              </p>
              <Link href="https://ielsco.com/events/gif/finance" target="_blank" className="text-xs font-bold text-[#914D4D] hover:underline mt-2 inline-flex items-center gap-1">
                Read Self-Funded benefits & pricing <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <Link href="https://ielsco.com/events/gif" target="_blank" className="shrink-0">
              <Button className="px-6 py-2.5 rounded-xl font-bold bg-[#914D4D] hover:bg-[#7a3e3e] text-white shadow-md flex items-center gap-2">
                <Globe className="w-4 h-4" /> Apply Self-Funded <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      


  
   {/* PDF PRINTABLE ZONE — everything below prints on paper
══════════════════════════════════════════════════════════ */}

{/* WRAPPER SCROLL: Biar di layar HP aman, bisa digeser ke samping */}
<div className="w-full overflow-x-auto pb-6 print:overflow-visible">

  {/* AREA PRINT: Paksa lebar minimal 800px agar layout mengunci ke versi desktop */}
  <div id="gif-report-print" className="bg-white p-2 min-w-[800px]">
    <div id="print-page-1" className="p-2 pb-6">
      
      {/* ── 1. HEADER: Paksa flex-row dan text-right ── */}
      <div className="bg-[#2F4055] rounded-[2rem] p-8 md:p-10 mb-8 shadow-md flex flex-row items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Kiri: Dua Logo */}
        <div className="relative z-10 flex items-center gap-5 bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/10">
          <img 
            src="/images/logos/iels_white1.png" 
            alt="IELS" 
            className="h-10 w-auto object-contain" 
          />
          <div className="w-px h-10 bg-white/20"></div>
          <img 
            src="/images/logos/events/gifsgp.png" 
            alt="GIF SGP" 
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Kanan: Nama & Judul Project */}
        <div className="relative z-10 text-right">
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Phase 3 Evaluation
          </h1>
          <div className="flex flex-col items-end space-y-1">
            <div className="font-bold text-white text-lg">
              {userProfile?.full_name}
            </div>
            <div className="text-white/80 text-sm font-medium max-w-sm">
              {evaluation.project_title || "GIF Delegate Project"}
            </div>
            <div className="text-[#914D4D] bg-white px-3 py-1 rounded-full text-xs font-bold mt-2 inline-block">
              Evaluated: {evalDate}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCORE SUMMARY: Paksa grid-cols-3 ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45 }}
        className="grid grid-cols-3 gap-5 mb-8">

        {/* Overall score */}
        <div className="avoid-break break-inside-avoid bg-white rounded-3xl border border-[#914D4D]/20 p-7 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#914D4D]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-[#914D4D] uppercase tracking-widest mb-3">Overall Score</div>
            <div className="text-6xl font-black text-[#914D4D] tabular-nums leading-none mb-2">{weighted}</div>
            <div className="text-xs text-gray-400 font-medium mb-3">out of 100</div>
            <div className="text-sm font-bold text-[#914D4D] bg-[#914D4D]/10 px-4 py-1.5 rounded-full">
              {weighted >= 90 ? "Outstanding"
                : weighted >= 80 ? "Excellent"
                : weighted >= 70 ? "Good"
                : "Satisfactory"}
            </div>
          </div>
        </div>

        {/* Rank */}
        <div className="avoid-break break-inside-avoid bg-white rounded-3xl border border-[#2F4055]/15 p-7 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-[#2F4055] uppercase tracking-widest mb-3">Final Rank</div>
            <div className="text-5xl font-black text-[#2F4055] tabular-nums leading-none mb-2">
              #{evaluation.rank ?? "—"}
            </div>
            {evaluation.total_participants && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium">
                <Users className="w-3.5 h-3.5" />
                of {evaluation.total_participants} participants
              </div>
            )}
          </div>
        </div>

        {/* Stars */}
        <div className="avoid-break break-inside-avoid bg-white rounded-3xl border border-[#2F4055]/15 p-7 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFD1D1]/15 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-[#304156] uppercase tracking-widest mb-3">Performance</div>
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star}
                  className={cn("w-7 h-7", weighted / 20 >= star ? "text-[#914D4D] fill-[#914D4D]" : "text-gray-200 fill-gray-200")}
                />
              ))}
            </div>
            <div className="text-xs text-gray-400 font-medium">
              {(Math.round(weighted / 20 * 10) / 10).toFixed(1)} / 5.0
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── METRICS BREAKDOWN ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.45 }}
        className="avoid-break break-inside-avoid bg-white rounded-3xl border border-[#304156]/10 p-8 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#914D4D]/10 p-2.5 rounded-xl">
            <BarChart3 className="w-5 h-5 text-[#914D4D]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#304156]">Evaluation Breakdown</h2>
            <p className="text-xs text-gray-400">Scores are weighted by category</p>
          </div>
        </div>

        <div className="space-y-8">
          {metrics.map((m) => <ScoreBar key={m.label} {...m} />)}
        </div>

        {/* Paksa grid-cols-3 */}
        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className={cn("text-2xl font-black tabular-nums", m.barClass.replace("bg-", "text-"))}>
                {m.score}
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">{m.weight} weight</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>

    <div id="print-page-2" className="p-2">
      {/* ── "TURN YOUR IDEA INTO REALITY" ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.45 }}
        className="mb-8">
        <div className="flex items-center gap-3 mb-6 print-header">
          <div className="bg-[#2F4055]/10 p-2.5 rounded-xl">
            <MessageSquare className="w-5 h-5 text-[#2F4055]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#304156]">Turn Your Idea Into Reality</h2>
            <p className="text-xs text-gray-400">Personalized guidance from the GIF evaluation panel</p>
          </div>
        </div>

        {/* Paksa grid-cols-3 untuk 3 feedback box */}
        <div className="grid grid-cols-3 gap-5">

          {/* 1 — What Worked Well */}
          {evaluation.feedback_strengths && (
            <div className="avoid-break break-inside-avoid bg-[#914D4D]/5 border border-[#914D4D]/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#914D4D]/10 p-2 rounded-xl shrink-0">
                  <CheckCircle className="w-5 h-5 text-[#914D4D]" />
                </div>
                <h3 className="font-bold text-[#914D4D] text-sm">What Worked Well</h3>
              </div>
              <p className="text-sm text-[#304156]/80 leading-relaxed whitespace-pre-line">
                {evaluation.feedback_strengths}
              </p>
            </div>
          )}

          {/* 2 — Critical Blindspots */}
          {evaluation.feedback_improvements && (
            <div className="avoid-break break-inside-avoid bg-[#2F4055]/5 border border-[#2F4055]/15 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#2F4055]/10 p-2 rounded-xl shrink-0">
                  <Target className="w-5 h-5 text-[#2F4055]" />
                </div>
                <h3 className="font-bold text-[#2F4055] text-sm">Critical Blindspots</h3>
              </div>
              <p className="text-sm text-[#304156]/80 leading-relaxed whitespace-pre-line">
                {evaluation.feedback_improvements}
              </p>
            </div>
          )}

          {/* 3 — Real-World Roadmap */}
          {evaluation.actionable_next_step && (
            <div className="avoid-break break-inside-avoid bg-gradient-to-br from-[#2F4055]/5 to-[#914D4D]/5 border border-[#304156]/15 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#304156]/10 p-2 rounded-xl shrink-0">
                  <Map className="w-5 h-5 text-[#304156]" />
                </div>
                <h3 className="font-bold text-[#304156] text-sm">Your Real-World Roadmap</h3>
              </div>
              <p className="text-sm text-[#304156]/80 leading-relaxed whitespace-pre-line">
                {evaluation.actionable_next_step}
              </p>
            </div>
          )}

          {/* Fallback if all feedback empty */}
          {!evaluation.feedback_strengths && !evaluation.feedback_improvements && !evaluation.actionable_next_step && (
            <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
              Detailed feedback from judges will appear here once finalized.
            </div>
          )}
          
        </div>
      </motion.div>

      {/* ── EVALUATION COMMITTEE ── */}
      <div className="avoid-break break-inside-avoid bg-white rounded-3xl border border-[#304156]/10 p-8 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#304156]/10 p-2.5 rounded-xl">
            <Users className="w-5 h-5 text-[#304156]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#304156]">Evaluation Committee</h2>
            <p className="text-xs text-gray-400">Official panelists for Phase 3 Evaluation</p>
          </div>
        </div>

        {/* Paksa grid-cols-2 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="text-sm font-bold text-[#304156]">Arbadza Rido Adzariyat</div>
            <div className="text-xs text-gray-400 mt-1">Lead Evaluator · COO of IELS</div>
          </div>
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="text-sm font-bold text-[#304156]">Jia Wei Lee</div>
            <div className="text-xs text-gray-400 mt-1">Guest Evaluator · NUS Enterprise</div>
          </div>
        </div>

        {/* Paksa text-left */}
        <div className="pt-5 border-t border-gray-100 text-left">
          <p className="text-xs text-gray-500 leading-relaxed">
            For further inquiries, feedback, or verification regarding this evaluation report, please contact the committee via email at{" "}
            <a href="mailto:arbadza@ielsco.com" className="text-[#914D4D] font-bold hover:underline">
              arbadza@ielsco.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  </div>

</div> {/* ── END WRAPPER SCROLL ── */}
        {/* ══════════════════════════════════════════════
            IELS SUPPORT & APPRECIATION GIFT
            (excluded from PDF)
        ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
          className="space-y-5 print-hide">

          {/* Mentor Match */}
          {evaluation.mentor_match && (
            <div className="bg-white border border-[#304156]/15 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="bg-[#304156]/10 p-4 rounded-2xl shrink-0">
                <UserCheck className="w-8 h-8 text-[#304156]" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-[#304156]/50 uppercase tracking-widest mb-1">Mentor Match</div>
                <h3 className="font-bold text-[#304156] text-lg mb-1">
                  {evaluation.mentor_match}
                </h3>
                <p className="text-sm text-[#304156]/70 leading-relaxed">
                  Want to make this project a reality? Book a free 30-minute 1-on-1 consultation with your assigned IELS Principal to discuss next steps, funding strategies, and execution plans.
                </p>
              </div>
              <Link
                href={`mailto:mentoring@ielsco.com?subject=GIF Consultation - ${encodeURIComponent(userProfile?.full_name ?? "")}`}
                className="shrink-0"
              >
                <Button className="px-6 py-3 rounded-xl font-bold bg-[#304156] hover:bg-[#2F4055] text-white shadow-md flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Book Consultation
                </Button>
              </Link>
            </div>
          )}
{/* Appreciation Gift */}
          <div className="relative overflow-hidden rounded-2xl shadow-sm border border-[#914D4D]/20">
            <div className="absolute inset-0 bg-gradient-to-br from-[#914D4D]/5 via-transparent to-[#2F4055]/5 pointer-events-none" />
            
            {/* Ubah struktur flex utama jadi items-start biar teks bisa melebar penuh */}
            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 md:gap-8">
              
              {/* Icon Kado Diperbesar (w-10 h-10, p-5) */}
              <div className="bg-gradient-to-br from-[#914D4D]/10 to-[#2F4055]/10 p-5 rounded-2xl shrink-0 border border-[#914D4D]/10">
                <Gift className="w-10 h-10 text-[#914D4D]" />
              </div>
              
              {/* Kolom Teks dan Button di bawahnya */}
              <div className="flex-1 flex flex-col gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-[#914D4D]/10 text-[#914D4D] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                    <Sparkles className="w-3 h-3" /> Exclusive Rewards
                  </div>
                  <h3 className="font-bold text-[#304156] text-xl mb-4">Your Phase 3 Appreciation Package</h3>
                  
                  <div className="space-y-4">
                    {/* Visionary Membership */}
                    <div className="flex items-start gap-3">
                      <Crown className="w-5 h-5 text-[#914D4D] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#304156]/80 leading-relaxed">
                        <strong className="text-[#304156]">1-Year Visionary Membership:</strong> A free upgrade to our highest, most exclusive community tier. Keep learning, growing, and building with top-tier access.
                      </p>
                    </div>
                    
                    {/* English Global Festival 2027 */}
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-[#914D4D] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#304156]/80 leading-relaxed">
                        <strong className="text-[#304156]">VIP Invite: English Global Festival 2027 (TBA):</strong> An exclusive invitation to our upcoming event series culminating in a grand conference with 1,000+ learners and teachers across Southeast Asia.
                      </p>
                    </div>

                    {/* Project Partnership */}
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-[#914D4D] shrink-0 mt-0.5" />
                      <p className="text-sm text-[#304156]/80 leading-relaxed">
                        <strong className="text-[#304156]">Project Realization Partnership:</strong> We saw the potential in your idea. Get a fast-track opportunity to collaborate with IELS to bring your Phase 3 project to life.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Call to Action dipindah ke bawah */}
                <div>
                  <Link href="/dashboard/community" className="inline-block w-full sm:w-auto">
                    <Button className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-[#2F4055] to-[#914D4D] text-white shadow-xl flex items-center justify-center gap-2 hover:to-[#2F4055] transition-all group">
                      <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                      Claim Visionary Status
                    </Button>
                  </Link>
                </div>
              </div>

            </div>
          </div>

          {/* Self-funded nudge for all waitlist users who haven't declined */}
          {tier === "waitlist" && waitlistStatus !== "declined" && (
            <div className="bg-[#914D4D]/5 border border-[#914D4D]/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-[#914D4D] mb-1">Also interested in going regardless?</p>
                <p className="text-sm text-[#914D4D]/70 leading-relaxed">
                  You can also apply as a Self-Funded delegate — same program, same NUS benchmarking, same GIF experience.
                </p>
              </div>
              <Link href="https://ielsco.com/events/gif" target="_blank" className="shrink-0">
                <Button className="px-6 py-2.5 rounded-xl font-bold border-2 border-[#914D4D]/30 text-[#914D4D] hover:bg-[#914D4D]/10 flex items-center gap-2 transition-all">
                  <Globe className="w-4 h-4" /> Self-Funded Info <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Footer note */}
          <div className="text-center pt-4 text-xs text-gray-400 space-y-1">
            <p className="font-medium">Global Impact Fellowship 2026 — Batch 1 · Powered by IELS</p>
            <p>This report is confidential and intended solely for the participant named above.</p>
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}
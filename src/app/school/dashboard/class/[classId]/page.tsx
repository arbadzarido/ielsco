// =============================================================================
// app/school/dashboard/class/[classId]/page.tsx — Class analytics + student list
// =============================================================================

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getClassDetailData } from "@/lib/queries";
import {
  ArrowLeft, ArrowRight, Brain, AlertTriangle,
  TrendingUp, Users, Target,
} from "lucide-react";
import type { StudentSummary, SkillScores, GoalCategory } from "@/lib/types";
import { GOAL_CATEGORY_LABELS, GOAL_STATUS_CONFIG } from "@/lib/types";

// ── Skill Heatmap ─────────────────────────────────────────────────────────────

function SkillHeatmap({ skills }: { skills: SkillScores }) {
  const entries = [
    { key: "Speaking",   value: skills.speaking   },
    { key: "Writing",    value: skills.writing     },
    { key: "Reading",    value: skills.reading     },
    { key: "Listening",  value: skills.listening   },
    { key: "Vocabulary", value: skills.vocabulary  },
  ];

  const getHeatColor = (v: number) => {
    if (v >= 75) return { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700" };
    if (v >= 55) return { bg: "bg-blue-500",    light: "bg-blue-50",    text: "text-blue-700"    };
    if (v >= 35) return { bg: "bg-amber-400",   light: "bg-amber-50",   text: "text-amber-700"   };
    return              { bg: "bg-[#E56668]",   light: "bg-red-50",     text: "text-red-700"     };
  };

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#F7F8FA] flex items-center justify-center">
          <Target size={14} className="text-[#2F4157]" />
        </div>
        <div>
          <p className="text-[12px] font-black text-[#1A2534] leading-none">Skill Heatmap</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Class-wide average per skill</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {entries.map(({ key, value }) => {
          const { bg, light, text } = getHeatColor(value ?? 0);
          return (
            <div key={key} className={`rounded-xl p-3 ${light} flex items-center gap-3`}>
              <span className="text-[11px] font-bold text-slate-600 w-20 flex-shrink-0">{key}</span>
              <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full ${bg} rounded-full transition-all duration-700`}
                  style={{ width: `${value ?? 0}%` }}
                />
              </div>
              <span className={`text-[12px] font-black w-10 text-right ${text}`}>
                {value ?? 0}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-4 flex-wrap">
        {[
          { label: "75+ Excellent", color: "bg-emerald-400" },
          { label: "55+ Good",     color: "bg-blue-400"    },
          { label: "35+ Fair",     color: "bg-amber-400"   },
          { label: "<35 At Risk",  color: "bg-[#E56668]"   },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pathway Cluster ───────────────────────────────────────────────────────────

function PathwayCluster({
  data,
}: {
  data: { category: GoalCategory; count: number; pct: number }[];
}) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-400",
    "bg-[#E56668]", "bg-purple-500", "bg-cyan-500", "bg-rose-400",
  ];

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
      <p className="text-[12px] font-black text-[#1A2534] mb-1">Pathway Clusters</p>
      <p className="text-[10px] text-slate-400 mb-4">Student goal distribution</p>

      {data.length === 0 ? (
        <p className="text-slate-400 text-[13px]">No goal data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map(({ category, count, pct }, i) => (
            <div key={category}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  {GOAL_CATEGORY_LABELS[category]}
                </span>
                <span className="text-[11px] font-black text-[#1A2534]">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[i % colors.length]} rounded-full`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{count} students</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s >= 75 ? "#34d399" : s >= 50 ? "#60a5fa" : s >= 25 ? "#fbbf24" : "#E56668";
  const circ = 2 * Math.PI * 16;

  return (
    <div className="relative w-10 h-10">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle
          cx="20" cy="20" r="16" fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - s / 100)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#1A2534]">
        {score ?? "—"}
      </span>
    </div>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({ student, classId }: { student: StudentSummary; classId: string }) {
  const goal = student.active_goal;
  const statusCfg = goal ? GOAL_STATUS_CONFIG[goal.status] : null;
  const initials = student.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <Link
      href={`/school/dashboard/class/${classId}/student/${student.student_id}`}
      className="group grid grid-cols-[2fr_1fr_2fr_1fr] gap-4 items-center px-5 py-3.5 hover:bg-[#F7F8FA] transition-colors border-b border-gray-50 last:border-0"
    >
      {/* Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#1A2534] flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#1A2534] truncate group-hover:text-[#E56668] transition-colors">
            {student.full_name}
          </p>
          <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
          {!student.is_onboarded && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500">
              Not onboarded
            </span>
          )}
        </div>
      </div>

      {/* Tier badge */}
      <div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
          student.subscription_role === "VISIONARY"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : student.subscription_role === "INSIDER"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            student.subscription_role === "VISIONARY" ? "bg-amber-400"
            : student.subscription_role === "INSIDER" ? "bg-blue-400"
            : "bg-slate-400"
          }`} />
          {student.subscription_role}
        </span>
      </div>

      {/* Active goal */}
      <div>
        {goal ? (
          <>
            <p className="text-[12px] font-semibold text-slate-700 line-clamp-1">{goal.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-semibold ${statusCfg?.color}`}>
                {statusCfg?.label}
              </span>
              <div className="flex-1 max-w-[80px] h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1A2534] rounded-full" style={{ width: `${goal.progress_pct}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{goal.progress_pct}%</span>
            </div>
          </>
        ) : (
          <span className="text-[12px] text-slate-300 italic">No active goal</span>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-2">
        <ScoreRing score={student.global_readiness_score} />
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-widest">GRS</p>
          <p className="text-[13px] font-black text-[#1A2534]">
            {student.global_readiness_score ?? "—"}%
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>; // Ubah tipe data jadi Promise
}) {
  // 1. UNWRAP PARAMS DULU
  const { classId } = await params; 

  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  // 2. PAKAI classId YANG SUDAH DI-AWAIT
  const data = await getClassDetailData(classId); 
  if (!data) notFound();
  const { classInfo, students, avgSkills, atRiskStudents, topImprovers, pathwayDistribution } = data;

  // AI copilot insight based on weakest skill
  const skillEntries = Object.entries(avgSkills) as [string, number][];
  const weakestSkill = skillEntries.sort((a, b) => a[1] - b[1])[0];
  const copilotInsight = weakestSkill
    ? `${weakestSkill[0].charAt(0).toUpperCase() + weakestSkill[0].slice(1)} (avg ${weakestSkill[1]}) is the weakest skill in this class. Consider dedicating 2 sessions this week to targeted ${weakestSkill[0]} exercises.`
    : "Keep up the great work — all skills are tracking well!";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/school/dashboard/class"
            className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-[#E56668] font-semibold mb-3 transition-colors"
          >
            <ArrowLeft size={13} /> All Classes
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668] mb-1">
            Batch {classInfo.enrollment_year}
          </p>
          <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">
            {classInfo.name}
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            {students.length} students
            {classInfo.grade ? ` · Grade ${classInfo.grade}` : ""}
            {classInfo.major ? ` · ${classInfo.major}` : ""}
          </p>
        </div>
      </div>

      {/* 12-col grid */}
      <div className="grid grid-cols-12 gap-5">

        {/* LEFT: 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* AI copilot banner */}
          <div className="bg-[#1A2534] rounded-[20px] p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E56668]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain size={15} className="text-[#E56668]" />
            </div>
            <div>
              <p className="text-white font-bold text-[13px] leading-none mb-1">
                AI Copilot · {classInfo.name}
              </p>
              <p className="text-white/55 text-[12px] leading-relaxed">{copilotInsight}</p>
            </div>
          </div>

          {/* Intervention radar row */}
          <div className="grid grid-cols-2 gap-4">
            {/* At Risk */}
            <div className="bg-white rounded-[20px] border border-gray-100 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-[#E56668]" />
                <p className="text-[12px] font-black text-[#1A2534]">
                  Intervention Radar
                </p>
                <span className="ml-auto bg-[#E56668]/10 text-[#E56668] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {atRiskStudents.length} at risk
                </span>
              </div>
              {atRiskStudents.length === 0 ? (
                <p className="text-slate-400 text-[12px]">No at-risk students 🎉</p>
              ) : (
                <div className="space-y-2">
                  {atRiskStudents.slice(0, 4).map((s) => (
                    <Link
                      key={s.student_id}
                      href={`/school/dashboard/class/${classId}/student/${s.student_id}`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#E56668]/10 flex items-center justify-center text-[#E56668] text-[9px] font-black flex-shrink-0">
                        {s.full_name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-[#1A2534] truncate">{s.full_name}</p>
                        <p className="text-[10px] text-slate-400">GRS: {s.global_readiness_score ?? "—"}</p>
                      </div>
                      <ArrowRight size={11} className="text-slate-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Improvers */}
            <div className="bg-white rounded-[20px] border border-gray-100 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-emerald-500" />
                <p className="text-[12px] font-black text-[#1A2534]">Top Performers</p>
                <span className="ml-auto bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {topImprovers.length} stars
                </span>
              </div>
              {topImprovers.length === 0 ? (
                <p className="text-slate-400 text-[12px]">Not enough data yet.</p>
              ) : (
                <div className="space-y-2">
                  {topImprovers.map((s, i) => (
                    <Link
                      key={s.student_id}
                      href={`/school/dashboard/class/${classId}/student/${s.student_id}`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors"
                    >
                      <span className="text-[10px] font-black text-slate-400 w-4">
                        {i + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-[#1A2534] truncate">{s.full_name}</p>
                        <p className="text-[10px] text-emerald-500 font-bold">GRS: {s.global_readiness_score}</p>
                      </div>
                      <ArrowRight size={11} className="text-slate-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Student table */}
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-4 px-5 py-3 bg-[#F7F8FA] border-b border-gray-100">
              {["Student", "Tier", "Active Goal", "GRS"].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {h}
                </span>
              ))}
            </div>

           {students.length === 0 ? (
  <div className="py-12 text-center text-slate-400 text-[14px]">
    No students in this class yet.
  </div>
) : (
  students.map((student) => (
    // GANTI params.classId MENJADI classId
    <StudentRow key={student.student_id} student={student} classId={classId} />
  ))
)}
          </div>
        </div>

        {/* RIGHT: 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <SkillHeatmap skills={avgSkills} />
          <PathwayCluster data={pathwayDistribution} />

          {/* Class stats summary */}
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              Class Overview
            </p>
            <div className="space-y-3">
              {[
                { label: "Total Students",  value: students.length, icon: Users },
                { label: "With Active Goal", value: students.filter((s) => s.active_goal).length, icon: Target },
                { label: "At Risk",          value: atRiskStudents.length, icon: AlertTriangle },
                { label: "Top Performers",   value: topImprovers.length, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-slate-400" />
                    <span className="text-[12px] text-slate-500">{label}</span>
                  </div>
                  <span className="text-[13px] font-black text-[#1A2534]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
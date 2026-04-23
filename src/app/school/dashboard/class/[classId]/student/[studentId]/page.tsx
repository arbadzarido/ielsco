// =============================================================================
// app/school/dashboard/class/[classId]/student/[studentId]/page.tsx
// Individual student profile for teachers
// =============================================================================

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getStudentDetailData } from "@/lib/queries";
import { ArrowLeft, Target, CheckCircle2, Circle, TrendingUp, Brain } from "lucide-react";
import { GOAL_CATEGORY_LABELS, GOAL_STATUS_CONFIG } from "@/lib/types";
import type { Goal, Milestone } from "@/lib/types";

// ── Score bar ─────────────────────────────────────────────────────────────────

function SkillBar({
  label, value, showLabel = true,
}: {
  label: string; value: number | null; showLabel?: boolean;
}) {
  const v = value ?? 0;
  const color =
    v >= 75 ? { bar: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" }
    : v >= 50 ? { bar: "bg-blue-400",   text: "text-blue-600",   bg: "bg-blue-50"   }
    : v >= 25 ? { bar: "bg-amber-400",  text: "text-amber-600",  bg: "bg-amber-50"  }
    :           { bar: "bg-[#E56668]",  text: "text-[#E56668]",  bg: "bg-red-50"    };

  return (
    <div className={`rounded-xl p-3 ${color.bg}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-600">{label}</span>
          <span className={`text-[15px] font-black ${color.text}`}>{value ?? "—"}</span>
        </div>
      )}
      <div className="h-2 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full ${color.bar} rounded-full transition-all duration-700`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal, milestones,
}: {
  goal: Goal; milestones: Milestone[];
}) {
  const statusCfg = GOAL_STATUS_CONFIG[goal.status];
  const goalMilestones = milestones.filter((m) => m.goal_id === goal.id);
  const completed = goalMilestones.filter((m) => m.is_completed).length;

  return (
    <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668] mb-1">
            {GOAL_CATEGORY_LABELS[goal.category]}
          </p>
          <h4 className="text-[15px] font-black text-[#1A2534] leading-tight">{goal.title}</h4>
          {goal.description && (
            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">{goal.description}</p>
          )}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-slate-400 uppercase tracking-widest">Progress</span>
          <span className="font-black text-[#1A2534]">{goal.progress_pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A2534] rounded-full transition-all duration-700"
            style={{ width: `${goal.progress_pct}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      {goalMilestones.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Milestones ({completed}/{goalMilestones.length} done)
          </p>
          <div className="space-y-1.5">
            {goalMilestones.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                {m.is_completed ? (
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-[12px] ${m.is_completed ? "line-through text-slate-400" : "text-slate-600"}`}>
                  {m.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {goal.target_date && (
        <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-gray-50">
          🎯 Target: {new Date(goal.target_date).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// 1. Ubah tipe data params menjadi Promise
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  // 2. Buka "kotak" params di sini
  const { classId, studentId } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  // 3. Gunakan studentId (bukan params.studentId)
  const data = await getStudentDetailData(studentId);
  if (!data) notFound();

  const { student, classInfo, goals, milestones, latestSnapshot } = data;

  const grs = latestSnapshot?.global_readiness_score ?? null;
  const activeGoals = goals.filter((g) => g.status === "IN_PROGRESS");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");
  const totalMilestonesCompleted = milestones.filter((m) => m.is_completed).length;

  const initials = student.full_name
    .split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // AI copilot per student
  const weakestSkill = latestSnapshot
    ? Object.entries({
        Speaking:   latestSnapshot.speaking_score ?? 0,
        Writing:    latestSnapshot.writing_score ?? 0,
        Reading:    latestSnapshot.reading_score ?? 0,
        Listening:  latestSnapshot.listening_score ?? 0,
        Vocabulary: latestSnapshot.vocabulary_score ?? 0,
      }).sort((a, b) => a[1] - b[1])[0]
    : null;

  const copilotNote = weakestSkill
    ? `${student.full_name.split(" ")[0]}'s weakest area is ${weakestSkill[0]} (${weakestSkill[1]}). Consider assigning targeted exercises this week.`
    : "No score data yet. Encourage the student to complete their first assessment.";


  // ... (kode lainnya tetap)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          // 4. Gunakan classId (bukan params.classId)
          href={`/school/dashboard/class/${classId}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-[#E56668] font-semibold mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> Back to {classInfo?.name ?? "Class"}
        </Link>
      </div>
      

      {/* Hero card */}
      <div className="bg-[#1A2534] rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full opacity-[0.10]" style={{ background: "#E56668", filter: "blur(80px)" }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[24px] font-black text-white tracking-tight">
                {student.full_name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                student.subscription_role === "VISIONARY" ? "bg-amber-50/10 text-amber-300 border-amber-400/30"
                : student.subscription_role === "INSIDER"  ? "bg-blue-50/10 text-blue-300 border-blue-400/30"
                : "bg-white/5 text-white/50 border-white/10"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  student.subscription_role === "VISIONARY" ? "bg-amber-400"
                  : student.subscription_role === "INSIDER" ? "bg-blue-400" : "bg-white/40"
                }`} />
                {student.subscription_role}
              </span>
              {!student.is_onboarded && (
                <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/20">
                  Not Onboarded
                </span>
              )}
            </div>
            <p className="text-white/40 text-[13px]">{student.email}</p>
            <div className="flex gap-6 mt-4">
              {[
                { label: "Class",     value: classInfo?.name ?? "—" },
                { label: "Batch",     value: student.enrollment_year ?? "—" },
                { label: "Goals",     value: goals.length },
                { label: "Milestones Done", value: totalMilestonesCompleted },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest">{label}</p>
                  <p className="text-white font-black text-[14px] leading-tight mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GRS hero score */}
          <div className="text-right flex-shrink-0">
            <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">
              Global Readiness Score
            </p>
            <p className="text-6xl font-black text-white leading-none">{grs ?? "—"}</p>
            <p className="text-white/25 text-[11px] mt-1">out of 100</p>
          </div>
        </div>
      </div>

      {/* 12-col grid */}
      <div className="grid grid-cols-12 gap-5">

        {/* LEFT: 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Active Goals */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-[#E56668]" />
              <h2 className="text-[13px] font-black text-[#1A2534] uppercase tracking-widest">
                Active Goals ({activeGoals.length})
              </h2>
            </div>
            {activeGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} milestones={milestones} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[20px] border border-gray-100 p-8 text-center text-slate-400 text-[13px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                No active goals. Student hasn't set learning objectives yet.
              </div>
            )}
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-emerald-500" />
                <h2 className="text-[13px] font-black text-[#1A2534] uppercase tracking-widest">
                  Completed ({completedGoals.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} milestones={milestones} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Skill breakdown */}
          {latestSnapshot && (
            <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <p className="text-[12px] font-black text-[#1A2534] mb-1">Skill Breakdown</p>
              <p className="text-[10px] text-slate-400 mb-4">
                Latest snapshot · {new Date(latestSnapshot.snapshot_date).toLocaleDateString("en-GB")}
              </p>
              <div className="space-y-2.5">
                {([
                  ["Speaking",   latestSnapshot.speaking_score],
                  ["Writing",    latestSnapshot.writing_score],
                  ["Reading",    latestSnapshot.reading_score],
                  ["Listening",  latestSnapshot.listening_score],
                  ["Vocabulary", latestSnapshot.vocabulary_score],
                ] as [string, number | null][]).map(([label, value]) => (
                  <SkillBar key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          )}

          {/* AI copilot note */}
          <div className="bg-[#1A2534] rounded-[20px] p-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.12]" style={{ background: "#E56668", filter: "blur(30px)" }} />
            <div className="relative flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E56668]/15 flex items-center justify-center flex-shrink-0">
                <Brain size={13} className="text-[#E56668]" />
              </div>
              <div>
                <p className="text-white font-black text-[12px] mb-1.5">AI Copilot Note</p>
                <p className="text-white/50 text-[12px] leading-relaxed">{copilotNote}</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              Quick Stats
            </p>
            <div className="space-y-3">
              {[
                { label: "Total Goals",       value: goals.length },
                { label: "In Progress",       value: activeGoals.length },
                { label: "Completed Goals",   value: completedGoals.length },
                { label: "Milestones Done",   value: totalMilestonesCompleted },
                { label: "Milestones Total",  value: milestones.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">{label}</span>
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
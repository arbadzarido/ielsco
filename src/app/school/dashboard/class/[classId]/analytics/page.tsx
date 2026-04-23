// =============================================================================
// app/school/dashboard/class/[classId]/analytics/page.tsx — Class analytics
// =============================================================================

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getClassDetailData } from "@/lib/queries";
import { ArrowLeft, BarChart3, TrendingUp, Target, Brain } from "lucide-react";
import { GOAL_CATEGORY_LABELS } from "@/lib/types";
import type { GoalCategory } from "@/lib/types";

const SKILL_KEYS = ["speaking", "writing", "reading", "listening", "vocabulary"] as const;

function SkillBar({ label, value, rank }: { label: string; value: number; rank: number }) {
  const color =
    value >= 75 ? { bar: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" }
    : value >= 55 ? { bar: "bg-blue-400",    text: "text-blue-600",    bg: "bg-blue-50"    }
    : value >= 35 ? { bar: "bg-amber-400",   text: "text-amber-600",   bg: "bg-amber-50"   }
    :               { bar: "bg-[#E56668]",   text: "text-[#E56668]",   bg: "bg-red-50"     };

  return (
    <div className={`rounded-[16px] p-4 ${color.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-slate-600">{label}</p>
        <span className={`text-[18px] font-black ${color.text}`}>{value}</span>
      </div>
      <div className="h-2 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full ${color.bar} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">
        Ranked #{rank} skill in class
      </p>
    </div>
  );
}

export default async function ClassAnalyticsPage({
  params,
}: {
  params: { classId: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  const data = await getClassDetailData(params.classId);
  if (!data) notFound();

  const { classInfo, students, avgSkills, pathwayDistribution } = data;

  // Rank skills worst to best
  const skillRanked = SKILL_KEYS
    .map((k) => ({ key: k, value: (avgSkills as any)[k] as number }))
    .sort((a, b) => a.value - b.value);

  const avgGRS =
    students.length > 0
      ? Math.round(students.reduce((s, st) => s + (st.global_readiness_score ?? 0), 0) / students.length)
      : 0;

  // Score distribution buckets
  const buckets = [
    { label: "0–24 (At Risk)",    min: 0,  max: 24, color: "bg-[#E56668]"  },
    { label: "25–49 (Developing)",min: 25, max: 49, color: "bg-amber-400"  },
    { label: "50–74 (On Track)",  min: 50, max: 74, color: "bg-blue-400"   },
    { label: "75–100 (Excellent)",min: 75, max: 100,color: "bg-emerald-400"},
  ].map((b) => ({
    ...b,
    count: students.filter(
      (s) => (s.global_readiness_score ?? 0) >= b.min && (s.global_readiness_score ?? 0) <= b.max
    ).length,
  }));
  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/school/dashboard/class/${params.classId}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-[#E56668] font-semibold mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> Back to {classInfo.name}
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={14} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">
            Class Analytics
          </p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">
          {classInfo.name} · Deep Analysis
        </h1>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* LEFT: 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Skill heatmap detailed */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-black text-[#1A2534] mb-1">Skill Performance Matrix</p>
            <p className="text-[11px] text-slate-400 mb-5">
              Ranked from weakest to strongest · Class average scores
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skillRanked.map(({ key, value }, i) => (
                <SkillBar
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={value}
                  rank={i + 1}
                />
              ))}
            </div>
          </div>

          {/* GRS Distribution histogram */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-black text-[#1A2534] mb-1">
              GRS Score Distribution
            </p>
            <p className="text-[11px] text-slate-400 mb-5">
              How students are spread across readiness levels
            </p>
            <div className="flex items-end gap-3 h-32">
              {buckets.map((b) => (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[11px] font-black text-[#1A2534]">{b.count}</span>
                  <div
                    className={`w-full ${b.color} rounded-t-lg transition-all`}
                    style={{ height: `${(b.count / maxBucket) * 96}px`, minHeight: b.count > 0 ? "8px" : "2px" }}
                  />
                  <span className="text-[9px] text-slate-400 text-center leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pathway distribution table */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-black text-[#1A2534] mb-1">Goal Pathway Distribution</p>
            <p className="text-[11px] text-slate-400 mb-5">What students are working toward</p>
            {pathwayDistribution.length === 0 ? (
              <p className="text-slate-400 text-[13px]">No active goals recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {pathwayDistribution.map(({ category, count, pct }, i) => {
                  const barColors = ["bg-blue-500","bg-emerald-500","bg-amber-400","bg-[#E56668]","bg-purple-500","bg-cyan-500"];
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-[12px] text-slate-600 font-medium w-32 flex-shrink-0">
                        {GOAL_CATEGORY_LABELS[category as GoalCategory]}
                      </span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColors[i % barColors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-2 w-20 flex-shrink-0">
                        <span className="text-[12px] font-black text-[#1A2534]">{pct}%</span>
                        <span className="text-[11px] text-slate-400">({count})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Summary card */}
          <div className="bg-[#1A2534] rounded-[20px] p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.12]" style={{ background:"#E56668", filter:"blur(40px)" }} />
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 relative">Class Summary</p>
            <div className="relative space-y-4">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Class Avg. GRS</p>
                <p className="text-5xl font-black text-white leading-none">{avgGRS}</p>
                <p className="text-white/30 text-[11px] mt-0.5">out of 100</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                {[
                  { label: "Students", value: students.length },
                  { label: "With Goals", value: students.filter((s) => s.active_goal).length },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-white/35 text-[10px] uppercase tracking-widest">{label}</p>
                    <p className="text-white font-black text-xl">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI insight */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-[#E56668]" />
              <p className="text-[12px] font-black text-[#1A2534]">AI Insight</p>
            </div>
            <p className="text-slate-500 text-[12px] leading-relaxed">
              The class's weakest skill is{" "}
              <strong className="text-[#E56668]">
                {skillRanked[0].key.charAt(0).toUpperCase() + skillRanked[0].key.slice(1)}
              </strong>{" "}
              at an average of{" "}
              <strong>{skillRanked[0].value}</strong>. Focus targeted drills
              here before the next assessment window to maximize GRS improvement.
            </p>
          </div>

          {/* Quicklinks */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Navigate</p>
            <div className="space-y-1.5">
              {[
                { label: "Student List",  href: `/school/dashboard/class/${params.classId}` },
                { label: "All Students",  href: `/school/dashboard/students` },
                { label: "School Insights", href: `/school/insights` },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F7F8FA] text-[13px] font-semibold text-[#1A2534] hover:text-[#E56668] transition-colors group"
                >
                  {label}
                  <ArrowLeft size={12} className="rotate-180 text-gray-300 group-hover:text-[#E56668] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
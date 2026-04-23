// =============================================================================
// app/school/insights/page.tsx — School-wide analytics & insights
// =============================================================================

import { redirect } from "next/navigation";
import { getAuthUser, getDashboardData, getClassDetailData } from "@/lib/queries";
import { BarChart3, TrendingUp, Brain, Target, Users } from "lucide-react";
import type { ClassSummary, SkillScores, GoalCategory } from "@/lib/types";
import { GOAL_CATEGORY_LABELS } from "@/lib/types";

export default async function InsightsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  const dashData = await getDashboardData();
  if (!dashData) redirect("/school/sign-in");

  const { classes, totalStudents, avgSchoolGRS, school } = dashData;

  // Aggregate skill data across all classes
  const classDetails = await Promise.all(
    classes.map((cls: ClassSummary) => getClassDetailData(cls.class_id))
  );

  const validDetails = classDetails.filter(Boolean);

  const avgSkillsAllClasses: SkillScores = {
    speaking:   0, writing: 0, reading: 0, listening: 0, vocabulary: 0,
  };

  if (validDetails.length > 0) {
    const keys: (keyof SkillScores)[] = ["speaking", "writing", "reading", "listening", "vocabulary"];
    keys.forEach((k) => {
      const vals = validDetails.map((d) => d!.avgSkills[k]).filter((v) => v > 0);
      avgSkillsAllClasses[k] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });
  }

  // Aggregate pathway distribution
  const pathwayMap: Record<string, number> = {};
  validDetails.forEach((d) => {
    d!.pathwayDistribution.forEach(({ category, count }) => {
      pathwayMap[category] = (pathwayMap[category] ?? 0) + count;
    });
  });
  const totalPathway = Object.values(pathwayMap).reduce((a, b) => a + b, 0);
  const pathways = Object.entries(pathwayMap)
    .map(([cat, count]) => ({
      category: cat as GoalCategory,
      count,
      pct: totalPathway > 0 ? Math.round((count / totalPathway) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Total at-risk
  const totalAtRisk = validDetails.reduce((s, d) => s + d!.atRiskStudents.length, 0);
  const totalTopPerformers = validDetails.reduce((s, d) => s + d!.topImprovers.length, 0);

  const skillEntries = Object.entries(avgSkillsAllClasses) as [string, number][];
  const sortedSkills = skillEntries.sort((a, b) => a[1] - b[1]);
  const weakest = sortedSkills[0];

  const SKILL_COLORS: Record<string, string> = {
    speaking:   "bg-blue-400",
    writing:    "bg-emerald-400",
    reading:    "bg-amber-400",
    listening:  "bg-purple-400",
    vocabulary: "bg-[#E56668]",
  };

  const PATHWAY_COLORS = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-400",
    "bg-[#E56668]", "bg-purple-500", "bg-cyan-500", "bg-rose-400",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={13} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">Analytics</p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">School Insights</h1>
        <p className="text-slate-500 text-[13px] mt-1">
          Aggregated analytics across {classes.length} classes · {school?.name}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "School Avg GRS",   value: `${avgSchoolGRS}%`, sub: "Global Readiness",  icon: TrendingUp, accent: true  },
          { label: "Total Students",   value: totalStudents,       sub: "enrolled",           icon: Users                    },
          { label: "At Risk",          value: totalAtRisk,         sub: "GRS below 30",       icon: Target                   },
          { label: "Top Performers",   value: totalTopPerformers,  sub: "GRS above 75",       icon: TrendingUp               },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <div
            key={label}
            className={`rounded-[20px] p-5 ${
              accent ? "bg-[#1A2534]" : "bg-white border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? "text-white/40" : "text-slate-400"}`}>
                {label}
              </p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? "bg-white/10" : "bg-[#F7F8FA]"}`}>
                <Icon size={13} className={accent ? "text-[#E56668]" : "text-[#2F4157]"} />
              </div>
            </div>
            <p className={`text-[30px] font-black leading-none ${accent ? "text-white" : "text-[#1A2534]"}`}>
              {value}
            </p>
            <p className={`text-[11px] mt-1 ${accent ? "text-white/30" : "text-slate-400"}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-5">

        {/* LEFT: 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Skill breakdown */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] font-black text-[#1A2534] mb-1">School-wide Skill Averages</p>
            <p className="text-[11px] text-slate-400 mb-5">Aggregated across all assigned classes</p>

            <div className="space-y-3">
              {(Object.entries(avgSkillsAllClasses) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([skill, value]) => {
                  const isWeakest = skill === weakest[0];
                  return (
                    <div key={skill} className={`rounded-xl p-3.5 ${isWeakest ? "bg-red-50 border border-red-100" : "bg-[#F7F8FA]"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${SKILL_COLORS[skill]}`} />
                          <span className="text-[12px] font-bold text-slate-700 capitalize">{skill}</span>
                          {isWeakest && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#E56668] bg-[#E56668]/10 px-1.5 py-0.5 rounded">
                              Weakest
                            </span>
                          )}
                        </div>
                        <span className="text-[14px] font-black text-[#1A2534]">{value}</span>
                      </div>
                      <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                        <div className={`h-full ${SKILL_COLORS[skill]} rounded-full`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Class comparison */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] font-black text-[#1A2534] mb-1">Class GRS Comparison</p>
            <p className="text-[11px] text-slate-400 mb-5">Average Global Readiness Score per class</p>
            <div className="space-y-3">
              {classes.map((cls: ClassSummary) => {
                const grs = cls.avg_readiness_score ?? 0;
                const barColor = grs >= 75 ? "bg-emerald-400" : grs >= 50 ? "bg-blue-400" : grs >= 25 ? "bg-amber-400" : "bg-[#E56668]";
                return (
                  <div key={cls.class_id} className="flex items-center gap-3">
                    <span className="text-[12px] font-semibold text-slate-600 w-24 flex-shrink-0">{cls.class_name}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${grs}%` }} />
                    </div>
                    <span className="text-[12px] font-black text-[#1A2534] w-10 text-right">{grs}%</span>
                    <span className="text-[10px] text-slate-400 w-16">{cls.total_students} students</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* AI Copilot */}
          <div className="bg-[#1A2534] rounded-[20px] p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.10]" style={{ background: "#E56668", filter: "blur(40px)" }} />
            <div className="relative flex items-start gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#E56668]/15 flex items-center justify-center flex-shrink-0">
                <Brain size={13} className="text-[#E56668]" />
              </div>
              <p className="text-white font-black text-[13px]">AI School Insight</p>
            </div>
            <div className="relative bg-white/[0.05] rounded-xl p-3.5 border border-white/[0.06]">
              <p className="text-white/60 text-[12px] leading-relaxed">
                {weakest
                  ? `Across all classes, <strong>${weakest[0]}</strong> is the weakest skill at ${weakest[1]} average. Prioritize structured ${weakest[0]} interventions school-wide for the highest GRS impact.`
                  : "Insufficient data for recommendations yet. Encourage students to complete their first assessment."}
              </p>
            </div>
          </div>

          {/* Pathway clusters */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-black text-[#1A2534] mb-1">Goal Pathway Clusters</p>
            <p className="text-[10px] text-slate-400 mb-4">School-wide student aspirations</p>
            {pathways.length === 0 ? (
              <p className="text-slate-400 text-[12px]">No goal data yet.</p>
            ) : (
              <div className="space-y-3">
                {pathways.map(({ category, count, pct }, i) => (
                  <div key={category}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {GOAL_CATEGORY_LABELS[category]}
                      </span>
                      <span className="text-[11px] font-black text-[#1A2534]">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${PATHWAY_COLORS[i % PATHWAY_COLORS.length]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{count} students</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
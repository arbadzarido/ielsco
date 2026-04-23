// =============================================================================
// app/school/dashboard/page.tsx — Main overview dashboard
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardData } from "@/lib/queries";
import {
  Sparkles, ArrowRight, TrendingUp, Users, GraduationCap,
  Target, AlertTriangle, Download,
} from "lucide-react";
import type { ClassSummary } from "@/lib/types";
import { AICopilotCard } from "@/components/school/AiCopilotCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getGRSColor(score: number | null) {
  if (!score) return { bar: "bg-gray-200", text: "text-gray-400" };
  if (score >= 75) return { bar: "bg-emerald-400", text: "text-emerald-600" };
  if (score >= 50) return { bar: "bg-blue-400", text: "text-blue-600" };
  if (score >= 25) return { bar: "bg-amber-400", text: "text-amber-600" };
  return { bar: "bg-[#E56668]", text: "text-[#E56668]" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`rounded-[20px] p-5 flex flex-col gap-3 ${
      accent
        ? "bg-[#1A2534] text-white"
        : "bg-white border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
    }`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accent ? "text-white/40" : "text-slate-400"}`}>
          {label}
        </p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          accent ? "bg-white/10" : "bg-[#F7F8FA]"
        }`}>
          <Icon size={15} className={accent ? "text-[#E56668]" : "text-[#2F4157]"} />
        </div>
      </div>
      <div>
        <p className={`text-3xl font-black leading-none tracking-tight ${accent ? "text-white" : "text-[#1A2534]"}`}>
          {value}
        </p>
        {sub && <p className={`text-[11px] mt-1.5 ${accent ? "text-white/35" : "text-slate-400"}`}>{sub}</p>}
      </div>
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassSummary }) {
  const grs = cls.avg_readiness_score;
  const { text } = getGRSColor(grs);
  const total = cls.total_students || 1;

  return (
    <Link
      href={`/school/dashboard/class/${cls.class_id}`}
      className="group bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 hover:shadow-md hover:border-[#2F4157]/15 transition-all duration-200 block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E56668] mb-1">
            Batch {cls.enrollment_year}
          </p>
          <h3 className="text-[17px] font-black text-[#1A2534] leading-tight">
            {cls.class_name}
          </h3>
        </div>

        {/* GRS Ring */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
            <circle cx="24" cy="24" r="18" fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
            <circle
              cx="24" cy="24" r="18" fill="none"
              stroke={grs && grs >= 75 ? "#34d399" : grs && grs >= 50 ? "#60a5fa" : grs && grs >= 25 ? "#fbbf24" : "#E56668"}
              strokeWidth="4.5"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - (grs ?? 0) / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#1A2534]">
            {grs ?? "—"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-50">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Students</p>
          <p className="font-black text-[#1A2534] text-lg leading-tight">{cls.total_students}</p>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Avg. GRS</p>
          <p className={`font-black text-lg leading-tight ${text}`}>{grs ?? "—"}%</p>
        </div>
      </div>

      {/* Role distribution */}
      <div className="space-y-1.5 mb-3">
        <div className="h-1.5 rounded-full bg-gray-50 overflow-hidden flex gap-0.5">
          {cls.visionary_count > 0 && (
            <div className="bg-amber-400 rounded-full" style={{ width: `${(cls.visionary_count / total) * 100}%` }} />
          )}
          {cls.insider_count > 0 && (
            <div className="bg-blue-400 rounded-full" style={{ width: `${(cls.insider_count / total) * 100}%` }} />
          )}
          {cls.explorer_count > 0 && (
            <div className="bg-slate-200 rounded-full" style={{ width: `${(cls.explorer_count / total) * 100}%` }} />
          )}
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-slate-500">
            <span className="font-bold text-amber-500">{cls.visionary_count}</span> Visionary
          </span>
          <span className="text-[10px] text-slate-500">
            <span className="font-bold text-blue-500">{cls.insider_count}</span> Insider
          </span>
          <span className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-400">{cls.explorer_count}</span> Explorer
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center text-[#E56668] text-[12px] font-bold gap-1 group-hover:gap-2 transition-all mt-2">
        View class <ArrowRight size={13} />
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function SchoolDashboardPage() {
  const data = await getDashboardData();
  if (!data) redirect("/school/sign-in");

  const { teacher, school, classes, totalStudents, avgSchoolGRS, skillBreakdown } = data;
  const firstName = teacher.full_name?.split(" ")[0] ?? "Teacher";
  const greeting = getGreeting();

  return (
    <div className="space-y-8">

      {/* ── Hero greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E56668]/10 text-[#E56668] rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles size={12} />
            {school?.name ?? "School Dashboard"}
          </div>
          <h1 className="text-[28px] font-black text-[#1A2534] tracking-tight leading-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-slate-500 text-[14px] mt-1.5 font-medium">
            Guiding{" "}
            <span className="text-[#E56668] font-bold">{totalStudents} students</span>{" "}
            across{" "}
            <span className="text-[#1A2534] font-bold">{classes.length} classes</span>
            {school?.city ? ` · ${school.city}` : ""}
          </p>
        </div>
        <button className="self-start sm:self-auto inline-flex items-center gap-2 bg-white border border-gray-200 text-[#1A2534] font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
          <Download size={15} />
          Export Report
        </button>
      </div>

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-6">

        {/* ─ LEFT: 8 cols ─ */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Classes"   value={classes.length}      sub="assigned to you"    icon={GraduationCap} accent />
            <StatCard label="Total Students"  value={totalStudents}        sub="active learners"    icon={Users}         />
            <StatCard label="School Avg. GRS" value={`${avgSchoolGRS}%`}  sub="Global Readiness"   icon={TrendingUp}    />
            <StatCard label="Active Goals"    value="—"                   sub="across all classes" icon={Target}        />
          </div>

          {/* Class directory */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[13px] font-black uppercase tracking-widest text-[#1A2534]">
                Class Directory
              </h2>
              <Link
                href="/school/dashboard/class"
                className="text-[12px] font-bold text-[#E56668] flex items-center gap-1 hover:gap-2 transition-all"
              >
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {classes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-[14px]">
                No classes assigned yet. Contact your IELS admin.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classes.map((cls) => (
                  <ClassCard key={cls.class_id} cls={cls} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─ RIGHT: 4 cols analytics sidebar ─ */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* AI Copilot — passes real skill data from Supabase */}
          <AICopilotCard
            avgGRS={avgSchoolGRS}
            totalStudents={totalStudents}
            skillBreakdown={skillBreakdown}
          />

          {/* Quick actions */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">
              Quick Actions
            </p>
            <div className="space-y-2">
              {[
                { label: "View Insights",     href: "/school/insights",           icon: TrendingUp,  color: "text-blue-600 bg-blue-50"    },
                { label: "Generate Report",   href: "/school/reports",            icon: Download,    color: "text-emerald-600 bg-emerald-50" },
                { label: "At-Risk Students",  href: "/school/dashboard/students", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7F8FA] transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#1A2534] group-hover:text-[#E56668] transition-colors">
                    {label}
                  </span>
                  <ArrowRight size={13} className="ml-auto text-gray-300 group-hover:text-[#E56668] transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* School info card */}
          {school && (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">
                Partner School
              </p>
              <div className="space-y-2">
                <p className="font-black text-[#1A2534] text-[15px]">{school.name}</p>
                {school.city && (
                  <p className="text-slate-400 text-[12px]">
                    {school.city}{school.province ? `, ${school.province}` : ""}
                  </p>
                )}
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[#E56668]/10 text-[#E56668] rounded-full">
                  {school.partner_tier}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
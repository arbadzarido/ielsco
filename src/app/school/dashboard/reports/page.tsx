// =============================================================================
// app/school/reports/page.tsx — Reports & export center
// =============================================================================

import { redirect } from "next/navigation";
import { getAuthUser, getDashboardData } from "@/lib/queries";
import { FileText, Download, BarChart3, Users, GraduationCap, Calendar } from "lucide-react";
import type { ClassSummary } from "@/lib/types";

const REPORT_TYPES = [
  {
    id: "class-progress",
    title: "Class Progress Report",
    description: "Average GRS, skill breakdown, and goal completion rates per class.",
    icon: GraduationCap,
    tag: "Per Class",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "student-detail",
    title: "Student Detail Report",
    description: "Individual GRS history, active goals, milestones, and skill scores.",
    icon: Users,
    tag: "Per Student",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "school-overview",
    title: "School Overview Report",
    description: "School-wide aggregated performance, pathway distribution, and at-risk analysis.",
    icon: BarChart3,
    tag: "School-wide",
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: "monthly-summary",
    title: "Monthly Summary",
    description: "GRS trend over time, improvement rates, and intervention recommendations.",
    icon: Calendar,
    tag: "Monthly",
    color: "bg-purple-50 text-purple-600",
  },
];

export default async function ReportsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  const dashData = await getDashboardData();
  if (!dashData) redirect("/school/sign-in");

  const { classes, school, totalStudents } = dashData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={13} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">Reports</p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">Reports & Export</h1>
        <p className="text-slate-500 text-[13px] mt-1">
          Generate and download reports for {school?.name ?? "your school"}
        </p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORT_TYPES.map(({ id, title, description, icon: Icon, tag, color }) => (
          <div
            key={id}
            className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-[#F7F8FA] text-slate-500 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            </div>

            <h3 className="text-[15px] font-black text-[#1A2534] mb-2">{title}</h3>
            <p className="text-[12px] text-slate-400 leading-relaxed mb-5">{description}</p>

            <div className="flex gap-2">
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1A2534] text-white text-[12px] font-bold hover:bg-[#2F4157] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export functionality — connect your backend"
              >
                <Download size={13} />
                Export PDF
              </button>
              <button
                disabled
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[#1A2534] text-[12px] font-bold hover:bg-[#F7F8FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="CSV export — connect your backend"
              >
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Class quick-links */}
      <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <p className="text-[13px] font-black text-[#1A2534] mb-1">Quick Export by Class</p>
        <p className="text-[11px] text-slate-400 mb-5">
          Generate a focused report for a single class
        </p>

        <div className="space-y-2">
          {classes.map((cls: ClassSummary) => (
            <div
              key={cls.class_id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F8FA] hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1A2534]/10 flex items-center justify-center">
                  <GraduationCap size={14} className="text-[#1A2534]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A2534]">{cls.class_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {cls.total_students} students · Avg GRS: {cls.avg_readiness_score ?? "—"}%
                  </p>
                </div>
              </div>
              <button
                disabled
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#E56668] hover:text-[#d05558] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={12} />
                Export
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-100 rounded-[16px] p-4">
        <p className="text-[12px] text-amber-700 font-medium leading-relaxed">
          <strong>Note:</strong> Export functionality requires a PDF/CSV generation backend.
          Connect your preferred service (e.g., Puppeteer, React PDF, or a Supabase Edge Function)
          to activate these buttons. All data is already structured and ready for export.
        </p>
      </div>
    </div>
  );
}
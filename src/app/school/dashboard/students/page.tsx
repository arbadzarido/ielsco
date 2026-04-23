// =============================================================================
// app/school/dashboard/students/page.tsx — All students across all classes
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getDashboardData, getClassStudents } from "@/lib/queries";
import { Users, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import type { StudentSummary, ClassSummary } from "@/lib/types";
import { GOAL_STATUS_CONFIG } from "@/lib/types";

export default async function AllStudentsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  const dashData = await getDashboardData();
  if (!dashData) redirect("/school/sign-in");

  // Load all students from all teacher's classes
  const allStudentsArrays = await Promise.all(
    dashData.classes.map((cls: ClassSummary) => getClassStudents(cls.class_id))
  );
  const allStudents: StudentSummary[] = allStudentsArrays.flat();

  // Categorize
  const atRisk     = allStudents.filter((s) => (s.global_readiness_score ?? 0) < 30);
  const onTrack    = allStudents.filter((s) => (s.global_readiness_score ?? 0) >= 30 && (s.global_readiness_score ?? 0) < 75);
  const excellent  = allStudents.filter((s) => (s.global_readiness_score ?? 0) >= 75);
  const noGoal     = allStudents.filter((s) => !s.active_goal);

  function StudentRow({ student }: { student: StudentSummary }) {
    const grs = student.global_readiness_score;
    const ringColor = (grs ?? 0) >= 75 ? "#34d399" : (grs ?? 0) >= 50 ? "#60a5fa" : (grs ?? 0) >= 25 ? "#fbbf24" : "#E56668";
    const circ = 2 * Math.PI * 14;
    const goal = student.active_goal;
    const statusCfg = goal ? GOAL_STATUS_CONFIG[goal.status] : null;
    const initials = student.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

    return (
      <Link
        href={`/school/dashboard/class/${student.class_id}/student/${student.student_id}`}
        className="group grid grid-cols-[2.5fr_1fr_1fr_2fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F7F8FA] transition-colors border-b border-gray-50 last:border-0"
      >
        {/* Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#1A2534] flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#1A2534] truncate group-hover:text-[#E56668] transition-colors">
              {student.full_name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
          </div>
        </div>

        {/* Class */}
        <span className="text-[12px] text-slate-500 font-medium">{student.class_name}</span>

        {/* Tier */}
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
          student.subscription_role === "VISIONARY" ? "bg-amber-50 text-amber-700 border-amber-200"
          : student.subscription_role === "INSIDER"  ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-slate-100 text-slate-600 border-slate-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            student.subscription_role === "VISIONARY" ? "bg-amber-400"
            : student.subscription_role === "INSIDER" ? "bg-blue-400" : "bg-slate-400"
          }`} />
          {student.subscription_role}
        </span>

        {/* Goal */}
        <div>
          {goal ? (
            <>
              <p className="text-[12px] font-semibold text-slate-700 line-clamp-1">{goal.title}</p>
              <span className={`text-[10px] font-bold ${statusCfg?.color}`}>{statusCfg?.label}</span>
            </>
          ) : (
            <span className="text-[11px] text-slate-300 italic">No goal set</span>
          )}
        </div>

        {/* GRS */}
        <div className="flex items-center gap-2">
          <div className="relative w-9 h-9">
            <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={ringColor} strokeWidth="3.5"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - (grs ?? 0) / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#1A2534]">
              {grs ?? "—"}
            </span>
          </div>
          <ArrowRight size={13} className="text-gray-200 group-hover:text-[#E56668] transition-colors" />
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users size={13} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">
            Student Management
          </p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">All Students</h1>
        <p className="text-slate-500 text-[13px] mt-1">
          {allStudents.length} students across {dashData.classes.length} classes
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: allStudents.length, icon: Users, color: "text-[#1A2534] bg-white" },
          { label: "At Risk (GRS <30)", value: atRisk.length, icon: AlertTriangle, color: "text-[#E56668] bg-red-50" },
          { label: "Excellent (GRS 75+)", value: excellent.length, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
          { label: "No Active Goal", value: noGoal.length, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-[18px] border border-gray-100 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
            <div className="flex items-center justify-between">
              <span className="text-[28px] font-black text-[#1A2534]">{value}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={15} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Student table */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2.5fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3 bg-[#F7F8FA] border-b border-gray-100">
          {["Student", "Class", "Tier", "Active Goal", "GRS"].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {h}
            </span>
          ))}
        </div>

        {allStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-[14px]">
            No students found across your classes.
          </div>
        ) : (
          allStudents.map((student) => (
            <StudentRow key={student.student_id} student={student} />
          ))
        )}
      </div>
    </div>
  );
}
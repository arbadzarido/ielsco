// =============================================================================
// app/school/dashboard/class/[classId]/students/page.tsx — Full student list
// =============================================================================

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getClassDetailData } from "@/lib/queries";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { GOAL_CATEGORY_LABELS, GOAL_STATUS_CONFIG } from "@/lib/types";
import type { StudentSummary } from "@/lib/types";

function StudentCard({ student, classId }: { student: StudentSummary; classId: string }) {
  const grs = student.global_readiness_score ?? 0;
  const goal = student.active_goal;
  const statusCfg = goal ? GOAL_STATUS_CONFIG[goal.status] : null;
  const ringColor = grs >= 75 ? "#34d399" : grs >= 50 ? "#60a5fa" : grs >= 25 ? "#fbbf24" : "#E56668";
  const circ = 2 * Math.PI * 20;
  const initials = student.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <Link
      href={`/school/dashboard/class/${classId}/student/${student.student_id}`}
      className="group bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#2F4157]/15 transition-all block"
    >
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#1A2534] flex-shrink-0 flex items-center justify-center text-white text-[12px] font-black">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-black text-[#1A2534] truncate group-hover:text-[#E56668] transition-colors">
            {student.full_name}
          </p>
          <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
        </div>

        {/* GRS ring */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke={ringColor} strokeWidth="4"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - grs / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#1A2534]">
            {student.global_readiness_score ?? "—"}
          </span>
        </div>
      </div>

      {/* Role badge */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3 ${
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

      {/* Active goal */}
      {goal ? (
        <div className="bg-[#F7F8FA] rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {GOAL_CATEGORY_LABELS[goal.category]}
          </p>
          <p className="text-[12px] font-semibold text-[#1A2534] line-clamp-1">{goal.title}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#1A2534] rounded-full" style={{ width: `${goal.progress_pct}%` }} />
            </div>
            <span className={`text-[10px] font-bold ${statusCfg?.color}`}>{goal.progress_pct}%</span>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-slate-300 italic">No active goal</p>
      )}

      <div className="flex items-center text-[#E56668] text-[11px] font-bold gap-1 group-hover:gap-2 transition-all mt-3">
        View profile <ArrowRight size={11} />
      </div>
    </Link>
  );
}

export default async function ClassStudentsPage({
  params,
}: {
  params: { classId: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  const data = await getClassDetailData(params.classId);
  if (!data) notFound();

  const { classInfo, students } = data;

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
          <Users size={13} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">
            Student Roster
          </p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">
          {classInfo.name} · All Students
        </h1>
        <p className="text-slate-500 text-[13px] mt-1">
          {students.length} enrolled students · Batch {classInfo.enrollment_year}
        </p>
      </div>

      {/* Student grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {students.map((student) => (
          <StudentCard
            key={student.student_id}
            student={student}
            classId={params.classId}
          />
        ))}

        {students.length === 0 && (
          <div className="col-span-3 bg-white rounded-[20px] border border-gray-100 p-12 text-center text-slate-400">
            No students found in this class.
          </div>
        )}
      </div>
    </div>
  );
}
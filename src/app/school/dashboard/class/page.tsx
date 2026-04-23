// =============================================================================
// app/school/dashboard/class/page.tsx — All classes overview
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardData } from "@/lib/queries";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { ClassSummary } from "@/lib/types";

function getGRSMeta(score: number | null) {
  if (!score) return { label: "No data", color: "text-slate-400", ring: "#e2e8f0" };
  if (score >= 75) return { label: "Excellent", color: "text-emerald-600", ring: "#34d399" };
  if (score >= 50) return { label: "On Track",  color: "text-blue-600",    ring: "#60a5fa" };
  if (score >= 25) return { label: "Needs Work", color: "text-amber-600",  ring: "#fbbf24" };
  return              { label: "At Risk",    color: "text-[#E56668]",   ring: "#E56668" };
}

export default async function ClassListPage() {
  const data = await getDashboardData();
  if (!data) redirect("/school/sign-in");

  const { classes } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#E56668] mb-2">
          <GraduationCap size={13} /> Class Management
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">All Classes</h1>
        <p className="text-slate-500 text-[13px] mt-1">
          {classes.length} class{classes.length !== 1 ? "es" : ""} assigned to you
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {classes.map((cls: ClassSummary) => {
          const grs = cls.avg_readiness_score;
          const meta = getGRSMeta(grs);
          const total = cls.total_students || 1;
          const circ = 2 * Math.PI * 20;

          return (
            <Link
              key={cls.class_id}
              href={`/school/dashboard/class/${cls.class_id}`}
              className="group bg-white rounded-[24px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-lg hover:border-[#2F4157]/15 transition-all duration-200 overflow-hidden block"
            >
              {/* Top accent bar based on GRS */}
              <div
                className="h-1 w-full"
                style={{
                  background: grs && grs >= 75 ? "#34d399" : grs && grs >= 50 ? "#60a5fa" : grs && grs >= 25 ? "#fbbf24" : "#E56668",
                }}
              />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668] mb-1.5">
                      Batch {cls.enrollment_year}
                    </p>
                    <h3 className="text-[20px] font-black text-[#1A2534] leading-none">
                      {cls.class_name}
                    </h3>
                    {cls.grade && (
                      <p className="text-slate-400 text-[12px] mt-1">
                        Grade {cls.grade}{cls.major ? ` · ${cls.major}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Score ring */}
                  <div className="relative w-14 h-14">
                    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                      <circle cx="28" cy="28" r="20" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                      <circle
                        cx="28" cy="28" r="20" fill="none"
                        stroke={meta.ring} strokeWidth="5"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - (grs ?? 0) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#1A2534]">
                      {grs ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Students", value: cls.total_students },
                    { label: "Avg GRS", value: `${grs ?? "—"}%` },
                    { label: "Status", value: meta.label, className: meta.color },
                  ].map(({ label, value, className }) => (
                    <div key={label} className="bg-[#F7F8FA] rounded-xl p-2.5">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">{label}</p>
                      <p className={`text-[13px] font-black mt-0.5 ${className ?? "text-[#1A2534]"}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Role bar */}
                <div className="space-y-1.5">
                  <div className="flex h-2 rounded-full bg-gray-50 overflow-hidden gap-0.5">
                    {cls.visionary_count > 0 && <div className="bg-amber-400 rounded-full" style={{ width: `${(cls.visionary_count / total) * 100}%` }} />}
                    {cls.insider_count > 0   && <div className="bg-blue-400  rounded-full" style={{ width: `${(cls.insider_count / total) * 100}%` }} />}
                    {cls.explorer_count > 0  && <div className="bg-slate-200 rounded-full" style={{ width: `${(cls.explorer_count / total) * 100}%` }} />}
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[10px] text-slate-500"><b className="text-amber-500">{cls.visionary_count}</b> Visionary</span>
                    <span className="text-[10px] text-slate-500"><b className="text-blue-500">{cls.insider_count}</b> Insider</span>
                    <span className="text-[10px] text-slate-500"><b className="text-slate-400">{cls.explorer_count}</b> Explorer</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center text-[#E56668] text-[12px] font-bold gap-1 group-hover:gap-2 transition-all mt-4 pt-4 border-t border-gray-50">
                  Manage class <ArrowRight size={13} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
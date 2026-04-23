"use client";

// =============================================================================
// IELS For Schools — School Dashboard
// Path: app/dashboard/school/page.tsx
// Description: Teacher/Admin view of all enrolled students, their roles,
//              active goals, and Global Readiness Scores.
// =============================================================================

import { useState, useMemo } from "react";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type SubscriptionRole = "EXPLORER" | "INSIDER" | "VISIONARY";
type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED";

interface ActiveGoal {
  title: string;
  category: string;
  status: GoalStatus;
}

interface Student {
  id: string;
  fullName: string;
  email: string;
  className: string;
  enrollmentYear: number;
  subscriptionRole: SubscriptionRole;
  activeGoal: ActiveGoal | null;
  /** Global Readiness Score: 0–100 */
  globalReadinessScore: number;
  /** Number of milestones completed */
  milestonesCompleted: number;
  isActive: boolean;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_SCHOOL_NAME = "SMAN 1 Malang";
const MOCK_TEACHER_NAME = "Bu Riana";

const MOCK_STUDENTS: Student[] = [
  {
    id: "1",
    fullName: "Aisyah Ramadhani",
    email: "aisyah@sman1malang.sch.id",
    className: "XII IPA 1",
    enrollmentYear: 2022,
    subscriptionRole: "VISIONARY",
    activeGoal: {
      title: "Score IELTS 7.5 by June 2025",
      category: "IELTS_PREPARATION",
      status: "IN_PROGRESS",
    },
    globalReadinessScore: 87,
    milestonesCompleted: 14,
    isActive: true,
  },
  {
    id: "2",
    fullName: "Bimo Santoso",
    email: "bimo@sman1malang.sch.id",
    className: "XII IPS 2",
    enrollmentYear: 2022,
    subscriptionRole: "INSIDER",
    activeGoal: {
      title: "Scholarship Essay Writing Mastery",
      category: "SCHOLARSHIP_READINESS",
      status: "IN_PROGRESS",
    },
    globalReadinessScore: 64,
    milestonesCompleted: 8,
    isActive: true,
  },
  {
    id: "3",
    fullName: "Citra Dewi Kusuma",
    email: "citra@sman1malang.sch.id",
    className: "XI IPA 3",
    enrollmentYear: 2023,
    subscriptionRole: "EXPLORER",
    activeGoal: {
      title: "Build General Fluency for Daily Use",
      category: "GENERAL_FLUENCY",
      status: "IN_PROGRESS",
    },
    globalReadinessScore: 41,
    milestonesCompleted: 3,
    isActive: true,
  },
  {
    id: "4",
    fullName: "Daffa Ardiansyah",
    email: "daffa@sman1malang.sch.id",
    className: "XII IPA 2",
    enrollmentYear: 2022,
    subscriptionRole: "INSIDER",
    activeGoal: null,
    globalReadinessScore: 22,
    milestonesCompleted: 1,
    isActive: true,
  },
  {
    id: "5",
    fullName: "Elisa Margaretha",
    email: "elisa@sman1malang.sch.id",
    className: "X IPS 1",
    enrollmentYear: 2024,
    subscriptionRole: "EXPLORER",
    activeGoal: {
      title: "TOEFL Score 90+ for University Application",
      category: "TOEFL_PREPARATION",
      status: "NOT_STARTED",
    },
    globalReadinessScore: 12,
    milestonesCompleted: 0,
    isActive: true,
  },
  {
    id: "6",
    fullName: "Farhan Maulana",
    email: "farhan@sman1malang.sch.id",
    className: "XII IPS 1",
    enrollmentYear: 2022,
    subscriptionRole: "VISIONARY",
    activeGoal: {
      title: "Land a Remote Work Opportunity via English",
      category: "REMOTE_WORK_ENGLISH",
      status: "COMPLETED",
    },
    globalReadinessScore: 95,
    milestonesCompleted: 21,
    isActive: true,
  },
  {
    id: "7",
    fullName: "Ghea Permata Sari",
    email: "ghea@sman1malang.sch.id",
    className: "XI IPA 1",
    enrollmentYear: 2023,
    subscriptionRole: "INSIDER",
    activeGoal: {
      title: "Public Speaking Confidence for Model UN",
      category: "PUBLIC_SPEAKING",
      status: "IN_PROGRESS",
    },
    globalReadinessScore: 58,
    milestonesCompleted: 6,
    isActive: true,
  },
  {
    id: "8",
    fullName: "Hendra Wijaya",
    email: "hendra@sman1malang.sch.id",
    className: "X IPA 2",
    enrollmentYear: 2024,
    subscriptionRole: "EXPLORER",
    activeGoal: {
      title: "Academic Writing for LPDP Scholarship",
      category: "ACADEMIC_WRITING",
      status: "PAUSED",
    },
    globalReadinessScore: 33,
    milestonesCompleted: 2,
    isActive: false,
  },
];

// =============================================================================
// ROLE CONFIG
// =============================================================================

const ROLE_CONFIG: Record<
  SubscriptionRole,
  { label: string; colors: string; dot: string }
> = {
  EXPLORER: {
    label: "Explorer",
    colors: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  INSIDER: {
    label: "Insider",
    colors: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  VISIONARY: {
    label: "Visionary",
    colors: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
};

const GOAL_STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; color: string }
> = {
  NOT_STARTED: { label: "Not Started", color: "text-slate-400" },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-600" },
  COMPLETED: { label: "Completed", color: "text-emerald-600" },
  PAUSED: { label: "Paused", color: "text-amber-500" },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Circular score ring visualizing Global Readiness Score */
function ScoreRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "#10b981" // emerald
      : score >= 50
      ? "#3b82f6" // blue
      : score >= 25
      ? "#f59e0b" // amber
      : "#e56668"; // IELS coral

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold text-slate-700"
        style={{ fontFamily: "Geologica, sans-serif" }}
      >
        {score}
      </span>
    </div>
  );
}

/** Role badge pill */
function RoleBadge({ role }: { role: SubscriptionRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${cfg.colors}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/** Summary stat card */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[24px] p-5 overflow-hidden ${
        accent
          ? "bg-[#2F4157] text-white"
          : "bg-white border border-gray-100 shadow-sm"
      }`}
    >
      {accent && (
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
          style={{ background: "#E56668", filter: "blur(40px)" }}
        />
      )}
      <p
        className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${
          accent ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-3xl font-black leading-none ${
          accent ? "text-white" : "text-[#2F4157]"
        }`}
        style={{ fontFamily: "Geologica, sans-serif" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs mt-1 ${accent ? "text-white/50" : "text-slate-400"}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD PAGE
// =============================================================================

export default function SchoolDashboardPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<SubscriptionRole | "ALL">("ALL");
  const [yearFilter, setYearFilter] = useState<number | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  // Derive filter options from data
  const years = useMemo(
    () =>
      Array.from(new Set(MOCK_STUDENTS.map((s) => s.enrollmentYear))).sort(
        (a, b) => b - a
      ),
    []
  );

  // Filter + sort
  const filtered = useMemo(() => {
    return MOCK_STUDENTS.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.className.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || s.subscriptionRole === roleFilter;
      const matchYear = yearFilter === "ALL" || s.enrollmentYear === yearFilter;
      return matchSearch && matchRole && matchYear;
    }).sort((a, b) =>
      sortBy === "score"
        ? b.globalReadinessScore - a.globalReadinessScore
        : a.fullName.localeCompare(b.fullName)
    );
  }, [search, roleFilter, yearFilter, sortBy]);

  // Summary stats
  const avgScore =
    MOCK_STUDENTS.length > 0
      ? Math.round(
          MOCK_STUDENTS.reduce((s, u) => s + u.globalReadinessScore, 0) /
            MOCK_STUDENTS.length
        )
      : 0;
  const visionaryCount = MOCK_STUDENTS.filter(
    (s) => s.subscriptionRole === "VISIONARY"
  ).length;
  const activeGoalCount = MOCK_STUDENTS.filter((s) => s.activeGoal).length;

  return (
    <div
      className="min-h-screen bg-[#F7F8FA]"
      style={{ fontFamily: "Geologica, sans-serif" }}
    >
      {/* ── Top Nav ── */}
      <header className="bg-[#2F4157] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-[#E56668] flex items-center justify-center">
            <span className="text-white font-black text-sm">I</span>
          </div>
          <div>
            <span className="font-black text-white text-base leading-none">
              IELS
            </span>
            <span className="text-white/40 font-medium text-base leading-none">
              {" "}
              for Schools
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm hidden sm:block">
            Selamat datang,{" "}
            <span className="text-white font-semibold">{MOCK_TEACHER_NAME}</span>
          </span>
          <div className="w-8 h-8 rounded-full bg-[#E56668]/20 border border-[#E56668]/30 flex items-center justify-center text-sm font-bold text-[#E56668]">
            R
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Page Title ── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#E56668] mb-1">
            School Report
          </p>
          <h1 className="text-3xl font-black text-[#2F4157] leading-tight">
            {MOCK_SCHOOL_NAME}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tracking student English learning journeys & Global Readiness Scores
          </p>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Students"
            value={MOCK_STUDENTS.length}
            sub="enrolled"
            accent
          />
          <StatCard
            label="Avg. Readiness"
            value={`${avgScore}%`}
            sub="Global Readiness Score"
          />
          <StatCard
            label="Active Goals"
            value={activeGoalCount}
            sub={`of ${MOCK_STUDENTS.length} students`}
          />
          <StatCard
            label="Visionary Tier"
            value={visionaryCount}
            sub="top-tier members"
          />
        </div>

        {/* ── Filters & Search ── */}
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search students, class, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-[#F7F8FA] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F4157]/20 focus:border-[#2F4157]"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as SubscriptionRole | "ALL")
            }
            className="text-sm rounded-full border border-gray-200 px-4 py-2.5 bg-[#F7F8FA] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4157]/20 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="EXPLORER">Explorer</option>
            <option value="INSIDER">Insider</option>
            <option value="VISIONARY">Visionary</option>
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) =>
              setYearFilter(
                e.target.value === "ALL" ? "ALL" : parseInt(e.target.value)
              )
            }
            className="text-sm rounded-full border border-gray-200 px-4 py-2.5 bg-[#F7F8FA] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4157]/20 cursor-pointer"
          >
            <option value="ALL">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Angkatan {y}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "name")}
            className="text-sm rounded-full border border-gray-200 px-4 py-2.5 bg-[#F7F8FA] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4157]/20 cursor-pointer"
          >
            <option value="score">Sort: Readiness Score</option>
            <option value="name">Sort: Name A–Z</option>
          </select>

          <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
            {filtered.length} student{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Student Table ── */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 px-6 py-3 border-b border-gray-50 bg-[#F7F8FA]">
            {[
              "Student",
              "Class",
              "Year",
              "Role",
              "Active Goal",
              "Readiness",
            ].map((h) => (
              <span
                key={h}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              No students match your filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((student) => {
                const goalCfg = student.activeGoal
                  ? GOAL_STATUS_CONFIG[student.activeGoal.status]
                  : null;

                return (
                  <div
                    key={student.id}
                    className={`group md:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[#F7F8FA] transition-colors duration-150 flex flex-col md:flex-none ${
                      !student.isActive ? "opacity-50" : ""
                    }`}
                  >
                    {/* Student Name + Email */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initials */}
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "#2F4157" }}
                      >
                        {student.fullName
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#2F4157] text-sm truncate leading-tight">
                          {student.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Class */}
                    <div className="flex md:block items-center gap-2">
                      <span className="md:hidden text-[10px] uppercase tracking-widest text-slate-400">
                        Class:{" "}
                      </span>
                      <span className="text-sm text-slate-600 font-medium">
                        {student.className}
                      </span>
                    </div>

                    {/* Year */}
                    <div className="flex md:block items-center gap-2">
                      <span className="md:hidden text-[10px] uppercase tracking-widest text-slate-400">
                        Year:{" "}
                      </span>
                      <span className="text-sm text-slate-600">
                        {student.enrollmentYear}
                      </span>
                    </div>

                    {/* Role Badge */}
                    <div>
                      <RoleBadge role={student.subscriptionRole} />
                    </div>

                    {/* Active Goal */}
                    <div>
                      {student.activeGoal ? (
                        <div>
                          <p className="text-sm text-slate-700 font-medium leading-tight line-clamp-1">
                            {student.activeGoal.title}
                          </p>
                          <p
                            className={`text-[11px] font-semibold mt-0.5 ${goalCfg?.color}`}
                          >
                            ● {goalCfg?.label}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-300 italic">
                          No active goal
                        </span>
                      )}
                    </div>

                    {/* Global Readiness Score */}
                    <div className="flex items-center gap-2">
                      <ScoreRing score={student.globalReadinessScore} />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">
                          GRS
                        </p>
                        <p className="text-sm font-bold text-[#2F4157]">
                          {student.globalReadinessScore}%
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {student.milestonesCompleted} milestones
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-slate-400 pb-8">
          IELS For Schools — Data refreshes every 24 hours.{" "}
          <span className="text-[#E56668] font-semibold">
            Not Just a Course. A Global Launchpad.
          </span>
        </p>
      </main>

      {/* Inline font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}
// =============================================================================
// lib/types.ts — IELS B2B School Portal · Shared TypeScript Types
// =============================================================================

export type UserRole = "STUDENT" | "TEACHER" | "SCHOOL_ADMIN" | "IELS_ADMIN";
export type SubscriptionRole = "EXPLORER" | "INSIDER" | "VISIONARY";
export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED";
export type GoalCategory =
  | "IELTS_PREPARATION"
  | "TOEFL_PREPARATION"
  | "SCHOLARSHIP_READINESS"
  | "REMOTE_WORK_ENGLISH"
  | "ACADEMIC_WRITING"
  | "PUBLIC_SPEAKING"
  | "GENERAL_FLUENCY";

// ── Database row shapes ───────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  subscription_role: SubscriptionRole;
  school_id: string | null;
  class_id: string | null;
  enrollment_year: number | null;
  avatar_url: string | null;
  is_onboarded: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  country: string;
  logo_url: string | null;
  partner_tier: string;
  is_active: boolean;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  grade: string | null;
  major: string | null;
  enrollment_year: number;
  is_active: boolean;
}

export interface Goal {
  id: string;
  student_id: string;
  school_id: string;
  class_id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  progress_pct: number;
  target_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  student_id: string;
  school_id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
}

export interface ProgressSnapshot {
  id: string;
  student_id: string;
  school_id: string;
  class_id: string;
  global_readiness_score: number;
  speaking_score: number | null;
  writing_score: number | null;
  reading_score: number | null;
  listening_score: number | null;
  vocabulary_score: number | null;
  snapshot_date: string;
}

// ── Aggregated / View types ───────────────────────────────────────────────────

export interface ActiveGoalSummary {
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  progress_pct: number;
}

export interface StudentSummary {
  student_id: string;
  full_name: string;
  email: string;
  subscription_role: SubscriptionRole;
  is_active: boolean;
  is_onboarded: boolean;
  school_id: string;
  class_id: string;
  class_name: string;
  enrollment_year: number;
  school_name: string;
  global_readiness_score: number | null;
  milestones_completed: number;
  active_goal: ActiveGoalSummary | null;
}

export interface ClassSummary {
  class_id: string;
  school_id: string;
  class_name: string;
  grade: string | null;
  major: string | null;
  enrollment_year: number;
  total_students: number;
  avg_readiness_score: number | null;
  visionary_count: number;
  insider_count: number;
  explorer_count: number;
}

export interface SkillScores {
  speaking: number;
  writing: number;
  reading: number;
  listening: number;
  vocabulary: number;
}

// ── Skill breakdown (for AI Teaching Copilot) ────────────────────────────────

export interface SkillData {
  /** Average score 0–100 across all students for this skill */
  avgScore: number;
  /** Students with score < 50 */
  atRiskCount: number;
  /** Students with score >= 75 */
  topCount: number;
  /** Distribution buckets e.g. { "0-25": 3, "25-50": 11, "50-75": 22, "75-100": 11 } */
  scoreDistribution?: Record<string, number>;
  /** Common error patterns derived from snapshot data */
  commonErrors?: string[];
  /** 4-week trend string e.g. "+3.2" or "-1.5" */
  trend?: string;
}

export type SkillBreakdown = {
  writing:    SkillData;
  speaking:   SkillData;
  reading:    SkillData;
  listening:  SkillData;
  vocabulary: SkillData;
  grammar:    SkillData;
};

// ── Query return types ────────────────────────────────────────────────────────

export interface DashboardData {
  teacher: UserProfile;
  school: School | null;
  classes: ClassSummary[];
  totalStudents: number;
  avgSchoolGRS: number;
  /** Aggregated per-skill scores for the AI Teaching Copilot */
  skillBreakdown: SkillBreakdown;
}

export interface ClassDetailData {
  classInfo: Class;
  students: StudentSummary[];
  avgSkills: SkillScores;
  atRiskStudents: StudentSummary[];
  topImprovers: StudentSummary[];
  pathwayDistribution: { category: GoalCategory; count: number; pct: number }[];
}

export interface StudentDetailData {
  student: UserProfile;
  classInfo: Class | null;
  goals: Goal[];
  milestones: Milestone[];
  snapshots: ProgressSnapshot[];
  latestSnapshot: ProgressSnapshot | null;
}

// ── UI config ─────────────────────────────────────────────────────────────────

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  IELTS_PREPARATION:     "IELTS Prep",
  TOEFL_PREPARATION:     "TOEFL Prep",
  SCHOLARSHIP_READINESS: "Scholarship",
  REMOTE_WORK_ENGLISH:   "Remote Work",
  ACADEMIC_WRITING:      "Academic Writing",
  PUBLIC_SPEAKING:       "Public Speaking",
  GENERAL_FLUENCY:       "General Fluency",
};

export const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: "Not Started", color: "text-slate-500",   bg: "bg-slate-100"  },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-600",    bg: "bg-blue-50"    },
  COMPLETED:   { label: "Completed",   color: "text-emerald-600", bg: "bg-emerald-50" },
  PAUSED:      { label: "Paused",      color: "text-amber-600",   bg: "bg-amber-50"   },
};
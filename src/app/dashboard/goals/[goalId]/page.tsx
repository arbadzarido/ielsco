"use client";
// Pastiin udah import AlertTriangle dan Trash2 dari lucide-react
import { createPortal } from "react-dom"; // Pastiin ini juga ada
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TaskList from "@/components/goals/TaskList";
import TaskSubmission from "@/components/goals/TaskSubmission";
import MascotInsight from "@/components/dashboard/MascotInsight";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  MessageSquare,
  Sparkles,
  Crown,
  Trash2,
  AlertTriangle,
  Target,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getGoalById,
  toggleTaskCompletion,
  submitTaskForReview,
  getGoalAnalytics,
  deleteGoal,
} from "@/data/goals";
import {
  calculateStudyPlan,
  type CEFRLevel,
  type StudyPlanResult,
} from "@/data/progress-calculator";
import type { GoalWithTasks, GoalAnalytics as GoalAnalyticsType } from "@/types/goals";

type UserTier = "explorer" | "insider" | "visionary";

const DEFAULT_CURRENT_CEFR: CEFRLevel = "B1";
const DEFAULT_TARGET_CEFR: CEFRLevel = "B2";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params?.goalId as string;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
  );

  const [userData, setUserData] = useState<{
    id: string;
    name: string;
    tier: UserTier;
    avatar: string;
  }>({ id: "", name: "", tier: "explorer", avatar: "" });

  const [goal, setGoal] = useState<GoalWithTasks | null>(null);
  const [analytics, setAnalytics] = useState<GoalAnalyticsType | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submissionModalTask, setSubmissionModalTask] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // ── Load user + goal ──────────────────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }
// --- GANTI DENGAN INI ---
// 1. Ambil data Membership langsung (Source of Truth Status)
const { data: dbMembership } = await supabase
  .from("memberships")
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle();

// 2. Ambil data User (Nama & Avatar saja)
const { data: dbUser } = await supabase
  .from("users")
  .select("full_name, avatar_url")
  .eq("id", user.id)
  .maybeSingle();

// 3. Mapping Tier (Konsisten: Pro -> Insider, Visionary -> Visionary)
const dbTier = dbMembership?.tier;
let uiTier: UserTier = "explorer";

if (dbTier === "pro") {
  uiTier = "insider";
} else if (dbTier === "premium" || dbTier === "visionary") {
  uiTier = "visionary";
}

const avatarUrl =
  dbUser?.avatar_url ||
  user.user_metadata?.avatar_url ||
  user.user_metadata?.picture ||
  "";

setUserData({
  id: user.id,
  name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
  tier: uiTier,
  avatar: avatarUrl,
});

      if (goalId) {
        await loadGoalDetails(goalId);
      }
    };

    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]);

  // ── Load goal details ─────────────────────────────────────────────────────
  const loadGoalDetails = async (id: string) => {
    try {
      const [goalData, analyticsData] = await Promise.all([
        getGoalById(id),
        getGoalAnalytics(id),
      ]);

      if (goalData) {
        setGoal(goalData as GoalWithTasks);

        const currentCEFR: CEFRLevel =
          (goalData as any).current_cefr ?? DEFAULT_CURRENT_CEFR;
        const targetCEFR: CEFRLevel =
          (goalData as any).target_cefr ?? DEFAULT_TARGET_CEFR;

        const daysRemaining = Math.max(
          0,
          Math.ceil(
            (new Date(goalData.target_deadline).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          )
        );
        const monthsRemaining = Math.max(1, Math.round(daysRemaining / 30));

        const plan = calculateStudyPlan(
          goalData.objective,
          { cefr: currentCEFR },
          { cefr: targetCEFR },
          monthsRemaining,
          true
        );

        setStudyPlan(plan);
      }

      if (analyticsData) setAnalytics(analyticsData);
    } catch (error) {
      console.error("Failed to load goal:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  // FIX: must return Promise<boolean> to match TaskListProps.onToggleTask
  const handleToggleTask = async (taskId: string): Promise<boolean> => {
    if (!userData.id) return false;
    const success = await toggleTaskCompletion(taskId, userData.id);
    if (success && goalId) await loadGoalDetails(goalId);
    return success;
  };

const handleSubmitTask = async (
  taskId: string,
  submissionUrl: string,
  notes?: string
): Promise<boolean> => {
  const success = await submitTaskForReview(taskId, submissionUrl, notes);
  if (success && goalId) await loadGoalDetails(goalId);
  return success;
};

// --- FUNGSI DELETE BARU ---
const executeDeleteGoal = async () => {
  setIsDeleting(true);
  setDeleteError("");
  
  const success = await deleteGoal(goalId);

  if (success) {
    router.push("/dashboard/goals");
  } else {
    setDeleteError("Failed to delete goal. Please try again or contact support.");
    setIsDeleting(false);
  }
};

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || !goal) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
          <div className="h-64 bg-gray-200 rounded-3xl mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-gray-200 rounded-2xl" />
              <div className="h-32 bg-gray-200 rounded-2xl" />
            </div>
            <div className="h-[600px] bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const progressPercentage = goal.overall_progress;
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(goal.target_deadline).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    )
  );
  const currentTask = submissionModalTask
    ? goal.tasks.find((t) => t.id === submissionModalTask)
    : null;
  const hasPremiumAccess =
    userData.tier === "insider" || userData.tier === "visionary";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      userTier={userData.tier}
      userName={userData.name}
      userAvatar={userData.avatar}
    >
      <div className="min-h-screen bg-[#F7F8FA]">

        {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
        <div className="relative bg-[#304156] text-white overflow-hidden pb-12">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#E56668] opacity-10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 opacity-5 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 relative z-10">

            {/* Breadcrumb */}
            <Link
              href="/dashboard/goals"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8 transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-1 transition-transform"
              />
              Back to Goals Dashboard
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

              {/* Left: Title & meta */}
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest border border-white/10 backdrop-blur-sm">
                  <Target size={12} className="text-[#E56668]" />
                  {goal.destination}
                </div>

                <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
                  {goal.objective}
                </h1>

                {(goal as any).current_cefr && (goal as any).target_cefr && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-sm font-semibold">
                    <span className="text-white/60">Level journey:</span>
                    <span className="text-white">
                      {(goal as any).current_cefr} → {(goal as any).target_cefr}
                    </span>
                    {(goal as any).current_ielts && (goal as any).target_ielts && (
                      <span className="text-white/40 text-xs">
                        (IELTS {(goal as any).current_ielts} → {(goal as any).target_ielts})
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-6 text-sm text-white/70 pt-2">
                  <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <Calendar size={16} className="text-[#E56668]" />
                    Target:{" "}
                    <span className="text-white font-medium">
                      {new Date(goal.target_deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-white font-medium">{daysRemaining}</span>{" "}
                    days remaining
                  </span>
                </div>
              </div>

              {/* Right: Circular progress */}
              <div className="flex-shrink-0 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm flex flex-col items-center gap-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-white/10"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-[#E56668] transition-all duration-1000 ease-out drop-shadow-[0_0_10px_rgba(229,102,104,0.5)]"
                      strokeDasharray={`${progressPercentage}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black">{progressPercentage}%</span>
                  </div>
                </div>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                  Progress
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 -mt-8 relative z-20">

          {analytics && (
            <div className="mb-8">
              <MascotInsight analytics={analytics} goal={goal} userName={userData.name} />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left column: task list */}
            <div className="lg:col-span-2 space-y-8">
              <TaskList
                tasks={goal.tasks}
                userTier={userData.tier === "visionary" ? "insider" : userData.tier}
                onToggleTask={handleToggleTask}
                onSubmitTask={handleSubmitTask}
                onViewMaterials={(taskId) => setSubmissionModalTask(taskId)}
              />
            </div>

            {/* Right column: sidebar */}
            <div className="space-y-6">

              {/* Daily Study Plan */}
              {studyPlan && (
                <div className="bg-white rounded-[24px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#E56668]/5 rounded-bl-[100px] -mr-8 -mt-8 z-0" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                        <Sparkles size={18} fill="currentColor" />
                      </div>
                      <h3 className="font-bold text-[#2F4157] text-lg">Daily Study Plan</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">
                            Self-Study
                          </p>
                          <p className="text-2xl font-black text-[#2F4157]">
                            {studyPlan.breakdown.selfStudy.minutesPerDay}
                            <span className="text-sm font-bold text-slate-400 ml-0.5">m</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">per day</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">
                            Total/Day
                          </p>
                          <p className="text-2xl font-black text-[#E56668]">
                            {studyPlan.dailyMinutesRequired}
                            <span className="text-sm font-bold text-[#E56668]/60 ml-0.5">m</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">incl. club</p>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-xs text-blue-700 font-semibold mb-1">Level Journey</p>
                        <p className="text-sm font-bold text-blue-900">
                          {studyPlan.currentCEFR} → {studyPlan.targetCEFR}
                        </p>
                        <p className="text-[11px] text-blue-600 mt-0.5">
                          ~{studyPlan.totalHoursNeeded} total hours needed
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          Intensity
                        </p>
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                            studyPlan.difficultyLevel === "easy" &&
                              "bg-green-50 text-green-600 border-green-100",
                            studyPlan.difficultyLevel === "moderate" &&
                              "bg-blue-50 text-blue-600 border-blue-100",
                            studyPlan.difficultyLevel === "challenging" &&
                              "bg-orange-50 text-orange-600 border-orange-100",
                            studyPlan.difficultyLevel === "extreme" &&
                              "bg-red-50 text-red-600 border-red-100"
                          )}
                        >
                          {studyPlan.difficultyLevel}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex gap-3">
                          <AlertTriangle
                            size={16}
                            className="text-orange-400 flex-shrink-0 mt-0.5"
                          />
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {studyPlan.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-[#2F4157] mb-4 text-sm uppercase tracking-wider opacity-50">
                  Management
                </h3>

                <div className="space-y-3">
                  <Link
                    href={`/dashboard/goals/${goalId}/progress-report`}
                    className="group w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-xl transition-all text-left"
                  >
                    <span className="text-sm font-bold text-[#2F4157] group-hover:text-[#E56668] transition-colors flex items-center gap-3">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100 group-hover:border-[#E56668]/20 transition-colors">
                        <Download
                          size={16}
                          className="text-slate-400 group-hover:text-[#E56668]"
                        />
                      </div>
                      Export Report
                    </span>
                  </Link>

                  <Link
                    href={`/dashboard/goals/${goalId}/consultations`}
                    className={cn(
                      "group w-full flex items-center justify-between p-4 rounded-xl transition-all text-left border",
                      hasPremiumAccess
                        ? "bg-[#E56668]/5 hover:bg-[#E56668]/10 border-[#E56668]/20"
                        : "bg-slate-50 border-slate-100 opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-bold flex items-center gap-3",
                        hasPremiumAccess ? "text-[#E56668]" : "text-slate-500"
                      )}
                    >
                      <div
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors",
                          hasPremiumAccess
                            ? "bg-white border-[#E56668]/20"
                            : "bg-slate-100 border-slate-200"
                        )}
                      >
                        <MessageSquare
                          size={16}
                          className={hasPremiumAccess ? "text-[#E56668]" : "text-slate-400"}
                        />
                      </div>
                      Book Consultation
                    </span>
                    {!hasPremiumAccess && (
                      <Crown size={14} className="text-yellow-500" />
                    )}
                  </Link>

                      {/* DELETE BUTTON */}
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)} // <-- UBAH DI SINI
                    disabled={isDeleting}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 border border-slate-100 hover:border-red-100 rounded-xl transition-all text-left group mt-2"
                  >
                    <span className="text-sm font-bold text-slate-500 group-hover:text-red-600 flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-red-100 group-hover:border-red-200 transition-colors">
                        <Trash2 size={16} className="text-slate-400 group-hover:text-red-500" />
                      </div>
                      Delete Goal
                    </span>
                  </button>
                </div>
              </div>

              {/* Category progress */}
              {analytics && Object.keys(analytics.category_progress).length > 0 && (
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-[#2F4157] mb-6 text-sm uppercase tracking-wider opacity-50 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Breakdown
                  </h3>
                  <div className="space-y-6">
                    {Object.entries(analytics.category_progress).map(
                      ([category, data]) => (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              {category}
                            </span>
                            <span className="text-xs font-bold text-[#2F4157]">
                              {data.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#E56668] to-[#ff8f91] rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${data.percentage}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
                            {data.completed}/{data.total} tasks done
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Submission Modal */}
      {currentTask && (
        <TaskSubmission
          task={currentTask}
          isOpen={!!submissionModalTask}
          onClose={() => setSubmissionModalTask(null)}
          onSubmit={handleSubmitTask}
        />
      )}

      {/* === DELETE CONFIRMATION MODAL === */}
{isDeleteModalOpen && typeof window !== "undefined" && createPortal(
  <div 
    className="fixed inset-0 bg-[#2F4157]/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
    onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
  >
    <div 
      className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-red-50 border-4 border-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      
      <h3 className="text-2xl font-black text-[#2F4157] mb-2">
        Delete this goal?
      </h3>
      
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Are you sure you want to permanently delete <strong>{goal.objective}</strong>? 
        All your progress, completed tasks, and mentor feedback will be lost. 
        <span className="block mt-1 font-semibold text-red-500">This action cannot be undone.</span>
      </p>

      {deleteError && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
          {deleteError}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          onClick={() => setIsDeleteModalOpen(false)}
          disabled={isDeleting}
          className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={executeDeleteGoal}
          disabled={isDeleting}
          className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:bg-red-300 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 size={16} />
              Yes, Delete
            </>
          )}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
    </DashboardLayout>
  );
}
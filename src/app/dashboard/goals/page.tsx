"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  Target, Plus, AlertCircle, Activity, Lock, AlertTriangle, Trash2 
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { getUserGoals, deleteGoal } from "@/data/goals";
import GoalCard from "@/components/goals/GoalCard";
import GoalWizard from "@/components/goals/GoalWizard";
import type { Goal } from "@/types/goals";

type UserTier = "explorer" | "insider" | "visionary";

const MAX_GOALS = 3;

export default function GoalsPage() {
  const router  = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL     || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
  );

  const [goals,       setGoals]       = useState<Goal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showWizard,  setShowWizard]  = useState(false);
  const [userData,    setUserData]    = useState<{ id: string; name: string; tier: UserTier; avatar: string }>({
    id: "", name: "", tier: "explorer", avatar: "",
  });

  // ── Modal Delete State ──────────────────────────────────────────────────────
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeGoals    = goals.filter((g) => (g as any).status !== "completed");
  const completedGoals = goals.filter((g) => (g as any).status === "completed");
  const isGoalLimitHit = activeGoals.length >= MAX_GOALS;

  // ── Fetch goals ────────────────────────────────────────────────────────────
  const fetchGoals = async (userId: string) => {
    const userGoals = await getUserGoals(userId);
    setGoals(userGoals as Goal[]);
  };

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/sign-in"); return; }

// REPLACE DENGAN INI
// 1. Ambil data Membership langsung (Source of Truth untuk Tier)
const { data: dbMembership } = await supabase
  .from("memberships")
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle();

// 2. Ambil data Profile (Hanya untuk Nama & Avatar)
const { data: dbUser } = await supabase
  .from("users")
  .select("full_name, avatar_url")
  .eq("id", user.id)
  .maybeSingle();

// 3. Mapping Tier (Samain dengan Dashboard & Community)
const dbTier = dbMembership?.tier;
let uiTier: UserTier = "explorer";

if (dbTier === "pro") {
  uiTier = "insider";
} else if (dbTier === "premium" || dbTier === "visionary") {
  uiTier = "visionary";
}

setUserData({
  id: user.id,
  name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
  tier: uiTier,
  avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
});

      await fetchGoals(user.id);
      setLoading(false);
    };

    initData();
  }, [router, supabase]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleGoalCreated = async () => {
    setShowWizard(false);
    setLoading(true);
    if (userData.id) await fetchGoals(userData.id);
    setLoading(false);
  };

  // Triggered when trash icon is clicked on the card
  const confirmDelete = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteError("");
  };

  // Triggered when user clicks "Yes, Delete" inside the modal
  const executeDeleteGoal = async () => {
    if (!goalToDelete) return;
    
    setIsDeleting(true);
    setDeleteError("");
    
    const ok = await deleteGoal(goalToDelete.id);
    
    if (ok) {
      if (userData.id) await fetchGoals(userData.id);
      setGoalToDelete(null); // Close modal
    } else {
      setDeleteError("Failed to delete goal. Please try again.");
    }
    
    setIsDeleting(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      userName={userData.name}
      userTier={userData.tier}
      userAvatar={userData.avatar}
    >
  {/* ── HERO: MY LEARNING GOALS ─────────────────────────────────────── */}
<div className="relative bg-[#304156] text-white overflow-hidden py-12 lg:py-16 px-4 sm:px-8 lg:px-12">
  {/* Decorative blurs */}
  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#577E90]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

  <div className="max-w-7xl mx-auto relative z-10">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

      {/* Left: Heading & Description */}
      <div className="lg:col-span-7 flex flex-col items-center text-center md:items-start md:text-left space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider">
          <Target size={16} />
          <span>GOALS & PROGRESS</span>
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
          Track Your Roadmap
        </h1>

        <p className="text-white/80 text-base lg:text-lg leading-relaxed max-w-xl mx-auto md:mx-0">
          Set clear objectives, track your progress in real-time, and let consistency shape your journey to success.
        </p>

        {/* Goal limit indicator */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i < activeGoals.length ? "bg-[#577E90]" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-white/60 font-medium">
            {activeGoals.length}/{MAX_GOALS} active goals
            {isGoalLimitHit && " — limit reached"}
          </span>
        </div>
      </div>

      {/* Right: CTA & Stats */}
      <div className="lg:col-span-5 flex flex-col items-center md:items-end gap-4 w-full">
        <div className="w-full sm:max-w-xs space-y-3">

          {/* New goal button */}
          <button
            onClick={() => { if (!isGoalLimitHit) setShowWizard(true); }}
            disabled={isGoalLimitHit}
            title={isGoalLimitHit ? "Delete an existing goal first (max 3 active)" : "Create a new goal"}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase tracking-wide text-sm shadow-lg transition-all ${
              isGoalLimitHit
                ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/20"
                : "bg-[#577E90] text-white hover:bg-[#486b7a] hover:scale-[1.02] active:scale-95"
            }`}
          >
            {isGoalLimitHit ? (
              <>
                <Lock size={18} />
                Max 3 Goals Reached
              </>
            ) : (
              <>
                <Plus size={20} />
                Set a New Goal
              </>
            )}
          </button>

          {/* Limit tooltip */}
          {isGoalLimitHit && (
            <p className="text-center text-xs text-white/50 leading-relaxed">
              Complete or delete an active goal to unlock a new slot.
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Active</p>
              <p className="text-2xl font-bold leading-none">
                {loading ? "—" : String(activeGoals.length).padStart(2, "0")}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">Completed</p>
              <p className="text-2xl font-bold leading-none text-green-400">
                {loading ? "—" : String(completedGoals.length).padStart(2, "0")}
              </p>
            </div>
          </div>

          <button className="w-full py-3 bg-white/5 border border-white/10 text-white font-semibold uppercase tracking-wide text-xs rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <Activity size={16} />
            View Analysis History
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* ── GOALS LIST ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
            ))}
          </div>

        ) : goals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-gray-400" size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#2F4157] mb-2">No Goals Yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Start your journey by creating your first learning goal above.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E56668] text-white rounded-xl font-bold text-sm hover:bg-[#C04C4E] transition-colors shadow-md"
            >
              <Plus size={16} strokeWidth={3} /> Create My First Goal
            </button>
          </div>

        ) : (
          <div className="space-y-8">

            {/* Active goals */}
            {activeGoals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">
                    Active Goals ({activeGoals.length}/{MAX_GOALS})
                  </h2>
                  {isGoalLimitHit && (
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                      Limit reached — complete or delete to add more
                    </span>
                  )}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onDelete={() => confirmDelete(goal)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed goals */}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
                  Completed Goals ({completedGoals.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
                  {completedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onDelete={() => confirmDelete(goal)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── WIZARD ───────────────────────────────────────────────────────── */}
      {showWizard && (
        <GoalWizard
          userId={userData.id}
          onClose={() => setShowWizard(false)}
          onSuccess={handleGoalCreated}
        />
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {goalToDelete && typeof window !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-[#2F4157]/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isDeleting && setGoalToDelete(null)}
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
              Are you sure you want to permanently delete <strong>{goalToDelete.objective}</strong>? 
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
                onClick={() => setGoalToDelete(null)}
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
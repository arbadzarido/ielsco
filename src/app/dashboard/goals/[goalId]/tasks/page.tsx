"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TaskList from "@/components/goals/TaskList";
import TaskSubmission from "@/components/goals/TaskSubmission";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  Download,
  BookOpen,
  FileText,
  Video,
  Headphones,
  ExternalLink,
  Lock,
  Crown
} from "lucide-react";
import Link from "next/link";
import { getGoalById, toggleTaskCompletion, submitTaskForReview } from "@/data/goals";
import { getPersonalizedAssignments, getPersonalizedMaterials } from "@/data/assignments-materials";
import type { GoalWithTasks } from "@/types/goals";
import { cn } from "@/lib/utils";

// --- TIPE DATA BARU ---
type UserTier = "explorer" | "insider" | "visionary";

export default function TasksPage() {
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
  }>({ 
    id: "", 
    name: "", 
    tier: "explorer" 
  });

  const [goal, setGoal] = useState<GoalWithTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionModalTask, setSubmissionModalTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "materials">("tasks");

  useEffect(() => {
    const initData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }
// --- GANTI DENGAN INI ---
// 1. Ambil data Membership langsung (Source of Truth untuk akses Konsultasi)
const { data: dbMembership } = await supabase
  .from("memberships")
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle();

// 2. Ambil data User (Nama & Profile)
const { data: dbUser } = await supabase
  .from("users")
  .select("full_name")
  .eq("id", user.id)
  .maybeSingle();

// 3. Mapping Tier (Konsisten: Visionary dapet akses penuh)
const dbTier = dbMembership?.tier;
let uiTier: UserTier = "explorer";

if (dbTier === "pro") {
  uiTier = "insider";
} else if (dbTier === "premium" || dbTier === "visionary") {
  uiTier = "visionary";
} else {
  uiTier = "explorer";
}

setUserData({
  id: user.id,
  name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
  tier: uiTier,
});
      if (goalId) {
        const goalData = await getGoalById(goalId);
        if (goalData) setGoal(goalData);
      }
      
      setLoading(false);
    };

    initData();
  }, [goalId, router, supabase]);

  // ✅ FIX 1: Wajib me-return Promise<boolean> sesuai permintaan interface TaskList
  const handleToggleTask = async (taskId: string): Promise<boolean> => {
    if (!userData.id) return false;
    const success = await toggleTaskCompletion(taskId, userData.id);
    if (success && goalId) {
      const goalData = await getGoalById(goalId);
      if (goalData) setGoal(goalData);
    }
    return success;
  };

  const handleSubmitTask = async (taskId: string, url: string, notes?: string): Promise<boolean> => {
    const success = await submitTaskForReview(taskId, url, notes);
    if (success && goalId) {
      const goalData = await getGoalById(goalId);
      if (goalData) setGoal(goalData);
    }
    return success;
  };

  if (loading || !goal) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-8 max-w-7xl mx-auto animate-pulse">
          <div className="h-12 bg-gray-200 rounded-xl w-64 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  const materials = getPersonalizedMaterials(goal.objective, userData.tier as any); 
  
  const currentTask = submissionModalTask 
    ? goal.tasks.find(t => t.id === submissionModalTask) 
    : null;

  const getMaterialIcon = (type: string) => {
    switch(type) {
      case 'video': return <Video size={16} />;
      case 'podcast': return <Headphones size={16} />;
      case 'ebook': return <BookOpen size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar="">
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/dashboard/goals/${goalId}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-[#2F4157] text-sm mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Goal
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#2F4157] mb-2">
                  Tasks & Materials
                </h1>
                <p className="text-gray-600">
                  {goal.objective}
                </p>
              </div>
              
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-[#2F4157] rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                <Download size={18} />
                Export Task List
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white border border-gray-200 p-1.5 rounded-xl mb-6 w-fit shadow-sm">
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === "tasks"
                  ? "bg-[#E56668] text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              All Tasks ({goal.tasks.length})
            </button>
            <button
              onClick={() => setActiveTab("materials")}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === "materials"
                  ? "bg-[#E56668] text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Learning Materials ({materials.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === "tasks" ? (
            <TaskList
              tasks={goal.tasks}
              userTier={userData.tier === "visionary" ? "insider" : userData.tier}
              onToggleTask={handleToggleTask}
              
              // ✅ FIX 2: Kasih fungsi eksekusi submit benerannya ke prop ini
              onSubmitTask={handleSubmitTask} 
              
              // Kalau ada prop buat buka modal (tergantung dari definition TaskList lu), biasanya kayak gini:
              // onOpenSubmitModal={(taskId) => setSubmissionModalTask(taskId)}
              // atau:
              onViewMaterials={(taskId) => setSubmissionModalTask(taskId)}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#2F4157] mb-4">
                  Recommended Learning Materials
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Curated resources to support your {goal.objective} journey. 
                  <span className="text-[#E56668] font-bold"> Insider</span> & 
                  <span className="text-purple-600 font-bold"> Visionary</span> members get full access.
                </p>
                
                <div className="grid gap-4">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className={cn(
                        "group p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all",
                        !material.isLocked ? "hover:bg-gray-100 hover:border-[#E56668]/30" : "opacity-80"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors",
                          material.isLocked 
                            ? "bg-gray-100 border-gray-200 text-gray-400" 
                            : "bg-white border-gray-200 text-[#E56668] group-hover:border-[#E56668]"
                        )}>
                          {material.isLocked ? <Lock size={16}/> : getMaterialIcon(material.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className={cn(
                              "font-bold transition-colors",
                              material.isLocked ? "text-gray-500" : "text-[#2F4157] group-hover:text-[#E56668]"
                            )}>
                              {material.title}
                            </h3>
                            
                            {material.isLocked && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase tracking-wide rounded">
                                <Crown size={10} /> Premium
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {material.description}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs">
                            <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 font-medium capitalize">
                              {material.type}
                            </span>
                            <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 font-medium capitalize">
                              {material.difficulty}
                            </span>
                            {material.duration && (
                              <span className="text-gray-500">
                                {material.duration}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {material.url && !material.isLocked && (
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-4 py-2 bg-[#E56668] text-white rounded-lg font-semibold text-sm hover:bg-[#C04C4E] transition-colors shadow-sm"
                          >
                            Access
                            <ExternalLink size={14} />
                          </a>
                        )}
                        
                        {material.isLocked && (
                           <button className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg font-semibold text-sm cursor-not-allowed">
                              Locked
                           </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentTask && (
        <TaskSubmission
          task={currentTask}
          isOpen={!!submissionModalTask}
          onClose={() => setSubmissionModalTask(null)}
          onSubmit={handleSubmitTask}
        />
      )}
    </DashboardLayout>
  );
}
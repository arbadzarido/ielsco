"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createBrowserClient } from "@supabase/ssr";

import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Award,
  BarChart3,
  Activity,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { getGoalById, getGoalAnalytics } from "@/data/goals";
import type { GoalWithTasks, GoalAnalytics } from "@/types/goals";

// --- TIPE DATA ---
type UserTier = "explorer" | "insider" | "visionary";

export default function ProgressReportPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params?.goalId as string;
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Update State Definition
  const [userData, setUserData] = useState<{
    id: string;
    name: string;
    tier: UserTier;
    avatar: string; // <-- Tambahin field ini
  }>({ 
    id: "", 
    name: "", 
    tier: "explorer", // Default value
    avatar: ""
    
  });

  const [goal, setGoal] = useState<GoalWithTasks | null>(null);
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

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
  .select("full_name, avatar_url")
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
const avatarUrl = dbUser?.avatar_url || user.user_metadata?.avatar_url || "";
setUserData({
  id: user.id,
  name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
  tier: uiTier,
  avatar: avatarUrl
});
      if (goalId) {
        const goalData = await getGoalById(goalId);
        const analyticsData = await getGoalAnalytics(goalId);
        
        if (goalData) setGoal(goalData);
        if (analyticsData) setAnalytics(analyticsData);
      }
      
      setLoading(false);
    };

    initData();
  }, [goalId, router, supabase]);

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert("PDF export will be implemented");
  };

  if (loading || !goal || !analytics) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-8 max-w-7xl mx-auto animate-pulse">
          <div className="h-12 bg-gray-200 rounded-xl w-64 mb-8"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  const daysElapsed = Math.floor(
    (new Date().getTime() - new Date(goal.created_at).getTime()) /
      (24 * 60 * 60 * 1000)
  );
  
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(goal.target_deadline).getTime() - new Date().getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );

  const totalDays = daysElapsed + daysRemaining;
  const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
  const progressDelta = goal.overall_progress - expectedProgress;
  const isAheadOfSchedule = progressDelta >= 0;

  return (
    // 3. Pass userData.tier ke Layout
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
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
                  Progress Report
                </h1>
                <p className="text-gray-600">
                  {goal.objective} • {new Date().toLocaleDateString('en-US', { 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              
              <button 
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#E56668] text-white rounded-xl font-semibold hover:bg-[#C04C4E] transition-colors shadow-lg"
              >
                <Download size={18} />
                Export as PDF
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 mb-8">
            {/* Overall Progress */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Target className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Overall Progress
                  </p>
                  <p className="text-2xl font-bold text-[#2F4157]">
                    {goal.overall_progress}%
                  </p>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  style={{ width: `${goal.overall_progress}%` }}
                />
              </div>
            </div>

            {/* Tasks Completed */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Tasks Done
                  </p>
                  <p className="text-2xl font-bold text-[#2F4157]">
                    {goal.tasks.filter(t => t.is_completed).length}/{goal.tasks.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {Math.round((goal.tasks.filter(t => t.is_completed).length / goal.tasks.length) * 100)}% completion rate
              </p>
            </div>

            {/* Weekly Velocity */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Activity className="text-orange-600" size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Weekly Velocity
                  </p>
                  <p className="text-2xl font-bold text-[#2F4157]">
                    {analytics.average_progress_per_week}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Average progress per week
              </p>
            </div>

            {/* Schedule Status */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isAheadOfSchedule ? "bg-green-50" : "bg-red-50"
                }`}>
                  {isAheadOfSchedule ? (
                    <TrendingUp className="text-green-600" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600" size={24} />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Schedule
                  </p>
                  <p className={`text-2xl font-bold ${
                    isAheadOfSchedule ? "text-green-600" : "text-red-600"
                  }`}>
                    {isAheadOfSchedule ? "Ahead" : "Behind"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {Math.abs(Math.round(progressDelta))}% {isAheadOfSchedule ? "ahead of" : "behind"} expected
              </p>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Timeline Overview */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#2F4157] mb-6 flex items-center gap-2">
                  <Calendar size={20} className="text-[#E56668]" />
                  Timeline Overview
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Started</span>
                    <span className="font-semibold text-[#2F4157]">
                      {new Date(goal.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Target Deadline</span>
                    <span className="font-semibold text-[#2F4157]">
                      {new Date(goal.target_deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Days Elapsed</span>
                      <span className="font-semibold text-[#2F4157]">{daysElapsed} days</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Days Remaining</span>
                      <span className="font-semibold text-[#2F4157]">{daysRemaining} days</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Duration</span>
                      <span className="font-semibold text-[#2F4157]">{totalDays} days</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        Time Progress
                      </span>
                      <span className="text-xs font-bold text-[#2F4157]">
                        {Math.round((daysElapsed / totalDays) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full"
                        style={{ width: `${(daysElapsed / totalDays) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Breakdown */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#2F4157] mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-[#E56668]" />
                  Task Type Breakdown
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">System-Verified Tasks</span>
                      <span className="font-semibold text-[#2F4157]">
                        {analytics.system_tasks_completed}/{goal.tasks.filter(t => t.task_type === 'system').length}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ 
                          width: `${(analytics.system_tasks_completed / Math.max(1, goal.tasks.filter(t => t.task_type === 'system').length)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Self-Track Tasks</span>
                      <span className="font-semibold text-[#2F4157]">
                        {analytics.self_track_tasks_completed}/{goal.tasks.filter(t => t.task_type === 'self_track').length}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ 
                          width: `${(analytics.self_track_tasks_completed / Math.max(1, goal.tasks.filter(t => t.task_type === 'self_track').length)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Mentor-Assessed Tasks</span>
                      <span className="font-semibold text-[#2F4157]">
                        {analytics.mentor_assessed_tasks_completed}/{goal.tasks.filter(t => t.task_type === 'mentor_assessed').length}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ 
                          width: `${(analytics.mentor_assessed_tasks_completed / Math.max(1, goal.tasks.filter(t => t.task_type === 'mentor_assessed').length)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Category Progress */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#2F4157] mb-6 flex items-center gap-2">
                  <Activity size={20} className="text-[#E56668]" />
                  Category Progress
                </h3>
                
                <div className="space-y-5">
                  {Object.entries(analytics.category_progress).map(([category, data]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 capitalize">
                          {category}
                        </span>
                        <span className="text-sm font-bold text-[#2F4157]">
                          {data.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#E56668] to-[#ff8f91] rounded-full transition-all duration-500"
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {data.completed}/{data.total} tasks completed
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#2F4157] mb-6 flex items-center gap-2">
                  <Award size={20} className="text-[#E56668]" />
                  Engagement & Activity
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-3xl font-bold text-blue-600 mb-1">
                      {analytics.days_active}
                    </p>
                    <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">
                      Days Active
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-xl">
                    <p className="text-3xl font-bold text-orange-600 mb-1">
                      {analytics.completion_streak}
                    </p>
                    <p className="text-xs text-orange-700 uppercase tracking-wide font-semibold">
                      Day Streak
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Last Activity</span>
                    <span className="font-semibold text-[#2F4157]">
                      {new Date(analytics.last_activity_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Projected Completion */}
              <div className={`rounded-2xl p-6 border shadow-sm ${
                analytics.is_ahead_of_schedule
                  ? "bg-green-50 border-green-100"
                  : "bg-orange-50 border-orange-100"
              }`}>
                <h3 className="text-lg font-bold text-[#2F4157] mb-4 flex items-center gap-2">
                  <Clock size={20} className={analytics.is_ahead_of_schedule ? "text-green-600" : "text-orange-600"} />
                  Projected Completion
                </h3>
                
                <p className={`text-2xl font-bold mb-2 ${
                  analytics.is_ahead_of_schedule ? "text-green-600" : "text-orange-600"
                }`}>
                  {new Date(analytics.projected_completion_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                
                <p className="text-sm text-gray-700">
                  {analytics.is_ahead_of_schedule
                    ? "You're on track to complete ahead of schedule! Keep up the great work."
                    : "You may need to increase your pace to meet the deadline. Consider extending your timeline or increasing daily study time."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
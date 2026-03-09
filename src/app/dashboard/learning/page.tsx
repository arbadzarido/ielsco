"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  PlayCircle,
  Activity,
  CalendarDays,
  FileText,
  ArrowRight,
  GraduationCap,
  Download,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Target,
  Clock,
  AlertCircle,
  Plus,
  Trophy,
  Globe,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createBrowserClient } from "@supabase/ssr";

// --- INTERFACES ---

interface Goal {
  id: string;
  title: string;
  targetScore: number;
  currentScore: number | null;
  deadline: string;
  examType: "IELTS" | "TOEFL" | "TOEIC";
  status: "on_track" | "needs_attention" | "achieved";
}

interface ActiveLearningItem {
  id: string;
  title: string;
  type: "course" | "test" | "resource" | "event";
  progress: number; // 0-100
  nextTask: string;
  thumbnailColor: string;
  link: string;
  lastAccessed?: string;
}

// --- HELPERS ---
const typeConfig = {
  course: {
    label: "Course",
    bg: "bg-blue-50",
    text: "text-blue-600",
    bar: "bg-blue-500",
    icon: GraduationCap,
  },
  test: {
    label: "Test",
    bg: "bg-orange-50",
    text: "text-orange-600",
    bar: "bg-orange-500",
    icon: FileText,
  },
  resource: {
    label: "Resource",
    bg: "bg-purple-50",
    text: "text-purple-600",
    bar: "bg-purple-500",
    icon: Download,
  },
  event: {
    label: "Event",
    bg: "bg-green-50",
    text: "text-green-600",
    bar: "bg-green-500",
    icon: CalendarDays,
  },
};

const goalStatusConfig = {
  on_track: {
    label: "On Track",
    color: "text-green-600",
    bg: "bg-green-50",
    dot: "bg-green-500",
  },
  needs_attention: {
    label: "Needs Attention",
    color: "text-amber-600",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  achieved: {
    label: "Achieved",
    color: "text-blue-600",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
  },
};

// --- FETCH HOOKS (real integration pattern) ---

function useActiveLearning(userId: string | null): {
  items: ActiveLearningItem[];
  loading: boolean;
} {
  const [items, setItems] = useState<ActiveLearningItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!userId) return;

    const fetchActiveLearning = async () => {
      setLoading(true);
      const results: ActiveLearningItem[] = [];

      // 1. Enrolled courses with progress
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select(
          `
          id, progress, updated_at,
          courses:course_id(id, title, thumbnail_color)
        `
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(4);

      if (enrollments) {
        enrollments.forEach((e: any) => {
          results.push({
            id: `course-${e.id}`,
            title: e.courses?.title ?? "Course",
            type: "course",
            progress: e.progress ?? 0,
            nextTask: e.progress === 100 ? "Completed!" : "Continue module",
            thumbnailColor: e.courses?.thumbnail_color ?? "from-blue-500 to-blue-700",
            link: `/dashboard/courses/${e.courses?.id}`,
            lastAccessed: e.updated_at,
          });
        });
      }

      // 2. Recent test attempts
      const { data: testAttempts } = await supabase
        .from("test_attempts")
        .select(
          `
          id, score, status, completed_at,
          tests:test_id(id, title, exam_type)
        `
        )
        .eq("user_id", userId)
        .in("status", ["in_progress", "completed"])
        .order("completed_at", { ascending: false })
        .limit(2);

      if (testAttempts) {
        testAttempts.forEach((t: any) => {
          results.push({
            id: `test-${t.id}`,
            title: t.tests?.title ?? "Test",
            type: "test",
            progress: t.status === "completed" ? 100 : 50,
            nextTask:
              t.status === "completed" ? "View Analysis Report" : "Continue Test",
            thumbnailColor: "from-orange-500 to-red-500",
            link:
              t.status === "completed"
                ? `/dashboard/test/result/${t.id}`
                : `/dashboard/test/${t.tests?.id}/attempt/${t.id}`,
            lastAccessed: t.completed_at,
          });
        });
      }

      // 3. Purchased resources
      const { data: resourcePurchases } = await supabase
        .from("resource_purchases")
        .select(
          `
          id, created_at,
          resources:resource_id(id, title)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (resourcePurchases) {
        resourcePurchases.forEach((r: any) => {
          results.push({
            id: `resource-${r.id}`,
            title: r.resources?.title ?? "Resource",
            type: "resource",
            progress: 0,
            nextTask: "Download / Read",
            thumbnailColor: "from-purple-500 to-purple-700",
            link: `/dashboard/resources/${r.resources?.id}`,
            lastAccessed: r.created_at,
          });
        });
      }

      // 4. Registered events
      const { data: eventRegistrations } = await supabase
        .from("event_registrations")
        .select(
          `
          id, created_at,
          events:event_id(id, title, start_date)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (eventRegistrations) {
        eventRegistrations.forEach((ev: any) => {
          results.push({
            id: `event-${ev.id}`,
            title: ev.events?.title ?? "Event",
            type: "event",
            progress: 0,
            nextTask: ev.events?.start_date
              ? `Starts ${new Date(ev.events.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
              : "See Schedule",
            thumbnailColor: "from-green-500 to-teal-500",
            link: `/dashboard/events/${ev.events?.id}`,
            lastAccessed: ev.created_at,
          });
        });
      }

      // Sort by last accessed
      results.sort(
        (a, b) =>
          new Date(b.lastAccessed ?? 0).getTime() -
          new Date(a.lastAccessed ?? 0).getTime()
      );

      setItems(results.slice(0, 6));
      setLoading(false);
    };

    fetchActiveLearning();
  }, [userId, supabase]);

  return { items, loading };
}

function useGoals(userId: string | null): { goals: Goal[]; loading: boolean } {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!userId) return;

    const fetchGoals = async () => {
      const { data } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (data) setGoals(data as Goal[]);
      setLoading(false);
    };

    fetchGoals();
  }, [userId, supabase]);

  return { goals, loading };
}

// --- MAIN PAGE ---

export default function LearningSpacePage() {
  const [userId, setUserId] = useState<string | null>(null);
  // --- UPDATE STATE ---
const [userData, setUserData] = useState({
  name: "Member",
  avatar: "",
  tier: "explorer" as "explorer" | "insider" | "visionary",
});
  const [userLoading, setUserLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- GANTI ISI useEffect fetchUser ---
useEffect(() => {
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    // 1. Ambil data Membership (Source of Truth)
    const { data: dbMembership } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Ambil data Profile (Nama & Avatar terbaru)
    const { data: dbUser } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Mapping Tier (Standard IELS)
    const dbTier = dbMembership?.tier;
    let uiTier: "explorer" | "insider" | "visionary" = "explorer";

    if (dbTier === "pro") {
      uiTier = "insider";
    } else if (dbTier === "premium" || dbTier === "visionary") {
      uiTier = "visionary";
    }

    setUserData({
      name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
      avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || "",
      tier: uiTier,
    });
    
    setUserLoading(false);
  };

  fetchUser();
}, [supabase]);

  const { items: activeLearning, loading: learningLoading } =
    useActiveLearning(userId);
  const { goals, loading: goalsLoading } = useGoals(userId);

  const firstName = userData.name.split(" ")[0];
  const activeCount = activeLearning.length;

  return (
    <DashboardLayout
      userName={userData.name}
      userAvatar={userData.avatar}
      userTier={userData.tier}
    >
      <div className="min-h-screen bg-[#F7F8FA] pb-20">
{/* ── HERO: MY LEARNING SPACE ─────────────────────────────────────── */}
<div className="relative bg-[#304156] text-white overflow-hidden py-12 lg:py-16 px-4 sm:px-8 lg:px-12">
  {/* Decorative blurs */}
  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#577E90]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

  <div className="max-w-7xl mx-auto relative z-10">
    <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left justify-between gap-6">
      
      <div className="w-full">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-4 md:mb-6">
          <Activity size={16} />
          <span>LEARNING CENTER</span>
        </div>
        
        <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-3">
          Sharpen Your Skills
        </h1>
        
        <p className="text-white/80 text-base lg:text-lg leading-relaxed max-w-xl mx-auto md:mx-0">
          {activeCount > 0 ? (
            <>
              You have{" "}
              <strong className="text-white font-semibold">
                {activeCount} active {activeCount === 1 ? "activity" : "activities"}
              </strong>{" "}
              waiting for you today. Let's keep the momentum going!
            </>
          ) : (
            <>Access exclusive mentorship sessions and materials to boost your fluency.</>
          )}
        </p>
      </div>

      <div className="w-full md:w-auto flex justify-center md:justify-end">
        <Link
          href="/dashboard/goals"
          className="flex items-center gap-2 px-6 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-[#577E90] rounded-2xl transition-all font-semibold text-sm shadow-lg"
        >
          <Target size={18} />
          Manage My Goals
        </Link>
      </div>
    </div>
  </div>
</div>

        <div className="max-w-7xl mx-auto px-4 lg:px-12 -mt-16 relative z-20 space-y-12">

          {/* === SECTION 1: CONTINUE LEARNING === */}
          <section>
            <div className="flex items-center justify-between mb-12">
            
      
            </div>

            {learningLoading ? (
              /* Skeleton */
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 h-40 animate-pulse" />
                ))}
              </div>
            ) : activeLearning.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <BookOpen size={28} className="text-gray-300" />
                </div>
                <h3 className="text-base font-bold text-gray-500 mb-2">
                  No active learning yet
                </h3>
                <p className="text-sm text-gray-400 max-w-xs mb-6">
                  Enroll in a course, take a practice test, or grab a resource to get started.
                </p>
                <Link
                  href="/dashboard/shop"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#E56668] text-white rounded-xl font-bold text-sm hover:bg-[#c94d4f] transition-all"
                >
                  <Plus size={16} /> Explore Products
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeLearning.map((item, idx) => {
                  const cfg = typeConfig[item.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.thumbnailColor} flex items-center justify-center text-white shadow-md flex-shrink-0`}
                        >
                          <Icon size={28} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                            {item.progress === 100 && (
                              <CheckCircle2 size={16} className="text-green-500" />
                            )}
                          </div>

                          <h3 className="font-bold text-[#2F4157] line-clamp-1 group-hover:text-[#E56668] transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {item.nextTask}
                          </p>

                          {item.type !== "event" && (
                            <div className="mt-4">
                              <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>{item.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${cfg.bar} transition-all`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Link href={item.link} className="absolute inset-0" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* === SECTION 2: MY GOALS & RECOMMENDATIONS === */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2F4157]">My Goals</h2>
              <Link
                href="/dashboard/goals"
                className="text-sm font-medium text-gray-500 hover:text-[#E56668] flex items-center gap-1 transition-colors"
              >
                Manage Goals <ChevronRight size={16} />
              </Link>
            </div>

            {goalsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 h-36 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : goals.length === 0 ? (
              /* Empty Goals */
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="w-14 h-14 bg-[#E56668]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Target size={28} className="text-[#E56668]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#2F4157] mb-1">
                    You haven't set any goals yet
                  </h3>
                  <p className="text-sm text-gray-400 max-w-md">
                    Define your target score and exam date. We'll help you stay on track with the right resources.
                  </p>
                </div>
                <Link
                  href="/dashboard/goals/new"
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#E56668] text-white rounded-xl font-bold text-sm hover:bg-[#c94d4f] transition-all shrink-0"
                >
                  <Plus size={16} /> Set a Goal
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map((goal, idx) => {
                  const statusCfg = goalStatusConfig[goal.status];
                  const daysLeft = Math.max(
                    0,
                    Math.ceil(
                      (new Date(goal.deadline).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  );
                  const progress = goal.currentScore
                    ? Math.min(100, Math.round((goal.currentScore / goal.targetScore) * 100))
                    : 0;

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {goal.examType}
                          </span>
                          <h3 className="font-bold text-[#2F4157] mt-0.5">{goal.title}</h3>
                        </div>
                        <span
                          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Score + Deadline */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Trophy size={13} className="text-amber-500" />
                          <span>
                            Target:{" "}
                            <strong className="text-[#2F4157]">{goal.targetScore}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-gray-400" />
                          <span>
                            {daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}
                          </span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                          <span>Score Progress</span>
                          <span>
                            {goal.currentScore ?? "–"} / {goal.targetScore}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#E56668] transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Recommendation hint */}
                      {goal.status === "needs_attention" && (
                        <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-lg p-2.5">
                          <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-amber-700">
                            Try a practice test to measure your current level.
                            <Link href="/dashboard/test" className="font-bold ml-1 underline">
                              Take Test →
                            </Link>
                          </p>
                        </div>
                      )}

                      <Link href={`/dashboard/goals/${goal.id}`} className="absolute inset-0" />
                    </motion.div>
                  );
                })}

                {/* Add Goal slot */}
                <Link
                  href="/dashboard/goals/new"
                  className="bg-gray-50 rounded-2xl p-5 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center hover:border-[#E56668]/40 hover:bg-[#E56668]/5 transition-all group cursor-pointer min-h-[140px]"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 mb-3 group-hover:text-[#E56668] group-hover:scale-110 transition-all shadow-sm">
                    <Plus size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-500 group-hover:text-[#E56668]">
                    Add New Goal
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Set your next target score</p>
                </Link>
              </div>
            )}
          </section>

          {/* === SECTION 3: EXPLORE THE ECOSYSTEM === */}
          <section>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-[#2F4157] font-geologica">
                The IELS Ecosystem
              </h2>
              <p className="text-gray-500 mt-2">
                Everything you need to grow, perform, and access global opportunities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <EcosystemCard
                title="IELS Test"
                description="Take official simulation tests for IELTS, TOEFL, & TOEIC with AI Scoring."
                icon={FileText}
                color="bg-[#E56668]"
                href="/dashboard/test"
                stats="AI Scoring Available"
              />
              <EcosystemCard
                title="IELS Courses"
                description="Structured learning paths guided by expert mentors to boost your skills."
                icon={GraduationCap}
                color="bg-[#E56668]"
                href="/dashboard/learning/courses"
                stats="12+ Active Courses"
              />
              <EcosystemCard
                title="IELS Resources"
                description="Access premium e-books, templates, and recorded masterclass sessions."
                icon={Download}
                color="bg-[#E56668]"
                href="/dashboard/learning/library"
                stats="Digital Library"
              />
              <EcosystemCard
                title="IELS Events"
                description="Join webinars, workshops, and speaking clubs to network globally."
                icon={CalendarDays}
                color="bg-[#E56668]"
                href="/dashboard/events"
                stats="Live Every Week"
              />
            </div>
          </section>

          {/* === SECTION 4: GIF SINGAPORE PROMO === */}
          <section>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2F4055] via-[#914D4D] to-[#304156] text-white shadow-2xl group ring-1 ring-white/10 font-geologica">
              {/* Background Decor */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] opacity-20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:opacity-30 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#304156] opacity-30 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3" />
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />

              <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Left Content */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left flex-1">
                  {/* Logo */}
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0 p-4 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                    <img
                      src="/images/logos/events/gifsgp.png"
                      alt="GIF Singapore"
                      className="max-w-full max-h-full object-contain drop-shadow-md"
                    />
                  </div>

                  <div className="space-y-3 max-w-2xl">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-[#914D4D] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mx-auto md:mx-0 shadow-lg shadow-[#914D4D]/20 border border-white/20">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                      Registration Open
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black leading-tight">
                      Ready for Singapore?{" "}
                      <span className="text-[#FFD1D1]">🇸🇬</span>
                    </h3>

                    <p className="text-white/90 text-sm md:text-base leading-relaxed font-light">
                      Join{" "}
                      <strong>Global Impact Fellowship 2026</strong>. Benchmark directly at{" "}
                      <strong>NUS & Glints HQ</strong>. Get a chance for a{" "}
                      <span className="text-[#FFD1D1] font-bold underline decoration-[#FFD1D1]/50 underline-offset-4">
                        Fully Funded
                      </span>{" "}
                      spot & exclusive mentoring from IELS Founders.
                    </p>

                    {/* Key Highlights */}
                    <div className="flex flex-wrap gap-3 pt-1 justify-center md:justify-start">
                      {[
                        { icon: Globe, label: "Singapore, 2026" },
                        { icon: GraduationCap, label: "NUS Benchmarking" },
                        { icon: Trophy, label: "Fully Funded Available" },
                        { icon: Sparkles, label: "Exclusive Mentoring" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/90 text-[11px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm"
                        >
                          <item.icon size={12} />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-3 items-center shrink-0">
                  <Link
                    href="/dashboard/gif"
                    className="px-8 py-4 bg-white text-[#2F4055] rounded-2xl font-black text-sm hover:bg-[#FFD1D1] transition-all shadow-2xl hover:shadow-white/20 transform hover:-translate-y-0.5"
                  >
                    Explore Fellowship →
                  </Link>
                  <Link
                    href="/dashboard/events"
                    className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all"
                  >
                    More Events
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}

// --- SUB-COMPONENT: ECOSYSTEM CARD ---

function EcosystemCard({
  title,
  description,
  icon: Icon,
  color,
  href,
  stats,
}: {
  title: string;
  description: string;
  icon: any;
  color: string;
  href: string;
  stats: string;
}) {
  return (
    <Link href={href} className="group h-full">
      <div className="bg-white h-full rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col">
        <div className={`absolute top-0 left-0 w-full h-1 ${color}`} />

        <div
          className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center text-white shadow-md mb-6 group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={28} />
        </div>

        <h3 className="text-xl font-bold text-[#2F4157] mb-3 group-hover:text-[#E56668] transition-colors">
          {title}
        </h3>

        <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">{description}</p>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md">
            {stats}
          </span>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#E56668] group-hover:text-white transition-all">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
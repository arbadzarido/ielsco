"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingModal from "@/components/subscription/PricingModal";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  CheckCircle2,
  Crown,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  Target,
  Award,
  TrendingUp,
  Users,
  Mail,
  FileText,
  Star
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getGoalById, bookConsultation, getUpcomingConsultations } from "@/data/goals";
import type { GoalWithTasks, MentorConsultation } from "@/types/goals";

// --- TYPES ---
type UserTier = "explorer" | "insider" | "visionary";

interface QuotaInfo {
  total: number;
  used: number;
  remaining: number;
  resetDate: string;
}

export default function ConsultationPage() {
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
  email: string;
  avatar: string; // <-- Tambahin field ini
}>({ 
  id: "", 
  name: "", 
  tier: "explorer",
  email: "",
  avatar: "" // <-- Kasih default kosong
});
  const [goal, setGoal] = useState<GoalWithTasks | null>(null);
  const [consultations, setConsultations] = useState<MentorConsultation[]>([]);
  const [quota, setQuota] = useState<QuotaInfo>({ total: 0, used: 0, remaining: 0, resetDate: "" });
  const [loading, setLoading] = useState(true);
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QUOTA CALCULATION
  const calculateQuota = (tier: UserTier, consultationsThisMonth: number): QuotaInfo => {
    const quotaLimits = {
      explorer: 0,
      insider: 1,
      visionary: 3
    };

    const total = quotaLimits[tier];
    const used = consultationsThisMonth;
    const remaining = Math.max(0, total - used);
    
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const resetDate = nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return { total, used, remaining, resetDate };
  };

  // EMAIL NOTIFICATION FUNCTION
  const sendEmailNotification = async (bookingData: any) => {
    try {
      const response = await fetch('/api/send-consultation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'hello@ielsco.com',
          userName: userData.name,
          userEmail: userData.email,
          goalTitle: goal?.objective || 'Learning Goal',
          scheduledAt: bookingData.scheduled_at,
          topics: bookingData.discussion_topics,
          notes: bookingData.notes || 'No additional notes'
        })
      });

      if (!response.ok) {
        console.error('Email notification failed');
      }
    } catch (error) {
      console.error('Email error:', error);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }

      // Fetch Membership
      const { data: dbMembership } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: dbUser } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const dbTier = dbMembership?.tier;
      let uiTier: UserTier = "explorer";

      if (dbTier === "pro") {
        uiTier = "insider";
      } else if (dbTier === "premium" || dbTier === "visionary") {
        uiTier = "visionary";
      }
      const avatarUrl = dbUser?.avatar_url || user.user_metadata?.avatar_url || "";
      setUserData({
        id: user.id,
        name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
        tier: uiTier,
        email: user.email || "",
        avatar: avatarUrl
      });

      if (goalId) {
        const goalData = await getGoalById(goalId);
        if (goalData) setGoal(goalData);
        
        const upcomingConsults = await getUpcomingConsultations(user.id);
        setConsultations(upcomingConsults);

        // Calculate quota for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const consultationsThisMonth = upcomingConsults.filter(c => 
          new Date(c.created_at || c.scheduled_at) >= startOfMonth
        ).length;

        const quotaInfo = calculateQuota(uiTier, consultationsThisMonth);
        setQuota(quotaInfo);
      }
      
      setLoading(false);
    };

    initData();
  }, [goalId, router, supabase]);

  const handleTopicToggle = (topic: string) => {
    setTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || topics.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    if (quota.remaining <= 0) {
      alert(`You've reached your monthly limit (${quota.total} consultation${quota.total > 1 ? 's' : ''}). Quota resets on ${quota.resetDate}.`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      const bookingData = {
        goal_id: goalId,
        scheduled_at: scheduledDateTime.toISOString(),
        discussion_topics: topics,
        notes: notes || undefined
      };

      const result = await bookConsultation(userData.id, bookingData);
      
      if (result) {
        // Send email notification
        await sendEmailNotification(bookingData);

        alert("Consultation booked successfully! A confirmation email has been sent to our team.");
        setShowBookingModal(false);
        
        // Reload data
        const upcomingConsults = await getUpcomingConsultations(userData.id);
        setConsultations(upcomingConsults);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const consultationsThisMonth = upcomingConsults.filter(c => 
          new Date(c.created_at || c.scheduled_at) >= startOfMonth
        ).length;
        const quotaInfo = calculateQuota(userData.tier, consultationsThisMonth);
        setQuota(quotaInfo);
        
        // Reset form
        setSelectedDate("");
        setSelectedTime("");
        setTopics([]);
        setNotes("");
      }
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Failed to book consultation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-8 max-w-7xl mx-auto animate-pulse">
          <div className="h-12 bg-gray-200 rounded-xl w-64 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  // LOCKED STATE (EXPLORER)
  if (userData.tier === "explorer") {
    return (
      <DashboardLayout userTier={userData.tier} 
  userName={userData.name} 
  userAvatar={userData.avatar}>
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-[32px] p-10 shadow-2xl text-center border border-gray-100">
            
            {/* Icon Badge */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-200">
                <Crown className="text-white" size={48} strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <Sparkles size={18} className="text-yellow-900" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-[#2F4157] mb-3">
              Premium Mentor Consultations
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto">
              Get exclusive 1-on-1 video sessions with expert mentors. 
              <span className="font-bold text-[#2F4157]"> Insider & Visionary members</span> receive personalized guidance to accelerate their learning journey.
            </p>
            
            {/* Benefits Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Video, title: "30-Min Video Call", desc: "Face-to-face with mentors" },
                { icon: Target, title: "Goal-Focused", desc: "Aligned with your objectives" },
                { icon: FileText, title: "Session Notes", desc: "Written feedback & recap" },
                { icon: TrendingUp, title: "Progress Tracking", desc: "Monitor improvements" }
              ].map((item, i) => (
                <div key={i} className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100 text-left">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                    <item.icon size={20} className="text-purple-600" />
                  </div>
                  <h4 className="font-bold text-[#2F4157] text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Tier Comparison */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-purple-100">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Zap size={24} className="text-white" />
                  </div>
                  <p className="text-xs font-black text-purple-900 uppercase tracking-wider mb-1">Insider</p>
                  <p className="text-2xl font-black text-purple-600">1x</p>
                  <p className="text-[10px] text-purple-600 font-medium">per month</p>
                </div>
                
                <div className="h-16 w-px bg-purple-200"></div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Crown size={24} className="text-yellow-900" fill="currentColor" />
                  </div>
                  <p className="text-xs font-black text-yellow-900 uppercase tracking-wider mb-1">Visionary</p>
                  <p className="text-2xl font-black text-yellow-600">3x</p>
                  <p className="text-[10px] text-yellow-600 font-medium">per month</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowPricingModal(true)}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
              style={{ backgroundSize: '200% auto' }}
            >
              Unlock Mentor Access
            </button>
            
            <Link
              href={`/dashboard/goals/${goalId}`}
              className="inline-block mt-6 text-sm text-gray-500 hover:text-purple-600 transition-colors font-medium flex items-center gap-1 mx-auto"
            >
              <ArrowLeft size={14} /> Back to Goal Details
            </Link>
          </div>
        </div>
        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
      </DashboardLayout>
    );
  }

  const topicOptions = [
    { value: "progress_review", label: "Progress Review", icon: TrendingUp },
    { value: "study_strategy", label: "Study Strategy", icon: Target },
    { value: "test_preparation", label: "Test Preparation", icon: FileText },
    { value: "essay_feedback", label: "Essay Feedback", icon: MessageSquare },
    { value: "speaking_practice", label: "Speaking Practice", icon: Users },
    { value: "time_management", label: "Time Management", icon: Clock },
    { value: "motivation", label: "Motivation & Mindset", icon: Sparkles },
    { value: "application_help", label: "Application Help", icon: Award }
  ];

  const tierConfig = {
    insider: {
      badge: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
      icon: Zap,
      label: "Insider"
    },
    visionary: {
      badge: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
      icon: Crown,
      label: "Visionary"
    }
  };

  const config = tierConfig[userData.tier as "insider" | "visionary"];

  // UNLOCKED STATE (INSIDER / VISIONARY)
  return (
    <DashboardLayout userTier={userData.tier} 
  userName={userData.name} 
  userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F7F8FA] pb-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/dashboard/goals/${goalId}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-[#2F4157] text-sm mb-4 transition-colors font-medium"
            >
              <ArrowLeft size={16} />
              Back to Goal
            </Link>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-[#2F4157] mb-2">
                  Mentor Consultations
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <Target size={16} className="text-gray-400" />
                  {goal?.objective || "Your Learning Goal"}
                </p>
              </div>
              
              <button 
                onClick={() => setShowBookingModal(true)}
                disabled={quota.remaining <= 0}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow-lg transition-all",
                  quota.remaining > 0
                    ? "bg-[#E56668] text-white hover:scale-105 hover:shadow-xl"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Calendar size={18} />
                {quota.remaining > 0 ? "Book New Session" : "Quota Reached"}
              </button>
            </div>
          </div>

          {/* Quota & Info Cards */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            
            {/* Quota Card */}
            <div className={cn(
              "rounded-[24px] p-6 border-2 shadow-sm relative overflow-hidden",
              config.badge.bg, config.badge.border
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className={cn("text-xs font-black uppercase tracking-widest", config.badge.text)}>
                    {config.label} Quota
                  </span>
                  <config.icon size={20} className={config.badge.text} strokeWidth={2.5} />
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#2F4157]">{quota.remaining}</span>
                    <span className="text-gray-500 font-medium">/ {quota.total}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mt-1">sessions remaining</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className={cn("font-bold", config.badge.text)}>
                      {quota.total > 0 ? Math.round((quota.used / quota.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all rounded-full", 
                        userData.tier === "visionary" ? "bg-yellow-500" : "bg-purple-500"
                      )}
                      style={{ width: `${quota.total > 0 ? (quota.used / quota.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Resets on {quota.resetDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Tier Benefits Card */}
            <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-2xl shrink-0",
                  config.badge.bg
                )}>
                  <config.icon size={24} className={config.badge.text} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-[#2F4157] mb-1 capitalize">
                    {config.label} Member Benefits
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {userData.tier === "visionary" 
                      ? "You have access to 3 priority consultations per month with expert mentors and principals. Book at least 2 weeks in advance." 
                      : "You have access to 1 priority consultation per month with expert mentors. Book at least 2 weeks in advance."}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Priority Scheduling",
                      "30-Min Video Call",
                      "Session Recording",
                      "Written Feedback",
                      userData.tier === "visionary" && "Principal Access"
                    ].filter(Boolean).map((benefit, i) => (
                      <span key={i} className="text-xs font-bold bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>

                {userData.tier === "insider" && (
                  <button 
                    onClick={() => setShowPricingModal(true)}
                    className="shrink-0 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl font-bold text-sm hover:bg-yellow-300 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Crown size={14} fill="currentColor" />
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Consultations */}
          <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm min-h-[400px]">
            <h2 className="text-2xl font-black text-[#2F4157] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Video size={20} className="text-purple-600" />
              </div>
              Upcoming Sessions
            </h2>
            
            {consultations.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-[24px] border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-100">
                  <MessageSquare className="text-gray-300" size={36} />
                </div>
                <h3 className="font-bold text-[#2F4157] text-xl mb-2">
                  No upcoming consultations
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Ready to accelerate your progress? Book your {quota.used > 0 ? 'next' : 'first'} session with an expert mentor.
                </p>
                {quota.remaining > 0 && (
                  <button 
                    onClick={() => setShowBookingModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#E56668] text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    <Calendar size={18} />
                    Book Your Session
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation, idx) => (
                  <div
                    key={consultation.id}
                    className="group p-6 bg-gradient-to-br from-white to-gray-50 rounded-[24px] border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-black rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                            <CheckCircle2 size={14} strokeWidth={3} /> Confirmed
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {consultation.duration_minutes} minutes
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 font-medium">
                            Session #{idx + 1}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2 text-[#2F4157]">
                            <Calendar size={18} className="text-purple-600" />
                            <span className="font-bold">
                              {new Date(consultation.scheduled_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-2">
                            <Clock size={18} className="text-purple-600" />
                            <span className="font-bold text-[#2F4157]">
                              {new Date(consultation.scheduled_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        {consultation.discussion_topics && consultation.discussion_topics.length > 0 && (
                          <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Discussion Topics</p>
                            <div className="flex flex-wrap gap-2">
                              {consultation.discussion_topics.map((topic, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-700 font-bold"
                                >
                                  {topic.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {consultation.meeting_link && (
                        <a
                          href={consultation.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                        >
                          <Video size={18} />
                          Join Now
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOOKING MODAL - FIXED Z-INDEX */}
      {showBookingModal && (
        <div 
          className="fixed inset-0 bg-[#2F4157]/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
          onClick={() => setShowBookingModal(false)}
        >
          <div 
            className="bg-white rounded-[32px] max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 rounded-t-[32px] z-10 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-[#2F4157] mb-1">
                  Book Mentor Consultation
                </h3>
                <p className="text-sm text-gray-600">
                  Schedule a 30-minute personalized session
                </p>
              </div>
              <button 
                onClick={() => setShowBookingModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleBookConsultation} className="p-8 space-y-6">
              
              {/* Date & Time */}
              <div>
                <label className="block text-sm font-black text-gray-700 uppercase tracking-wider mb-4">
                  Schedule Details
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">
                      Preferred Date <span className="text-purple-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium transition-all"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Minimum 2 weeks advance booking
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">
                      Preferred Time <span className="text-purple-600">*</span>
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium appearance-none cursor-pointer transition-all"
                      required
                    >
                      <option value="">Select time slot</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="19:00">07:00 PM</option>
                      <option value="20:00">08:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Discussion Topics */}
              <div>
                <label className="block text-sm font-black text-gray-700 uppercase tracking-wider mb-4">
                  Discussion Topics <span className="text-purple-600">*</span>
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {topicOptions.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <button
                        key={topic.value}
                        type="button"
                        onClick={() => handleTopicToggle(topic.value)}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all group",
                          topics.includes(topic.value)
                            ? "border-purple-500 bg-purple-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            topics.includes(topic.value)
                              ? "bg-purple-500 text-white"
                              : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                          )}>
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                          <span className={cn(
                            "text-sm font-bold transition-colors",
                            topics.includes(topic.value)
                              ? "text-purple-700"
                              : "text-gray-700"
                          )}>
                            {topic.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                  <Star size={12} className="text-yellow-500" />
                  Select at least one topic for focused discussion
                </p>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-black text-gray-700 uppercase tracking-wider mb-3">
                  Additional Notes
                  <span className="text-xs text-gray-500 font-normal normal-case ml-2">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share any specific questions, challenges, or areas you'd like to focus on during the session..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-medium transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cn(
                    "flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    isSubmitting
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 shadow-lg"
                  )}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Confirm & Notify Mentor
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
    </DashboardLayout>
  );
}
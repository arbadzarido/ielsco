// src/app/dashboard/gif/video-submission/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Lock,
  ArrowLeft,
  Upload,
  Info,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  Video,
  Clock,
  MonitorPlay,
  Mic,
  Target,
  Loader2,
  Calendar,
  ArrowRight
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- TYPES ---
type UserProfile = {
  full_name: string;
  email: string;
  avatar_url?: string;
  tier?: "explorer" | "insider" | "visionary";
};

type ModalConfig = {
  isOpen: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

export default function VideoSubmissionPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [regData, setRegData] = useState<any>(null);
  
  // Form States
  const [videoLink, setVideoLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Accordion states
  const [guidelinesOpen, setGuidelinesOpen] = useState(true);

  // Modal State
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showModal = (title: string, message: string, type: "success" | "error" | "warning" | "info") => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  };

  // DEADLINE LOGIC: May 3, 2026
  const DEADLINE = new Date("2026-05-29T23:59:59");
  const now = new Date();
  const isPastDeadline = now > DEADLINE;

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }
        setUserId(user.id);

        // 1. Fetch Membership & Profile
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
        let uiTier: "explorer" | "insider" | "visionary" = "explorer";
        if (dbTier === "pro") uiTier = "insider";
        else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";

        const avatarUrl = dbUser?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;

        setUserProfile({
          full_name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
          email: user.email || "",
          avatar_url: avatarUrl,
          tier: uiTier
        });

        // 2. Fetch Registration Data
        const { data } = await supabase
          .from('gif_registrations')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setRegData(data);
          setVideoLink(data.phase3_video_link || "");
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, supabase]);

  const handleSubmit = async () => {
    if (isPastDeadline) {
      showModal("Deadline Passed", "The submission deadline (May 3rd) has passed. Updates are no longer accepted.", "warning");
      return;
    }

    // Validation
    if (!videoLink.trim()) {
      showModal("Link Required", "Please enter your Google Drive video link.", "warning");
      return;
    }
    
    if (!videoLink.includes("drive.google.com")) {
      showModal("Invalid Link", "Please provide a valid Google Drive link.", "error");
      return;
    }

    if (!userId) {
      showModal("Session Error", "Your session seems to have expired. Please refresh the page or log in again.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gif_registrations')
        .update({
          phase3_video_link: videoLink,
          phase3_status: 'submitted',
          phase3_submitted_at: new Date().toISOString()
        })
        .eq('id', regData.id);

      if (!error) {
        setRegData((prev: any) => ({ ...prev, phase3_status: 'submitted', phase3_video_link: videoLink }));
        showModal("Submission Successful!", "Video pitch submitted successfully! You can update this link anytime before the final deadline.", "success");
      } else {
        console.error(error);
        showModal("Submission Failed", "Error submitting. Please try again.", "error");
      }
    } catch (err) {
      console.error(err);
      showModal("Submission Failed", "An unexpected error occurred. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#914D4D] mx-auto mb-4" />
          <p className="text-sm text-[#304156]/60 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // HARD LOCK: If phase3_verified is false, they shouldn't be here.
  if (!regData?.phase3_verified) {
    return (
      <DashboardLayout userTier={userProfile?.tier} userName={userProfile?.full_name} userAvatar={userProfile?.avatar_url}>
        <div className="max-w-3xl mx-auto py-20 px-4 text-center font-geologica">
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-10 shadow-xl">
            <Lock className="w-16 h-16 text-[#914D4D] mx-auto mb-4" />
            <h1 className="text-3xl font-black text-[#304156] mb-4">Access Restricted 🔒</h1>
            <p className="text-gray-600 mb-8 text-lg">
              You are currently not eligible to access the Phase 3 Video Submission page. This phase is exclusively for participants who have passed Phase 2.
            </p>
            <div className="flex justify-center">
              <Link href="/dashboard/gif">
                <Button className="rounded-xl bg-white text-[#304156] border border-[#304156]/20 hover:bg-[#304156]/5 py-6 px-8 shadow-sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isSubmitted = regData?.phase3_status === 'submitted';
  const isAutoComplete = regData?.is_mentoring_participant;

  return (
    <DashboardLayout 
      userTier={userProfile?.tier} 
      userName={userProfile?.full_name} 
      userAvatar={userProfile?.avatar_url}
    >
      <div className="max-w-6xl mx-auto pb-20 space-y-8 px-4 md:px-8 pt-6 font-geologica relative">
        
        {/* IELS CUSTOM MODAL POP-UP */}
        <AnimatePresence>
          {modal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#304156]/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-[#304156]/10"
              >
                <div className="p-6">
                  <div className="flex justify-end">
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="text-center px-4 pb-4">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner",
                      modal.type === 'success' ? "bg-green-100" : 
                      modal.type === 'error' ? "bg-[#914D4D]/10" : "bg-yellow-100"
                    )}>
                      {modal.type === 'success' && <CheckCircle className="w-8 h-8 text-green-600" />}
                      {modal.type === 'error' && <AlertCircle className="w-8 h-8 text-[#914D4D]" />}
                      {modal.type === 'warning' && <Info className="w-8 h-8 text-yellow-600" />}
                    </div>
                    
                    <h3 className="text-xl font-bold text-[#304156] mb-2">{modal.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-8">{modal.message}</p>
                    
                    <Button 
                      onClick={closeModal} 
                      className={cn(
                        "w-full py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all",
                        modal.type === 'success' ? "bg-[#304156] hover:bg-[#2F4055] text-white" : 
                        "bg-[#914D4D] hover:bg-[#7a3e3e] text-white"
                      )}
                    >
                      Understood
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/gif">
            <Button className="rounded-xl bg-white text-[#304156] border border-[#304156]/20 hover:bg-[#304156]/5 shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to GIF Dashboard
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] rounded-3xl shadow-2xl">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#304156] rounded-full blur-[120px]"></div>
          </div>

          <div className="relative z-10 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/10 p-3 rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm">
                <Video className="w-8 h-8 text-white" />
              </div>
              {isAutoComplete ? (
                <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 shadow-sm backdrop-blur-md tracking-wider">
                  AUTO-COMPLETED VIA MENTORING
                </span>
              ) : isSubmitted ? (
                <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 shadow-sm backdrop-blur-md tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> SUBMITTED
                </span>
              ) : (
                <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 shadow-sm backdrop-blur-md tracking-wider">
                  STEP 3 OF 3
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-sm leading-tight">
              Video Presentation Pitch
            </h1>
            <p className="text-white/90 text-lg max-w-2xl font-light leading-relaxed">
              This is your final chance to impress the judges. Record a concise, impactful pitch of your SDG project and submit the link below.
            </p>
          </div>
        </div>

      
        {/* COMPREHENSIVE VIDEO GUIDELINES SECTION */}
        <div className="bg-white rounded-2xl border border-[#914D4D]/20 overflow-hidden shadow-sm">
          <button
            onClick={() => setGuidelinesOpen(!guidelinesOpen)}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#914D4D]/10 p-2 rounded-lg">
                <Target className="w-5 h-5 text-[#914D4D]" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-[#304156]">Comprehensive Video Guidelines</h2>
                <p className="text-sm text-gray-500">Read this carefully before recording your pitch</p>
              </div>
            </div>
            {guidelinesOpen ? <ChevronUp className="w-5 h-5 text-[#914D4D]" /> : <ChevronDown className="w-5 h-5 text-[#914D4D]" />}
          </button>

          {guidelinesOpen && (
            <div className="px-6 pb-6 space-y-6">
              <div className="h-px bg-gray-200"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Time & Duration Limits */}
                <div className="border border-gray-200 rounded-xl p-5 hover:border-[#914D4D] transition">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-6 h-6 text-[#914D4D]" />
                    <h3 className="font-bold text-[#304156] text-lg">1. Time & Duration Limits</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#304156]/80">
                    <li><strong className="text-[#304156]">Maximum Length:</strong> Strictly 5 minutes. Any video exceeding 5 minutes and 0 seconds will be penalized or cut off during grading.</li>
                    <li><strong className="text-[#304156]">Pacing:</strong> Do not rush your words just to fit the time. Be concise, skip the fluff, and focus on your Impact Storytelling and Operational Blueprint.</li>
                  </ul>
                </div>

                {/* 2. Format & Recording Setup */}
                <div className="border border-gray-200 rounded-xl p-5 hover:border-[#914D4D] transition">
                  <div className="flex items-center gap-3 mb-3">
                    <MonitorPlay className="w-6 h-6 text-[#914D4D]" />
                    <h3 className="font-bold text-[#304156] text-lg">2. Format & Setup</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#304156]/80">
                    <li><strong className="text-[#304156]">Recording Tool:</strong> You must use Zoom Meeting (or Google Meet/Teams) to record.</li>
                    <li><strong className="text-[#304156]">Visual Layout:</strong> Your recording must simultaneously display your Presentation Deck (Screen Share) AND your Face (Speaker View). The judges need to see your expressions.</li>
                    <li><strong className="text-[#304156]">File Format:</strong> Export as an .MP4 file and upload it to your own Google Drive.</li>
                  </ul>
                </div>

                {/* 3. Quality & Editing Standards */}
                <div className="border border-gray-200 rounded-xl p-5 hover:border-[#914D4D] transition">
                  <div className="flex items-center gap-3 mb-3">
                    <Mic className="w-6 h-6 text-[#914D4D]" />
                    <h3 className="font-bold text-[#304156] text-lg">3. Quality Standards</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#304156]/80">
                    <li><strong className="text-[#304156]">Zero Complex Editing:</strong> We do not judge your video editing skills. No cinematic transitions or fancy overlays required.</li>
                    <li><strong className="text-[#304156]">Audio is King:</strong> Ensure your voice is 100% clear. Record in a quiet room, avoid wind noise. If judges can't hear you, they can't fund you.</li>
                    <li><strong className="text-[#304156]">Legibility:</strong> Ensure your slides are readable on the screen share. Use large fonts.</li>
                  </ul>
                </div>

                {/* 4. The Pitching Standard */}
                <div className="border border-gray-200 rounded-xl p-5 hover:border-[#914D4D] transition">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-6 h-6 text-[#914D4D]" />
                    <h3 className="font-bold text-[#304156] text-lg">4. Pitching Standard</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-[#304156]/80">
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" /> Hook the judges in the first 30 seconds.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" /> Provide actionable SMART goals and clear KPIs.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" /> Showcase a realistic 3-month Execution Roadmap.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" /> End with a strong Call to Action (Why you, why now?).</li>
                  </ul>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Video Submission Section */}
        {!isAutoComplete && (
          <div className="bg-white border border-[#914D4D]/20 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-xl">
            {/* Subtle Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#914D4D]/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-10">
              
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 bg-[#914D4D]/10 text-[#914D4D] px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-[#914D4D]/20">
                  <Video className="w-3.5 h-3.5" /> Video Pitch Submission
                </div>
                
                <div>
                  <h2 className="text-3xl font-black text-[#304156] mb-2">Submit Your Pitch Link</h2>
                  <p className="text-[#304156]/70 text-base leading-relaxed">
                    Provide the Google Drive link to your recorded presentation pitch here.
                  </p>
                </div>

                <div className="bg-[#304156]/5 rounded-2xl p-5 border border-[#304156]/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#914D4D] mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-[#304156] mb-1 text-sm uppercase tracking-wide">CRITICAL REQUIREMENT:</h3>
                      <p className="text-sm text-[#304156]/80 leading-relaxed">
                        Ensure your Google Drive link access is set to <strong>'Anyone with the link can view'</strong>. If our judges request access, your submission will automatically fail.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 text-sm font-bold text-[#914D4D]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> DEADLINE: 29 May 2026 (23:59 WIB)
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-[400px] flex flex-col justify-center">
                {isSubmitted ? (
                  <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-2xl p-6 shadow-sm">
                    <div className="text-center mb-4">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[#304156]" />
                      <h3 className="font-black text-xl text-[#304156]">Link Saved!</h3>
                      <p className="text-xs text-[#304156]/70 mt-1">You can update your link until the deadline.</p>
                    </div>
                    
                    <label className="block text-sm font-bold text-[#304156] mb-2">Update URL <span className="text-[#914D4D]">*</span></label>
                    <input
                      type="url"
                      disabled={isPastDeadline}
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-[#304156] focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed mb-4 text-sm"
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => window.open(regData.phase3_video_link, "_blank")}
                        className="w-1/3 bg-white text-[#304156] border border-[#304156]/20 hover:bg-[#304156]/5 py-3 rounded-xl font-bold shadow-sm"
                        title="View current link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || isPastDeadline || videoLink === regData.phase3_video_link}
                        className={cn(
                          "w-2/3 py-3 rounded-xl font-bold text-base shadow-md transition-all",
                          isPastDeadline 
                            ? "bg-gray-400 text-white cursor-not-allowed" 
                            : "bg-[#914D4D] text-white hover:bg-[#7a3e3e]"
                        )}
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isPastDeadline ? (
                          "Locked"
                        ) : (
                          "Update Link"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
                    <label className="block text-sm font-bold text-[#304156] mb-2">Video Drive URL <span className="text-[#914D4D]">*</span></label>
                    <input
                      type="url"
                      disabled={isPastDeadline}
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-[#304156] focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed mb-4 text-sm"
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || isPastDeadline || !videoLink.trim()}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold text-base shadow-md transition-all",
                        isPastDeadline 
                          ? "bg-gray-400 text-white cursor-not-allowed" 
                          : "bg-[#914D4D] text-white hover:bg-[#7a3e3e]"
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...
                        </>
                      ) : isPastDeadline ? (
                        <>
                          <Lock className="w-5 h-5 mr-2" /> Deadline Passed
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" /> Submit Link
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-3 font-medium">
                      Ensure link access is set to public.
                    </p>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        )}

        {/* Community & Support */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#914D4D]/5 p-2.5 rounded-xl">
                <Target className="w-5 h-5 text-[#914D4D]" />
              </div>
              <h3 className="font-bold text-[#304156] text-lg">Final Preparation</h3>
            </div>
            <p className="text-sm text-[#304156]/70 mb-6 flex-1">
              Need feedback on your pitch draft before recording? Discuss with fellow participants in our community channel to refine your message.
            </p>
            <Button 
              onClick={() => window.open("https://chat.whatsapp.com/LhBkjbLyTd9Hjsq23hg4gl", "_blank")}
              className="w-full bg-white border border-[#304156]/20 text-[#304156] hover:bg-[#304156]/5 rounded-xl py-3 font-bold"
            >
              Join WhatsApp Group
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#304156]/5 p-2.5 rounded-xl">
                <AlertCircle className="w-5 h-5 text-[#304156]" />
              </div>
              <h3 className="font-bold text-[#304156] text-lg">Need Assistance?</h3>
            </div>
            <p className="text-sm text-[#304156]/70 mb-6 flex-1">
              Having technical trouble recording, exporting, or uploading your video? Reach out to our technical support team immediately.
            </p>
            <Link href="https://wa.me/6288297253491" target="_blank">
              <Button className="w-full bg-[#304156] hover:bg-[#2F4055] text-white rounded-xl py-3 font-bold">
                Contact Support
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
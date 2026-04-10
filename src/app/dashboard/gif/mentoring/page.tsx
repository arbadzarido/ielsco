"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion"; // <-- Tambahin AnimatePresence
import {
  CheckCircle,
  ArrowLeft,
  Crown,
  Users,
  Calendar,
  Download,
  AlertCircle,
  X,          
  ExternalLink,
  Loader2,
  PlayCircle,
  Lock,
  Upload,
  Target,
  Award,
  BookOpen,
  ArrowRight,
  Clock,
  Rocket,
  ChevronDown,
  ChevronUp,
  Info
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

type MentoringSession = {
  week: number;
  title: string;
  desc: string;
  output: string;
  displayDate: string;
  status: 'upcoming' | 'completed' | 'locked';
  recording_url?: string;
  materials_url?: string;
};

export default function MentoringDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [projectLink, setProjectLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [projectGuideOpen, setProjectGuideOpen] = useState(false);
  // --- MODAL STATE ---
  type ModalConfig = {
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  };

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

  // --- REAL CURRICULUM DATA (Base) ---
  const rawSessions = [
    {
      week: 1,
      title: "Session 01: Micro-Problem Identification",
      desc: "Narrowing down broad education issues into a specific, data-backed problem statement focused on SDG 4.",
      output: "Validated SDG 4 problem statement.",
      dateString: "2026-04-05T23:59:59", // Batas akhir hari untuk hitung completed
      displayDate: "05 Apr 2026",
    },
    {
      week: 2,
      title: "Session 02: Building the MVP",
      desc: "Designing a Minimum Viable Project. Learning how to build a creative yet feasible solution framework.",
      output: "Initial project concept note.",
      dateString: "2026-04-12T23:59:59",
      displayDate: "12 Apr 2026",
    },
    {
      week: 3,
      title: "Session 03: Operational Blueprint",
      desc: "Mapping out the technical 'how-to' of your project. Creating a step-by-step workflow, timeline, and resource requirements.",
      output: "Technical operational flowchart.",
      dateString: "2026-04-19T23:59:59",
      displayDate: "19 Apr 2026",
    },
    {
      week: 4,
      title: "Session 04: Impact Logic & Measurement",
      desc: "Learning the Theory of Change. Defining how your project creates real impact and how to measure success.",
      output: "Impact M&E framework.",
      dateString: "2026-04-26T23:59:59",
      displayDate: "26 Apr 2026",
    },
    {
      week: 5,
      title: "Session 05: Stress-Testing & Final Refinement",
      desc: "Final logic check and risk mitigation. Sharpening the technical project specs to ensure it's bulletproof.",
      output: "Final project specification.",
      dateString: "2026-05-03T23:59:59",
      displayDate: "03 May 2026",
    }
  ];

  // Dynamic status logic
  const sessions: MentoringSession[] = useMemo(() => {
    const now = new Date();
    
    return rawSessions.map((session, index, arr) => {
      const sessionDate = new Date(session.dateString);
      const isCompleted = now > sessionDate;
      
      let status: 'completed' | 'upcoming' | 'locked' = 'locked';
      
      if (isCompleted) {
        status = 'completed';
      } else {
        // Jika sesi sebelumnya sudah lewat (completed) atau ini sesi pertama, maka upcoming
        if (index === 0) {
          status = 'upcoming';
        } else {
          const prevSessionDate = new Date(arr[index - 1].dateString);
          if (now > prevSessionDate) {
            status = 'upcoming';
          } else {
            status = 'locked';
          }
        }
      }

      // Beri link default ke GDrive kalau statusnya completed
      const recording_url = status === 'completed' ? "https://drive.google.com/drive/folders/1SIc6tGryDeCBBucCMZpo0b1CftW3osUT?usp=drive_link" : undefined;
      const materials_url = status === 'completed' ? "https://drive.google.com/drive/folders/1H9hrLhZdZKNbkjpMhUU3Ed5Qd_Ww0nnq?usp=sharing" : undefined;

      return {
        week: session.week,
        title: session.title,
        desc: session.desc,
        output: session.output,
        displayDate: session.displayDate,
        status,
        recording_url,
        materials_url
      };
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }

        // 1. Ambil data Membership langsung (Source of Truth Tier)
        const { data: dbMembership } = await supabase
          .from("memberships")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // 2. Ambil data Profile (Nama & Avatar)
        const { data: dbUser } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        // 3. Mapping Tier (Insider/Visionary)
        const dbTier = dbMembership?.tier;
        let uiTier: "explorer" | "insider" | "visionary" = "explorer";

        if (dbTier === "pro") {
          uiTier = "insider";
        } else if (dbTier === "premium" || dbTier === "visionary") {
          uiTier = "visionary";
        }

        const avatarUrl = dbUser?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;

        setUserProfile({
          full_name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
          email: user.email || "",
          avatar_url: avatarUrl,
          tier: uiTier
        });

        // 2. Check Mentoring Registration
        const { data } = await supabase
          .from('gif_registrations')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && data.is_mentoring_participant) {
          setAuthorized(true);
          setUserData(data);
          setProjectLink(data.project_drive_link || ""); // Matches SQL table project_drive_link
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error("Error:", err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, supabase]);

const handleProjectSubmit = async () => {
    if (!projectLink.trim()) {
      showModal("Link Required", "Please enter your project link.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gif_registrations')
        .update({
          project_drive_link: projectLink,
          phase2_submitted_at: new Date().toISOString()
        })
        .eq('id', userData?.id);

      if (!error) {
        showModal("Submission Successful!", "Project submitted successfully! You can update this link anytime before the final deadline.", "success");
        setUserData((prev: any) => ({ ...prev, project_drive_link: projectLink }));
      } else {
        showModal("Submission Failed", "Error submitting. Please try again.", "error");
      }
    } catch (err) {
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

  if (!authorized) {
    return (
      <DashboardLayout
        userTier={userProfile?.tier} 
        userName={userProfile?.full_name} 
        userAvatar={userProfile?.avatar_url}
      >
        <div className="max-w-3xl mx-auto px-4 py-20 font-geologica">
          <div className="bg-white rounded-3xl border border-[#914D4D]/20 p-12 text-center shadow-xl">
            <div className="bg-[#914D4D]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-[#914D4D]" />
            </div>
            <h1 className="text-3xl font-black text-[#304156] mb-4">Access Restricted</h1>
            <p className="text-[#304156]/80 mb-8 max-w-md mx-auto leading-relaxed">
              This dashboard is only accessible to registered mentoring participants. 
              Please apply for the mentoring program first to unlock the Golden Ticket pathway.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard/gif">
                <Button className="w-full rounded-xl bg-white py-3 text-[#304156] border border-[#304156]/20 hover:bg-[#304156]/5">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Button 
                onClick={() => window.open("https://forms.gle/D4DMBFshr1JeydZC9", "_blank")}
                className="w-full bg-[#914D4D] hover:bg-[#7a3e3e] py-3 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Apply for Mentoring
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSessions / sessions.length) * 100;

  return (
    <DashboardLayout
      userTier={userProfile?.tier} 
      userName={userProfile?.full_name} 
      userAvatar={userProfile?.avatar_url}
    >
      <div className="max-w-6xl mx-auto pb-20 space-y-8 px-4 md:px-8 pt-6 font-geologica">
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
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 shadow-sm backdrop-blur-md tracking-wider">
                FAST TRACK PARTICIPANT
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-sm leading-tight">
              Project Mentoring Hub
            </h1>
            <p className="text-white/90 text-lg max-w-2xl mb-10 leading-relaxed font-light">
              Welcome to your exclusive mentoring space! Track your weekly curriculum, access session materials, 
              and submit your final Golden Ticket project deck.
            </p>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#304156]/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-black text-white mb-1">{completedSessions}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">Sessions Done</div>
              </div>
              <div className="bg-[#304156]/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-black text-white mb-1">{Math.round(progressPercent)}%</div>
                <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">Progress</div>
              </div>
              <div className="bg-[#304156]/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-black text-white mb-1">5</div>
                <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">Total Weeks</div>
              </div>
              <div className="bg-[#914D4D]/40 backdrop-blur-md rounded-xl p-4 border border-[#914D4D]/50 shadow-inner">
                <div className="text-3xl font-black text-white mb-1 drop-shadow-sm flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" /> Phase 3
                </div>
                <div className="text-xs text-white/90 uppercase tracking-wider font-semibold">Direct Access</div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Banner */}
        <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="bg-[#304156]/5 p-3 rounded-xl">
              <Award className="w-6 h-6 text-[#914D4D]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#304156] mb-3 flex items-center gap-2">
                Your Mentoring Privileges
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" />
                  <span className="text-[#304156]/80 font-medium">Phase 1 & 2 Skipped (Pre-validated)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" />
                  <span className="text-[#304156]/80 font-medium">Direct to Project Presentation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 flex-shrink-0" />
                  <span className="text-[#304156]/80 font-medium">NUS-Standard Skillset & Frameworks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Timeline */}
        <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#304156] mb-1">Mentoring Curriculum</h2>
              <p className="text-sm text-[#304156]/60">A structured journey to prepare you for international selection.</p>
            </div>
            <span className="text-sm font-bold bg-[#304156]/5 text-[#304156] px-4 py-2 rounded-lg border border-[#304156]/10">
              {completedSessions} of {sessions.length} sessions completed
            </span>
          </div>

          <div className="mb-10">
            <div className="h-3 bg-[#304156]/5 rounded-full overflow-hidden border border-[#304156]/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-[#914D4D]"
              ></motion.div>
            </div>
          </div>

          <div className="space-y-4">
            {sessions.map((session, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "border rounded-2xl p-5 md:p-6 transition-all",
                  session.status === 'completed' 
                    ? "border-[#304156]/20 bg-[#304156]/5" 
                    : session.status === 'upcoming'
                    ? "border-[#914D4D]/30 bg-white shadow-md relative overflow-hidden"
                    : "border-gray-100 bg-gray-50/50 opacity-70"
                )}
              >
                {session.status === 'upcoming' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#914D4D]"></div>
                )}
                
                <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                  {/* Date/Week Box */}
                  <div className={cn(
                    "w-full md:w-24 py-3 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0 border",
                    session.status === 'completed' 
                      ? "bg-[#304156] text-white border-[#304156]" 
                      : session.status === 'upcoming'
                      ? "bg-white text-[#914D4D] border-[#914D4D]/30 shadow-sm"
                      : "bg-gray-100 text-gray-400 border-gray-200"
                  )}>
                    <div className="text-xs uppercase tracking-wider opacity-80">Session</div>
                    <div className="text-xl">0{session.week}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-[#304156]">{session.title}</h3>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="w-4 h-4 text-[#304156]/60" />
                        <span className="text-[#304156]/80">{session.displayDate}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-[#304156]/70 mb-4 leading-relaxed">
                      {session.desc}
                    </p>

                    <div className="bg-white/50 rounded-lg p-3 border border-[#304156]/5 mb-4 text-sm">
                      <span className="font-bold text-[#304156] mr-2">Target Output:</span>
                      <span className="text-[#304156]/80">{session.output}</span>
                    </div>

                    {session.status === 'completed' && (
                      <div className="flex flex-wrap gap-3">
                        {session.recording_url && (
                          <Button onClick={() => window.open(session.recording_url, "_blank")} className="bg-[#304156] hover:bg-[#2F4055] text-white rounded-lg shadow-sm h-9 px-4 text-xs">
                            <PlayCircle className="w-4 h-4 mr-2" /> Watch Recording
                          </Button>
                        )}
                        {session.materials_url && (
                          <Button onClick={() => window.open(session.materials_url, "_blank")} className="bg-white border border-[#304156]/20 text-[#304156] hover:bg-[#304156]/5 rounded-lg h-9 px-4 text-xs">
                            <Download className="w-4 h-4 mr-2" /> Material Deck
                          </Button>
                        )}
                      </div>
                    )}

                    {session.status === 'upcoming' && (
                      <div className="inline-flex items-center text-xs font-bold text-[#914D4D] bg-[#914D4D]/10 px-3 py-1.5 rounded-md">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Next Schedule
                      </div>
                    )}

                    {session.status === 'locked' && (
                      <div className="inline-flex items-center text-xs font-bold text-gray-500">
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Unlocks after previous session
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

     {/* === PROJECT PROPOSAL GUIDE SECTION === */}
        <div className="bg-white rounded-2xl border border-[#914D4D]/20 overflow-hidden shadow-sm">
          <button
            onClick={() => setProjectGuideOpen(!projectGuideOpen)}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#914D4D]/10 p-2 rounded-lg">
                <Target className="w-5 h-5 text-[#914D4D]" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-[#304156]">Project Proposal Framework</h2>
                <p className="text-sm text-gray-500">Step-by-step Design Thinking guide for your individual SDG project</p>
              </div>
            </div>
            {projectGuideOpen ? <ChevronUp className="w-5 h-5 text-[#914D4D]" /> : <ChevronDown className="w-5 h-5 text-[#914D4D]" />}
          </button>

          {projectGuideOpen && (
            <div className="px-6 pb-6 space-y-6">
              <div className="h-px bg-gray-200"></div>

              {/* Format Requirements */}
              <div className="bg-[#914D4D]/5 rounded-xl p-6 border border-[#914D4D]/20">
                <h3 className="font-bold text-[#914D4D] mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Presentation Format Requirements
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#304156] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-[#914D4D]">Format:</span>
                        <span className="text-[#304156]"> PowerPoint, Google Slides, or Canva</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#304156] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-[#914D4D]">Length:</span>
                        <span className="text-[#304156]"> Maximum 10 slides</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#304156] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-[#914D4D]">Submission:</span>
                        <span className="text-[#304156]"> Canva Link (Review) or Google Drive (Final PDF)</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#304156] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-[#914D4D]">Focus:</span>
                        <span className="text-[#304156]"> Must align with SDG 4 (Quality Education)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide-by-Slide Framework */}
              <div>
                <h3 className="font-bold text-[#304156] mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#914D4D]" />
                  Recommended Slide Structure (Design Thinking)
                </h3>
                
                <div className="space-y-3">
                  {[
                    { num: "1", title: "Cover Slide", content: "Project title, your full name, origin/university. Make it visually compelling!" },
                    { num: "2", title: "Empathize: The Core Issue", content: "What specific SDG 4 problem in Indonesia are you addressing? Use a brief story, observation, or persona to show empathy." },
                    { num: "3", title: "Define: Data & Scope", content: "Back up your observation with hard data. Narrow down the problem to a specific target audience or region." },
                    { num: "4", title: "Ideate: The Big Concept", content: "Introduce your proposed solution. What is the core idea? Be clear and concise." },
                    { num: "5", title: "Ideate: Innovation Factor", content: "Why is your solution different or better than existing ones? Highlight the unique value proposition." },
                    { num: "6", title: "Prototype: Visualizing the Solution", content: "Show, don't just tell. Include a flowchart, wireframe, or diagram of how your project will work in reality." },
                    { num: "7", title: "Prototype: Key Activities", content: "What are the 3-4 main steps required to launch this project offline/online?" },
                    { num: "8", title: "Test/Impact: Measuring Success", content: "If executed, what are your KPIs? How will you know if the project actually improved the beneficiaries' lives?" },
                    { num: "9", title: "Sustainability Vision", content: "How will this project survive long-term without relying heavily on continuous funding?" },
                    { num: "10", title: "Call to Action / Closing", content: "Why are you the right person to lead this idea? Close with a strong statement on how GIF will help you execute it." }
                  ].map((slide, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-[#914D4D] transition">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#304156] text-white px-3 py-1 rounded-lg font-bold text-sm flex-shrink-0 w-20 text-center">
                          Slide {slide.num}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#304156] mb-1">{slide.title}</h4>
                          <p className="text-sm text-gray-600">{slide.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

       {/* Project Submission Section */}
        <div className="bg-white border border-[#914D4D]/20 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-xl">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#914D4D]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-10">
            
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#914D4D]/10 text-[#914D4D] px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-[#914D4D]/20">
                <Target className="w-3.5 h-3.5" /> The Final Gate
              </div>
              
              <div>
                <h2 className="text-3xl font-black text-[#304156] mb-2">Project Deck Submission</h2>
                <p className="text-[#304156]/70 text-base leading-relaxed">
                  Submit your project deck for mentoring review, and update it to your final document before the ultimate deadline.
                </p>
              </div>

              <div className="bg-[#304156]/5 rounded-2xl p-5 border border-[#304156]/10">
                <h3 className="font-bold text-[#304156] mb-3 text-sm uppercase tracking-wide">Submission Timeline:</h3>
                <ul className="space-y-3 text-sm text-[#304156]/80">
                  <li className="flex items-start gap-3">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#914D4D]" />
                    <span><strong>Phase 1 (Review):</strong> Submit your draft link by <strong className="text-[#304156]">7 May 2026</strong> for progress tracking and feedback.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#914D4D]" />
                    <span><strong>Phase 2 (Final):</strong> Update this form with your final link by <strong className="text-[#304156]">10 May 2026</strong>.</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2 text-sm font-bold text-[#914D4D]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> REVIEW DEADLINE: 7 May 2026
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> FINAL DEADLINE: 10 May 2026 (23:59 WIB)
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[400px] flex flex-col justify-center">
              {userData?.project_drive_link ? (
                <div className="bg-[#304156]/5 border border-[#304156]/10 rounded-2xl p-6 shadow-sm">
                  <div className="text-center mb-4">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[#304156]" />
                    <h3 className="font-black text-xl text-[#304156]">Link Saved!</h3>
                    <p className="text-xs text-[#304156]/70 mt-1">You can update your link until the final deadline.</p>
                  </div>
                  
                  <label className="block text-sm font-bold text-[#304156] mb-2">Update URL <span className="text-[#914D4D]">*</span></label>
                  <input
                    type="url"
                    value={projectLink}
                    onChange={(e) => setProjectLink(e.target.value)}
                    placeholder="Paste any link here..."
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-[#304156] focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition mb-4 text-sm"
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(userData.project_drive_link, "_blank")}
                      className="w-1/3 bg-white text-[#304156] border border-[#304156]/20 hover:bg-[#304156]/5 py-3 rounded-xl font-bold shadow-sm"
                      title="View current link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleProjectSubmit}
                      disabled={submitting || projectLink === userData.project_drive_link}
                      className="w-2/3 py-3 rounded-xl font-bold text-base bg-[#914D4D] text-white hover:bg-[#7a3e3e] shadow-md transition-all"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Update Link"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
                  <label className="block text-sm font-bold text-[#304156] mb-2">Project URL <span className="text-[#914D4D]">*</span></label>
                  <input
                    type="url"
                    value={projectLink}
                    onChange={(e) => setProjectLink(e.target.value)}
                    placeholder="Paste any link here..."
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-[#304156] focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition mb-4 text-sm"
                  />
                  <Button
                    onClick={handleProjectSubmit}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl font-bold text-base bg-[#914D4D] text-white hover:bg-[#7a3e3e] shadow-md transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" /> Submit Link
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-3 font-medium">
                    Ensure link access is set to public so mentors can view it.
                  </p>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Community & Support */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#304156]/5 p-2.5 rounded-xl">
                <Users className="w-5 h-5 text-[#304156]" />
              </div>
              <h3 className="font-bold text-[#304156] text-lg">Mentoring Community</h3>
            </div>
            <p className="text-sm text-[#304156]/70 mb-6 flex-1">
              Connect with fellow Fast-Track participants. Share insights, request feedback, and collaborate on your journey to Singapore.
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
              <div className="bg-[#914D4D]/5 p-2.5 rounded-xl">
                <BookOpen className="w-5 h-5 text-[#914D4D]" />
              </div>
              <h3 className="font-bold text-[#304156] text-lg">Need Assistance?</h3>
            </div>
            <p className="text-sm text-[#304156]/70 mb-6 flex-1">
              Having trouble with assignments, scheduling 1-on-1 consultations, or accessing materials? Our team is ready to help.
            </p>
            <Link href="https://wa.me/6288297253491" target="_blank">
              <Button className="w-full bg-[#304156] hover:bg-[#2F4055] text-white rounded-xl py-3 font-bold">
                Contact Mentor
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
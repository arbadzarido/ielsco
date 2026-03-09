"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  AlertCircle, 
  PlayCircle, 
  BookOpen,
  Target,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles, 
  Lock, 
  Bell,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RegistrationStatusCard from "@/components/test/RegistrationStatusCard"; 
import TestCard from "@/components/test/TestCard";
import ResourceLibrary from "@/components/test/ResourceLibrary";
import MasterClassSection from "@/components/test/MasterClassSection";

// --- Types ---
type UserTier = "explorer" | "insider" | "visionary";

interface TestRegistration {
  id: string;
  email: string;
  full_name: string;
  test_type: 'ielts' | 'toefl' | 'toeic' | 'sat';
  registration_date: string;
  access_status: 'active' | 'expired';
}

interface TestAttempt {
  id: string;
  user_id: string;
  test_type: 'pre_test' | 'post_test'; // Standardizing naming
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string; // Standardized to optional string
  listening_score?: number;
  reading_score?: number;
  writing_score?: number;
  speaking_score?: number;
  overall_score?: number;
  ielts_band?: number;
  mentor_feedback?: string;
}

export default function IELSTestDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- State ---
  const [userData, setUserData] = useState({
    id: "", name: "", email: "", tier: "explorer" as UserTier, avatar: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [registration, setRegistration] = useState<TestRegistration | null>(null);
  const [preTest, setPreTest] = useState<TestAttempt | null>(null);
  const [postTest, setPostTest] = useState<TestAttempt | null>(null);

  // --- Main Logic Flow ---
  useEffect(() => {
    let isMounted = true;

    const initDashboard = async () => {
      try {
        setLoading(true);

        // 1. Authenticate User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }

        // 2. Get Profile & Tier (SINKRONISASI MEMBERSHIP)
        const { data: dbUser } = await supabase
          .from("users")
          .select(`
            *,
            memberships (
              tier
            )
          `)
          .eq("id", user.id)
          .single();

        if (!isMounted) return;

        // --- MAPPING LOGIC STANDAR IELS ---
        // Kita pastiin 'pro' jadi 'insider', 'premium' jadi 'visionary'
        const dbTier = dbUser?.memberships?.[0]?.tier;
        let uiTier: UserTier = "explorer";
        
        if (dbTier === "pro") {
          uiTier = "insider";
        } else if (dbTier === "premium" || dbTier === "visionary") {
          uiTier = "visionary";
        }

        const userInfo = {
          id: user.id,
          name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
          email: user.email || "",
          tier: uiTier, // Sekarang udah sinkron
          avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || ""
        };
        setUserData(userInfo);

        // 3. STEP A: Verify Spreadsheet Access via API
        // This ensures people from GForm are synced to Supabase
        setVerifying(true);
        const verifyRes = await fetch('/api/test/verify-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userInfo.email, userId: userInfo.id }),
        });
        const accessData = await verifyRes.json();
        
        if (accessData.hasAccess && isMounted) {
          setRegistration(accessData.registration);
          
          // 4. STEP B: Direct Supabase Fetch for Attempts
          // We query DB directly here for real-time accuracy and "Post-test" unlocking
          const { data: attempts } = await supabase
            .from('test_attempts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

          if (attempts && isMounted) {
            const pre = attempts.find(a => a.test_type === 'pre_test');
            const post = attempts.find(a => a.test_type === 'post_test');
            setPreTest(pre);
            setPostTest(post);
          }
        }
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setVerifying(false);
        }
      }
    };

    initDashboard();
    return () => { isMounted = false; };
  }, [router, supabase]);

  // --- Logic Helpers ---
  const canTakePostTest = preTest?.status === 'completed';
  const isIELTS = registration?.test_type === 'ielts';
  const showResults = preTest?.status === 'completed' || postTest?.status === 'completed';

  // --- Loading View ---
  if (loading) {
    return (
      <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <div className="h-64 bg-gray-100 rounded-[32px] animate-pulse" />
          <div className="grid md:grid-cols-2 gap-8">
             <div className="h-56 bg-gray-100 rounded-3xl animate-pulse" />
             <div className="h-56 bg-gray-100 rounded-3xl animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }


 // --- NOT REGISTERED VIEW ---
if (!registration) {
  return (
    <DashboardLayout
      userTier={userData.tier}
      userName={userData.name}
      userAvatar={userData.avatar}
    >
      <div className="min-h-screen bg-[#F7F8FA]">
        
   
        

        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-12">
 {/* HERO & Stats Grid */}
         
            <div className="lg:col-span-3 bg-gradient-to-br from-[#304156] to-[#1e2a38] rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden shadow-lg border border-[#CDC6BC]/20">
              <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
                 <Target size={16} />
                <span>My Test</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                Mock Up Assessment
              </h1>

              <p className="text-white/80 text-base lg:text-lg leading-relaxed">
                Register now to access your personalized test dashboard,
                track progress, and achieve your target score.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-12">
          {/* Access Denied Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="lg:col-span-2 bg-white border border-[#CDC6BC] rounded-[32px] p-8 md:p-10 shadow-sm text-center">
              <div className="w-20 h-20 bg-[#F6F3EF] rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[#304156]">
                <Target className="text-[#304156]" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-[#304156] mb-3">
                Access Required
              </h2>
              <p className="text-[#577E90] mb-8 leading-relaxed max-w-md mx-auto">
                We couldn't find an active test registration for{" "}
                <span className="text-[#304156] font-bold">
                  {userData.email}
                </span>
                . Please register via our official form to unlock your test
                dashboard.
              </p>
              
              {/* FIXED TAG DI SINI */}
              <a 
                href="https://forms.gle/iZsfxutCF5NYWqWn7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#304156] text-white rounded-2xl font-bold hover:bg-[#253344] transition-all shadow-lg"
              >
                Register for IELTS Test
                <ArrowRight size={20} />
              </a>
            </div>

            <div className="bg-gradient-to-br from-[#304156] to-[#3d4f66] rounded-[32px] p-6 text-white flex flex-col justify-center items-center text-center shadow-sm">
              <Sparkles className="mb-4" size={48} />
              <p className="text-xs font-bold uppercase tracking-wider mb-2">
                Official Portal
              </p>
              <p className="text-2xl font-bold">IELS Assessment</p>
            </div>
          </div>
          {/* Benefits Section */}
          <div className="bg-white border border-[#CDC6BC] rounded-[32px] p-8 md:p-10 shadow-sm">
            <h3 className="text-2xl font-bold text-[#304156] mb-8 text-center">
              What You'll Get After Registration
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F6F3EF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#CDC6BC]">
                  <BookOpen className="text-[#304156]" size={28} />
                </div>
                <h4 className="font-bold text-[#304156] mb-2">
                  Study Materials
                </h4>
                <p className="text-sm text-[#577E90] leading-relaxed">
                  Access premium preparation resources and practice tests
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#F6F3EF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#CDC6BC]">
                  <TrendingUp className="text-[#304156]" size={28} />
                </div>
                <h4 className="font-bold text-[#304156] mb-2">
                  Progress Tracking
                </h4>
                <p className="text-sm text-[#577E90] leading-relaxed">
                  Monitor your improvement with detailed analytics
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-[#F6F3EF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#CDC6BC]">
                  <Award className="text-[#304156]" size={28} />
                </div>
                <h4 className="font-bold text-[#304156] mb-2">
                  Official Certificate
                </h4>
                <p className="text-sm text-[#577E90] leading-relaxed">
                  Earn your verified IELTS score certificate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
  
// --- Main Dashboard View ---
  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen pb-24 bg-[#FDFDFD]">
        
        {/* ── HERO: REGISTERED USER ─────────────────────────────────────── */}
        <div className="relative bg-[#304156] text-white overflow-hidden py-12 lg:py-16 px-4 sm:px-8 lg:px-12">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#577E90]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left max-w-3xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
                  <Target size={16} />
                  <span>My Test</span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4 text-white">
                  Your {registration.test_type.toUpperCase()} Journey
                </h1>

                <p className="text-white/80 text-base lg:text-lg leading-relaxed">
                  Track your progress, access premium materials, and achieve your
                  target score with personalized guidance.
                </p>
              </div>

              {/* RIGHT CONTENT: Stats Cards */}
              <div className="flex flex-row flex-wrap justify-center md:justify-end gap-3 sm:gap-4 w-full md:w-auto">
                <div className="bg-white/5 backdrop-blur-xl px-6 py-4 sm:px-8 sm:py-5 rounded-[24px] border border-white/10 text-center min-w-[130px] sm:min-w-[140px] flex-1 sm:flex-none">
                  <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Status</p>
                  <p className="font-black text-green-400 uppercase text-xs sm:text-sm tracking-widest">Active</p>
                </div>

                {(preTest?.overall_score || preTest?.ielts_band) && (
                  <div className="bg-white/5 backdrop-blur-xl px-6 py-4 sm:px-8 sm:py-5 rounded-[24px] border border-white/10 text-center min-w-[130px] sm:min-w-[140px] flex-1 sm:flex-none">
                    <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Current Band</p>
                    <p className="font-black text-[#CB2129] text-xl sm:text-2xl tracking-tighter">
                      {preTest?.overall_score || preTest?.ielts_band}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 -mt-6 relative z-20 space-y-16">
          
          {/* 2. Registration Status */}
          <RegistrationStatusCard registration={registration} />

          {/* 3. Assessment Modules Grid */}
          <section>
            <div className="space-y-2 mb-10">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-[#304156] tracking-tight font-geologica">
                  Required Modules
                </h2>
                <div className="h-px flex-1 bg-[#CDC6BC]/30 hidden md:block" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Pre-Test Module */}
              <TestCard
                title="DIAGNOSTIC PRE-TEST"
                description="Your starting point. This assessment identifies your strengths and critical weaknesses."
                duration="2 Hours"
                sections={4}
                status={preTest?.status || 'not_started'}
                score={preTest?.overall_score || preTest?.ielts_band}
                testType="pre-test"
                isLocked={false}
                href={
                  preTest?.status === 'completed'
                    ? `/dashboard/test/results/${preTest.id}`
                    : `/dashboard/test/${registration.test_type.toUpperCase()}/pre-test`
                }
              />

              {/* Post-Test Module */}
              <TestCard
                title="FINAL POST-TEST"
                description="The ultimate benchmark. Take this after completing your Masterclasses to see your growth."
                duration="2 Hours"
                sections={4}
                status={postTest?.status || 'not_started'}
                score={postTest?.overall_score || postTest?.ielts_band}
                testType="post-test"
                isLocked={!canTakePostTest}
                lockReason={!canTakePostTest ? "Complete Diagnostic Pre-Test first" : undefined}
                href={
                  postTest?.status === 'completed'
                    ? `/dashboard/test/results/${postTest.id}`
                    : canTakePostTest
                    ? `/dashboard/test/${registration.test_type.toUpperCase()}/post-test`
                    : undefined
                }
              />
            </div>
          </section>

          {/* 5. Resources & Training (IELTS Exclusive) */}
          {isIELTS && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
              
              {/* LEFT COLUMN: Master Class & Resources */}
              <div className="lg:col-span-2 space-y-12 sm:space-y-16">
                
                {/* 1. Master Class */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-[#CDC6BC]/30 pb-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#304156] tracking-tight font-geologica">
                      IELTS Master Class
                    </h3>
                    <div className="h-px flex-1 bg-[#CDC6BC]/30 hidden md:block" />
                  </div>
                  <div className="w-full max-w-full overflow-hidden px-1">
                    <MasterClassSection />
                  </div>
                </div>

                {/* 2. Resource Library */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-[#CDC6BC]/30 pb-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#304156] tracking-tight font-geologica">
                      IELTS Resources
                    </h3>
                    <div className="h-px flex-1 bg-[#CDC6BC]/30 hidden md:block" />
                  </div>
                  <div className="w-full max-w-full overflow-hidden px-1">
                    <ResourceLibrary />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Sidebar Content */}
              <aside className="space-y-8">
                <div className="bg-[#F6F3EF] p-6 sm:p-8 rounded-[32px] border border-[#CDC6BC]/40 shadow-sm lg:sticky lg:top-24">
                  <h3 className="text-[10px] font-black text-[#577E90] uppercase tracking-[0.2em] mb-8 border-b border-[#CDC6BC]/50 pb-4">Upcoming Systems</h3>
                  <div className="space-y-3">
                    {['TOEFL iBT', 'TOEIC Mastery', 'SAT Digital'].map((item) => (
                      <div key={item} className="p-4 bg-white rounded-2xl border border-[#CDC6BC]/20 flex justify-between items-center opacity-40">
                        <span className="font-bold text-[#304156] text-[11px] uppercase">{item}</span>
                        <Lock size={12} className="text-[#CDC6BC]" />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  AlertCircle, 
  PlayCircle, 
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

  // --- Not Registered View ---
  if (!registration) {
    return (
      <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#CB2129]" />
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="text-[#CB2129]" size={48} />
            </div>
            <h2 className="text-3xl font-black text-[#304156] mb-4 tracking-tighter">Access Denied</h2>
            <p className="text-gray-500 mb-10 leading-relaxed font-medium">
              We couldn't verify an active test registration for <span className="text-[#304156] font-bold">{userData.email}</span>. Please ensure you have registered via our official Form.
            </p>
            <a href="https://forms.gle/iZsfxutCF5NYWqWn7" target="_blank" className="block w-full py-4 bg-[#CB2129] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/20 hover:scale-105 transition-all">
              Register Now
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- Main Dashboard View ---
  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen pb-24 bg-[#FDFDFD]">
      {/* Hero Section dengan Tier-based Color */}
<div className={cn(
  "relative text-white overflow-hidden transition-colors duration-500",
  userData.tier === "visionary" ? "bg-gradient-to-r from-yellow-700 to-yellow-900" :
  userData.tier === "insider" ? "bg-[#E56668]" : "bg-[#2F4157]"
)}>
  {/* Background Decoration */}
  <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

  <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-16 relative z-10">
    {/* Parent Flex: col & center on mobile | row & justify on desktop */}
    <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-10">
      
      {/* LEFT CONTENT: Text & Badge */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] sm:text-xs font-medium mb-4 backdrop-blur-sm">
          <Sparkles size={12} className="text-yellow-400" />
          <span className="uppercase tracking-wider">Official Assessment Portal</span>
        </div>
        
        <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
          Your {registration.test_type.toUpperCase()} Journey
        </h1>
        
        <p className="text-gray-300 max-w-xl text-sm sm:text-lg leading-relaxed mt-4">
          Track your progress, access premium materials, and achieve your target score.
        </p>
      </div>

      {/* RIGHT CONTENT: Stats Cards */}
      {/* justify-center on mobile | justify-end on desktop */}
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
        <div className="max-w-7xl mx-auto px-6 lg:px-12 -mt-6 relative z-20 space-y-16">
          
          {/* 2. Registration Status */}
          <RegistrationStatusCard registration={registration} />

          {/* 3. Assessment Modules Grid */}
          <section>
<div className="space-y-2 mb-10">
  {/* Label Kecil di Atas (Optional, biar makin mirip style Master Class) */}
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
              // --- LOGIC BARU DI SINI ---
  href={
    preTest?.status === 'completed' 
      ? `/dashboard/test/results/${preTest.id}` // Jika sudah selesai, ke halaman hasil
      : `/dashboard/test/${registration.test_type.toUpperCase()}/pre-test` // Jika belum, ke halaman test
  } />

              {/* Post-Test Module: Unlocks ONLY after Pre-test completion */}
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

  // ... prop lainnya
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
      
      {/* 1. Master Class - Fully visible, but constrained to prevent overflow */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-[#CDC6BC]/30 pb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-[#304156] tracking-tight font-geologica">
            IELTS Master Class
          </h3>
          <div className="h-px flex-1 bg-[#CDC6BC]/30 hidden md:block" />
        </div>
        
        {/* Anti-Offside Wrapper: Ensuring videos don't leak out */}
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
                

                {/* Upcoming Ecosystems */}
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
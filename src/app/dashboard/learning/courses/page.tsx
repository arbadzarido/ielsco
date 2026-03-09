"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { createBrowserClient } from "@supabase/ssr";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  PlayCircle, FileText, BookOpen, Award, CheckCircle2, 
  Calendar, Video, Lock, ArrowRight, ChevronRight, 
  Download, Target, GraduationCap, X, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TIPE DATA ---
type UserTier = "explorer" | "insider" | "visionary";

interface CourseModule {
  id: string;
  title: string;
  duration: string;
  type: "video" | "document" | "quiz";
}

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  tags: string[];
  totalVideos: number;
  totalTemplates: number;
  instructor: string;
  thumbnail: string;
  modules: CourseModule[];
}

// --- DATA DUMMY SPESIFIK & MENDETAIL ---
const COURSES: Course[] = [
  {
    id: "course-remote-work-01",
    title: "English for Remote Work & Global Careers",
    description: "Master the exact communication skills needed to land, survive, and thrive in global tech companies and remote startups. Learn async communication, meeting etiquette, and cross-cultural nuances.",
    level: "B2 - C2",
    tags: ["Career", "Remote Work", "Communication"],
    totalVideos: 12,
    totalTemplates: 8,
    instructor: "Arbadza Rido",
    thumbnail: "🌍",
    modules: [
      { id: "mod1", title: "Asynchronous Communication: Slack & Email Mastery", duration: "45 mins", type: "video" },
      { id: "mod2", title: "Leading & Participating in Zoom Standups", duration: "35 mins", type: "video" },
      { id: "mod3", title: "Cross-Cultural Collaboration & Feedback", duration: "50 mins", type: "video" },
      { id: "mod4", title: "Remote Work Email & Notion Templates", duration: "PDF + Notion", type: "document" },
    ]
  },
  {
    id: "course-grammar-mastery-01",
    title: "Mastering Grammar: From Foundations to Flawless Execution",
    description: "Stop second-guessing your sentences. This course breaks down complex English grammar into intuitive patterns for professional writing, academic papers, and confident speaking.",
    level: "B1 - C1",
    tags: ["Grammar", "Writing", "Foundations"],
    totalVideos: 15,
    totalTemplates: 5,
    instructor: "Arbadza Rido",
    thumbnail: "✍️",
    modules: [
      { id: "mod1", title: "Nailing the Perfect Tenses Without Confusion", duration: "40 mins", type: "video" },
      { id: "mod2", title: "Conditionals & Subjunctives in Business Context", duration: "45 mins", type: "video" },
      { id: "mod3", title: "Prepositions: The Ultimate Cheat Sheet", duration: "PDF", type: "document" },
      { id: "mod4", title: "Common Pitfalls for Indonesian Speakers", duration: "30 mins", type: "video" },
    ]
  }
];

export default function CoursesDashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
  );

 // --- UPDATE STATE (Tambahkan id supaya error TS ilang) ---
const [userData, setUserData] = useState({
  id: "", // WAJIB ADA buat handleEnrollment
  name: "Member",
  avatar: "",
  tier: "explorer" as UserTier,
});
const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  // --- GANTI ISI useEffect fetchUser ---
useEffect(() => {
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Ambil data Membership langsung (Source of Truth Tier)
    const { data: dbMembership } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Ambil data Profile (Nama & Avatar terbaru dari tabel users)
    const { data: dbUser } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Mapping Tier (Mapping premium/visionary -> visionary)
    const dbTier = dbMembership?.tier;
    let uiTier: UserTier = "explorer";

    if (dbTier === "pro") {
      uiTier = "insider";
    } else if (dbTier === "premium" || dbTier === "visionary") {
      uiTier = "visionary";
    }

    setUserData({
      id: user.id, // Simpan ID auth ke state
      name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
      avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || "",
      tier: uiTier,
    });
    
    setLoading(false);
  };

  fetchUser();
}, [supabase]);
  // --- FUNGSI DAFTAR COURSE KE SUPABASE ---
  const handleEnrollment = async () => {
    if (!selectedCourse || !userData.id) return;
    setIsEnrolling(true);

    try {
      // 1. Simpan data enrollment ke tabel 'user_courses'
      // 2. Setup progress awal (Assessment Flow) di tabel 'course_assessments'
      
      /* CONTOH KODE SUPABASE ASLI (Uncomment kalau tabel udah ada):
      const { error: enrollError } = await supabase.from('user_courses').insert({
        user_id: userData.id,
        course_id: selectedCourse.id,
        status: 'enrolled',
        current_step: 'placement_test'
      });

      const { error: assessmentError } = await supabase.from('course_assessments').insert({
        user_id: userData.id,
        course_id: selectedCourse.id,
        status: 'pending',
        type: 'placement_test'
      });
      */

      // Simulasi delay database
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEnrollmentSuccess(true);
      
      // Redirect ke halaman Placement Test setelah 2 detik
      setTimeout(() => {
        router.push(`/dashboard/courses/${selectedCourse.id}/placement-test`);
      }, 2000);

    } catch (error) {
      console.error("Enrollment failed:", error);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-8 max-w-7xl mx-auto animate-pulse">
          <div className="h-64 bg-gray-200 rounded-3xl mb-8" />
          <div className="h-96 bg-gray-200 rounded-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F7F8FA] pb-20">
        
   
        

        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-12">
 {/* HERO & Stats Grid */}
          <div className="mb-12">
            <div className="lg:col-span-3 bg-gradient-to-br from-[#304156] to-[#1e2a38] rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden shadow-lg border border-[#CDC6BC]/20">
              <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
                <GraduationCap size={16} />
                <span>My Courses</span>
              </div>

             <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                Premium Learning Hub
              </h1>

              <p className="text-white/80 text-base lg:text-lg leading-relaxed">
                Access exclusive video courses, templates, and e-books. Complete
                assessments to earn verified certificates.
              </p>
              </div></div></div>
</div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-8 relative z-20 space-y-10">
          
          {/* ── COURSE LIST ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {COURSES.map((course) => (
              <div key={course.id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
                <div className="p-6 lg:p-8 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl bg-gray-50 p-3 rounded-2xl border border-gray-100">{course.thumbnail}</div>
                    <span className="bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
                      Level: {course.level}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-[#2F4157] mb-2 leading-tight">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed line-clamp-3">
                    {course.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {course.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 uppercase tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                      <Video size={16} className="text-[#E56668]" /> {course.totalVideos} Video Modules
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                      <FileText size={16} className="text-blue-500" /> {course.totalTemplates} Templates/PDFs
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button 
                    onClick={() => setSelectedCourse(course)}
                    className="w-full py-3.5 bg-white border border-gray-200 text-[#2F4157] rounded-xl font-black text-sm hover:border-[#E56668] hover:text-[#E56668] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    View Curriculum & Enroll <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── MENTOR BOOKING SECTION ── */}
          <div className="bg-white rounded-[32px] border border-[#2F4157]/10 p-1 shadow-lg mt-12 overflow-hidden">
            <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2a38] rounded-[28px] p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-10">
              
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-[#E56668] rounded-full blur-2xl opacity-20 translate-x-4 translate-y-4" />
                <div className="w-40 h-40 lg:w-48 lg:h-48 relative rounded-full border-4 border-white/10 overflow-hidden z-10">
                  {/* Pastikan gambar ini ada di public folder lu */}
                  <Image src="/images/contents/about/arba.png" alt="Arbadza Rido" fill className="object-cover" />
                </div>
                <div className="absolute bottom-2 right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-[#1e2a38] z-20" title="Available for Mentoring" />
              </div>

              <div className="flex-1 text-center lg:text-left text-white">
                <div className="inline-block px-3 py-1 bg-[#E56668]/20 text-[#E56668] rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-[#E56668]/30">
                  1-on-1 Mentorship
                </div>
                <h2 className="text-3xl font-black mb-2">Book a Session with Arbadza Rido</h2>
                <p className="text-[#a5b4c6] text-sm mb-6 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Founder of IELS, Certified EFL & ESL Teacher. Need personalized feedback on your writing, a mock interview for remote jobs, or speaking practice? Book a dedicated session to accelerate your progress.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link 
                    href="https://cal.com/arbadzarido" // Ganti dengan link booking beneran
                    target="_blank"
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#C04C4E] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Calendar size={18} /> Book via Cal.com
                  </Link>
                  <Link 
                    href="/docs/arba-credentials.pdf"
                    target="_blank"
                    className="w-full sm:w-auto px-8 py-3.5 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center"
                  >
                    View Credentials
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── COURSE ENROLLMENT MODAL (Coursera-style Flow) ── */}
      {selectedCourse && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="absolute inset-0 bg-[#2F4157]/80 backdrop-blur-sm" onClick={() => !isEnrolling && setSelectedCourse(null)} />

          <div className="relative z-10 w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-lg font-black text-[#2F4157]">Course Syllabus & Pathway</h3>
                <p className="text-xs text-gray-500 font-medium">Verify your skills and earn a certificate</p>
              </div>
              <button onClick={() => setSelectedCourse(null)} disabled={isEnrolling} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 lg:p-8 flex-1 bg-gray-50/50">
              {enrollmentSuccess ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-[#2F4157] mb-2">Enrollment Successful!</h3>
                  <p className="text-gray-500 max-w-sm mb-6">Redirecting you to the Placement Test to gauge your current level...</p>
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-[#E56668] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex gap-4 mb-8">
                    <div className="text-5xl">{selectedCourse.thumbnail}</div>
                    <div>
                      <h2 className="text-xl font-black text-[#2F4157] mb-1 leading-tight">{selectedCourse.title}</h2>
                      <p className="text-sm text-gray-500 line-clamp-2">{selectedCourse.description}</p>
                    </div>
                  </div>

                  {/* Assessment Pipeline UI */}
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Your Learning Pathway</h4>
                  <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
                    
                    {/* Step 1: Placement */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[13px] top-0 w-6 h-6 bg-[#E56668] rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <h5 className="font-bold text-[#2F4157] text-sm">1. Placement Test</h5>
                      <p className="text-xs text-gray-500 mt-1">A 15-minute diagnostic test to personalize your learning path.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded uppercase">Required to unlock</span>
                    </div>

                    {/* Step 2: Modules */}
                    <div className="relative pl-6 opacity-60">
                      <div className="absolute -left-[13px] top-0 w-6 h-6 bg-gray-200 rounded-full border-4 border-white flex items-center justify-center">
                        <Lock size={10} className="text-gray-500" />
                      </div>
                      <h5 className="font-bold text-gray-700 text-sm">2. Video Modules & Materials</h5>
                      <div className="mt-3 space-y-2">
                        {selectedCourse.modules.map((mod, idx) => (
                          <div key={mod.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 text-sm">
                            <span className="text-gray-400 font-bold w-4">{idx + 1}.</span>
                            {mod.type === 'video' ? <PlayCircle size={16} className="text-gray-400" /> : <BookOpen size={16} className="text-gray-400" />}
                            <span className="flex-1 text-gray-600 font-medium truncate">{mod.title}</span>
                            <span className="text-xs text-gray-400 font-medium">{mod.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 3: Reflection */}
                    <div className="relative pl-6 opacity-60">
                      <div className="absolute -left-[13px] top-0 w-6 h-6 bg-gray-200 rounded-full border-4 border-white flex items-center justify-center">
                        <Lock size={10} className="text-gray-500" />
                      </div>
                      <h5 className="font-bold text-gray-700 text-sm">3. Peer Reflection Assignment</h5>
                      <p className="text-xs text-gray-500 mt-1">Submit a practical assignment and review a peer&apos;s work.</p>
                    </div>

                    {/* Step 4: Post Test */}
                    <div className="relative pl-6 opacity-60">
                      <div className="absolute -left-[13px] top-0 w-6 h-6 bg-gray-200 rounded-full border-4 border-white flex items-center justify-center">
                        <Lock size={10} className="text-gray-500" />
                      </div>
                      <h5 className="font-bold text-gray-700 text-sm">4. Post-Test & Certification</h5>
                      <p className="text-xs text-gray-500 mt-1">Pass the final test (80% minimum) to earn your verified certificate.</p>
                    </div>

                  </div>
                </>
              )}
            </div>

            {!enrollmentSuccess && (
              <div className="p-6 bg-white border-t border-gray-100 shrink-0">
                <button 
                  onClick={handleEnrollment}
                  disabled={isEnrolling}
                  className="w-full py-4 bg-[#E56668] text-white rounded-xl font-black text-sm hover:bg-[#C04C4E] hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isEnrolling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Setting up your workspace...
                    </>
                  ) : (
                    <>
                      Start Pathway & Take Placement Test <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </DashboardLayout>
  );
}
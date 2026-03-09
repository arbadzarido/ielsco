"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createBrowserClient } from "@supabase/ssr";
import {
  Library,
  FileText,
  Download,
  BookOpen,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";

type UserTier = "explorer" | "insider" | "visionary";

export default function MyLibraryPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resourceCount, setResourceCount] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    const initData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/sign-in");
        return;
      }

      const { data: dbMembership } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const dbTier = dbMembership?.tier;
      let uiTier: UserTier = "explorer";

      if (dbTier === "pro") {
        uiTier = "insider";
      } else if (dbTier === "visionary" || dbTier === "premium") {
        uiTier = "visionary";
      }

      setUserData({
        id: user.id,
        name: user.user_metadata?.full_name || "Student",
        email: user.email || "",
        tier: uiTier,
        avatar: user.user_metadata?.avatar_url || "",
      });

      // Mock data
      setResourceCount(24);
      setDownloadCount(12);
      setLoading(false);
    };

    initData();
  }, [router, supabase]);

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#304156]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userTier={userData.tier}
      userName={userData.name}
      userAvatar={userData.avatar}
    >
      <div className="min-h-screen bg-[#F6F3EF]">
        

        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-12">
          {/* HERO & Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
            <div className="lg:col-span-3 bg-gradient-to-br from-[#304156] to-[#1e2a38] rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden shadow-lg border border-[#CDC6BC]/20">
              <div className="text-left max-w-3xl mx-auto">
              <div className="inline-flex items-left gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
                <Library size={16} />
                <span>My Library</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                Resource Collection
              </h1>

              <p className="text-white/80 text-base lg:text-lg leading-relaxed">
                Access study guides, templates, worksheets, and premium materials
                to accelerate your learning.
              </p>
         
                <div className="flex gap-8 pt-6">
                  <div>
                    <p className="text-4xl font-bold text-white">{resourceCount}</p>
                    <p className="text-xs text-[#577E90] uppercase tracking-wider font-bold mt-1">
                      Available
                    </p>
                  </div>
                  <div className="w-px bg-white/10 h-14"></div>
                  <div>
                    <p className="text-4xl font-bold text-white">{downloadCount}</p>
                    <p className="text-xs text-[#577E90] uppercase tracking-wider font-bold mt-1">
                      Downloaded
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute top-0 right-0 w-80 h-80 bg-[#577E90]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 mix-blend-screen"></div>
            </div>

            <div className="bg-white border border-[#CDC6BC] rounded-[32px] p-6 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 bg-[#F6F3EF] rounded-2xl flex items-center justify-center mb-4 border border-[#CDC6BC]/50">
                <Download className="text-[#304156]" size={32} />
              </div>
              <p className="text-[#577E90] font-bold text-xs uppercase tracking-wider">
                Downloaded
              </p>
              <p className="text-4xl font-bold text-[#304156] mt-1">
                {resourceCount > 0
                  ? Math.round((downloadCount / resourceCount) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#577E90]"
                size={20}
              />
              <input
                type="text"
                placeholder="Search resources..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-[#CDC6BC] rounded-2xl text-sm focus:ring-2 focus:ring-[#304156] focus:border-transparent outline-none"
              />
            </div>
            <button className="px-6 py-3 bg-white border border-[#CDC6BC] rounded-2xl font-semibold text-sm hover:bg-[#F6F3EF] transition-all flex items-center gap-2 justify-center">
              <Filter size={18} />
              Filter
            </button>
          </div>

          {/* Resource Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Example Resource Card */}
            <div className="bg-white border border-[#CDC6BC] rounded-[24px] p-6 hover:shadow-sm transition-all">
              <div className="w-12 h-12 bg-[#F6F3EF] rounded-xl flex items-center justify-center mb-4">
                <FileText className="text-[#304156]" size={24} />
              </div>
              <h3 className="font-bold text-[#304156] mb-2">
                IELTS Writing Task 2 Template
              </h3>
              <p className="text-sm text-[#577E90] mb-4 leading-relaxed">
                Proven essay structure for Band 7+ scores
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#577E90]">PDF • 2.4 MB</span>
                <button className="text-xs font-bold text-[#304156] hover:text-[#577E90] transition-colors flex items-center gap-1">
                  Download <Download size={14} />
                </button>
              </div>
            </div>

            {/* Add more resource cards */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
"use client";

/**
 * ============================================================
 * GIF SINGAPORE 2026 — CLOSED PAGE  (/dashboard/gif)
 * ============================================================
 * Applications are closed. This page only points selected delegates
 * to the participant portal at /dashboard/gif/delegates.
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, MapPin, Calendar, Users } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";

type UserProfile = {
  full_name: string;
  avatar_url?: string;
  tier?: "explorer" | "insider" | "visionary";
};

export default function GIFClosedPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/sign-in"); return; }

        const [membershipRes, userRes] = await Promise.all([
          supabase.from("memberships").select("tier").eq("user_id", user.id).maybeSingle(),
          supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        ]);

        const dbTier = membershipRes.data?.tier;
        let uiTier: "explorer" | "insider" | "visionary" = "explorer";
        if (dbTier === "pro") uiTier = "insider";
        else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";

        setUserProfile({
          full_name: userRes.data?.full_name || user.user_metadata?.full_name || "Learner",
          avatar_url: userRes.data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
          tier: uiTier,
        });
      } catch (err) {
        console.error("Error init:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-[#914D4D]" />
    </div>
  );

  return (
    <DashboardLayout userTier={userProfile?.tier} userName={userProfile?.full_name} userAvatar={userProfile?.avatar_url}>
      <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8 pt-8 font-geologica">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] rounded-3xl shadow-2xl"
        >
          <div className="absolute bg-[url('/images/contents/stories/member-stories/banner/singapore-banner.png')] bg-cover bg-center inset-0 opacity-10 mix-blend-overlay">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#304156] rounded-full blur-[120px] opacity-80"></div>
          </div>

          <div className="relative z-10 p-8 md:p-14 flex flex-col items-center text-center space-y-8">
            <Image
              src="/images/logos/events/gifsgp.png"
              alt="GIF Singapore"
              width={180}
              height={60}
              priority
              className="h-28 w-auto drop-shadow-2xl object-contain"
            />

            <div className="space-y-3">
              <p className="text-[#FFD1D1] text-xs md:text-sm font-bold uppercase tracking-[0.3em]">Global Impact Fellowship</p>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">Singapore 2026</h1>
            </div>

            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full">
              <Lock className="w-4 h-4 text-white/80" />
              <span className="text-white font-bold text-xs uppercase tracking-wide">Applications for this batch are closed</span>
            </div>

            <div className="space-y-3 max-w-xl">
              <p className="text-white text-lg md:text-xl font-light leading-relaxed">
                The final delegates for GIF Singapore 2026 have been selected.
              </p>
              <p className="text-white/80 text-base leading-relaxed">
                If you are a selected delegate, please access your participant portal.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 text-white/90 text-sm">
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-full"><MapPin className="w-4 h-4" /> Singapore</span>
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-full"><Calendar className="w-4 h-4" /> 17–20 November 2026</span>
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-full"><Users className="w-4 h-4" /> 20 Delegates</span>
            </div>

            <Link href="/dashboard/gif/delegates" className="w-full md:w-auto">
              <Button className="w-full md:w-auto py-3.5 px-10 rounded-2xl bg-white hover:bg-gray-100 text-[#304156] font-black text-base md:text-lg shadow-xl hover:shadow-2xl transition-all group flex items-center justify-center">
                Open Delegate Portal
                <ArrowRight className="w-5 h-5 ml-3 text-[#914D4D] group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <p className="text-[#FFD1D1] font-bold text-sm md:text-base">See you at GIF Batch 3 — 2027.</p>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
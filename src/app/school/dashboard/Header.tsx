"use client";

// =============================================================================
// components/schools/layout/Header.tsx
// Desktop: breadcrumb top bar
// Mobile:  compact app-bar (greeting + avatar + bell) — like student dashboard ref
// =============================================================================

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, ChevronRight } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { UserProfile } from "@/lib/types";

interface HeaderProps {
  profile: UserProfile;
}

const BREADCRUMB_MAP: Record<string, string> = {
  school:      "School",
  dashboard:   "Dashboard",
  class:       "Classes",
  students:    "Students",
  analytics:   "Analytics",
  insights:    "Insights",
  reports:     "Reports",
  settings:    "Settings",
  "sign-in":   "Sign In",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/school/sign-in");
    router.refresh();
  }

  // Breadcrumbs (desktop)
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments
    .filter((s) => !s.startsWith("[") && !/^[0-9a-f-]{36}$/.test(s))
    .map((s) => BREADCRUMB_MAP[s] ?? s);

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const firstName = profile.full_name?.split(" ")[0] ?? "Teacher";

  return (
    <>
      {/* ── DESKTOP header (breadcrumbs + user) ──────────────────────────── */}
      <header className="hidden lg:flex h-14 bg-white border-b border-gray-100 items-center px-6 gap-4 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={13} className="text-gray-300" />}
              <span
                className={`text-[13px] ${
                  i === breadcrumbs.length - 1
                    ? "font-bold text-[#1A2534]"
                    : "text-gray-400 font-medium"
                }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell size={17} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E56668]" />
          </button>

          <div className="w-px h-5 bg-gray-100" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#1A2534] flex items-center justify-center text-white text-[10px] font-black">
              {initials}
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#1A2534] leading-none">
                {profile.full_name}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                {profile.role.replace("_", " ")}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── MOBILE app-bar ────────────────────────────────────────────────── */}
      {/* Inspired by student dashboard ref: greeting + avatar left, bell + tier right */}
      <header className="lg:hidden sticky top-0 z-20 bg-[#1A2534] px-5 py-4 flex items-center justify-between shadow-lg">
        {/* Left: avatar + greeting */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-[#E56668]/20 border-2 border-[#E56668]/40 flex items-center justify-center text-[#E56668] text-[13px] font-black">
              {initials}
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1A2534]" />
          </div>
          <div>
            <p className="text-white/60 text-[11px] font-medium leading-none">
              {getGreeting()},
            </p>
            <p className="text-white font-bold text-[15px] leading-tight mt-0.5">
              {firstName} 👋
            </p>
          </div>
        </div>

        {/* Right: school badge + bell */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-white/70 border border-white/15">
            TEACHER
          </span>
          <button className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E56668]" />
          </button>
        </div>
      </header>
    </>
  );
}
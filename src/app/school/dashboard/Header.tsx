"use client";

// =============================================================================
// components/schools/layout/Header.tsx
// Desktop: Premium Dark Blue Header Bar + Only First Name + Avatar Context Fixed
// Mobile: Unified Dark Side-Menu Drawer matched with User Student Dashboard Style
// =============================================================================

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { 
  Bell, LogOut, ChevronRight, ChevronDown, 
  User, Settings, HelpCircle, UserCircle, Menu, X,
  LayoutDashboard, GraduationCap, Users, BookOpen, BarChart3, FileText, Sparkles, Crown
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

interface HeaderProps {
  profile: UserProfile;
}

const BREADCRUMB_MAP: Record<string, string> = {
  school:     "School",
  dashboard:  "Dashboard",
  class:      "Classes",
  students:   "Students",
  mentor:     "Mentor Dashboard",
  analytics:  "Analytics",
  insights:   "Insights",
  reports:    "Reports",
  settings:   "Settings",
  help:   "Help",
  profile:    "My Profile",
  "sign-in":  "Sign In",
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

  // Dropdown & Drawer State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const profileRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Close profile dropdown when clicking outside (Desktop)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/school/sign-in");
    router.refresh();
  }

  // Breadcrumbs parsing
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments
    .filter((s) => !s.startsWith("[") && !/^[0-9a-f-]{36}$/.test(s))
    .map((s) => BREADCRUMB_MAP[s] ?? s);

  const initials = profile.full_name
    ? profile.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "T";

  const firstName = profile.full_name?.split(" ")[0] ?? "Teacher";
  const userTier = (profile.subscription_role?.toLowerCase() as "explorer" | "insider" | "visionary") || "explorer";

  // Menu Items khusus B2B School Portal
  const navItems = [
    { name: "Dashboard", path: "/school/dashboard", icon: LayoutDashboard },
    {
      name: "Management",
      path: "#",
      icon: GraduationCap,
      children: [
        { name: "Classes", path: "/school/dashboard/class", icon: GraduationCap },
        { name: "Students", path: "/school/dashboard/students", icon: Users },
        { name: "Mentor", path: "/school/dashboard/mentor", icon: BookOpen },
      ],
    },
    {
      name: "Analytics",
      path: "#",
      icon: BarChart3,
      children: [
        { name: "Insights", path: "/school/dashboard/insights", icon: BarChart3 },
        { name: "Reports", path: "/school/dashboard/reports", icon: FileText },
      ],
    },
  ];

  const closeMobileMenu = () => setIsMobileOpen(false);

  const getTierBadge = (tier: "explorer" | "insider" | "visionary") => {
    switch(tier) {
      case "visionary":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-bold border border-purple-500/30 uppercase tracking-wide">
            <Sparkles size={10} className="text-purple-300" /> VISIONARY
          </span>
        );
      case "insider":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-bold border border-blue-500/30 uppercase tracking-wide">
            INSIDER
          </span>
        );
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px] font-bold border border-white/20 uppercase tracking-wide">
            EXPLORER
          </span>
        );
    }
  };

  return (
    <>
      {/* ── DESKTOP HEADER ──────────────────────────────────────────────── */}
      <header className="hidden lg:flex h-24 bg-[#1A2534] border-b border-white/10 items-center px-8 gap-4 sticky top-0 z-40 shadow-lg">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={13} className="text-white/30" />}
              <span
                className={`text-[13px] ${
                  i === breadcrumbs.length - 1
                    ? "font-bold text-white"
                    : "text-white/50 font-medium"
                }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-4 lg:gap-6 z-40 pr-10">
          <button className="relative w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E56668]" />
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Profile Dropdown Aligned perfectly with User Dashboard Style */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 group focus:outline-none text-left cursor-pointer"
            >
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-sm font-bold text-white leading-none">{firstName}</span>
                <div className="mt-1 opacity-90 hover:opacity-100 transition-opacity">
                  {getTierBadge(userTier)}
                </div>
              </div>
              <div className="relative">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border-2 border-white/20 group-hover:border-[#E56668] transition-all object-cover" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border-2 border-white/20 group-hover:border-[#E56668] transition-all font-bold text-sm">
                    {initials}
                  </div>
                )}
                <div className={cn(
                  "absolute -bottom-1 -right-1 bg-white rounded-full p-[3px] text-[#1A2534] transition-transform duration-300 shadow-sm",
                  isProfileOpen ? "rotate-180" : ""
                )}>
                  <ChevronDown size={10} strokeWidth={3} />
                </div>
              </div>
            </button>

            {/* Dropdown Menu Popup Card */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-4 w-72 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 origin-top-right z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 space-y-1">
                  <Link 
                    href="/school/dashboard/profile" 
                    onClick={() => setIsProfileOpen(false)} 
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1A2534] rounded-xl transition-colors"
                  >
                    <User size={18} className="text-gray-400" /> My Profile
                  </Link>
                  <Link 
                    href="/school/dashboard/settings" 
                    onClick={() => setIsProfileOpen(false)} 
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1A2534] rounded-xl transition-colors"
                  >
                    <Settings size={18} className="text-gray-400" /> Settings
                  </Link>
                  <div className="h-px bg-gray-100 my-1 mx-3" />
                  <Link 
                    href="/school/dashboard/help" 
                    onClick={() => setIsProfileOpen(false)} 
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1A2534] rounded-xl transition-colors"
                  >
                    <HelpCircle size={18} className="text-gray-400" /> Help Center
                  </Link>
                </div>
                <div className="p-2 border-t border-gray-100 mt-1">
                  <button 
                    onClick={handleSignOut} 
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold transition-colors text-left"
                  >
                    <LogOut size={18} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE APP-BAR ────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#1A2534] px-5 py-4 flex items-center justify-between shadow-lg border-b border-white/5">
        {/* Left: Avatar + Greeting */}
        <div className="flex items-center gap-3">
          <Link href="/school/dashboard/profile" className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-11 h-11 rounded-full object-cover border-2 border-white/25" 
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1A2534]" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium leading-none">
                {getGreeting()},
              </p>
              <p className="text-white font-bold text-base leading-tight mt-0.5">
                {firstName} 👋
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Badge Tier + Bell + Hamburger */}
        <div className="flex items-center gap-2">
          {getTierBadge(userTier)}
          <button className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E56668]" />
          </button>
          <button
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ── MOBILE SLIDE-IN SIDE MENU DRAWER (MATCHED TO USER DASHBOARD) ──── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={closeMobileMenu} />
      )}
      <div className={cn(
        "lg:hidden fixed top-0 right-0 h-full w-[80%] max-w-sm bg-[#1A2534] z-50 transition-transform duration-300 shadow-2xl flex flex-col justify-between",
        isMobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div>
          {/* Drawer Top Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <span className="text-white font-bold text-lg">Menu</span>
            <button onClick={closeMobileMenu} className="text-white/70 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Drawer Menu Links */}
          <nav className="p-6 space-y-2 overflow-y-auto h-[calc(100vh-220px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isRootActive = item.path !== "#" && pathname === item.path;
              const isChildActive = item.children?.some((c) => pathname?.startsWith(c.path));
              const isActive = isRootActive || isChildActive;
              const hasChildren = !!item.children?.length;
              const isExpanded = openDropdown === item.name;

              if (hasChildren) {
                return (
                  <div key={item.name} className="overflow-hidden">
                    <div className={cn("rounded-xl transition-colors", isActive ? "bg-white/10" : "")}>
                      <div className="flex items-center justify-between pr-2">
                        <button 
                          onClick={() => setOpenDropdown(isExpanded ? null : item.name)}
                          className="flex-1 flex items-center gap-3 px-4 py-3 text-white font-medium text-left focus:outline-none"
                        >
                          <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                          <span className={cn("text-sm font-medium", isActive ? "text-white font-bold" : "text-gray-300")}>{item.name}</span>
                        </button>
                        <button onClick={() => setOpenDropdown(isExpanded ? null : item.name)} className="p-3 text-gray-400 hover:text-white">
                          <ChevronDown size={18} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                        </button>
                      </div>
                      <div className={cn("overflow-hidden transition-all duration-300 ease-in-out pl-4 pr-2 space-y-1", isExpanded ? "max-h-96 pb-3 opacity-100" : "max-h-0 opacity-0")}>
                        {item.children?.map((child) => {
                          const isChildLinkActive = pathname === child.path;
                          return (
                            <Link 
                              key={child.name} 
                              href={child.path} 
                              onClick={closeMobileMenu} 
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                                isChildLinkActive ? "bg-[#E56668]/20 text-[#ffb3b4]" : "text-white/80 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <child.icon size={16} /> {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link 
                  key={item.path} 
                  href={item.path} 
                  onClick={closeMobileMenu} 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", 
                    isActive ? "bg-white text-[#1A2534]" : "text-white hover:bg-white/10"
                  )}
                >
                  <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Drawer Bottom Profile Section (Exactly mirrored from User Dashboard Layout) */}
        <div className="pt-4 mt-4 border-t border-white/10 p-6 bg-white/[0.01]">
          <div className="overflow-hidden">
            <div className={cn("rounded-xl", openDropdown === "profile" ? "bg-white/10" : "")}>
              <button 
                onClick={() => setOpenDropdown(openDropdown === "profile" ? null : "profile")} 
                className="w-full flex items-center justify-between pr-2 rounded-xl hover:bg-white/5 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 bg-[#2F4157] flex items-center justify-center text-white font-bold text-sm">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-white font-bold text-sm truncate">{profile.full_name?.split(" ").slice(0, 2).join(" ")}</p>
                    <div className="mt-0.5">{getTierBadge(userTier)}</div>
                  </div>
                </div>
                <ChevronDown size={18} className={cn("text-gray-400 transition-transform duration-300 mr-1", openDropdown === "profile" && "rotate-180")} />
              </button>
              
              <div className={cn("overflow-hidden transition-all duration-300 ease-in-out pl-4 pr-2 space-y-1", openDropdown === "profile" ? "max-h-96 pb-3 opacity-100" : "max-h-0 opacity-0")}>
                <Link href="/school/dashboard/profile" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                  <User size={16} className="text-gray-400" /> My Profile
                </Link>
                <Link href="/school/dashboard/settings" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                  <Settings size={16} className="text-gray-400" /> Settings
                </Link>
                <Link href="/school/dashboard/help" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                  <HelpCircle size={16} className="text-gray-400" /> Help Center
                </Link>
              </div>

              <button 
                onClick={handleSignOut} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors mt-1"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
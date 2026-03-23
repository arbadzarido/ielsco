"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { 
  ArrowLeft, 
  Info, 
  Calendar, 
  Target, 
  Rocket,
  FileText,
  Sparkles,
  Mic,
  GraduationCap,
  LogIn, 
  Menu, 
  X, 
  ChevronDown,
  UserCircle,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// DB values: "pro" = Insider, "visionary" = Visionary, null = Explorer
function getTierBadge(tier: string | null) {
  const map: Record<string, { label: string; color: string }> = {
    pro:       { label: "INSIDER",   color: "bg-blue-600"   },
    visionary: { label: "VISIONARY", color: "bg-purple-600" },
    explorer:  { label: "EXPLORER",  color: "bg-gray-500"   },
  };
  const t = map[tier ?? "explorer"] ?? map["explorer"];
  return (
    <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${t.color}`}>
      {t.label}
    </span>
  );
}

export default function GIFHeader() {
  const pathname = usePathname();
  const router   = useRouter();

  if (pathname?.startsWith("/dashboard") && pathname !== "/dashboard/gif") {
    return null;
  }

  // Auth state
  const [user,        setUser]        = useState<User | null>(null);
  const [userName,    setUserName]    = useState<string | null>(null);
  const [userAvatar,  setUserAvatar]  = useState<string | null>(null);
  const [userTier,    setUserTier]    = useState<string>("explorer");
  const [authLoading, setAuthLoading] = useState(true);

  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown,     setOpenDropdown]     = useState<string | null>(null);
  const [isProfileOpen,    setIsProfileOpen]    = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Auth listener
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); fetchProfile(supabase, user.id); }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(supabase, u.id);
      else { setUserName(null); setUserAvatar(null); setUserTier("explorer"); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(supabase: ReturnType<typeof createClient>, userId: string) {
    const { data: userData } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .single();

    const { data: membershipData } = await supabase
      .from("memberships")
      .select("tier")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userData) {
      setUserName(userData.full_name ?? null);
      setUserAvatar(userData.avatar_url ?? null);
    }
    setUserTier(membershipData?.tier ?? "explorer");
  }

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.push("/");
    router.refresh();
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu  = () => setIsMobileMenuOpen(false);

  const navItems = [
    { name: "About", path: "/events/gif",            icon: Info     },
    { name: "Agenda",    path: "/events/gif/itinerary",  icon: Calendar },
    {
      name: "Output", path: "#", icon: Target,
      children: [
        { name: "Project Realization", path: "/events/gif/project",  icon: Rocket   },
        { name: "Academic Research",   path: "/events/gif/research", icon: FileText },
      ],
    },
    {
      name: "Preparation", path: "#", icon: Sparkles,
      children: [
        { name: "Insight Talk",   path: "/events/gif/talk",      icon: Mic          },
        { name: "Prep Mentoring", path: "/events/gif/mentoring", icon: GraduationCap },
      ],
    },
  ];

  // Profile / Register button — shared between desktop & mobile
  const ProfileSection = ({ mobile = false }: { mobile?: boolean }) => {
    if (authLoading) {
      return (
        <div className={`${mobile ? "w-full" : ""} flex items-center gap-3`}>
          <div className="w-8 h-3 bg-white/20 rounded animate-pulse hidden lg:block" />
          <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
        </div>
      );
    }

    // NOT logged in → Register button
    if (!user) {
      if (mobile) {
        return (
          <div className="pt-4 mt-4 border-t border-white/10">
            <Link
              href="/dashboard/gif"
              onClick={closeMobileMenu}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-[#E56668] text-white font-bold hover:bg-[#C04C4E] transition-all shadow-lg"
            >
              <LogIn size={20} />
              Dashboard
            </Link>
          </div>
        );
      }
      return (
        <Link
          href="/dashboard/gif"
          className="ml-2 inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 bg-[#E56668] text-white font-semibold hover:bg-[#C04C4E] transition transform hover:scale-[1.02] shadow-lg shadow-red-900/20"
        >
          <LogIn size={18} />
          Dashboard
        </Link>
      );
    }

    // LOGGED IN → profile dropdown (desktop)
    if (!mobile) {
      return (
        <div className="relative ml-2" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 group focus:outline-none text-left"
          >
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-sm font-bold text-white leading-none">
                {userName?.split(" ")[0]}
              </span>
              <div className="mt-1 opacity-90 hover:opacity-100 transition-opacity">
                {getTierBadge(userTier)}
              </div>
            </div>
            <div className="relative">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-white/20 group-hover:border-[#E56668] transition-all object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border-2 border-white/20 group-hover:border-[#E56668] transition-all">
                  <UserCircle size={24} />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 bg-white rounded-full p-[3px] text-[#2F4157] transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`}>
                <ChevronDown size={10} strokeWidth={3} />
              </div>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 truncate">{userName}</p>
                <div className="mt-1">{getTierBadge(userTier)}</div>
              </div>
              <div className="p-2 space-y-1">
                <Link
                  href="/dashboard/gif"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors font-medium"
                >
                  <LayoutDashboard size={18} className="text-[#E56668]" />
                  Go to GIF Dashboard
                </Link>
              </div>
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // LOGGED IN → profile section (mobile)
    return (
      <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 bg-[#2F4157]">
            {userAvatar ? (
              <img src={userAvatar} alt={userName ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {userName?.charAt(0) ?? <UserCircle size={20} />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{userName}</p>
            <div className="mt-0.5">{getTierBadge(userTier)}</div>
          </div>
        </div>
        <Link
          href="/dashboard/gif"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          <LayoutDashboard size={18} className="text-[#E56668]" />
          Go to GIF Dashboard
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-[#2F4157] flex items-center justify-between py-6 lg:py-10 px-4 sm:px-8 lg:px-[100px] z-[100] shadow-md">
      {/* Logo */}
      <Link href="/" className="flex items-center font-geologica gap-3 lg:gap-[19px]" onClick={closeMobileMenu}>
        <Image src="/images/logos/iels_white.png" width={60} height={60} className="lg:w-[75px]" alt="IELS Logo White" />
        <Image src="/images/logos/events/gif.png" width={60} height={60} className="w-[120px] brightness-0 invert opacity-100" alt="GIF Logo" />
      </Link>

      {/* Desktop Nav */}
      <div className="hidden xl:flex items-center text-white gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          if ("children" in item && item.children) {
            const isOpen   = openDropdown === item.name;
            const isActive = item.children.some(child => pathname === child.path);
            return (
              <div key={item.name} className="relative group" onMouseLeave={() => setOpenDropdown(null)}>
                <div className={`flex items-center rounded-full transition-all cursor-pointer ${isActive ? "bg-white text-[#2F4157] font-medium" : "hover:bg-white/10 text-white/90 hover:text-white"}`}>
                  <div className="flex items-center gap-2 pl-5 py-2.5 pr-1">
                    <Icon size={18} />
                    {item.name}
                  </div>
                  <button type="button" onClick={(e) => { e.preventDefault(); setOpenDropdown(isOpen ? null : item.name); }} className="pr-4 py-2 flex items-center justify-center">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "group-hover:rotate-180"}`} />
                  </button>
                </div>
                <div className={`absolute left-0 mt-2 w-64 rounded-2xl bg-white text-[#2F4157] shadow-xl z-[60] transition-all duration-200 border border-gray-100 overflow-hidden ${isOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible"}`}>
                  <div className="py-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link key={child.path} href={child.path} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600 hover:text-[#E56668]" onClick={() => setOpenDropdown(null)}>
                          <ChildIcon size={18} className="text-gray-400" />
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-colors font-medium ${isActive ? "bg-white text-[#2F4157]" : "text-white/90 hover:text-white hover:bg-white/10"}`}>
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}

        {/* Profile / Register */}
        <ProfileSection />
      </div>

      {/* Mobile hamburger */}
      <button onClick={toggleMobileMenu} className="xl:hidden flex flex-col items-center justify-center w-10 h-10 text-white" aria-label="Toggle menu">
        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {isMobileMenuOpen && <div className="xl:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={closeMobileMenu} />}

      {/* Mobile Menu */}
      <div className={`xl:hidden fixed top-0 right-0 h-full w-[80%] max-w-sm bg-[#2F4157] z-50 transition-transform duration-300 shadow-2xl ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <span className="text-white font-geologica font-bold text-lg">Menu</span>
          <button onClick={closeMobileMenu} className="text-white/70 hover:text-white"><X size={24} /></button>
        </div>

        <nav className="p-6 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {navItems.map((item) => {
            const Icon = item.icon;

            if ("children" in item && item.children) {
              const isOpen   = openDropdown === item.name;
              const isActive = item.children.some(child => pathname === child.path);
              return (
                <div key={item.name} className="overflow-hidden">
                  <div className={`rounded-xl transition-colors ${isActive ? "bg-white/10" : ""}`}>
                    <div className="flex items-center justify-between pr-2">
                      <div className="flex-1 flex items-center gap-3 px-4 py-3 text-white font-medium">
                        <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                        {item.name}
                      </div>
                      <button onClick={() => setOpenDropdown(isOpen ? null : item.name)} className="p-3 text-white/70 hover:text-white">
                        <ChevronDown size={18} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    <div className={`space-y-1 pl-4 pr-2 overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-2" : "max-h-0"}`}>
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.path;
                        return (
                          <Link key={child.path} href={child.path} onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isChildActive ? "bg-[#E56668]/20 text-[#ffb3b4]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                            <ChildIcon size={16} />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${isActive ? "bg-white text-[#2F4157]" : "text-white hover:bg-white/10"}`}>
                <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                {item.name}
              </Link>
            );
          })}

          {/* Profile / Register (mobile) */}
          <ProfileSection mobile />
        </nav>
      </div>
    </div>
  );
}
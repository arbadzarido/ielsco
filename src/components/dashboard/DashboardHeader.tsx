"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCircle,
  LogOut,
  Settings,
  Menu,
  X,
  ChevronDown,
  Trophy,
  User,
  HelpCircle,
  CreditCard,
  BookOpen,
  Library,
  FileText,
  GraduationCap,
  Sparkles,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserTier = "explorer" | "insider" | "visionary";

export default function DashboardHeader({
  userAvatar,
  userName,
  userTier = "explorer",
}: {
  userAvatar?: string;
  userName?: string;
  userTier?: UserTier;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getTierBadge = (tier: UserTier) => {
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
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-500/20 text-gray-300 text-[10px] font-bold border border-gray-500/30 uppercase tracking-wide">
            EXPLORER
          </span>
        );
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Goals", path: "/dashboard/goals", icon: Trophy },
    {
      name: "Learning",
      path: "/dashboard/learning",
      icon: BookOpen,
      children: [
        { name: "My Test", path: "/dashboard/test", icon: FileText },
        { name: "My Courses", path: "/dashboard/learning/courses", icon: GraduationCap },
        { name: "My Schedule", path: "/dashboard/events", icon: CalendarDays },
        { name: "My Library", path: "/dashboard/learning/library", icon: Library },
      ],
    },
    { name: "Community", path: "/dashboard/community", icon: Users },
  ];

  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <>
      {/* ── DESKTOP HEADER ──────────────────────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-40 w-full bg-[#2F4157] shadow-lg border-b border-white/10">
        <div className="w-full px-6 sm:px-8 lg:px-[100px] py-6 lg:py-8">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-3 lg:gap-5 z-40">
              <Link href="/dashboard" className="flex items-center font-geologica gap-3 lg:gap-[15px]">
                <Image src="/images/logos/iels_white1.png" alt="IELS" width={50} height={50} className="lg:w-[50px]" />
                <div className="hidden lg:flex flex-col text-white">
                  <span className="font-bold text-lg leading-none tracking-tight">Dashboard</span>
                  <span className="text-[10px] text-white/60 tracking-wider uppercase mt-0.5">Learning Space</span>
                </div>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1 justify-center flex-1 px-4">
              {navItems.map((item) => {
                const isDashRoot = item.path === "/dashboard" && pathname === "/dashboard";
                const isStdActive = item.path !== "/dashboard" && pathname?.startsWith(item.path);
                const isChildActive = item.children?.some((c) => pathname?.startsWith(c.path));
                const isActive = isDashRoot || isStdActive || isChildActive;
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;

                return (
                  <div
                    key={item.name}
                    className="relative group px-1"
                    onMouseEnter={() => hasChildren && setActiveDropdown(item.name)}
                    onMouseLeave={() => hasChildren && setActiveDropdown(null)}
                  >
                    <Link
                      href={item.path}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-white text-[#2F4157] shadow-md font-bold"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <Icon size={18} className={cn(isActive ? "text-[#E56668]" : "text-gray-400 group-hover:text-white")} />
                      {item.name}
                      {hasChildren && <ChevronDown size={14} className="mt-0.5 opacity-70" />}
                    </Link>

                    {hasChildren && (
                      <div
                        className={cn(
                          "absolute left-1/2 -translate-x-1/2 pt-4 w-56 z-40 transition-all duration-200 origin-top",
                          activeDropdown === item.name
                            ? "opacity-100 translate-y-0 visible"
                            : "opacity-0 -translate-y-2 invisible"
                        )}
                      >
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden p-1.5">
                          {item.children?.map((child) => {
                            const isChildLinkActive = pathname?.startsWith(child.path);
                            return (
                              <Link
                                key={child.name}
                                href={child.path}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors group/child",
                                  isChildLinkActive
                                    ? "bg-gray-50 text-[#2F4157] font-bold"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-[#2F4157]"
                                )}
                              >
                                <child.icon size={16} className={cn(isChildLinkActive ? "text-[#E56668]" : "text-gray-400 group-hover/child:text-[#E56668]")} />
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Right: Notif + Profile */}
            <div className="flex items-center gap-4 lg:gap-6 z-40">
             
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 group focus:outline-none text-left"
                >
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-sm font-bold text-white leading-none">{userName?.split(" ")[0]}</span>
                    <div className="mt-1 opacity-90 hover:opacity-100 transition-opacity">
                      {getTierBadge(userTier)}
                    </div>
                  </div>
                  <div className="relative">
                    {userAvatar ? (
                      <Image src={userAvatar} alt="Profile" width={40} height={40} className="rounded-full border-2 border-white/20 group-hover:border-[#E56668] transition-all object-cover" />
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
                  <div className="absolute right-0 mt-4 w-72 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 origin-top-right z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 space-y-1">
                      <Link href="/dashboard/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                        <User size={18} className="text-gray-400" /> My Profile
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                        <Settings size={18} className="text-gray-400" /> Settings
                      </Link>
                    
                      <div className="h-px bg-gray-100 my-1 mx-3" />
                      <Link href="/dashboard/help" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                        <HelpCircle size={18} className="text-gray-400" /> Help Center
                      </Link>
                    </div>
                    <div className="p-2 border-t border-gray-100 mt-1">
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold transition-colors">
                        <LogOut size={18} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE APP BAR ──────────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-[#2F4157] shadow-lg">
        <div className="flex items-center justify-between px-5 py-4">

          {/* Left: Avatar + Greeting */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="Profile" className="w-11 h-11 rounded-full object-cover border-2 border-white/25" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                  <UserCircle size={24} className="text-white" />
                </div>
              )}
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#2F4157]" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium leading-none">{getGreeting()},</p>
              <p className="text-white font-bold text-base leading-tight mt-0.5">
                {userName?.split(" ")[0] ?? "Learner"} 👋
              </p>
            </div>
          </div>

          {/* Right: Tier badge + Bell + Hamburger */}
          <div className="flex items-center gap-2">
            {getTierBadge(userTier)}
            <button className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E56668] rounded-full" />
            </button>
            <button
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-IN MENU ─────────────────────────────────────────── */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={closeMobileMenu} />
      )}
      <div className={`md:hidden fixed top-0 right-0 h-full w-[80%] max-w-sm bg-[#2F4157] z-50 transition-transform duration-300 shadow-2xl ${isMobileOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <span className="text-white font-geologica font-bold text-lg">Menu</span>
          <button onClick={closeMobileMenu} className="text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="p-6 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isDashRoot = item.path === "/dashboard" && pathname === "/dashboard";
            const isStdActive = item.path !== "/dashboard" && pathname?.startsWith(item.path);
            const isChildActive = item.children?.some((c) => pathname?.startsWith(c.path));
            const isActive = isDashRoot || isStdActive || isChildActive;
            const hasChildren = !!item.children?.length;
            const isExpanded = openDropdown === item.name;

            if (hasChildren) {
              return (
                <div key={item.name} className="overflow-hidden">
                  <div className={`rounded-xl transition-colors ${isActive ? "bg-white/10" : ""}`}>
                    <div className="flex items-center justify-between pr-2">
                      <Link href={item.path} onClick={closeMobileMenu} className="flex-1 flex items-center gap-3 px-4 py-3 text-white font-medium">
                        <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                        <span className={cn("text-sm font-medium", isActive ? "text-white font-bold" : "text-gray-300")}>{item.name}</span>
                      </Link>
                      <button onClick={() => setOpenDropdown(isExpanded ? null : item.name)} className="p-3 text-gray-400 hover:text-white">
                        <ChevronDown size={18} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                      </button>
                    </div>
                    <div className={cn("overflow-hidden transition-all duration-300 ease-in-out pl-4 pr-2 space-y-1", isExpanded ? "max-h-96 pb-3 opacity-100" : "max-h-0 opacity-0")}>
                      {item.children?.map((child) => {
                        const isChildLinkActive = pathname?.startsWith(child.path);
                        return (
                          <Link key={child.name} href={child.path} onClick={closeMobileMenu} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isChildLinkActive ? "bg-[#E56668]/20 text-[#ffb3b4]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
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
              <Link key={item.path} href={item.path} onClick={closeMobileMenu} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", isActive ? "bg-white text-[#2F4157]" : "text-white hover:bg-white/10")}>
                <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                {item.name}
              </Link>
            );
          })}

          {/* Profile section */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <div className="overflow-hidden">
              <div className={`rounded-xl ${openDropdown === "profile" ? "bg-white/10" : ""}`}>
                <button onClick={() => setOpenDropdown(openDropdown === "profile" ? null : "profile")} className="w-full flex items-center justify-between pr-2 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 bg-[#2F4157]">
                      {userAvatar ? (
                        <img src={userAvatar} alt={userName ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                          {userName?.charAt(0) ?? <UserCircle size={20} />}
                        </div>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-white font-bold text-sm">{userName?.split(" ").slice(0, 2).join(" ")}</p>
                      <div className="mt-0.5">{getTierBadge(userTier)}</div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={cn("text-gray-400 transition-transform duration-300 mr-1", openDropdown === "profile" && "rotate-180")} />
                </button>
                <div className={cn("overflow-hidden transition-all duration-300 ease-in-out pl-4 pr-2 space-y-1", openDropdown === "profile" ? "max-h-96 pb-3 opacity-100" : "max-h-0 opacity-0")}>
                  <Link href="/dashboard/profile" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"><User size={16} /> My Profile</Link>
                  <Link href="/dashboard/settings" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"><Settings size={16} /> Settings</Link>
                  <Link href="/dashboard/help" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"><HelpCircle size={16} /> Help Center</Link>
                </div>
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors mt-1">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
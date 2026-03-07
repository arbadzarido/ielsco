"use client";

import Link from "next/link";
import Image from "next/image";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users,
  ShoppingCart,
  Bell, 
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
  Store,
  FileText,
  GraduationCap,
  Sparkles // Icon baru untuk Visionary Tier
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tambahkan prop userTier di sini
export default function DashboardHeader({ 
  userAvatar, 
  userName,
  userTier = "explorer" // Default tier
}: { 
  userAvatar?: string, 
  userName?: string,
  userTier?: "explorer" | "insider" | "visionary"
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);

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

  // --- LOGIC BADGE TIER (NEW) ---
  const getTierBadge = (tier: string) => {
    switch(tier) {
      case "visionary":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-bold border border-purple-500/30 uppercase tracking-wide">
            <Sparkles size={10} className="text-purple-300" /> VISIONARY
          </span>
        );
      case "insider":
        return (
          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-bold border border-blue-500/30 uppercase tracking-wide">
            INSIDER
          </span>
        );
      default: // explorer
        return (
          <span className="inline-block px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 text-[10px] font-bold border border-gray-500/30 uppercase tracking-wide">
            Explorer
          </span>
        );
    }
  };

  // === STRUKTUR MENU UTAMA (Desktop) ===
  const navItems = [
    { 
      name: "Dashboard", 
      path: "/dashboard", 
      icon: LayoutDashboard 
    },
    { 
      name: "My Goals", 
      path: "/dashboard/goals", 
      icon: Trophy 
    },
    { 
      name: "My Learning", 
      path: "/dashboard/learning",
      icon: BookOpen,
      children: [
        { name: "My Test", path: "/dashboard/test", icon: FileText },
        { name: "My Courses", path: "/dashboard/courses", icon: GraduationCap },
        { name: "My Schedule", path: "/dashboard/events", icon: CalendarDays },
        { name: "My Library", path: "/dashboard/library", icon: Library },
      ]
    },
    { 
      name: "Community", 
      path: "/dashboard/community", 
      icon: Users 
    },
  ];

return (
  <header className="sticky top-0 z-40 w-full bg-[#2F4157] shadow-lg border-b border-white/10 transition-all duration-300">
    <div className="w-full px-6 sm:px-8 lg:px-[100px] py-6 lg:py-8">
      <div className="flex items-center justify-between">
        
        {/* 1. LOGO (LEFT) */}
        <div className="flex-shrink-0 flex items-center gap-3 lg:gap-5 z-40">
           <Link href="/dashboard" className="flex items-center font-geologica gap-3 lg:gap-[15px]">
              <Image 
                src="/images/logos/iels_white.png" 
                alt="IELS" 
                width={50} 
                height={50} 
                className="lg:w-[50px]" 
              />
              <div className="hidden lg:flex flex-col text-white">
                <span className="font-bold text-lg leading-none tracking-tight">
                  Dashboard
                </span>
                <span className="text-[10px] text-white/60 tracking-wider uppercase mt-0.5">
                  Learning Space
                </span>
              </div>
           </Link>
        </div>

 {/* 2. NAVIGATION (CENTER - DESKTOP ONLY) */}
        <nav className="hidden md:flex items-center gap-1 justify-center flex-1 px-4">
          {navItems.map((item) => {
            
            // Logic Active State
            const isDashboardRoot = item.path === "/dashboard" && pathname === "/dashboard";
            const isStandardActive = item.path !== "/dashboard" && pathname?.startsWith(item.path);
            const isChildActive = item.children?.some(child => pathname?.startsWith(child.path));
            
            // SPECIAL CASE FOR GIF:
            // Jika pathname diawali /dashboard/gif, maka menu "My Learning" dianggap aktif.
            const isGifActive = item.name === "My Learning" && pathname?.startsWith("/dashboard/gif");

            const isActive = isDashboardRoot || isStandardActive || isChildActive || isGifActive;
            
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;

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

                {/* DROPDOWN MENU */}
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
                        // Optional: Jika mau GIF men-highlight salah satu child (misal My Schedule)
                        // const isChildLinkActive = pathname?.startsWith(child.path) || (child.name === "My Schedule" && pathname?.startsWith("/dashboard/gif"));
                        const isChildLinkActive = pathname?.startsWith(child.path);

                        return (
                          <Link
                            key={child.name}
                            href={child.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors group/child",
                                isChildLinkActive ? "bg-gray-50 text-[#2F4157] font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-[#2F4157]"
                            )}
                          >
                            <child.icon size={16} className={cn(isChildLinkActive ? "text-[#E56668]" : "text-gray-400 group-hover/child:text-[#E56668]")} />
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 3. RIGHT ACTIONS */}
        <div className="flex items-center gap-4 lg:gap-6 z-40">
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            {/* MARKETPLACE */}
            <Link href="/dashboard/shop" className="hidden sm:block">
              <button className="relative p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all group" title="Marketplace">
                <Store size={22} className="group-hover:text-[#E56668] transition-colors" />
              </button>
            </Link>

            {/* CART */}
            <Link href="/dashboard/cart">
              <button className="relative p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all group">
                <ShoppingCart size={22} className="group-hover:scale-105 transition-transform" />
              </button>
            </Link>

            {/* NOTIF */}
<NotificationDropdown />
          </div>

          {/* PROFILE DROPDOWN */}
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

            {/* PROFILE MENU */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-4 w-72 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 transform transition-all origin-top-right z-540 animate-in fade-in zoom-in-95 duration-100">
            
                <div className="p-2 space-y-1">
                  <Link href="/dashboard/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                    <User size={18} className="text-gray-400" />
                    My Profile
                  </Link>
                  <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                    <Settings size={18} className="text-gray-400" />
                    Settings
                  </Link>
                  <Link href="/dashboard/shop/orders" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                    <CreditCard size={18} className="text-gray-400" />
                    My Orders
                  </Link>
                  <div className="h-px bg-gray-100 my-1 mx-3" />
                  <Link href="/dashboard/help" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#2F4157] rounded-xl transition-colors">
                    <HelpCircle size={18} className="text-gray-400" />
                    Help Center
                  </Link>
                </div>
                
                <div className="p-2 border-t border-gray-100 mt-1">
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold transition-colors">
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-white" onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </div>

    {/* MOBILE NAV DROPDOWN */}
    {isMobileOpen && (
      <div className="md:hidden bg-[#263546] border-t border-white/10 p-4 shadow-inner absolute w-full left-0 z-40 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-top-2">
        <div className="space-y-2">
          {/* Mobile User Info */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 mb-2">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white/20 bg-[#2F4157] flex-shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white font-bold text-lg">
                  {userName?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">{userName}</p>
              <div className="mt-1 transform scale-90 origin-left">
                {getTierBadge(userTier)}
              </div>
            </div>
          </div>

          <Link href="/dashboard/shop" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
            <Store size={20} className="text-[#E56668]" />
            Marketplace (Shop)
          </Link>

          {navItems.map((item) => {
            const isActive = item.path === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.path);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = mobileDropdown === item.name;

            return (
              <div key={item.name} className="overflow-hidden">
                {hasChildren ? (
                  <div className={cn("rounded-xl transition-all", isActive ? "bg-white/5" : "")}>
                    <div className="flex items-center justify-between">
                      <Link 
                        href={item.path} 
                        onClick={() => setIsMobileOpen(false)}
                        className="flex-1 flex items-center gap-3 px-4 py-3"
                      >
                        <item.icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-400"} />
                        <span className={cn("text-sm font-medium", isActive ? "text-white font-bold" : "text-gray-300")}>
                          {item.name}
                        </span>
                      </Link>

                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setMobileDropdown(isExpanded ? null : item.name);
                        }}
                        className="p-3 text-gray-400 hover:text-white transition-transform"
                      >
                        <ChevronDown size={18} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                      </button>
                    </div>

                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out pl-11 space-y-1", 
                      isExpanded ? "max-h-96 pb-3 opacity-100" : "max-h-0 opacity-0"
                    )}>
                      {item.children?.map((child) => (
                        <Link key={child.name} href={child.path} onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link href={item.path} onClick={() => setIsMobileOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", isActive ? "bg-[#CB2129] text-white shadow-lg shadow-red-900/20" : "text-gray-300 hover:bg-white/5")}>
                     <item.icon size={20} />
                     {item.name}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </header>
);
}
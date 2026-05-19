"use client";

// =============================================================================
// components/schools/layout/Sidebar.tsx
// Desktop sidebar — subdomain aware with white rounded-full menu highlights
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BarChart3,
  FileText,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface SidebarProps {
  profile: UserProfile;
}

// Semua base URL diset mulai dari /dashboard
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Classes",  href: "/dashboard/class",    icon: GraduationCap },
      { label: "Students", href: "/dashboard/students", icon: Users         },
      { label: "Mentor",   href: "/dashboard/mentor",   icon: BookOpen      },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Insights", href: "/dashboard/insights", icon: BarChart3 },
      { label: "Reports",  href: "/dashboard/reports",  icon: FileText  },
    ],
  },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  // Deteksi environment: Localhost vs Production (Subdomain)
  const isLocal = pathname.startsWith("/school");
  const prefix = isLocal ? "/school" : "";
  
  // Normalise path buat ngecek menu mana yang active
  const normalizedPath = isLocal ? pathname.replace("/school", "") : pathname;

  return (
    <aside className="hidden lg:flex w-[260px] flex-shrink-0 bg-[#1A2534] flex-col h-screen sticky top-0 z-30">
      {/* Brand - Updated to match IELS Dashboard Logo style */}
      <div className="pl-8 pr-6 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <img 
            src="https://ielsco.com/images/logos/iels_white.png" 
            alt="IELS Logo" 
            className="h-7 w-auto"
          />
          <div className="flex flex-col justify-center mt-2">
            <p className="text-white font-bold text-[16px] leading-none tracking-tight">
              Dashboard
            </p>
            <p className="text-white/50 text-[9px] font-bold uppercase tracking-[0.15em] mt-1">
              School Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-5 py-4 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.18em] px-2 mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                // Generate href dinamis tergantung localhost/production
                const finalHref = `${prefix}${href}`;

                // Cek active state
                const active =
                  normalizedPath === href ||
                  (href !== "/dashboard" && normalizedPath.startsWith(href));

                return (
                  <li key={href}>
                    <Link
                      href={finalHref}
                      className={`group flex items-center gap-4 px-5 py-2.5 transition-all duration-150 text-[13px] ${
                        active
                          ? "bg-white text-[#1A2534] font-bold rounded-full shadow-md"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.05] font-medium rounded-lg"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={
                          active
                            ? "text-[#E56668]"
                            : "text-white/40 group-hover:text-white/60"
                        }
                      />
                      {label}
                      {active && (
                        <ChevronRight size={12} className="ml-auto text-[#1A2534]/30" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
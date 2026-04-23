"use client";

// =============================================================================
// components/schools/layout/Sidebar.tsx
// Desktop sidebar — subdomain aware
//
// Href pakai /dashboard (tanpa /school) supaya bekerja di subdomain.
// Active detection pakai normalizedPath yang strip /school prefix.
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";

interface SidebarProps {
  profile: UserProfile;
}

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
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Insights", href: "/insights", icon: BarChart3 },
      { label: "Reports",  href: "/reports",  icon: FileText  },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  // Normalise path: strip /school prefix supaya active check bekerja
  // di kedua kondisi (ielsco.com/school/dashboard & school.ielsco.com/dashboard)
  const normalizedPath = pathname.startsWith("/school")
    ? pathname.replace("/school", "")
    : pathname;

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    // Desktop only — hidden on mobile (bottom nav handles mobile)
    <aside className="hidden lg:flex w-[220px] flex-shrink-0 bg-[#1A2534] flex-col h-screen sticky top-0 z-30">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E56668] flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white font-black text-[13px]">I</span>
          </div>
          <div>
            <p className="text-white font-black text-[15px] leading-none tracking-tight">IELS</p>
            <p className="text-white/35 text-[9px] font-semibold uppercase tracking-[0.15em] mt-0.5">
              School Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.18em] px-2 mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active =
                  normalizedPath === href ||
                  (href !== "/dashboard" && normalizedPath.startsWith(href));

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? "bg-white/[0.10] text-white"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
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
                        <ChevronRight size={12} className="ml-auto text-white/30" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E56668]/20 border border-[#E56668]/30 flex items-center justify-center text-[#E56668] text-[11px] font-black flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-[12px] font-semibold truncate leading-none">
              {profile.full_name}
            </p>
            <p className="text-white/35 text-[10px] uppercase tracking-widest mt-0.5">
              {profile.role.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
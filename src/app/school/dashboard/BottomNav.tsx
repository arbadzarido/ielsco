"use client";

// =============================================================================
// components/schools/layout/BottomNav.tsx
// Mobile-only bottom tab bar — IELS Premium Style (Fixed Box, Rounded & Colors)
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

const TABS = [
  { label: "Dashboard", href: "/school/dashboard", icon: LayoutDashboard },
  { label: "Classes",   href: "/school/dashboard/class",    icon: GraduationCap },
  { label: "Students",  href: "/school/dashboard/students", icon: Users          },
  { label: "Insights",  href: "/school/insights",           icon: BarChart3      },
  { label: "Settings",  href: "/school/settings",           icon: Settings       },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    // Mobile only — hidden on desktop (lg+).
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex flex-row w-full items-center justify-between px-2 py-2">
        {TABS.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/school/dashboard" && pathname?.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              // flex-1 agar bagi rata layarnya
              className="flex-1 px-1 group"
            >
              {/* Box ini sekarang membungkus IKON dan TEKS sekaligus */}
              <div
                className={`flex flex-col items-center justify-center w-full py-2.5 rounded-2xl transition-all duration-300 ${
                  active
                    ? "bg-[#E56668] shadow-md" // Background merah kontras
                    : "bg-transparent group-hover:bg-gray-50"
                }`}
              >
                <Icon
                  size={20}
                  // Ikon jadi putih saat aktif
                  className={`transition-colors duration-300 ${
                    active ? "text-white" : "text-gray-400"
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                
                <span
                  // Teks ikut masuk ke dalam box dan jadi putih saat aktif
                  className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 mt-1 ${
                    active ? "text-white" : "text-gray-400"
                  }`}
                  style={{ fontFamily: "Geologica, sans-serif" }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
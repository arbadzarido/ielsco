"use client";

// =============================================================================
// components/schools/layout/BottomNav.tsx
// Mobile-only bottom tab bar — subdomain aware
//
// Saat diakses via school.ielsco.com, middleware merewrite path secara internal:
//   /dashboard         -> app/school/dashboard
//   /dashboard/class   -> app/school/dashboard/class
//   dst.
//
// Jadi href di sini cukup /dashboard (TANPA /school prefix).
// Active state detection pakai normalizedPath yang strip /school prefix
// supaya tetap bekerja di kedua kondisi (main domain & subdomain).
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
  { label: "Dashboard", href: "/dashboard",          icon: LayoutDashboard },
  { label: "Classes",   href: "/dashboard/class",    icon: GraduationCap   },
  { label: "Students",  href: "/dashboard/students", icon: Users           },
  { label: "Insights",  href: "/insights",           icon: BarChart3       },
  { label: "Settings",  href: "/settings",           icon: Settings        },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Normalise: strip /school prefix kalau ada (main domain case),
  // supaya active check konsisten antara main domain dan subdomain.
  const normalizedPath = pathname.startsWith("/school")
    ? pathname.replace("/school", "")
    : pathname;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex flex-row w-full items-center justify-between px-2 py-2">
        {TABS.map(({ label, href, icon: Icon }) => {
          const active =
            normalizedPath === href ||
            (href !== "/dashboard" && normalizedPath.startsWith(href));

          return (
            <Link key={href} href={href} className="flex-1 px-1 group">
              <div
                className={`flex flex-col items-center justify-center w-full py-2.5 rounded-2xl transition-all duration-300 ${
                  active
                    ? "bg-[#E56668] shadow-md"
                    : "bg-transparent group-hover:bg-gray-50"
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-colors duration-300 ${
                    active ? "text-white" : "text-gray-400"
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
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
"use client";

import { ReactNode } from "react";
import DashboardHeader from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { MobileTabBar } from "./MobileTabBar";
import { SectionTabs } from "./SectionTabs";
import { ElcoCopilot } from "@/components/elco/ElcoCopilot";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface DashboardLayoutProps {
  children: ReactNode;
  // Kept so legacy dashboard pages still compile. Tiers are no longer shown in the core dashboard.
  userTier?: "explorer" | "insider" | "visionary";
  userName?: string;
  userAvatar?: string | null;
}

export default function DashboardLayout({ children, userName = "Learner", userAvatar }: DashboardLayoutProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-[#F5F7FA] bg-[radial-gradient(1100px_520px_at_0%_0%,#E6EEF4_0%,transparent_60%),radial-gradient(900px_480px_at_100%_0%,#FBEFEF_0%,transparent_55%)] font-sans text-[#2F4157]">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-[#2F4157]"
      >
        {t("common.skipToContent")}
      </a>
      <DashboardSidebar userName={userName} userAvatar={userAvatar} />
      <div className="flex min-h-screen flex-col lg:pl-[336px]">
        <DashboardHeader userName={userName} userAvatar={userAvatar} />
        <div id="dashboard-main" className="relative z-0 w-full flex-1 pb-[calc(104px+env(safe-area-inset-bottom))] lg:pb-0">
          <SectionTabs />
          {children}
        </div>
        <footer className="hidden border-t border-[#E3E7ED]/60 py-6 text-center text-sm text-[#2F4157]/50 lg:block">
          © {new Date().getFullYear()} IELS. All rights reserved.
        </footer>
      </div>
      <MobileTabBar />
      <ElcoCopilot />
    </div>
  );
}

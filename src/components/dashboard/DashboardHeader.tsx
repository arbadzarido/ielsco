"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";
import { glass, focusRing } from "./ui";
import { cn } from "@/lib/utils";

// Top bar for phones and tablets (< lg): brand and the account menu (profile, settings, help, sign-out).
// Navigation lives in the floating MobileTabBar at the bottom ("More" opens the full menu).
export default function DashboardHeader({ userName = "Learner", userAvatar }: { userName?: string; userAvatar?: string | null }) {
  return (
    <header className={cn(glass, "sticky top-0 z-40 w-full rounded-none border-x-0 border-t-0 lg:hidden")} style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/dashboard" data-testid="header-logo-link" className={cn("flex items-center gap-2.5 rounded-lg px-1", focusRing)}>
          <Image src="/images/logos/iels_blue1.png" alt="" width={32} height={32} />
          <span className="text-[18px] font-bold text-[#2F4157]">IELSco</span>
          <span className="sr-only">dashboard home</span>
        </Link>
        <AccountMenu userName={userName} userAvatar={userAvatar} />
      </div>
    </header>
  );
}

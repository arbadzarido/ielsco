"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { ApplyFlow } from "@/components/careers/apply/ApplyFlow";
import { RECRUITMENT } from "@/data/careers/recruitment";

// /dashboard/careers/apply: the Open Recruitment 2027 application (signed in). Reached from /careers, the dashboard
// recruitment card and division pages. Deliberately without the dashboard sidebar, header and tab bar: one task, one
// column, a clear way out.
export default function CareersApplyPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-[#1A2534] [&_:is(h1,h2,h3)]:[font-family:var(--font-heading)]" data-testid="careers-apply-page">
      <header className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[64px] max-w-[880px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/careers" className="flex min-w-0 items-center gap-3" data-testid="apply-brand">
            <Image src="/images/logos/iels_blue1.png" alt="IELSco" width={30} height={30} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight text-[#1A2534]">Open Recruitment {RECRUITMENT.cohort}</span>
              <span className="block truncate text-[12px] text-[#2F4157]/60">IELSco &amp; Elco AI · closes {RECRUITMENT.closesLabel}</span>
            </span>
          </Link>
          <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-semibold text-[#2F4157] hover:bg-[#F1F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90]" data-testid="apply-exit">
            <X size={16} aria-hidden="true" /><span className="hidden sm:inline">Save and exit</span><span className="sm:hidden">Exit</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-4 pb-[calc(env(safe-area-inset-bottom)+48px)] pt-6 sm:px-6 sm:pt-10">
        <ApplyFlow />
      </main>
    </div>
  );
}

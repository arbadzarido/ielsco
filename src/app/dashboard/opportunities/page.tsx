"use client";

import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, cardGloss } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Product reset: this page used to show sample listings (MOCK_OPPORTUNITIES) with past deadlines behind a tier
// lock. Until there is a maintained, real source of opportunities, it says so honestly and points to what works.
export default function OpportunitiesPage() {
  return (
    <DashboardPage>
      {() => (
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14" data-testid="opportunities-page">
          <PageHeader title="Opportunities" description="Scholarships, internships and programmes matched to your goals." />
          <section className={cn(cardGloss, "p-6 md:p-8")}>
            <Briefcase size={28} className="mb-4 text-[#577E90]" aria-hidden="true" />
            <h2 className="mb-2 text-xl font-bold">We&apos;re rebuilding this list</h2>
            <p className="mb-6 text-lg text-[#2F4157]/70">
              We only want to show opportunities that are open and checked. Until then, set your goals so we can match
              you when listings return, and use Explore for guides on applications and interviews.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard/my-goals" className={btnPrimary}>Set my goals <ArrowRight size={16} /></Link>
              <Link href="/dashboard/explore" className={btnSecondary}>Go to Explore</Link>
            </div>
          </section>
        </div>
      )}
    </DashboardPage>
  );
}

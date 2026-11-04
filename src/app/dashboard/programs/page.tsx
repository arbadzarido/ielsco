"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageStates";
import { btnLink } from "@/components/dashboard/ui";
import { ProgramCard } from "@/components/dashboard/programs/ProgramCard";
import { CourseTrackList } from "@/components/dashboard/programs/CourseTrackList";
import { MentorDirectory } from "@/components/dashboard/programs/MentorDirectory";
import { PROGRAMS } from "@/data/dashboard/programs";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ArrowUpRight } from "lucide-react";
import { btnPrimary as primaryBtn, btnSecondary } from "@/components/dashboard/ui";
import { elcoHref } from "@/lib/elco";
import { TUTOR_PRICE_LABEL, tutorRequestUrl } from "@/components/tutoring/links";

export default function ProgramsPage() {
  const { t } = useI18n();
  return (
    <DashboardPage>
      {() => (
        <div className="mx-auto max-w-[110rem] space-y-16 px-4 py-10 md:px-6 md:py-14 lg:px-12">
          <PageHeader title={t("pages.programsTitle")} description={t("pages.programsBody")}>
            <Link href="/dashboard/search" className={btnLink}>Search everything</Link>
          </PageHeader>
          <section aria-labelledby="learn-heading" data-testid="learn-two-ways" className="grid gap-6 md:grid-cols-2">
            <h2 id="learn-heading" className="sr-only">Two ways to learn English</h2>
            <div className="rounded-3xl bg-white p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">AI learning and test prep</p>
              <h3 className="mt-2 text-2xl font-bold">Elco AI</h3>
              <p className="mt-2 text-base text-[#2F4157]/75">The primary place to learn and practise English: courses, learning tools and test preparation. Live test prep: TOEFL ITP, IELTS and TOEIC (Learn, Practice, Tryout and Progress). SAT English is coming soon.</p>
              <a href={elcoHref("dashboard-programs")} target="_blank" rel="noopener noreferrer" className={`${primaryBtn} mt-5`}>Access Elco AI <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <div className="rounded-3xl bg-white p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">Human tutoring</p>
              <h3 className="mt-2 text-2xl font-bold">Private tutor, {TUTOR_PRICE_LABEL}</h3>
              <p className="mt-2 text-base text-[#2F4157]/75">One-to-one sessions with an IELSco tutor, requested per session. No course subscription. It adds a person to your Elco AI practice.</p>
              <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} mt-5`}>Request a private tutor <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </section>
          <CourseTrackList />
          <MentorDirectory />
          <section aria-labelledby="other-programs-heading">
            <h2 id="other-programs-heading" className="text-2xl font-bold md:text-3xl">More from IELS</h2>
            <div className="mt-2">
              {PROGRAMS.filter((p) => !["iels-course", "elco-ai"].includes(p.id)).map((p) => <ProgramCard key={p.id} program={p} />)}
            </div>
          </section>
        </div>
      )}
    </DashboardPage>
  );
}

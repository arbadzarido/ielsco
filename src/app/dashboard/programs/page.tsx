"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PageHeader } from "@/components/dashboard/PageStates";
import { ProgramCard } from "@/components/dashboard/programs/ProgramCard";
import { CourseTrackList } from "@/components/dashboard/programs/CourseTrackList";
import { MentorDirectory } from "@/components/dashboard/programs/MentorDirectory";
import { PROGRAMS } from "@/data/dashboard/programs";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ElcoCallout } from "@/components/elco/ElcoCallout";

export default function ProgramsPage() {
  const { t } = useI18n();
  return (
    <DashboardPage>
      {() => (
        <div className="mx-auto max-w-[110rem] space-y-16 px-4 py-10 md:px-6 md:py-14 lg:px-12">
          <PageHeader title={t("pages.programsTitle")} description={t("pages.programsBody")} />
          <CourseTrackList />
          <MentorDirectory />
          <section aria-labelledby="other-programs-heading">
            <h2 id="other-programs-heading" className="text-2xl font-bold md:text-3xl">More from IELS</h2>
            <div className="mt-2">
              {PROGRAMS.filter((p) => p.id !== "iels-course").map((p) => <ProgramCard key={p.id} program={p} />)}
            </div>
            <ElcoCallout className="mt-6" refId="programs" title="Elco AI: practise every day" body="Guided Learning and Free Practice with feedback, at ai.ielsco.com. Separate from IELS programs and free to start." />
          </section>
        </div>
      )}
    </DashboardPage>
  );
}

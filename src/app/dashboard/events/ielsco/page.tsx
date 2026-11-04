"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { OfficialEventsView } from "@/components/events/OfficialEventsView";
import { CircleLink, TalksSection } from "@/components/events/IelscoEventsSections";

// IELSco Events: every official one-time IELSco event (workshops, bootcamps, info sessions, conferences) with one-click
// registration, plus IELSco Talks, which belong here rather than in the menu. IELS Circle, the ongoing speaking
// community, has its own menu item and page (/dashboard/circle); this page only points to it.
export default function IelscoEventsPage() {
  return (
    <DashboardPage>
      {({ user, supabase }) => (
        <OfficialEventsView user={user} supabase={supabase} title="IELSco Events"
          description="Official one-time events IELSco organises: workshops, IELSco Talks, info sessions, conferences and community activities. Register in one click; your account details are shared with the organisers.">
          <TalksSection />
          <CircleLink />
          <ElcoPractice context="workshop" refId="events-ielsco" />
        </OfficialEventsView>
      )}
    </DashboardPage>
  );
}

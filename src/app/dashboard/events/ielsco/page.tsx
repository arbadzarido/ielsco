"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { OfficialEventsView } from "@/components/events/OfficialEventsView";

export default function IelscoEventsPage() {
  return (
    <DashboardPage>
      {({ user, supabase }) => (
        <OfficialEventsView user={user} supabase={supabase} title="IELSco Events"
          description="Workshops, bootcamps, programs and info sessions run by IELSco and its partners. Register in one click; your account details are shared with the organisers.">
          <ElcoPractice context="workshop" refId="events-ielsco" />
        </OfficialEventsView>
      )}
    </DashboardPage>
  );
}

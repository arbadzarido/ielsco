"use client";

import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnSecondary } from "@/components/dashboard/ui";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { OfficialEventsView } from "@/components/events/OfficialEventsView";

// IELSco Talks: the talk-format official events (lib/events/catalog.ts), plus the replay archive. No replay has been
// published yet, so the archive says so instead of listing anything.
export default function TalksPage() {
  return (
    <DashboardPage>
      {({ user, supabase }) => (
        <OfficialEventsView user={user} supabase={supabase} format="talk" title="IELSco Talks"
          description="Real Stories. Global Perspectives. New Possibilities. Speakers, alumni and partners on studying, working and growing across borders.">
          <section aria-labelledby="replays-heading" className="space-y-3" data-testid="talks-replays">
            <h2 id="replays-heading" className="text-[22px] font-bold">Replays and clips</h2>
            <EmptyState title="No replays published yet" body="Recorded talks and short clips will appear here once speakers have agreed to publish them."
              action={<Link href="/circle/stories/submit" className={btnSecondary}>Share your own story</Link>} />
          </section>
          <ElcoPractice context="talk" refId="events-talks" />
        </OfficialEventsView>
      )}
    </DashboardPage>
  );
}

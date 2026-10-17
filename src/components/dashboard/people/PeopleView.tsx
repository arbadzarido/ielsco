"use client";

import { useMemo, useState } from "react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from "../PageStates";
import { MemberCard } from "../MemberCard";
import { VisibilityCard } from "./VisibilityCard";
import { PeopleFilters } from "./PeopleFilters";
import { EMPTY_QUERY, useDirectory } from "./useDirectory";
import { btnPrimary, btnSecondary } from "../ui";
import { DEMO_MEMBERS } from "@/data/dashboard/demo-members";
import { SHOW_DEMO_DATA } from "@/data/dashboard/config";
import { similarity, sortBySimilarity } from "@/lib/dashboard/match";
import type { DirectoryQuery } from "@/lib/dashboard/profile";
import type { DirectoryMember } from "@/lib/dashboard/types";
import { useI18n } from "@/lib/i18n/I18nProvider";

function filterDemo(members: DirectoryMember[], q: DirectoryQuery) {
  const s = q.search.trim().toLowerCase();
  return members.filter(
    (m) =>
      (!q.direction || m.direction === q.direction) &&
      (!q.origin || m.origin_country === q.origin) &&
      (!q.destination || m.destination_country === q.destination) &&
      (!q.interest || m.interests.includes(q.interest)) &&
      (!s || [m.display_name, m.origin_country, m.country, m.destination_country].some((v) => v?.toLowerCase().includes(s)))
  );
}

export function PeopleView({ profile, supabase }: DashboardCtx) {
  const { t } = useI18n();
  const [query, setQuery] = useState<DirectoryQuery>(EMPTY_QUERY);
  const [showDemo, setShowDemo] = useState(SHOW_DEMO_DATA);
  const directory = useDirectory(supabase, query, true);
  const demo = useMemo(() => sortBySimilarity(filterDemo(DEMO_MEMBERS, query), profile), [query, profile]);
  const filtered = JSON.stringify(query) !== JSON.stringify(EMPTY_QUERY);

  return (
    <div className="mx-auto max-w-[110rem] space-y-10 px-4 py-10 md:px-6 md:py-14 lg:px-12">
      <PageHeader title={t("pages.peopleTitle")} description={t("pages.peopleBody")} />
      <VisibilityCard profile={profile} />
      <PeopleFilters value={query} onChange={setQuery} />

      <section aria-labelledby="members-heading" className="space-y-4">
        <div>
          <h2 id="members-heading" className="text-2xl font-bold">Members</h2>
          <p className="text-base text-[#2F4157]/60">Real, opted-in members, best matches first. You only see what each person chose to share.</p>
        </div>
        {directory.status === "loading" && directory.members.length === 0 && <LoadingState label="Finding members…" />}
        {directory.status === "unavailable" && (
          <Notice testId="directory-unavailable-notice">The member directory will appear here once the IELS database update for profiles is applied.</Notice>
        )}
        {directory.status === "error" && <ErrorState message={directory.error ?? "Could not load members."} onRetry={directory.retry} />}
        {directory.status === "ready" && directory.members.length === 0 && (
          <EmptyState
            title={filtered ? "No members match these filters" : "No members have joined the directory yet"}
            body={filtered ? "Try fewer filters. People who hide a field (like where they're from) won't appear when you filter by it." : "Be one of the first. Make your profile visible so others with similar goals can find you."}
            action={filtered ? <button type="button" onClick={() => setQuery(EMPTY_QUERY)} className={btnPrimary}>Clear filters</button> : undefined}
          />
        )}
        {directory.members.length > 0 && (
          <div data-testid="real-members-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {directory.members.map((m) => <MemberCard key={m.id} member={m} reasons={similarity(m, profile).reasons} />)}
          </div>
        )}
        {directory.hasMore && (
          <button type="button" data-testid="people-load-more" disabled={directory.status === "loading"} onClick={directory.loadMore} className={btnSecondary}>
            {directory.status === "loading" ? "Loading…" : "Load more"}
          </button>
        )}
      </section>

      {SHOW_DEMO_DATA && (
        <section aria-labelledby="demo-heading" className="space-y-4 border-t border-[#E3E7ED]/60 pt-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="demo-heading" className="text-2xl font-bold">Demo profiles</h2>
              <p className="text-base text-[#2F4157]/60">Fictional people to preview the directory. They are not IELS members and are never saved to the database.</p>
            </div>
            <button type="button" data-testid="toggle-demo-profiles" aria-pressed={showDemo} onClick={() => setShowDemo((v) => !v)} className={btnSecondary}>
              {showDemo ? "Hide demo profiles" : "Show demo profiles"}
            </button>
          </div>
          {showDemo &&
            (demo.length > 0 ? (
              <div data-testid="demo-members-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {demo.map(({ member, reasons }) => <MemberCard key={member.id} member={member} reasons={reasons} />)}
              </div>
            ) : (
              <EmptyState title="No demo profiles match" body="Try other filters." />
            ))}
        </section>
      )}
    </div>
  );
}

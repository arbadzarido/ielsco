"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState, ErrorState, LoadingState, Notice } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/dashboard/ui";
import { connectApi, isUnavailable } from "@/lib/connect/api";
import { ACTIVITIES, DAYS, ENGLISH_LEVELS, GOALS, LANGUAGES, labels, TOPICS } from "@/lib/connect/options";
import type { DiscoverFilters, DiscoverRow } from "@/lib/connect/types";
import { SEA_COUNTRIES } from "@/lib/dashboard/options";
import { ConnectFrame, PersonCard, UnavailableNotice, useLoad } from "./shared";

const PAGE = 12;
const EMPTY: DiscoverFilters = { search: "", country: "", speaks: "", learning: "", englishLevel: "", topic: "", goal: "", activity: "", day: "" };

// Why this person is suggested, from the server's shared-field arrays (no invented scores).
export function reasonsFor(r: Pick<DiscoverRow, "they_teach" | "they_learn" | "shared_goals" | "shared_topics" | "shared_days">) {
  return [
    r.they_teach.length ? `Speaks ${labels("language", r.they_teach).join(", ")}, which you're learning` : null,
    r.they_learn.length ? `Is learning ${labels("language", r.they_learn).join(", ")}, which you speak` : null,
    r.shared_goals.length ? `You both want to: ${labels("goal", r.shared_goals).join(", ").toLowerCase()}` : null,
    r.shared_topics.length ? `Shared interests: ${labels("topic", r.shared_topics).join(", ")}` : null,
    r.shared_days.length ? `Both free on ${labels("day", r.shared_days).join(", ")}` : null,
  ].filter(Boolean) as string[];
}

const RELATION_LABEL = { connected: "Connected", request_sent: "Intro sent", request_received: "Sent you an intro" } as const;

function Select({ id, label: text, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{text}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Any</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function DiscoverView({ supabase }: DashboardCtx) {
  const passport = useLoad(() => connectApi.myPassport(supabase), [supabase]);
  const [filters, setFilters] = useState<DiscoverFilters>(EMPTY);
  const [rows, setRows] = useState<DiscoverRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const set = (k: keyof DiscoverFilters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const load = async (offset: number) => {
    setStatus("loading");
    try {
      const page = await connectApi.discover(supabase, filters, offset, PAGE);
      setRows((prev) => (offset === 0 ? page : [...prev, ...page]));
      setHasMore(page.length === PAGE);
      setStatus("ready");
    } catch (e) {
      if (isUnavailable(e)) return setStatus("unavailable");
      setError((e as Error).message);
      setStatus("error");
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(0), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, filters]);

  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY);
  const notReady = passport.state.s === "ready" && !(passport.state.data.guidelines_accepted && passport.state.data.adult_confirmed);

  return (
    <ConnectFrame title="Discover people" description="Members who chose to appear in Connect, best language and interest matches first. You only see what each person chose to share.">
      {passport.state.s === "ready" && !passport.state.data.discoverable && (
        <Notice testId="discover-hidden-notice">
          You&apos;re hidden from Discover, so others can&apos;t find you or send you intros. <Link href="/dashboard/connect/passport" className="font-semibold underline">Update your Passport</Link> to appear.
        </Notice>
      )}
      <section aria-label="Filters" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="f-search" className={labelClass}>Name</label>
          <input id="f-search" type="search" value={filters.search} onChange={(e) => set("search")(e.target.value)} className={inputClass} placeholder="Search by name" />
        </div>
        <Select id="f-country" label="Country" value={filters.country} onChange={set("country")} options={SEA_COUNTRIES.map((c) => ({ value: c, label: c }))} />
        <Select id="f-speaks" label="Speaks" value={filters.speaks} onChange={set("speaks")} options={LANGUAGES} />
        <Select id="f-learning" label="Is learning" value={filters.learning} onChange={set("learning")} options={LANGUAGES} />
        <Select id="f-level" label="English level" value={filters.englishLevel} onChange={set("englishLevel")} options={ENGLISH_LEVELS.map((l) => ({ value: l, label: l }))} />
        <Select id="f-goal" label="Looking for" value={filters.goal} onChange={set("goal")} options={GOALS} />
        <Select id="f-topic" label="Interest" value={filters.topic} onChange={set("topic")} options={TOPICS} />
        <Select id="f-activity" label="Activity" value={filters.activity} onChange={set("activity")} options={ACTIVITIES} />
        <Select id="f-day" label="Free on" value={filters.day} onChange={set("day")} options={DAYS} />
        {filtered && <div className="flex items-end"><button type="button" onClick={() => setFilters(EMPTY)} className={btnSecondary}>Clear filters</button></div>}
      </section>

      {status === "unavailable" && <UnavailableNotice />}
      {status === "error" && <ErrorState message={error} onRetry={() => load(0)} />}
      {status === "loading" && rows.length === 0 && <LoadingState label="Finding members…" />}
      {status === "ready" && rows.length === 0 && (
        <EmptyState
          title={filtered ? "No members match these filters" : "Nobody to show yet"}
          body={filtered ? "Try fewer filters." : "Connect is new. As members create their Passports and turn on Discover, they'll appear here."}
          action={filtered ? <button type="button" onClick={() => setFilters(EMPTY)} className={btnPrimary}>Clear filters</button> : undefined}
        />
      )}
      {rows.length > 0 && (
        <div data-testid="discover-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <PersonCard key={r.person.id} person={r.person} reasons={reasonsFor(r)} footer={
              <>
                <Link href={`/dashboard/connect/people/${r.person.id}`} className={btnPrimary}>{r.relation ? "View profile" : "View & send intro"}</Link>
                {r.relation && <span className="self-center text-sm font-semibold text-[#577E90]">{RELATION_LABEL[r.relation]}</span>}
              </>
            } />
          ))}
        </div>
      )}
      {hasMore && <button type="button" disabled={status === "loading"} onClick={() => load(rows.length)} className={btnSecondary} data-testid="discover-more">{status === "loading" ? "Loading…" : "Load more"}</button>}
      {notReady && <p className="text-sm text-[#2F4157]/60">To send intros you need to accept the Connect guidelines in your Passport.</p>}
    </ConnectFrame>
  );
}

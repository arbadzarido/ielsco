"use client";

import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useDirectory, EMPTY_QUERY } from "../people/useDirectory";
import { MemberCard } from "../MemberCard";
import { btnLink } from "../ui";
import { DEMO_MEMBERS } from "@/data/dashboard/demo-members";
import { SHOW_DEMO_DATA } from "@/data/dashboard/config";
import { similarity, sortBySimilarity } from "@/lib/dashboard/match";
import type { MemberProfile } from "@/lib/dashboard/types";

// Real opted-in members first (server-ranked). Demo profiles only as a clearly labeled fallback.
export function SimilarPeople({ supabase, profile }: { supabase: SupabaseClient; profile: MemberProfile }) {
  const directory = useDirectory(supabase, EMPTY_QUERY, true);
  const real = directory.members.slice(0, 3);
  const showDemo = directory.status !== "loading" && real.length === 0 && SHOW_DEMO_DATA;
  const demo = showDemo ? sortBySimilarity(DEMO_MEMBERS, profile).slice(0, 3) : [];
  if (real.length === 0 && demo.length === 0) return null;

  return (
    <section data-testid="home-similar-people" aria-labelledby="people-heading">
      <div className="mb-2 flex items-end justify-between gap-4">
        <h2 id="people-heading" className="text-xl font-bold md:text-2xl">People with similar goals</h2>
        <Link href="/dashboard/people" data-testid="home-see-all-people" className={btnLink}>See all people</Link>
      </div>
      {real.length === 0 && (
        <p data-testid="home-people-demo-note" className="mb-4 text-base text-[#2F4157]/60">
          No real members match yet, so here are fictional demo profiles to show how it works.
        </p>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {real.map((m) => <MemberCard key={m.id} member={m} reasons={similarity(m, profile).reasons} />)}
        {demo.map(({ member, reasons }) => <MemberCard key={member.id} member={member} reasons={reasons} />)}
      </div>
    </section>
  );
}

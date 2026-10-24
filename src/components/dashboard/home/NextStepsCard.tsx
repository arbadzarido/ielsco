"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, BadgeCheck, Bookmark } from "lucide-react";
import { cardGloss } from "../ui";
import { cn } from "@/lib/utils";
import { dateWib } from "@/lib/format";

// Home: where the member stands, in two lines. Membership state comes from public.my_membership(); the tracker count from
// the member's own rows. Each line links to the one action that matters next.
export function NextStepsCard({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [m, setM] = useState<{ active: boolean; access_until: string | null } | null>(null);
  const [tracked, setTracked] = useState<{ total: number; preparing: number } | null>(null);

  useEffect(() => {
    supabase.rpc("my_membership").then(({ data, error }) => setM(error ? { active: false, access_until: null } : (data as { active: boolean; access_until: string | null })));
    supabase.from("opportunity_tracker").select("status").eq("user_id", userId).then(({ data }) => {
      const rows = (data as { status: string }[]) ?? [];
      setTracked({ total: rows.length, preparing: rows.filter((r) => r.status === "preparing").length });
    });
  }, [supabase, userId]);

  if (!m || !tracked) return null;
  const days = m.access_until ? Math.ceil((Date.parse(m.access_until) - Date.now()) / 864e5) : null;
  return (
    <section className={cn(cardGloss, "grid gap-4 p-5 md:grid-cols-2")} aria-label="Your next steps" data-testid="home-next-steps">
      <Link href="/dashboard/opportunities" className="group flex items-start gap-3 rounded-xl p-2 hover:bg-[#F7F8FA]">
        <Bookmark size={20} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
        <span>
          <span className="block font-semibold text-[#1A2534]">{tracked.total ? `${tracked.total} opportunities tracked` : "Track your first opportunity"}</span>
          <span className="text-sm text-[#2F4157]/70">{tracked.total ? `${tracked.preparing} in preparation` : "Save programs from the board and set your own deadlines."}</span>
        </span>
        <ArrowRight size={16} className="ml-auto mt-1 shrink-0 text-[#2F4157]/40 group-hover:text-[#2F4157]" aria-hidden="true" />
      </Link>
      <Link href="/dashboard/membership" className="group flex items-start gap-3 rounded-xl p-2 hover:bg-[#F7F8FA]">
        <BadgeCheck size={20} className={cn("mt-0.5 shrink-0", m.active ? "text-[#2D7A58]" : "text-[#577E90]")} aria-hidden="true" />
        <span>
          <span className="block font-semibold text-[#1A2534]">{m.active ? "Member tools" : "Free account"}</span>
          <span className="text-sm text-[#2F4157]/70">
            {m.active ? (days !== null && days <= 14 ? `Membership ends in ${days} days. Renew to keep your tools.` : `Member until ${dateWib(m.access_until!)}.`)
              : "Membership adds clinics, feedback and a study buddy."}
          </span>
        </span>
        <ArrowRight size={16} className="ml-auto mt-1 shrink-0 text-[#2F4157]/40 group-hover:text-[#2F4157]" aria-hidden="true" />
      </Link>
    </section>
  );
}

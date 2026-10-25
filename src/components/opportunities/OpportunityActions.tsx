"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { btnPrimary } from "@/components/site/ui";
import { SaveButton } from "./OpportunityBoard";
import { useTracker } from "./useTracker";

export default function OpportunityActions({ id, officialUrl }: { id: string; officialUrl: string }) {
  const tracker = useTracker();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <a href={officialUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="opp-official">
          Open the official page <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <SaveButton id={id} tracker={tracker} />
      </div>
      {tracker.notice && <p className="mt-3 text-[15px] text-[#2F4157]" role="status">{tracker.notice} <Link className="font-semibold underline" href="/membership">About membership</Link></p>}
      {tracker.saved.has(id) && <p className="mt-3 text-[15px] text-[#2F4157]/75">Saved. Track your progress in <Link className="font-semibold underline" href="/dashboard/opportunities">your dashboard</Link>.</p>}
    </div>
  );
}

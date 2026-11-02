"use client";

import { useState } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { OpportunitiesAdmin } from "@/components/dashboard/admin/OpportunitiesAdmin";
import { ProfessionalAdmin } from "@/components/dashboard/admin/ProfessionalAdmin";
import { focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

function Editors({ supabase }: { supabase: Parameters<typeof OpportunitiesAdmin>[0]["supabase"] }) {
  const [tab, setTab] = useState<"academic" | "professional">("academic");
  return (
    <div>
      <div className="mx-auto flex max-w-5xl gap-2 px-4 pt-8 md:px-6" role="tablist" aria-label="Listing type">
        {(["academic", "professional"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-full border px-4 py-2 text-sm font-semibold capitalize", focusRing, tab === t ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157]")}>{t}</button>
        ))}
      </div>
      {tab === "academic" ? <OpportunitiesAdmin supabase={supabase} /> : <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14"><ProfessionalAdmin supabase={supabase} /></div>}
    </div>
  );
}

export default function OpportunitiesAdminPage() {
  return <DashboardPage>{({ supabase }) => <AdminGate><Editors supabase={supabase} /></AdminGate>}</DashboardPage>;
}

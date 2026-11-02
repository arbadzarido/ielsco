"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardPage, type DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnPrimary } from "@/components/dashboard/ui";
import { LoadGate, useLoad } from "@/components/connect/shared";
import { ProfessionalDetail } from "@/components/opportunities/ProfessionalDetail";
import { siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { loadProfessionalBySlug } from "@/lib/professional/queries";

// A professional listing inside the dashboard (same component as /opportunities/professional/[slug]); "back" returns to
// Discover → Opportunities on the Professional tab, and the interest form is prefilled from the member's account.
function Listing({ supabase, user, profile }: DashboardCtx) {
  const { slug } = useParams<{ slug: string }>();
  const data = useLoad(() => loadProfessionalBySlug(supabase, slug), [supabase, slug]);
  return (
    <div className={cn(siteRoot, "mx-auto max-w-[1180px] px-4 py-8 md:px-6 md:py-10 lg:px-10")}>
      <LoadGate state={data.state} onRetry={data.reload} label="Loading opportunity…" />
      {data.state.s === "ready" && (data.state.data ? (
        <ProfessionalDetail o={data.state.data} backHref="/dashboard/discover/opportunities?type=professional" backLabel="Back to Opportunities" source="dashboard"
          defaults={{ fullName: profile.display_name || "", email: user.email ?? "" }} />
      ) : (
        <EmptyState title="This opportunity isn't available" body="It may have been closed or removed."
          action={<Link href="/dashboard/discover/opportunities?type=professional" className={btnPrimary}>Browse opportunities</Link>} />
      ))}
    </div>
  );
}

export default function DashboardProfessionalOpportunityPage() {
  return <DashboardPage>{(ctx) => <Listing {...ctx} />}</DashboardPage>;
}

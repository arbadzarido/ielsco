"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DiscoverOpportunities } from "@/components/connect/HubViews";

export default function Page() {
  return <DashboardPage>{(ctx) => <DiscoverOpportunities {...ctx} />}</DashboardPage>;
}

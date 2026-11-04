"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DiscoverOverview } from "@/components/dashboard/discover/DiscoverOverview";

export default function Page() {
  return <DashboardPage>{(ctx) => <DiscoverOverview {...ctx} />}</DashboardPage>;
}

"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DiscoverHome } from "@/components/connect/HubViews";

export default function Page() {
  return <DashboardPage>{(ctx) => <DiscoverHome {...ctx} />}</DashboardPage>;
}

"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DiscoverView } from "@/components/connect/DiscoverView";

export default function Page() {
  return <DashboardPage>{(ctx) => <DiscoverView {...ctx} />}</DashboardPage>;
}

"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ExploreView } from "@/components/dashboard/explore/ExploreView";

export default function ExplorePage() {
  return <DashboardPage>{(ctx) => <ExploreView {...ctx} />}</DashboardPage>;
}

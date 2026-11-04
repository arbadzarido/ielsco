"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MilestoneHall } from "@/components/dashboard/me/MilestoneHall";

export default function MilestonesPage() {
  return <DashboardPage>{(ctx) => <MilestoneHall {...ctx} />}</DashboardPage>;
}

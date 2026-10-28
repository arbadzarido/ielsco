"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { QuickMatchView } from "@/components/connect/QuickMatchView";

export default function Page() {
  return <DashboardPage>{(ctx) => <QuickMatchView {...ctx} />}</DashboardPage>;
}

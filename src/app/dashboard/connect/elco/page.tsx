"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ElcoConnectView } from "@/components/connect/HubViews";

export default function Page() {
  return <DashboardPage>{(ctx) => <ElcoConnectView {...ctx} />}</DashboardPage>;
}

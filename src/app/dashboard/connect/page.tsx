"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ConnectHub } from "@/components/connect/HubViews";

export default function Page() {
  return <DashboardPage>{(ctx) => <ConnectHub {...ctx} />}</DashboardPage>;
}

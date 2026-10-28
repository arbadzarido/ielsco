"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ConnectionsView } from "@/components/connect/ConnectionsView";

export default function Page() {
  return <DashboardPage>{(ctx) => <ConnectionsView {...ctx} />}</DashboardPage>;
}

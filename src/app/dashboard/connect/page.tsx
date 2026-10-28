"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ConnectHome } from "@/components/connect/ConnectHome";

export default function Page() {
  return <DashboardPage>{(ctx) => <ConnectHome {...ctx} />}</DashboardPage>;
}

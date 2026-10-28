"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { SeaExchangeView } from "@/components/connect/SeaExchangeView";

export default function Page() {
  return <DashboardPage>{(ctx) => <SeaExchangeView {...ctx} />}</DashboardPage>;
}

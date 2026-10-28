"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PulseView } from "@/components/connect/PulseView";

export default function Page() {
  return <DashboardPage>{(ctx) => <PulseView {...ctx} />}</DashboardPage>;
}

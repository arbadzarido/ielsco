"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { SafetyView } from "@/components/connect/SafetyView";

export default function Page() {
  return <DashboardPage>{(ctx) => <SafetyView {...ctx} />}</DashboardPage>;
}

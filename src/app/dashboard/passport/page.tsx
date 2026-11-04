"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PassportView } from "@/components/dashboard/me/PassportView";

export default function PassportPage() {
  return <DashboardPage>{(ctx) => <PassportView {...ctx} />}</DashboardPage>;
}

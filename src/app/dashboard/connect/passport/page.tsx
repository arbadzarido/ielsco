"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PassportView } from "@/components/connect/PassportForm";

export default function Page() {
  return <DashboardPage>{(ctx) => <PassportView {...ctx} />}</DashboardPage>;
}

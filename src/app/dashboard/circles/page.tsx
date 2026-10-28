"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { CirclesView } from "@/components/connect/CirclesView";

export default function Page() {
  return <DashboardPage>{(ctx) => <CirclesView {...ctx} />}</DashboardPage>;
}

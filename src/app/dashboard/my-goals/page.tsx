"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MyGoalsView } from "@/components/dashboard/goals/MyGoalsView";

export default function MyGoalsPage() {
  return <DashboardPage>{(ctx) => <MyGoalsView key={ctx.user.id} {...ctx} />}</DashboardPage>;
}

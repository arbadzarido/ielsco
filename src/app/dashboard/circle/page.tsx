"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { CircleView } from "@/components/dashboard/circle/CircleView";

export default function CirclePage() {
  return <DashboardPage>{({ supabase }) => <CircleView supabase={supabase} />}</DashboardPage>;
}

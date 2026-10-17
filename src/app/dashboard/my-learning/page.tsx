"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MyLearningView } from "@/components/dashboard/learning/MyLearningView";

export default function MyLearningPage() {
  return <DashboardPage>{(ctx) => <MyLearningView {...ctx} />}</DashboardPage>;
}

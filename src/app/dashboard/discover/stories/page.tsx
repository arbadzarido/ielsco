"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { NewsStoriesView } from "@/components/dashboard/discover/NewsStoriesView";

export default function NewsStoriesPage() {
  return <DashboardPage>{(ctx) => <NewsStoriesView {...ctx} />}</DashboardPage>;
}

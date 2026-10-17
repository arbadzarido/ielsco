"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { HomeView } from "@/components/dashboard/home/HomeView";

// GIF delegates reach /dashboard/gif from the GIF card on Home and the GIF banner in the navigation.
export default function DashboardHomePage() {
  return <DashboardPage>{(ctx) => <HomeView {...ctx} />}</DashboardPage>;
}

"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { SocialHome } from "@/components/connect/HubViews";

export default function Page() {
  return <DashboardPage>{(ctx) => <SocialHome {...ctx} />}</DashboardPage>;
}

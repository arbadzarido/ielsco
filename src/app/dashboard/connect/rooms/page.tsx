"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RoomsView } from "@/components/connect/RoomsView";

export default function Page() {
  return <DashboardPage>{(ctx) => <RoomsView {...ctx} />}</DashboardPage>;
}

"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MessagesView } from "@/components/connect/ConnectionsView";

export default function Page() {
  return <DashboardPage>{(ctx) => <MessagesView {...ctx} />}</DashboardPage>;
}

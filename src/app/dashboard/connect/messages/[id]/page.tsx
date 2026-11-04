"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { InboxView } from "@/components/connect/ConnectionsView";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <InboxView {...ctx} id={id} />}</DashboardPage>;
}

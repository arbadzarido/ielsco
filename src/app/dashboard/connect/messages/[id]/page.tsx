"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ThreadView } from "@/components/connect/ThreadView";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <ThreadView {...ctx} id={id} />}</DashboardPage>;
}

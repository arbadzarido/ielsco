"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ResourceDetailView } from "@/components/dashboard/resources/ResourceDetailView";

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <ResourceDetailView {...ctx} id={id} />}</DashboardPage>;
}

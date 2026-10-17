"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { CollectionDetailView } from "@/components/dashboard/collections/CollectionDetailView";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <CollectionDetailView {...ctx} id={id} />}</DashboardPage>;
}

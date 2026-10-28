"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PersonView } from "@/components/connect/PersonView";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <PersonView {...ctx} id={id} />}</DashboardPage>;
}

"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RoomDetail } from "@/components/connect/RoomDetail";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <RoomDetail {...ctx} id={id} />}</DashboardPage>;
}

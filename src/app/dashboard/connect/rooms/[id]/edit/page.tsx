"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RoomFormView } from "@/components/connect/RoomForm";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DashboardPage>{(ctx) => <RoomFormView {...ctx} id={id} />}</DashboardPage>;
}

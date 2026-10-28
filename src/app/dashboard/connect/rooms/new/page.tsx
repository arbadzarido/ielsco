"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RoomFormView } from "@/components/connect/RoomForm";

export default function Page() {
  return <DashboardPage>{(ctx) => <RoomFormView {...ctx} />}</DashboardPage>;
}

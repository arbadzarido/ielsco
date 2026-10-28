"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RoomFormView } from "@/components/connect/RoomForm";

// ?topic=…&category=… prefill a new room (used by SEA Cultural Exchange prompts).
function NewRoom() {
  const q = useSearchParams();
  const prefill = { topic: q?.get("topic") ?? undefined, category: q?.get("category") ?? undefined };
  return <DashboardPage>{(ctx) => <RoomFormView {...ctx} prefill={prefill} />}</DashboardPage>;
}

export default function Page() {
  return <Suspense><NewRoom /></Suspense>;
}

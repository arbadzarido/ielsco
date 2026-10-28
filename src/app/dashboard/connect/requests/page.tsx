"use client";

import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RequestsView } from "@/components/connect/RequestsView";

export default function Page() {
  return <DashboardPage>{(ctx) => <Suspense><RequestsView {...ctx} /></Suspense>}</DashboardPage>;
}

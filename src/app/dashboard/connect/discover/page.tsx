"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DiscoverView } from "@/components/connect/DiscoverView";

// ?goal=…&topic=…&speaks=…&learning=… preset the filters (links from Home, Circles and SEA Cultural Exchange).
function Discover() {
  const q = useSearchParams();
  const initial = Object.fromEntries((["goal", "topic", "speaks", "learning"] as const).map((k) => [k, q?.get(k) ?? ""]).filter(([, v]) => v));
  return <DashboardPage>{(ctx) => <DiscoverView {...ctx} initial={initial} />}</DashboardPage>;
}

export default function Page() {
  return <Suspense><Discover /></Suspense>;
}

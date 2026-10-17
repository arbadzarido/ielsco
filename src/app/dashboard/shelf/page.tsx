"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ShelfView } from "@/components/dashboard/bookmarks/ShelfView";

export default function ShelfPage() {
  return <DashboardPage>{(ctx) => <ShelfView {...ctx} />}</DashboardPage>;
}

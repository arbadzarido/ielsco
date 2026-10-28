"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { CircleDetail } from "@/components/connect/CirclesView";

// ?draft=… pre-fills the composer (SEA Cultural Exchange "Answer in the Circle"). Nothing is posted until the member presses Post.
function Circle() {
  const { id } = useParams<{ id: string }>();
  const draft = useSearchParams()?.get("draft") ?? undefined;
  return <DashboardPage>{(ctx) => <CircleDetail {...ctx} id={id} draft={draft ? `“${draft.slice(0, 300)}”\n\n` : undefined} />}</DashboardPage>;
}

export default function Page() {
  return <Suspense><Circle /></Suspense>;
}

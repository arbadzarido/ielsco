"use client";

import DashboardLayout from "./DashboardLayout";
import RouteError from "@/components/feedback/RouteError";

// The dashboard's error state: the sidebar stays, the page area shows what went wrong (loaded on demand by dashboard/error.tsx).
export default function DashboardRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <DashboardLayout>
      <RouteError error={error} reset={reset} home="/dashboard" homeLabel="Back to Home" />
    </DashboardLayout>
  );
}

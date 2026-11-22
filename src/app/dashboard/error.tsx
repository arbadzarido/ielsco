"use client";

import RouteErrorLazy from "@/components/feedback/RouteErrorLazy";

// A dashboard page failed to render: plain text at once, then the full state with the sidebar kept (loaded on demand).
// Dashboard pages that load data on the client show the same states inline (components/dashboard/PageStates).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorLazy error={error} reset={reset} home="/dashboard" homeLabel="Back to Home"
    load={() => import("@/components/dashboard/DashboardRouteError").then((m) => m.default)} />;
}

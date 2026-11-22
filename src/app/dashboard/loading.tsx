import DashboardLoading from "@/components/dashboard/DashboardLoading";

// Shown while this part of the dashboard loads: the real sidebar and the shape of the page.
export default function Loading() {
  return <DashboardLoading variant="page" label="Loading your dashboard" />;
}

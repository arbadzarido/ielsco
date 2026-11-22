import dynamic from "next/dynamic";

// Rendered on the server when a dashboard page calls notFound(); its code ships only with that response.
const DashboardNotFound = dynamic(() => import("@/components/dashboard/DashboardNotFound"));

export default function NotFound() {
  return <DashboardNotFound />;
}

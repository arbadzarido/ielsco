import type { Metadata } from "next";
import NotAvailable from "@/components/site/NotAvailable";

export const metadata: Metadata = { title: "Planner is no longer available | IELSco", robots: { index: false } };

// The planner tools were retired; this route stays so old links land somewhere useful.
export default function PlannerRetired() {
  return <NotAvailable title="The planner is no longer available" text="We retired this tool." />;
}

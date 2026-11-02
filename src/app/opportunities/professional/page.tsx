import type { Metadata } from "next";
import { OpportunitiesDirectory } from "@/components/opportunities/OpportunitiesDirectory";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

// The Professional tab of /opportunities as its own indexable URL (the switcher still works here without a reload).
export const metadata: Metadata = pageMetadata({
  title: "Jobs abroad with official recruitment partners | IELSco",
  description: "International employment opportunities shared with IELSco's official recruitment partners: hospitality, agriculture, textiles, construction and more, with salary, benefits and how to express interest.",
  path: "/opportunities/professional",
});

export default function ProfessionalOpportunitiesPage() {
  return <OpportunitiesDirectory initialTrack="professional" />;
}

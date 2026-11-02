import type { Metadata } from "next";
import { OpportunitiesDirectory } from "@/components/opportunities/OpportunitiesDirectory";
import { pageMetadata } from "@/lib/seo";
import { parseTrack } from "@/lib/professional/model";

export const metadata: Metadata = pageMetadata({
  title: "International scholarships, programs and jobs abroad | IELSco",
  description: "Find your next international opportunity: a checked list of scholarships, fellowships and youth programs, plus overseas jobs shared with our official recruitment partners. Free to browse.",
  path: "/opportunities",
});

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  const { type } = await searchParams;
  return <OpportunitiesDirectory initialTrack={parseTrack(Array.isArray(type) ? type[0] : type)} />;
}

import type { Metadata } from "next";
import { NOINDEX, pageMetadata } from "@/lib/seo";

// Logistics for confirmed GIF Batch 2 delegates: reachable by link, not a search landing page (the public program page is
// /events/gif). The page is a client component, so its metadata lives here (it used to inherit "Events & programs").
export const metadata: Metadata = {
  ...pageMetadata({
    title: "GIF Batch 2 itinerary: the Incubation Masterclass | IELSco",
    description: "Day-by-day itinerary of the Global Impact Fellowship Batch 2 Incubation Masterclass in Singapore, for confirmed delegates.",
    path: "/events/gif/itinerary",
  }),
  ...NOINDEX,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

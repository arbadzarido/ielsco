import type { Metadata } from "next";
import { NOINDEX, pageMetadata } from "@/lib/seo";

// Logistics for confirmed GIF Batch 2 delegates: reachable by link, not a search landing page (the public program page is
// /events/gif). The page is a client component, so its metadata lives here (it used to inherit "Events & programs").
export const metadata: Metadata = {
  ...pageMetadata({
    title: "GIF Batch 2 project realization guidelines | IELSco",
    description: "Guidelines for Global Impact Fellowship Batch 2 delegates on realizing and reporting their projects.",
    path: "/events/gif/project",
  }),
  ...NOINDEX,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

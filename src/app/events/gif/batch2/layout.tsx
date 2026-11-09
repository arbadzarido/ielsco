import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component, so its metadata lives here (it used to inherit "Events & programs").
export const metadata: Metadata = pageMetadata({
  title: "Global Impact Fellowship Batch 2: Singapore, 17–20 November 2026 | IELSco",
  description: "GIF Batch 2: a 4-day, 3-night leadership and project incubation residency in Singapore for Southeast Asian youth aged 15–23, 17–20 November 2026.",
  path: "/events/gif/batch2",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

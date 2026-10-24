import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "English Student Launchpad | IELS",
  description: "English Student Launchpad is a career incubation program from IELS for English Education and English Literature students who want to turn their major into global opportunities.",
  path: "/events/launchpad",
});

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
  return children;
}

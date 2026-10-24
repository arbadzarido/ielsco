import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import CareersView from "./CareersView";

export const metadata: Metadata = pageMetadata({
  title: "Careers & open recruitment | IELS",
  description: "Join the team behind IELS, a student-led English learning community: remote roles in the Operations, Growth, Business, Finance and Talent divisions. IELS roles are not paid internships.",
  path: "/careers",
});

export default function Page() {
  return <CareersView />;
}

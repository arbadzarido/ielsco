import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free English learning resources | IELS",
  description: "Free e-books, templates and audio guides from IELS, from IELTS speaking cue cards to academic essay structure.",
  path: "/products/resources",
});

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

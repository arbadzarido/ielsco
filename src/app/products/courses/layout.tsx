import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "English mentoring & courses | IELS",
  description: "1-on-1 mentoring and group learning from IELS mentors for fluency, professional English and test preparation.",
  path: "/products/courses",
});

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

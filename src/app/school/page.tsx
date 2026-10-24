import type { Metadata } from "next";
import { SCHOOL_URL, pageMetadata } from "@/lib/seo";
import SchoolView from "./SchoolView";

export const metadata: Metadata = pageMetadata({
  title: "IELS for Schools | English programs for high schools and universities",
  description: "IELS for Schools brings structured English programs, mentorship and pilot programs to high schools and universities across Indonesia.",
  path: `${SCHOOL_URL}/`,
});

export default function Page() {
  return <SchoolView />;
}

import type { Metadata } from "next";
import { CIRCLE_URL, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "IELS Circle cohort | 8 weeks of English practice",
  description: "Join an 8-week IELS Circle cohort: weekly learning themes, real English practice and a community of young people across Southeast Asia. Free to join.",
  path: `${CIRCLE_URL}/agenda`,
});

export default function CircleAgendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

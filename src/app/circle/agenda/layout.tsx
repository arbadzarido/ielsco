import type { Metadata } from "next";
import { CIRCLE_URL, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "IELS Circle cohort | 8-week English speaking practice in Southeast Asia",
  description: "The IELS Circle Oct-Dec 2026 cohort: 8 weeks of English practice, speaking club sessions and quizzes in our English speaking community for young people across Southeast Asia. Registration for this cohort is closed.",
  path: `${CIRCLE_URL}/agenda`,
});

export default function CircleAgendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

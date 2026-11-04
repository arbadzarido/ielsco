import type { Metadata } from "next";
import { CIRCLE_URL, pageMetadata } from "@/lib/seo";
import CircleView from "./CircleView";

export const metadata: Metadata = pageMetadata({
  title: "IELS Circle | English speaking club and community in Southeast Asia",
  description: "IELS Circle is a free English speaking community for young people across Southeast Asia: recurring weekly speaking practice on Wednesdays and Saturdays, member stories and cohort programs.",
  path: `${CIRCLE_URL}/`,
});

export default function Page() {
  return <CircleView />;
}

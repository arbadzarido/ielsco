import type { Metadata } from "next";
import { CIRCLE_URL, pageMetadata } from "@/lib/seo";
import CircleView from "./CircleView";

export const metadata: Metadata = pageMetadata({
  title: "IELS Circle | Weekly English sessions across Southeast Asia",
  description: "IELS Circle is a free English community for young people across Southeast Asia: weekly online sessions on Wednesdays and Saturdays, member stories and cohort programs.",
  path: `${CIRCLE_URL}/`,
});

export default function Page() {
  return <CircleView />;
}

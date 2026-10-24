import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import HomeView from "./HomeView";

export const metadata: Metadata = pageMetadata({
  title: "IELS | English community and opportunities across Southeast Asia",
  description: "IELS connects learners across Southeast Asia with peers, mentors and free resources, and with programs for studying and working abroad. Free account, weekly sessions on Wednesdays and Saturdays.",
  path: "/",
});

export default function Page() {
  return <HomeView />;
}

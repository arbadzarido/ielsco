import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import HomeView from "./HomeView";

export const metadata: Metadata = pageMetadata({
  title: "IELSco | International opportunities and the community to go after them",
  description: "IELSco helps young people in Southeast Asia find scholarships, fellowships and programs abroad, prepare strong applications and stay on track with a community. Free to join.",
  path: "/",
});

export default function Page() {
  return <HomeView />;
}

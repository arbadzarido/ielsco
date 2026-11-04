import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import HomeView from "./HomeView";

export const metadata: Metadata = pageMetadata({
  title: "IELSco | English Community and Speaking Club in Southeast Asia",
  description: "IELSco is an English learning community connecting people, English practice and global opportunities across Southeast Asia: the IELS Circle English speaking club, Elco AI, scholarships, study abroad and career opportunities. Free to join.",
  path: "/",
});

export default function Page() {
  return <HomeView />;
}

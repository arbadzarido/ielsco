import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import GifView from "./GifView";

export const metadata: Metadata = pageMetadata({
  title: "Global Impact Fellowship Summer 2027 | Southeast Asia Youth Program",
  description:
    "Global Impact Fellowship Summer 2027: an international youth incubation and competition program across Singapore, Malaysia and Thailand by bus. Six-month incubation, USD 5,000 project funding pool, study abroad experience. Early Bird USD 800.",
  path: "/events/gif",
});

export default function Page() {
  return <GifView />;
}

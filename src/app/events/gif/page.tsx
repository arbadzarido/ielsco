import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import GifView from "./GifView";

export const metadata: Metadata = pageMetadata({
  title: "Global Impact Fellowship (GIF) | IELSco",
  description: "The IELS Global Impact Fellowship is a leadership and project incubation program for young people who design and run projects with real impact. Fully funded, partially funded and self-funded places.",
  path: "/events/gif",
});

export default function Page() {
  return <GifView />;
}

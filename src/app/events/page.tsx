import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import EventsView from "./EventsView";

export const metadata: Metadata = pageMetadata({
  title: "Events & programs | IELS",
  description: "Info sessions, workshops and fellowships from IELS, including the Global Impact Fellowship. Registration is open on each event's page while it lasts.",
  path: "/events",
});

export default function Page() {
  return <EventsView />;
}

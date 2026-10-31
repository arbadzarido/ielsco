import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events & programs | IELSco",
  description: "Info sessions, workshops and fellowships from IELS, including the Global Impact Fellowship. Registration is open on each event's page while it lasts.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

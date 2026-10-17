import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IELS Circle | Weekly English sessions across Southeast Asia",
  description: "IELS Circle is a free English community for young people across Southeast Asia: weekly online sessions on Wednesdays and Saturdays, member stories and cohort programs.",
};

export default function CircleLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IELS Circle | English speaking club and community in Southeast Asia",
  description: "IELS Circle is a free English speaking community for young people across Southeast Asia: recurring weekly speaking practice on Wednesdays and Saturdays, member stories and cohort programs.",
};

export default function CircleLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

// The careers application is a focused page inside the signed-in area: no dashboard sidebar or tab bar.
export const metadata: Metadata = {
  title: "Apply · IELSco & Elco AI Open Recruitment 2027",
  robots: { index: false, follow: false },
};

export default function CareersApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

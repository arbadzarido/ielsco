import type { Metadata } from "next";
import type { ReactNode } from "react";

// Company OS root: never indexed. Pages that show internal data live in (app)/, behind the server gate in
// (app)/layout.tsx; the sign-in page and the 404 live outside it. Data access is enforced by RLS on every os_* table.
export const metadata: Metadata = {
  title: "Company OS · IELSco & Elco",
  robots: { index: false, follow: false, nocache: true },
};

export default function OsRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#F4F6F9] text-[#1B2A3C]">{children}</div>;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

// Company OS root: never indexed. Pages that show internal data live in (app)/, behind the server gate in
// (app)/layout.tsx; the sign-in page and the 404 live outside it. Data access is enforced by RLS on every os_* table.
export const metadata: Metadata = {
  title: "Company OS · IELSco & Elco",
  robots: { index: false, follow: false, nocache: true },
};

// The public site renders at a 75% root size; the Company OS is a dense work tool used on phones too, so it uses the
// browser default (16px). That keeps text legible and touch targets at their intended 40-44 px.
export default function OsRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{"html{font-size:100%!important}"}</style>
      <div className="min-h-screen bg-[#F4F6F9] text-[#1B2A3C]">{children}</div>
    </>
  );
}

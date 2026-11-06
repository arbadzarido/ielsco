import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OsShell } from "@/components/os/OsShell";

// Internal tool: never indexed. Access is enforced by RLS on every os_* table, not by this layout.
export const metadata: Metadata = {
  title: "Company OS · IELSco & Elco",
  robots: { index: false, follow: false },
};

export default function OsLayout({ children }: { children: ReactNode }) {
  return <OsShell>{children}</OsShell>;
}

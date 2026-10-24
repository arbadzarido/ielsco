import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ELCO_ENABLED } from "@/lib/elco";
import { NOINDEX } from "@/lib/seo";

export const metadata: Metadata = NOINDEX;

// The Elco linking consent screen only exists once Elco is live (NEXT_PUBLIC_ELCO_ENABLED=true).
export default function ConnectElcoLayout({ children }: { children: React.ReactNode }) {
  if (!ELCO_ENABLED) notFound();
  return children;
}

import { notFound } from "next/navigation";
import { ELCO_ENABLED } from "@/lib/elco";

// The Elco linking consent screen only exists once Elco is live (NEXT_PUBLIC_ELCO_ENABLED=true).
export default function ConnectElcoLayout({ children }: { children: React.ReactNode }) {
  if (!ELCO_ENABLED) notFound();
  return children;
}

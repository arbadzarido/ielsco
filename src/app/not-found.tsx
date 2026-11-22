import type { Metadata } from "next";
import dynamic from "next/dynamic";

// The 404 page: Elco looks around, a mistyped address gets "Did you mean …?", popular pages are one tap away. Its code
// (NotAvailable) ships only with a 404 response, not with every page.
const NotAvailable = dynamic(() => import("@/components/site/NotAvailable"));

export const metadata: Metadata = { title: "Page not found | IELSco", robots: { index: false } };

export default function NotFound() {
  return <NotAvailable />;
}

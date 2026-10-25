import type { Metadata } from "next";
import NotAvailable from "@/components/site/NotAvailable";

export const metadata: Metadata = { title: "Page not found | IELSco", robots: { index: false } };

export default function NotFound() {
  return <NotAvailable />;
}

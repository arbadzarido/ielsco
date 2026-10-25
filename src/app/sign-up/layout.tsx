import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";

export const metadata: Metadata = NOINDEX;

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}

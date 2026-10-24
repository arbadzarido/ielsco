import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Partner with IELS | Schools, universities, companies and communities",
  description: "IELS works with schools, universities, companies and communities on English learning and global opportunities across Indonesia and Southeast Asia. Contact partnership@ielsco.com.",
  path: "/partners",
});

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

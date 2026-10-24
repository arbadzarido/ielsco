import type { Metadata } from "next";
import { divisions } from "@/data/careers/divisions";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ division: string }> }): Promise<Metadata> {
  const { division: slug } = await params;
  const division = divisions.find((d) => d.slug === slug);
  if (!division) return { title: "Division not found | IELS Careers", robots: { index: false } };
  return pageMetadata({ title: `${division.title} Division | IELS Careers`, description: division.description, path: `/careers/${division.slug}` });
}

export default function DivisionLayout({ children }: { children: React.ReactNode }) {
  return children;
}

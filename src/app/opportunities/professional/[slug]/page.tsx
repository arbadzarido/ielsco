import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/footer";
import { ProfessionalDetail } from "@/components/opportunities/ProfessionalDetail";
import { container, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { countryName, locationLabel } from "@/lib/professional/model";
import { getProfessional } from "@/lib/professional/queries";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const o = await getProfessional((await params).slug);
  if (!o) return { title: "Opportunity not found | IELSco", robots: { index: false } };
  return pageMetadata({
    title: `${o.title} jobs in ${countryName(o.country_code)}: salary, benefits and recruitment partner | IELSco`,
    description: `${o.industry} · ${locationLabel(o)}. ${o.summary}`.slice(0, 160),
    path: `/opportunities/professional/${o.slug}`,
  });
}

export default async function ProfessionalOpportunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const o = await getProfessional((await params).slug);
  if (!o) notFound();
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")}>
      <div className={cn(container, "pb-[72px] pt-[32px] md:pt-[48px]")}>
        <ProfessionalDetail o={o} backHref="/opportunities?type=professional" backLabel="All international jobs" source="public" />
      </div>
      <Footer />
    </div>
  );
}

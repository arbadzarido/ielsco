import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/footer";
import OpportunityBoard from "@/components/opportunities/OpportunityBoard";
import { body, btnPrimary, card, container, eyebrow, h1, h2, lead, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { listPublishedOpportunities } from "@/lib/opportunities";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "International scholarships, fellowships and programs for Southeast Asian youth | IELSco",
  description: "A short, checked list of international scholarships, fellowships and youth programs, each with its official link and what we have and haven't verified. Save and track your applications for free.",
  path: "/opportunities",
});

export default async function OpportunitiesPage() {
  const items = await listPublishedOpportunities();
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="opportunities-page">
      <section className="bg-white pb-[40px] pt-[40px] md:pt-[64px]" aria-labelledby="hero">
        <div className={container}>
          <p className={eyebrow}>Opportunities</p>
          <h1 id="hero" className={cn(h1, "mt-4 max-w-[860px]")}>Scholarships, fellowships and programs worth applying to</h1>
          <p className={cn(lead, "mt-6 max-w-[720px]")}>
            A short list we maintain by hand, not a scraped database. Every listing links to the official page and says what
            we have checked. Dates change every cycle, so we only show a deadline once we have confirmed it.
          </p>
        </div>
      </section>

      <section className="bg-white pb-[64px] md:pb-[96px]" aria-label="Opportunity list">
        <div className={container}>
          {items.length > 0 ? <OpportunityBoard items={items} /> : (
            <div className={cn(card, "p-10 text-center")}>
              <p className="text-[18px] font-bold text-[#1A2534]">The opportunity board is being updated</p>
              <p className="mt-2 text-[15px] text-[#2F4157]/70">Please check back soon, or browse our free resources meanwhile.</p>
              <Link href="/products/resources" className={cn(textLink, "mt-4")}>Free resources <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          )}
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="prepare">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center")}>
          <div>
            <h2 id="prepare" className={h2}>Found one? Prepare it with people beside you</h2>
            <p className={cn(body, "mt-4 max-w-[620px]")}>
              Save opportunities to track your deadlines for free. Members also get written feedback on a CV or essay, live
              application clinics and a study buddy aiming for the same thing. We never guarantee selection: the decision is
              always the program&apos;s.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link href="/sign-up" className={btnPrimary}>Create a free account</Link>
            <Link href="/membership" className={cn(textLink, "justify-center px-4")}>What members get <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

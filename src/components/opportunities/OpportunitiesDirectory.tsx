import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/footer";
import { OpportunitiesExplorer } from "@/components/opportunities/OpportunitiesExplorer";
import { body, btnPrimary, card, container, eyebrow, h1, h2, lead, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { listPublishedOpportunities } from "@/lib/opportunities";
import { listPublishedProfessional } from "@/lib/professional/queries";
import type { OpportunityTrack } from "@/lib/professional/model";

function AcademicEmpty() {
  return (
    <div className={cn(card, "p-10 text-center")}>
      <p className="text-[18px] font-bold text-[#1A2534]">The opportunity board is being updated</p>
      <p className="mt-2 text-[15px] text-[#2F4157]/70">Please check back soon, or browse our free resources meanwhile.</p>
      <Link href="/products/resources" className={cn(textLink, "mt-4")}>Free resources <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  );
}

// Shared by /opportunities (?type=academic|professional) and /opportunities/professional.
export async function OpportunitiesDirectory({ initialTrack }: { initialTrack: OpportunityTrack }) {
  const [academic, professional] = await Promise.all([listPublishedOpportunities(), listPublishedProfessional()]);
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="opportunities-page">
      <section className="bg-white pb-[32px] pt-[40px] md:pt-[64px]" aria-labelledby="hero">
        <div className={container}>
          <p className={eyebrow}>Opportunities</p>
          <h1 id="hero" className={cn(h1, "mt-4 max-w-[860px]")}>Find Your Next International Opportunity</h1>
          <p className={cn(lead, "mt-6 max-w-[720px]")}>Explore opportunities to study, grow, and build your career across borders.</p>
        </div>
      </section>

      <section className="bg-white pb-[64px] md:pb-[96px]" aria-label="Opportunity directory">
        <div className={container}>
          <OpportunitiesExplorer academic={academic} professional={professional} initialTrack={initialTrack} jobBasePath="/opportunities/professional" academicEmpty={<AcademicEmpty />} />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="prepare">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center")}>
          <div>
            <h2 id="prepare" className={h2}>Found one? Prepare it with people beside you</h2>
            <p className={cn(body, "mt-4 max-w-[620px]")}>
              Save opportunities to track your deadlines for free. Members also get written feedback on a CV or essay, live
              application clinics and a study buddy aiming for the same thing. We never guarantee selection or placement: the
              decision is always the program&apos;s or the employer&apos;s.
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

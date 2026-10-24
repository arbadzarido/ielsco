import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Footer from "@/components/footer";
import ResourceLibrary from "@/components/resources/ResourceLibrary";
import { body, btnPrimary, card, cardLink, container, eyebrow, h1, h2, h3, lead, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { IELS_GUIDES, PUBLIC_RESOURCES, TOPICS } from "@/data/public-resources";
import { ELCO_ENABLED, elcoHref } from "@/lib/elco";

export const metadata: Metadata = {
  title: "Free resources for scholarship, study-abroad and job applications | IELSco",
  description: "A checked list of free guides and official sites for scholarships, CVs and motivation letters, interviews and studying abroad, plus member stories and the IELS opportunity board.",
  alternates: { canonical: "https://ielsco.com/products/resources" },
  openGraph: { title: "Free resources | IELSco", description: "Checked guides and official sites for applications and going abroad.", url: "https://ielsco.com/products/resources" },
};

export default function ResourcesPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="resources-page">
      <section className="bg-white pb-[40px] pt-[40px] md:pt-[64px]" aria-labelledby="hero">
        <div className={container}>
          <p className={eyebrow}>Free resources</p>
          <h1 id="hero" className={cn(h1, "mt-4 max-w-[860px]")}>Good, free material for your next application</h1>
          <p className={cn(lead, "mt-6 max-w-[720px]")}>
            Guides and official sites we&apos;d send a friend to: scholarships, CVs and essays, interviews and studying abroad.
            Every link was checked on {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(PUBLIC_RESOURCES[0]?.linkCheckedOn ?? "2026-10-17"))}.
            No sign-up needed.
          </p>
        </div>
      </section>

      <section className="bg-white pb-[56px]" aria-labelledby="iels">
        <div className={container}>
          <h2 id="iels" className="text-[20px] font-bold text-[#1A2534]">From IELSco</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IELS_GUIDES.map((g) => (
              <li key={g.href}>
                <Link href={g.href} className={cn(cardLink, "flex h-full flex-col p-5")}>
                  <span className="text-[17px] font-bold text-[#1A2534]">{g.title}</span>
                  <span className="mt-1.5 flex-1 text-[14px] leading-relaxed text-[#2F4157]/75">{g.text}</span>
                  <ArrowRight size={16} className="mt-3 text-[#2F4157]" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="library">
        <div className={container}>
          <h2 id="library" className={h2}>The library</h2>
          <p className={cn(body, "mt-3 max-w-[680px]")}>These sites belong to their publishers; IELSco isn&apos;t affiliated with them and earns nothing from the links.</p>
          <div className="mt-8"><ResourceLibrary items={PUBLIC_RESOURCES} topics={TOPICS} /></div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="next">
        <div className={cn(container, "grid gap-6 lg:grid-cols-2")}>
          <div className={cn(card, "flex flex-col p-8")}>
            <h2 id="next" className={h3}>Want someone to read your draft?</h2>
            <p className={cn(body, "mt-2 flex-1")}>Members get written feedback on a CV, motivation letter or essay, plus live application clinics and a study buddy.</p>
            <Link href="/membership" className={cn(btnPrimary, "mt-6 self-start")}>About membership <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className={cn(card, "flex flex-col p-8")}>
            <h3 className={h3}>Practising English every day?</h3>
            <p className={cn(body, "mt-2 flex-1")}>
              General English practice lives in Elco AI, our separate English-learning app: guided lessons, conversation practice
              and a vocabulary notebook.
            </p>
            {ELCO_ENABLED
              ? <a href={elcoHref("resources")} target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-6")}>Try Elco AI <ArrowUpRight size={16} aria-hidden="true" /></a>
              : <Link href="/products/courses" className={cn(textLink, "mt-6")}>Or learn with a mentor in IELS Courses <ArrowRight size={16} aria-hidden="true" /></Link>}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

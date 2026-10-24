import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info, ShieldCheck } from "lucide-react";
import Footer from "@/components/footer";
import OpportunityActions from "@/components/opportunities/OpportunityActions";
import { DeadlinePill } from "@/components/opportunities/OpportunityBoard";
import { body, card, container, eyebrow, h1, h3, lead, pill, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, FUNDING_LABEL, getOpportunity, LEVEL_LABEL, regionLabel, verificationText } from "@/lib/opportunities";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const o = await getOpportunity((await params).slug);
  if (!o) return { title: "Opportunity not found | IELSco", robots: { index: false } };
  return {
    title: `${o.title}: overview and official link | IELSco`,
    description: o.summary.slice(0, 160),
    alternates: { canonical: `https://ielsco.com/opportunities/${o.slug}` },
    openGraph: { title: o.title, description: o.summary.slice(0, 200), url: `https://ielsco.com/opportunities/${o.slug}` },
  };
}

export default async function OpportunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const o = await getOpportunity((await params).slug);
  if (!o) notFound();
  const facts: [string, string][] = [
    ["Organizer", o.organizer],
    ["Type", CATEGORY_LABEL[o.category]],
    ["Where", o.regions.map(regionLabel).join(", ") || "Varies"],
    ["Who can apply", o.open_to ?? "See the official page"],
    ["Level", o.study_level ? LEVEL_LABEL[o.study_level] ?? o.study_level : "See the official page"],
    ["Funding", FUNDING_LABEL[o.funding]],
  ];
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="opportunity-detail">
      <article className={cn(container, "pb-[72px] pt-[32px] md:pt-[48px]")}>
        <Link href="/opportunities" className={cn(textLink, "text-[15px]")}><ArrowLeft size={16} aria-hidden="true" /> All opportunities</Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className={eyebrow}>{CATEGORY_LABEL[o.category]}{o.is_iels_program ? " · IELS program" : ""}</p>
            <h1 className={cn(h1, "mt-4 text-[34px] sm:text-[42px] lg:text-[48px]")}>{o.title}</h1>
            <p className={cn(lead, "mt-5")}>{o.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2"><span className={pill}>{FUNDING_LABEL[o.funding]}</span><DeadlinePill o={o} /></div>
            <div className="mt-8"><OpportunityActions id={o.id} officialUrl={o.official_url} /></div>

            <div className={cn("mt-10 flex gap-3 rounded-[16px] border p-5 text-[15px] leading-relaxed",
              o.verification === "verified" ? "border-[#CFE3D8] bg-[#F3FAF6] text-[#235E45]" : "border-[#E6E9EE] bg-[#F8FAFC] text-[#2F4157]")}>
              {o.verification === "verified" ? <ShieldCheck size={20} className="shrink-0" aria-hidden="true" /> : <Info size={20} className="shrink-0" aria-hidden="true" />}
              <p><span className="font-semibold">{verificationText(o)}.</span> {o.deadline_note ?? ""} The official page is always the final word on eligibility, dates and documents.</p>
            </div>

            {o.eligibility && (<section className="mt-10"><h2 className={h3}>Eligibility (summary)</h2><p className={cn(body, "mt-3 whitespace-pre-line")}>{o.eligibility}</p></section>)}
            {o.documents.length > 0 && (
              <section className="mt-10"><h2 className={h3}>Documents usually required</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] text-[#2F4157]/80">{o.documents.map((d) => <li key={d}>{d}</li>)}</ul>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <dl className={cn(card, "divide-y divide-[#E6E9EE]")}>
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-6 py-4 text-[15px]"><dt className="font-semibold text-[#1A2534]">{k}</dt><dd className="text-[#2F4157]/80">{v}</dd></div>
              ))}
            </dl>
            <div className={cn(card, "p-6")}>
              <h2 className={h3}>Prepare your application</h2>
              <ul className="mt-4 space-y-3 text-[15px]">
                <li><Link href="/products/resources" className={textLink}>Free guides: CV, motivation letter, interviews <ArrowRight size={15} aria-hidden="true" /></Link></li>
                <li><Link href="/membership" className={textLink}>Get written feedback as a member <ArrowRight size={15} aria-hidden="true" /></Link></li>
                <li><Link href="/products/courses" className={textLink}>Scholarship essay course <ArrowRight size={15} aria-hidden="true" /></Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </article>
      <Footer />
    </div>
  );
}

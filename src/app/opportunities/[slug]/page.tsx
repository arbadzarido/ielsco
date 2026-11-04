import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info, ShieldCheck } from "lucide-react";
import Footer from "@/components/footer";
import OpportunityActions from "@/components/opportunities/OpportunityActions";
import { DeadlinePill } from "@/components/opportunities/OpportunityBoard";
import { body, card, container, eyebrow, h1, h3, lead, pill, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { CATEGORY_LABEL, deadlineState, FUNDING_LABEL, getOpportunity, LEVEL_LABEL, listPublishedOpportunities, regionLabel, verificationText } from "@/lib/opportunities";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { OPPORTUNITY_ELCO_CONTEXT } from "@/lib/elco";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const o = await getOpportunity((await params).slug);
  if (!o) return { title: "Opportunity not found | IELSco", robots: { index: false } };
  return pageMetadata({ title: `${o.title}: overview and official link | IELSco`, description: o.summary.slice(0, 160), path: `/opportunities/${o.slug}` });
}

export default async function OpportunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const o = await getOpportunity((await params).slug);
  if (!o) notFound();
  // Related: other open listings of the same type, then other open listings.
  const others = (await listPublishedOpportunities()).filter((x) => x.id !== o.id && deadlineState(x.deadline) !== "closed");
  const related = [...others.filter((x) => x.category === o.category), ...others.filter((x) => x.category !== o.category)].slice(0, 3);
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
            <ElcoPractice context={OPPORTUNITY_ELCO_CONTEXT[o.category] ?? "scholarship"} refId={`opportunity-${o.category}`} />
          </aside>
        </div>
        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related-heading" data-testid="related-opportunities">
            <h2 id="related-heading" className={h3}>Related opportunities</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <li key={r.id} className={cn(card, "p-5")}>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{CATEGORY_LABEL[r.category]}</p>
                  <Link href={`/opportunities/${r.slug}`} className="mt-2 block text-[17px] font-bold leading-snug text-[#1A2534] hover:underline">{r.title}</Link>
                  <p className="mt-1 text-[14px] text-[#2F4157]/65">{r.organizer}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <Footer />
    </div>
  );
}

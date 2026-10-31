import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, focusRing, h1, h2, lead, pill, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { divisions } from "@/data/careers/divisions";
import { RECRUITMENT, recruitmentPhase } from "@/data/careers/recruitment";

export const revalidate = 600;

export function generateStaticParams() {
  return divisions.map((d) => ({ division: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ division: string }> }): Promise<Metadata> {
  const { division } = await params;
  const d = divisions.find((x) => x.slug === division);
  if (!d) return { title: "Division not found | IELSco" };
  return pageMetadata({ title: `${d.title} division: volunteer roles at IELSco & Elco AI`, description: d.description, path: `/careers/${d.slug}` });
}

const list = "mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#2F4157]/80";

export default async function DivisionPage({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  const d = divisions.find((x) => x.slug === division);
  if (!d) notFound();
  const phase = recruitmentPhase();
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="division-page">
      <div className={cn(container, "pb-[72px] pt-[32px] md:pt-[48px]")}>
        <Link href="/careers" className={cn(textLink, "text-[15px]")}><ArrowLeft size={16} aria-hidden="true" /> Careers at IELSco &amp; Elco AI</Link>
        <p className={cn(eyebrow, "mt-8")}>{RECRUITMENT.cohortName}</p>
        <h1 className={cn(h1, "mt-4 text-[36px] sm:text-[44px] lg:text-[52px]")}>{d.title} division</h1>
        <p className={cn(lead, "mt-5 max-w-[720px]")}>{d.description}</p>
        <div className="mt-6">
          {phase === "open" && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Applications open until {RECRUITMENT.closesLabel}</span>}
          {phase === "upcoming" && <span className={cn(pill, "border-[#577E90]/30 text-[#577E90]")}>Applications open {RECRUITMENT.opensLabel} – {RECRUITMENT.closesLabel}</span>}
          {phase === "closed" && <span className={pill}>Applications closed on {RECRUITMENT.closesLabel}</span>}
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <section aria-labelledby="roles">
            <h2 id="roles" className={cn(h2, "text-[26px] sm:text-[30px]")}>Roles</h2>
            <ul className="mt-6 space-y-4">
              {d.roles.map((r, i) => (
                <li key={r.id}>
                  <details className={cn(card, "group p-6")} open={i === 0} data-testid={`role-${r.id}`}>
                    <summary className={cn("flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden", focusRing)}>
                      <span>
                        <span className="block text-[18px] font-bold text-[#1A2534]">{r.title}</span>
                        <span className="mt-1 block text-[14px] text-[#2F4157]/65">{r.scope} · Remote</span>
                        <span className={cn(body, "mt-2 block text-[15px]")}>{r.summary}</span>
                      </span>
                      <ChevronDown size={18} className="mt-1 shrink-0 text-[#577E90] transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-5 grid gap-6 border-t border-[#E6E9EE] pt-5 md:grid-cols-3">
                      <div><p className="text-[14px] font-bold text-[#1A2534]">What you do</p><ul className={list}>{r.responsibilities.map((x) => <li key={x}>{x}</li>)}</ul></div>
                      {r.deliverables && <div><p className="text-[14px] font-bold text-[#1A2534]">What you deliver</p><ul className={list}>{r.deliverables.map((x) => <li key={x}>{x}</li>)}</ul></div>}
                      <div>
                        <p className="text-[14px] font-bold text-[#1A2534]">What we look for</p>
                        {r.required
                          ? <ul className={list}><li>{r.required}</li>{r.preferred && <li>Nice to have: {r.preferred}</li>}</ul>
                          : <p className="mt-2 text-[15px] leading-relaxed text-[#2F4157]/80">Motivation, reliability and the time to commit. We&apos;ll go through the details at the group session.</p>}
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className={cn(card, "p-6")}>
              <p className="text-[17px] font-bold text-[#1A2534]">The program</p>
              <ul className="mt-3 space-y-2 text-[15px] text-[#2F4157]/80">
                {RECRUITMENT.structure.map(([t, x]) => <li key={t}><span className="font-semibold text-[#1A2534]">{t}</span> · {x}</li>)}
              </ul>
              <Link href="/careers#facts" className={cn(textLink, "mt-4 text-[15px]")}>Benefits and requirements <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className={cn(card, "p-6")}>
              {phase === "closed" ? (
                <>
                  <p className="text-[17px] font-bold text-[#1A2534]">Interested in a future cohort?</p>
                  <p className={cn(body, "mt-2 text-[15px]")}>Applications for 2027 are closed. We&apos;ll email you when the next intake opens.</p>
                  <Link href="/careers#apply" className={cn(btnSecondary, "mt-5 w-full")}>Register interest</Link>
                </>
              ) : (
                <>
                  <p className="text-[17px] font-bold text-[#1A2534]">{phase === "open" ? "Ready to apply?" : `Applications open ${RECRUITMENT.opensLabel}`}</p>
                  <p className={cn(body, "mt-2 text-[15px]")}>Complete the five Instagram campaign tasks, then choose {d.title} in the form.</p>
                  <Link href="/careers#apply" className={cn(btnPrimary, "mt-5 w-full")}>{phase === "open" ? "Apply" : "How to apply"} <ArrowRight size={18} aria-hidden="true" /></Link>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

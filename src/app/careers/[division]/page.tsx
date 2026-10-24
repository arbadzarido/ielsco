import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, card, container, eyebrow, focusRing, h1, h2, lead, pill, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { divisions } from "@/data/careers/divisions";
import { RECRUITMENT } from "@/data/careers/recruitment";

export function generateStaticParams() {
  return divisions.map((d) => ({ division: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ division: string }> }): Promise<Metadata> {
  const { division } = await params;
  const d = divisions.find((x) => x.slug === division);
  if (!d) return { title: "Division not found | IELSco" };
  return {
    title: `${d.title} division: Associate roles at IELSco`,
    description: d.description,
    alternates: { canonical: `https://ielsco.com/careers/${d.slug}` },
  };
}

// Role descriptions in src/data/careers/divisions.ts are trusted, repo-authored HTML lists.
const html = "text-[15px] leading-relaxed text-[#2F4157]/80 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5";

export default async function DivisionPage({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  const d = divisions.find((x) => x.slug === division);
  if (!d) notFound();
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="division-page">
      <div className={cn(container, "pb-[72px] pt-[32px] md:pt-[48px]")}>
        <Link href="/careers" className={cn(textLink, "text-[15px]")}><ArrowLeft size={16} aria-hidden="true" /> Careers at IELSco</Link>
        <p className={cn(eyebrow, "mt-8")}>{RECRUITMENT.cohortName}</p>
        <h1 className={cn(h1, "mt-4 text-[36px] sm:text-[44px] lg:text-[52px]")}>{d.title} division</h1>
        <p className={cn(lead, "mt-5 max-w-[720px]")}>{d.description}</p>
        <div className="mt-6">
          {RECRUITMENT.open
            ? <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Applications open</span>
            : <span className={pill}>Applications closed on {RECRUITMENT.closedOn}. Roles below are from the 2026 cohort.</span>}
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-12">
            {d.subDivisions.map((s) => (
              <section key={s.name} aria-labelledby={`sd-${s.name}`}>
                <h2 id={`sd-${s.name}`} className={cn(h2, "text-[26px] sm:text-[30px]")}>{s.name}</h2>
                <p className={cn(body, "mt-2")}>{s.objective}</p>
                <ul className="mt-6 space-y-4">
                  {s.roles.map((r) => (
                    <li key={r.title}>
                      <details className={cn(card, "group p-6")}>
                        <summary className={cn("flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden", focusRing)}>
                          <span>
                            <span className="block text-[18px] font-bold text-[#1A2534]">{r.title}</span>
                            <span className="mt-1 block text-[14px] text-[#2F4157]/65">{r.level} · {r.mode}{r.duration ? ` · ${r.duration}` : ""}</span>
                            <span className={cn(body, "mt-2 block text-[15px]")}>{r.description}</span>
                          </span>
                          <ChevronDown size={18} className="mt-1 shrink-0 text-[#577E90] transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="mt-5 grid gap-6 border-t border-[#E6E9EE] pt-5 md:grid-cols-3">
                          <div><p className="text-[14px] font-bold text-[#1A2534]">What you do</p><div className={html} dangerouslySetInnerHTML={{ __html: r.jobDescription }} /></div>
                          <div><p className="text-[14px] font-bold text-[#1A2534]">What we looked for</p><div className={html} dangerouslySetInnerHTML={{ __html: r.requirements }} /></div>
                          <div><p className="text-[14px] font-bold text-[#1A2534]">What you gain</p><div className={html} dangerouslySetInnerHTML={{ __html: r.benefits }} /></div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className={cn(card, "p-6")}>
              <p className="text-[14px] font-semibold text-[#577E90]">Division lead</p>
              <div className="mt-4 flex items-center gap-4">
                <Image src={d.principal.image} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover grayscale" />
                <div><p className="text-[17px] font-bold text-[#1A2534]">{d.principal.name}</p><p className="text-[14px] text-[#2F4157]/70">{d.principal.role}</p></div>
              </div>
              <blockquote className="mt-4 text-[15px] italic leading-relaxed text-[#2F4157]/80">&ldquo;{d.principal.message}&rdquo;</blockquote>
            </div>
            <div className={cn(card, "p-6")}>
              {RECRUITMENT.open && RECRUITMENT.applyUrl ? (
                <a href={RECRUITMENT.applyUrl} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, "w-full")}>Apply <ArrowRight size={18} aria-hidden="true" /></a>
              ) : (
                <>
                  <p className="text-[17px] font-bold text-[#1A2534]">Interested in a future cohort?</p>
                  <p className={cn(body, "mt-2 text-[15px]")}>There are no open vacancies right now. We&apos;ll email you when the next intake opens.</p>
                  <Link href="/careers#interest" className={cn(btnPrimary, "mt-5 w-full")}>Register interest</Link>
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

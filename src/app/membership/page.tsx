import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Minus } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { Faq } from "@/components/site/Faq";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { elcoHref } from "@/lib/elco";
import { tutorRequestUrl } from "@/components/tutoring/links";
import { COMPARISON, ELCO_LINK_URL, ELCO_PLANS, ELCO_PRICING_URL, FREE_FEATURES, HOW_BENEFITS_REACH_IELSCO, MEMBERSHIP_FAQ, NOT_INCLUDED } from "@/data/membership";

export const metadata: Metadata = pageMetadata({
  title: "IELSco membership comes with Elco AI: Starter and Pro benefits",
  description: "IELSco has no separate membership. Subscribe to Elco AI Starter or Pro and link your accounts to get IELS Circle English speaking club sessions and, with Pro, monthly mentoring on IELSco.",
  path: "/membership",
});

export default function MembershipPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="membership-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Membership</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Your Elco AI plan is your IELSco membership</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              IELSco has no separate membership to buy. Subscribe to Elco AI Starter or Pro, link your Elco account with
              your IELSco account, and your English learning community benefits sync automatically: the IELS Circle
              speaking club and, with Pro, monthly mentoring.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={ELCO_PRICING_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="membership-primary-cta">
                See Elco plans <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <Link href="/sign-up" className={btnSecondary}>Create a free IELSco account</Link>
            </div>
            <p className="mt-4 text-[14px] text-[#2F4157]/60">Billing is handled by Elco AI. IELSco does not take membership payments.</p>
          </div>
          <Photo photo="discussion" ratio="landscape" priority position="40% center" />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="plans-h">
        <div className={container}>
          <div className="max-w-[680px]">
            <p className={eyebrow}>Benefits on IELSco</p>
            <h2 id="plans-h" className={cn(h2, "mt-3")}>Two Elco plans, two sets of IELSco benefits</h2>
            <p className={cn(lead, "mt-4")}>Both plans include the Elco AI features of that plan. This is what each adds on IELSco.</p>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:max-w-[940px]">
            {ELCO_PLANS.map((p) => (
              <li key={p.id} className={cn(card, "flex flex-col p-8")} data-testid={`elco-plan-${p.id}`}>
                <span className={cn(pill, "self-start")}>Elco AI plan</span>
                <h3 className={cn(h3, "mt-4 text-[26px]")}>{p.name}</h3>
                <p className={cn(body, "mt-2")}>{p.tagline}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  <li className="flex gap-3 text-[16px] leading-snug text-[#2F4157]"><Check size={19} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{p.elco}</li>
                  {p.ielsco.map((t) => (
                    <li key={t} className="flex gap-3 text-[16px] leading-snug text-[#2F4157]"><Check size={19} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{t}</li>
                  ))}
                </ul>
                <a href={ELCO_PRICING_URL} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, "mt-8")}>Get {p.name} <ArrowUpRight size={18} aria-hidden="true" /></a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="how">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <p className={eyebrow}>How it works</p>
            <h2 id="how" className={cn(h2, "mt-3")}>How benefits reach your IELSco account</h2>
            <ol className="mt-8 space-y-6">
              {HOW_BENEFITS_REACH_IELSCO.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div><p className="text-[17px] font-bold text-[#1A2534]">{s.title}</p><p className={cn(body, "mt-1")}>{s.text}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={ELCO_LINK_URL} target="_blank" rel="noopener noreferrer" className={btnSecondary} data-testid="membership-link-cta">Link your Elco account <ArrowUpRight size={18} aria-hidden="true" /></a>
              <Link href="/dashboard/membership" className={textLink}>Open Membership in your dashboard <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className={cn(card, "self-start p-7")}>
            <h3 className={h3}>What this does not include or promise</h3>
            <ul className="mt-4 space-y-3">
              {NOT_INCLUDED.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-[#2F4157]/80"><Minus size={18} className="mt-0.5 shrink-0 text-[#2F4157]/40" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="compare">
        <div className={container}>
          <h2 id="compare" className={h2}>Free account, Elco Starter and Elco Pro side by side</h2>
          <div className="relative mt-8 overflow-x-auto rounded-[20px] border border-[#E6E9EE]">
            <table className="w-full min-w-[560px] border-collapse text-left text-[14px] sm:text-[15px]">
              <caption className="sr-only">Comparison of a free IELSco account, Elco Starter and Elco Pro</caption>
              <thead>
                <tr className="border-b border-[#E6E9EE] bg-[#F8FAFC]">
                  <th scope="col" className="px-3 py-3 font-semibold text-[#1A2534] sm:px-5 sm:py-4">Feature</th>
                  <th scope="col" className="w-[20%] px-3 py-3 font-semibold text-[#1A2534] sm:px-5 sm:py-4">Free account</th>
                  <th scope="col" className="w-[20%] px-3 py-3 font-semibold text-[#1A2534] sm:px-5 sm:py-4">Elco Starter</th>
                  <th scope="col" className="w-[20%] px-3 py-3 font-semibold text-[#1A2534] sm:px-5 sm:py-4">Elco Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.feature} className="border-b border-[#E6E9EE] last:border-0">
                    <th scope="row" className="px-3 py-3 font-medium text-[#2F4157] sm:px-5 sm:py-4">{r.feature}</th>
                    {[r.free, r.starter, r.pro].map((v, i) => (
                      <td key={i} className="px-3 py-3 text-[#2F4157] sm:px-5 sm:py-4">
                        {v === true ? <><Check size={18} className="text-[#2D7A58]" aria-hidden="true" /><span className="sr-only">Included</span></>
                          : v === false ? <><Minus size={18} className="text-[#2F4157]/35" aria-hidden="true" /><span className="sr-only">Not included</span></>
                          : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="free">
        <div className={container}>
          <div className="max-w-[640px]">
            <p className={eyebrow}>Free IELSco account</p>
            <h2 id="free" className={cn(h2, "mt-3")}>Start free. It stays useful.</h2>
            <p className={cn(lead, "mt-4")}>A free account is not a trial. It is how most people use IELSco.</p>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_FEATURES.map((f) => (
              <li key={f.title} className={cn(card, "p-6")}>
                <Check size={20} className="text-[#2D7A58]" aria-hidden="true" />
                <p className="mt-4 text-[17px] font-bold text-[#1A2534]">{f.title}</p>
                <p className={cn(body, "mt-1.5 text-[15px]")}>{f.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            <a href={elcoHref("membership")} target="_blank" rel="noopener noreferrer" className={textLink}>Access Elco AI <ArrowUpRight size={16} aria-hidden="true" /></a>
            <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className={textLink}>Request a private tutor (Rp90,000 per session) <ArrowUpRight size={16} aria-hidden="true" /></a>
            <a href="https://circle.ielsco.com" target="_blank" rel="noopener noreferrer" className={textLink}>IELS Circle English learning community <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="faq">
        <div className={cn(container, "max-w-[860px]")}>
          <h2 id="faq" className={h2}>Questions</h2>
          <Faq className="mt-8" items={MEMBERSHIP_FAQ} />
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: MEMBERSHIP_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }) }} />
      <Footer />
    </div>
  );
}

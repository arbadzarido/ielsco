import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Laptop, Wallet } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Faq } from "@/components/site/Faq";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { divisions } from "@/data/careers/divisions";
import { RECRUITMENT } from "@/data/careers/recruitment";

export const metadata: Metadata = {
  title: "Careers and volunteering at IELSco: the Associate Program",
  description: "IELSco is run by a small core team and a cohort of part-time, remote Associates. See the divisions, what the work involves, how selection works, and register your interest for the next intake.",
  alternates: { canonical: "https://ielsco.com/careers" },
  openGraph: { title: "Careers at IELSco", description: "Work on real programs as an IELS Associate.", url: "https://ielsco.com/careers", images: ["/images/site/team-portrait.webp"] },
};

const CULTURE = [
  ["Real work, not simulations", "Associates run live programs, talk to partners and ship things members use."],
  ["Clear owners and outputs", "Every task has an owner and an expected result. You get feedback on the work, not on hours logged."],
  ["Learn by doing it with us", "Principals and the core team review your work and coach you through the cohort."],
];

export default function CareersPage() {
  const roleCount = (d: (typeof divisions)[number]) => d.subDivisions.reduce((n, s) => n + s.roles.length, 0);
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="careers-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Careers &amp; volunteering</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Help run IELSco from the inside</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              IELSco is run by a small core team and a cohort of part-time Associates, most of them university students.
              Associates run programs, grow the community and build partnerships, remotely and alongside their studies.
            </p>
            <div className="mt-6" data-testid="recruitment-status">
              {RECRUITMENT.open
                ? <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Applications are open</span>
                : <span className={pill}>Applications for the 2026 cohort closed on {RECRUITMENT.closedOn}</span>}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {RECRUITMENT.open && RECRUITMENT.applyUrl
                ? <a href={RECRUITMENT.applyUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Apply now <ArrowRight size={18} aria-hidden="true" /></a>
                : <a href="#interest" className={btnPrimary} data-testid="careers-cta">Register interest for the next intake <ArrowRight size={18} aria-hidden="true" /></a>}
              <a href="#divisions" className={btnSecondary}>See the divisions</a>
            </div>
          </div>
          <Photo photo="teamPortrait" priority caption="Members of the IELS team." />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="facts">
        <div className={container}>
          <h2 id="facts" className={h2}>The Associate Program at a glance</h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: Clock, t: "Time", d: `${RECRUITMENT.commitment}. The 2026 cohort runs ${RECRUITMENT.period}.` },
              { icon: Laptop, t: "Where", d: "Online. There may be occasional in-person events, usually in big cities, announced early." },
              { icon: Wallet, t: "Pay", d: RECRUITMENT.pay },
            ].map((f) => (
              <li key={f.t} className={cn(card, "p-7")}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><f.icon size={20} aria-hidden="true" /></span>
                <h3 className={cn(h3, "mt-5")}>{f.t}</h3>
                <p className={cn(body, "mt-2")}>{f.d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {CULTURE.map(([t, d]) => (
              <div key={t} className="border-l-2 border-[#E56668] pl-5"><p className="text-[17px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1")}>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="divisions" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="div-h">
        <div className={container}>
          <div className="max-w-[640px]">
            <p className={eyebrow}>Divisions</p>
            <h2 id="div-h" className={cn(h2, "mt-3")}>Where Associates work</h2>
            <p className={cn(lead, "mt-4")}>Each division page lists the roles of the 2026 cohort, what they involve and what you learn.</p>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((d) => (
              <li key={d.slug}>
                <Link href={`/careers/${d.slug}`} className={cn(cardLink, "flex h-full flex-col p-7")}>
                  <p className="text-[14px] font-semibold text-[#577E90]">{roleCount(d)} roles in 2026</p>
                  <h3 className={cn(h3, "mt-2")}>{d.title}</h3>
                  <p className={cn(body, "mt-2 flex-1 text-[15px]")}>{d.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157]">See roles <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="process">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <p className={eyebrow}>Selection</p>
            <h2 id="process" className={cn(h2, "mt-3")}>How selection works</h2>
            <ol className="mt-8 space-y-6">
              {RECRUITMENT.process.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div><p className="text-[17px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1")}>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <Faq className="self-start" items={[
            { q: "Who could apply last time?", a: RECRUITMENT.lastEligibility },
            { q: "Do I need perfect English?", a: "No. We value growth and consistency, and we train Associates during the apprenticeship." },
            { q: "Can I apply for more than one role?", a: "In the 2026 intake you could choose a first and an optional second preference." },
            { q: "When is the next intake?", a: "It hasn't been announced. Register your interest below and we'll email you when it opens." },
          ]} />
        </div>
      </section>

      <section id="interest" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="interest-h">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16")}>
          <div>
            <h2 id="interest-h" className={h2}>Register your interest</h2>
            <p className={cn(lead, "mt-4")}>We&apos;ll email you when the next intake opens. This isn&apos;t an application and there are no current vacancies.</p>
            <p className={cn(body, "mt-6")}>Questions? <a className="font-semibold underline" href="mailto:careers@ielsco.com">careers@ielsco.com</a></p>
          </div>
          <div className={cn(card, "p-7 sm:p-8")}>
            <InquiryForm
              kind="careers"
              fields={["organization", "topic", "message"]}
              labels={{ organization: "University (optional)", topic: "Division you're most interested in", message: "Anything you'd like us to know (optional)" }}
              topics={[...divisions.map((d) => ({ value: d.slug, label: d.title })), { value: "unsure", label: "Not sure yet" }]}
              submitLabel="Keep me posted"
              successTitle="You're on our list"
              successText="We'll email you when the next Associate intake opens."
            />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

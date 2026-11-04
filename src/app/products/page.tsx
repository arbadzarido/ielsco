import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Compass, GraduationCap, Library, School, Sparkles, Users, UserPlus } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { body, btnPrimary, btnSecondary, cardLink, container, eyebrow, h1, h2, lead, section, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { elcoHref } from "@/lib/elco";
import { TutoringPanel } from "@/components/tutoring/TutoringPanel";
import { TUTOR_PRICE_LABEL } from "@/components/tutoring/links";

export const metadata: Metadata = pageMetadata({
  title: "Programs at IELSco: Elco AI, private English tutor, IELS Circle and fellowships",
  description: "Learn and practise English with Elco AI, add a private English tutor at Rp90,000 per session, join the IELS Circle English learning community, explore opportunities and the Global Impact Fellowship.",
  path: "/products",
});

type Item = { icon: typeof Compass; name: string; text: string; href: string; cost: string; external?: boolean };
const GROUPS: { title: string; intro: string; items: Item[] }[] = [
  {
    title: "Find opportunities", intro: "Know what exists and what it takes.",
    items: [
      { icon: Compass, name: "Opportunity board", text: "Scholarships, fellowships and programs with official links and honest verification labels.", href: "/opportunities", cost: "Free" },
      { icon: Library, name: "Free resources", text: "Checked guides for scholarships, CVs, essays, interviews and studying abroad.", href: "/products/resources", cost: "Free" },
      { icon: BookOpen, name: "Member stories", text: "Members who studied, interned or volunteered abroad, in their own words.", href: "/circle/stories", cost: "Free" },
    ],
  },
  {
    title: "Practise and connect", intro: "People to practise with and learn from.",
    items: [
      { icon: Users, name: "IELS Circle", text: "Our English learning community: open online speaking sessions every Wednesday 19:00 and Saturday 13:00 WIB.", href: "https://circle.ielsco.com", cost: "Free", external: true },
      { icon: CalendarDays, name: "Events", text: "Info sessions, workshops and talks, often with partner organizations.", href: "/events", cost: "Mostly free" },
      { icon: UserPlus, name: "Elco member benefits", text: "No separate IELSco membership: Elco Starter and Pro plans carry IELS Circle speaking club access to your IELSco account.", href: "/membership", cost: "With an Elco plan" },
    ],
  },
  {
    title: "Go deeper", intro: "Human support and programs with a clear outcome.",
    items: [
      { icon: GraduationCap, name: "Private tutoring", text: "One-to-one sessions with an IELSco tutor, on top of learning with Elco AI. Request a session when you need one.", href: "/products/courses", cost: TUTOR_PRICE_LABEL },
      { icon: Sparkles, name: "Global Impact Fellowship", text: "Leadership and project incubation for youth across Southeast Asia, held at NUS.", href: "/events/gif", cost: "Self-funded" },
      { icon: School, name: "IELS for Schools", text: "Sessions and workshops planned with your school.", href: "/school", cost: "Quoted per school" },
    ],
  },
];

function ItemLink({ item, children }: { item: Item; children: React.ReactNode }) {
  const cls = cn(cardLink, "flex h-full flex-col p-7");
  return item.external
    ? <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
    : <Link href={item.href} className={cls}>{children}</Link>;
}

export default function ProgramsPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="programs-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[72px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Programs</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Learn English with Elco AI. Grow with IELSco.</h1>
            <p className={cn(lead, "mt-6 max-w-[560px]")}>Elco AI is where you learn, practise and prepare for tests. IELSco adds people: private tutors, the IELS Circle community, opportunities and fellowships. Costs are stated up front.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className={btnPrimary}>Create a free account <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href={elcoHref("programs-hero")} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Access Elco AI <ArrowUpRight size={18} aria-hidden="true" /></a>
            </div>
          </div>
          <Photo photo="onlineSession" ratio="wide" priority position="center 30%" />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="learn">
        <div className={container}>
          <h2 id="learn" className={h2}>Two ways to learn English</h2>
          <p className={cn(lead, "mt-2 max-w-[720px]")}>Use Elco AI every day. Add a human tutor when you want one-to-one feedback.</p>
          <TutoringPanel refId="programs" className="mt-8" />
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} className={cn(section, "border-t border-[#E6E9EE]")} aria-label={g.title}>
          <div className={container}>
            <h2 className={h2}>{g.title}</h2>
            <p className={cn(lead, "mt-2")}>{g.intro}</p>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {g.items.map((i) => (
                <li key={i.name}>
                  <ItemLink item={i}>
                    <span className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><i.icon size={20} aria-hidden="true" /></span>
                      <span className="text-[13px] font-semibold text-[#577E90]">{i.cost}</span>
                    </span>
                    <span className="mt-5 text-[19px] font-bold text-[#1A2534]">{i.name}</span>
                    <span className={cn(body, "mt-2 flex-1 text-[15px]")}>{i.text}</span>
                    <ArrowRight size={17} className="mt-5 text-[#2F4157]" aria-hidden="true" />
                  </ItemLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <Footer />
    </div>
  );
}

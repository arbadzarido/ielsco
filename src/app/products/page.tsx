import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Compass, GraduationCap, Library, School, Sparkles, Users, UserPlus } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { body, btnPrimary, btnSecondary, cardLink, container, eyebrow, h1, h2, lead, section, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { ELCO_ENABLED, elcoHref } from "@/lib/elco";

export const metadata: Metadata = pageMetadata({
  title: "Programs at IELSco: opportunities, community, courses and fellowships",
  description: "Everything IELSco offers in one place: the opportunity board, IELS Circle, member stories, IELS Courses, events, the Global Impact Fellowship, membership and IELS for Schools.",
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
      { icon: Users, name: "IELS Circle", text: "Open online speaking sessions every Wednesday 19:00 and Saturday 13:00 WIB.", href: "/circle", cost: "Free" },
      { icon: CalendarDays, name: "Events", text: "Info sessions, workshops and talks, often with partner organizations.", href: "/events", cost: "Mostly free" },
      { icon: UserPlus, name: "Membership", text: "Application clinics, written feedback, a study buddy and a private member group.", href: "/membership", cost: "Paid (opening soon)" },
    ],
  },
  {
    title: "Go deeper", intro: "Structured programs with a clear outcome.",
    items: [
      { icon: GraduationCap, name: "IELS Courses", text: "Mentor-led courses for scholarship essays, careers abroad, tests and speaking.", href: "/products/courses", cost: "Paid per course" },
      { icon: Sparkles, name: "Global Impact Fellowship", text: "Leadership and project incubation for youth across Southeast Asia, held at NUS.", href: "/events/gif", cost: "Self-funded" },
      { icon: School, name: "IELS for Schools", text: "Sessions and workshops planned with your school.", href: "/school", cost: "Quoted per school" },
    ],
  },
];

export default function ProgramsPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="programs-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[72px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Programs</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Everything IELSco offers, and what it costs</h1>
            <p className={cn(lead, "mt-6 max-w-[560px]")}>Most of it is free. Paid programs say so up front, and none of them is required to use the rest.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className={btnPrimary}>Create a free account <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/opportunities" className={btnSecondary}>Browse opportunities</Link>
            </div>
          </div>
          <Photo photo="onlineSession" ratio="wide" priority position="center 30%" />
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
                  <Link href={i.href} className={cn(cardLink, "flex h-full flex-col p-7")}>
                    <span className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><i.icon size={20} aria-hidden="true" /></span>
                      <span className="text-[13px] font-semibold text-[#577E90]">{i.cost}</span>
                    </span>
                    <span className="mt-5 text-[19px] font-bold text-[#1A2534]">{i.name}</span>
                    <span className={cn(body, "mt-2 flex-1 text-[15px]")}>{i.text}</span>
                    <ArrowRight size={17} className="mt-5 text-[#2F4157]" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {ELCO_ENABLED && (
        <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="elco">
          <div className={cn(container, "flex flex-col gap-6 md:flex-row md:items-center md:justify-between")}>
            <div className="max-w-[640px]">
              <h2 id="elco" className={h2}>Daily English practice? That&apos;s Elco AI</h2>
              <p className={cn(lead, "mt-3")}>Elco AI is our separate English-learning app, with its own free and paid plans. IELSco stays your place for opportunities and people.</p>
            </div>
            <a href={elcoHref("programs")} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Open Elco AI <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}

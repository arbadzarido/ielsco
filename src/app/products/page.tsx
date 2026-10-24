import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, GraduationCap, Library, School, Sparkles, Users } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, section, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "What IELS offers | Community & Opportunities",
  description: "IELS connects Southeast Asian learners with people, free resources, the weekly IELS Circle, and programs such as the Global Impact Fellowship.",
};

// Product page = IELS strategy: Community & Opportunities. Each offering links to a page that exists today.
const JOURNEY = [
  {
    step: "01", title: "Discover", intro: "Find what's relevant to your goal, and the people who have walked that path.",
    items: [
      { icon: Library, name: "Free resources", text: "Grammar guides, recordings and scholarship lists to use at your own pace.", href: "/products/resources" },
      { icon: BookOpen, name: "Member stories", text: "Members write about exchanges, internships and programs abroad, in their own words.", href: "/circle/stories" },
    ],
  },
  {
    step: "02", title: "Participate", intro: "Practise with others every week and build the confidence to speak up.",
    items: [
      { icon: Users, name: "IELS Circle", text: "Online sessions every Wednesday 19:00 and Saturday 13:00 WIB, each with a new topic.", href: "/circle" },
      { icon: CalendarDays, name: "Circle cohort agenda", text: "The plan for the current Circle cohort, session by session.", href: "/circle/agenda" },
    ],
  },
  {
    step: "03", title: "Take the next step", intro: "Programs and events that open doors to study and work opportunities.",
    items: [
      { icon: Sparkles, name: "Global Impact Fellowship", text: "A leadership and project incubation program for youth across Southeast Asia, held at NUS.", href: "/events/gif" },
      { icon: CalendarDays, name: "Events", text: "Info sessions, workshops and fellowships with universities and partners.", href: "/events" },
    ],
  },
];

const ALSO = [
  { icon: School, name: "IELS for Schools", text: "A portal for partner schools to follow their students' English learning.", href: "https://school.ielsco.com", external: true },
  { icon: GraduationCap, name: "IELS Courses", text: "Guided English courses for communication, test preparation and professional growth.", href: "/products/courses" },
];

const PAST_PROGRAMS = [
  { name: "English Global Festival", text: "A national showcase of English, ideas and youth collaboration." },
  { name: "Step Up!", text: "A program for academic and professional English readiness." },
  { name: "IELS Insight Series", text: "Discussions with mentors, universities and professionals." },
  { name: "Singapore Global Insight Trip", text: "International exposure with universities and institutions in Singapore." },
];

export default function ProductsPage() {
  return (
    <div className={cn(siteRoot, "bg-white")} data-testid="products-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[72px] md:pt-[64px]">
        <div className={cn(container, "grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]")}>
          <div>
            <p className={eyebrow}>What IELS offers</p>
            <h1 className={cn(h1, "mt-3")}>Community first. Opportunities next.</h1>
            <p className={cn(lead, "mt-5 max-w-[600px]")}>
              IELS is a community for learners across Southeast Asia. You discover resources and people, take part in the
              weekly Circle, and move on to programs and opportunities when you are ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className={btnPrimary}>Join IELS for free <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/events" className={btnSecondary}>See events and programs</Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[360px]">
            <Image src="/images/contents/mascot/poses/wink-jump.png" alt="" fill sizes="360px" className="object-contain" priority />
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="journey-heading">
        <div className={container}>
          <h2 id="journey-heading" className={h2}>How members use IELS</h2>
          <ol className="mt-12 space-y-12">
            {JOURNEY.map((j) => (
              <li key={j.step} className="grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-12">
                <div>
                  <span className="text-[14px] font-bold text-[#577E90]">{j.step}</span>
                  <h3 className="mt-1 text-[26px] font-extrabold text-[#1A2534]">{j.title}</h3>
                  <p className={cn(body, "mt-2")}>{j.intro}</p>
                </div>
                <ul className="grid gap-5 sm:grid-cols-2">
                  {j.items.map((it) => (
                    <li key={it.name}>
                      <Link href={it.href} className={cn(cardLink, "flex h-full flex-col p-6")}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><it.icon size={20} aria-hidden="true" /></span>
                        <span className={cn(h3, "mt-5")}>{it.name}</span>
                        <span className={cn(body, "mt-2 flex-1")}>{it.text}</span>
                        <span className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157]">Open <ArrowRight size={16} aria-hidden="true" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="also-heading">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2")}>
          <div>
            <h2 id="also-heading" className={h2}>Also from IELS</h2>
            <ul className="mt-8 space-y-4">
              {ALSO.map((a) => (
                <li key={a.name}>
                  <a href={a.href} {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cn(cardLink, "flex items-start gap-4 p-5")}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><a.icon size={20} aria-hidden="true" /></span>
                    <span>
                      <span className="flex items-center gap-1.5 text-[17px] font-bold text-[#1A2534]">{a.name}{a.external && <ArrowUpRight size={16} aria-hidden="true" />}</span>
                      <span className={cn(body, "mt-1 block")}>{a.text}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={h2}>Programs we have run</h2>
            <p className={cn(body, "mt-3")}>Past IELS programs. Upcoming ones are announced on the events page.</p>
            <ul className={cn(card, "mt-6 divide-y divide-[#E6E9EE]")}>
              {PAST_PROGRAMS.map((p) => (
                <li key={p.name} className="p-5">
                  <p className="text-[16px] font-bold text-[#1A2534]">{p.name}</p>
                  <p className={cn(body, "mt-1")}>{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, Compass, Instagram, Linkedin } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, focusRing, h1, h2, h3, lead, section, textLink, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About IELSco | English community & global opportunities in Southeast Asia",
  description: "IELS (PT English Space Berkah Indonesia) is a community that connects Southeast Asian youth with people, resources, programs and international opportunities.",
  path: "/about",
});

type Leader = { name: string; role: string; image: string; instagram?: string; linkedin?: string; background: string; experience: string; inactive?: boolean };

const ADVISORS: Leader[] = [
  {
    name: "Alfiandi Imam Mawardi", role: "President Commissioner", image: "/images/people/directors/alfiandi.png",
    instagram: "https://www.instagram.com/alfiandiimam/", linkedin: "https://www.linkedin.com/in/alfiandi-imam-mawardi-06249893/",
    background: "Currently serving as the Founder and Commissioner of LANDASI, focusing on startup incubation, bootstrap investment, and fostering digital business ecosystems.",
    experience: "Brings over 8 years of experience at UPN 'Veteran' Jawa Timur's Innovation & Entrepreneur Center, alongside his past executive role as Founder & CEO of Tapfast Indonesia.",
  },
  {
    name: "Khairi Pandya Adhikara", role: "Strategic Advisor", image: "/images/people/directors/pandya1.png",
    instagram: "https://www.instagram.com/khairi.pandya/", linkedin: "https://www.linkedin.com/in/khairi-pandya/",
    background: "Currently serving as Sr. OD Specialist at STAR Capital, focusing on Organizational Development and Structure.",
    experience: "Former Manager of Organization & Workforce Transformation at Deloitte, managing stakeholder relations and human capital initiatives for over 2 years.",
  },
];

const DIRECTORS: Leader[] = [
  {
    name: "Arbadza Rido", role: "Co-Founder & CEO, IELSco & Elco AI", image: "/images/people/leadership/arbadza.png",
    instagram: "https://instagram.com/arbadzarido", linkedin: "https://linkedin.com/in/arbadzarido",
    background: "Professional EFL & ESL Teacher with over 3 years of experience teaching across various countries in Southeast Asia.",
    experience: "Former Project Manager at Pertamina Training & Consulting and Tech in Asia, leading cross-functional teams in high-impact corporate projects.",
  },
  {
    name: "Fadhila Qurotul Aini", role: "Co-Founder of IELSco", image: "/images/people/directors/dhila2.png", inactive: true,
    instagram: "https://www.instagram.com/fadhilaqa._/", linkedin: "https://linkedin.com/in/fadhilaqa/",
    background: "Successfully streamlined international outreach and digital operations to connect local talent with high-tier global aesthetic science networks.",
    experience: "Former Marketing and Operations Intern at IFAAS (International Fellowship In Advanced Aesthetic Science), managing remote global projects for 7 months.",
  },
];

// Elco AI is operated by PT Elco Edukasi Berkah Indonesia, a subsidiary of PT English Space Berkah Indonesia.
const ELCO_LEADERS: Leader[] = [
  {
    name: "Muhammad Farrel Alrezky", role: "Co-Founder & COO, Elco AI", image: "/images/people/leadership/farrel.png",
    instagram: "https://www.instagram.com/farelalres/", linkedin: "https://www.linkedin.com/in/muhammadfarrelalrezky/",
    background: "Business development and B2B enterprise sales, driving revenue and high-value strategic partnerships.",
    experience: "A top national sales performer who has closed enterprise AI and asset projects worth IDR 100 million to more than IDR 10 billion.",
  },
];

const STRATEGIC_PARTNERS: Leader[] = [
  {
    name: "Andrew Pandu Sembiring", role: "Strategic Partner", image: "/images/people/leadership/andrew.png",
    linkedin: "https://www.linkedin.com/in/andrew-pandu-sembiring-07a627138/",
    background: "President Director of PT Ficotama Bina Trampil since July 1998.",
    experience: "More than 20 years of experience in recruitment services for international labour supply, based in Indonesia.",
  },
];

const PRINCIPLES = [
  { icon: BookOpen, title: "Accessibility with purpose", text: "Background should never decide someone's global potential. We keep programs structured and affordable, and many resources free." },
  { icon: Award, title: "Focused on real outcomes", text: "We care about progress toward a goal: a scholarship, an exchange, a first role abroad. Not just attendance." },
  { icon: Compass, title: "Community as a system", text: "People grow faster together. Members practise, share what worked, and pull each other forward." },
];

function LeaderCard({ p }: { p: Leader }) {
  return (
    <li className={cn(card, "overflow-hidden")}>
      <div className="flex gap-5 p-5">
        <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[16px] bg-[#F1F4F8]">
          <Image src={p.image} alt={p.name} fill sizes="96px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-[18px] font-bold text-[#1A2534]">{p.name}</p>
          <p className="text-[15px] font-semibold text-[#577E90]">{p.role}</p>
          {p.inactive && <span className="mt-1.5 inline-flex rounded-full bg-[#F1F4F8] px-2.5 py-0.5 text-[13px] font-semibold text-[#2F4157]/70">Inactive</span>}
          {(p.instagram || p.linkedin) && <div className="mt-3 flex gap-2">
            {p.instagram && <a href={p.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on Instagram`} className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E9EE] text-[#2F4157] hover:border-[#2F4157]", focusRing)}><Instagram size={16} aria-hidden="true" /></a>}
            {p.linkedin && <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on LinkedIn`} className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E9EE] text-[#2F4157] hover:border-[#2F4157]", focusRing)}><Linkedin size={16} aria-hidden="true" /></a>}
          </div>}
        </div>
      </div>
      <details className="group border-t border-[#E6E9EE]">
        <summary className={cn("cursor-pointer list-none px-5 py-3 text-[15px] font-semibold text-[#2F4157] hover:bg-[#F7F8FA] [&::-webkit-details-marker]:hidden", focusRing)}>
          <span className="group-open:hidden">Show background</span><span className="hidden group-open:inline">Hide background</span>
        </summary>
        <div className="space-y-3 px-5 pb-5 text-[15px] leading-relaxed text-[#2F4157]/80">
          <p><span className="font-semibold text-[#1A2534]">Background. </span>{p.background}</p>
          <p><span className="font-semibold text-[#1A2534]">Experience. </span>{p.experience}</p>
        </div>
      </details>
    </li>
  );
}

export default function About() {
  return (
    <div className={cn(siteRoot, "bg-white")} data-testid="about-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[80px] md:pt-[64px]">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]")}>
          <div>
            <p className={eyebrow}>About IELS</p>
            <h1 className={cn(h1, "mt-3")}>English is not a subject. It is access.</h1>
            <p className={cn(lead, "mt-5 max-w-[580px]")}>
              IELS, legally incorporated as PT English Space Berkah Indonesia, is an inclusive community that helps Southeast
              Asian youth reach scholarships, exchanges, internships and work beyond their home country.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className={btnPrimary}>What IELS offers <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/circle" className={btnSecondary}>Visit the Circle</Link>
            </div>
          </div>
          <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] border border-[#E6E9EE]">
            <Image src="/images/contents/careers/iels_team_1.png" alt="The IELS team" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="mission-heading">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Our mission</p>
            <h2 id="mission-heading" className={cn(h2, "mt-3")}>Talent is everywhere. Access is not.</h2>
          </div>
          <div className={cn(lead, "space-y-5")}>
            <p>
              Many students in Southeast Asia dream of studying abroad, building an international career or joining a global
              program. What holds them back is rarely ability. It is access to information, to people who have done it, and to
              an environment where practising English feels normal.
            </p>
            <p>
              For too long English has been taught as a school subject to pass exams. IELS treats it as a way in: to communities,
              to programs and to opportunities.
            </p>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="approach-heading">
        <div className={container}>
          <p className={eyebrow}>Our approach</p>
          <h2 id="approach-heading" className={cn(h2, "mt-3 max-w-[720px]")}>Discover, participate, then take the next step</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { t: "Discover", d: "Free resources and member stories help you see what is possible and how others got there.", href: "/products/resources", cta: "Free resources" },
              { t: "Participate", d: "The weekly IELS Circle gives you a place to practise, ask questions and meet people with similar goals.", href: "/circle", cta: "IELS Circle" },
              { t: "Take the next step", d: "Programs such as the Global Impact Fellowship and our events connect members with universities and partners.", href: "/events", cta: "Events & programs" },
            ].map((s, i) => (
              <div key={s.t} className={cn(card, "flex flex-col p-7")}>
                <span className="text-[14px] font-bold text-[#577E90]">0{i + 1}</span>
                <h3 className={cn(h3, "mt-2")}>{s.t}</h3>
                <p className={cn(body, "mt-2 flex-1")}>{s.d}</p>
                <Link href={s.href} className={cn(textLink, "mt-5")}>{s.cta} <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            ))}
          </div>
          <h3 className="mt-16 text-[22px] font-extrabold text-[#1A2534]">What we hold ourselves to</h3>
          <ul className="mt-6 grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><p.icon size={20} aria-hidden="true" /></span>
                <div>
                  <p className="text-[17px] font-bold text-[#1A2534]">{p.title}</p>
                  <p className={cn(body, "mt-1")}>{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="community-heading">
        <div className={container}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[640px]">
              <p className={eyebrow}>Our community</p>
              <h2 id="community-heading" className={cn(h2, "mt-3")}>Online every week, together in person when we can</h2>
            </div>
            <Link href="/circle/stories" className={textLink}>Read member stories <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { src: "/images/contents/careers/iels_team_0.png", alt: "IELS members at an in-person session" },
              { src: "/images/contents/careers/iels_team_2.png", alt: "IELS members at a community event" },
              { src: "/images/contents/careers/iels_team_3.png", alt: "IELS members together at an event" },
            ].map((img, i) => (
              <div key={img.src} className={cn("relative aspect-[4/3] overflow-hidden rounded-[20px] border border-[#E6E9EE]", i === 2 && "sm:col-span-2 lg:col-span-1")}>
                <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 380px, 50vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="leadership-heading">
        <div className={container}>
          <p className={eyebrow}>Leadership</p>
          <h2 id="leadership-heading" className={cn(h2, "mt-3")}>The people behind IELS</h2>
          <div className="mt-10 grid gap-12 lg:grid-cols-2">
            <div>
              <h3 className="text-[18px] font-bold text-[#2F4157]">Board of Advisors</h3>
              <ul className="mt-5 space-y-5">{ADVISORS.map((p) => <LeaderCard key={p.name} p={p} />)}</ul>
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#2F4157]">Board of Directors</h3>
              <ul className="mt-5 space-y-5">{DIRECTORS.map((p) => <LeaderCard key={p.name} p={p} />)}</ul>
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#2F4157]">Elco AI</h3>
              <p className="mt-1 text-[15px] text-[#2F4157]/70">
                <a href="https://www.elcoai.com/about" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Elco AI</a> is operated by PT Elco Edukasi Berkah Indonesia, a subsidiary of PT English Space Berkah Indonesia.
              </p>
              <ul className="mt-5 space-y-5">{ELCO_LEADERS.map((p) => <LeaderCard key={p.name} p={p} />)}</ul>
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#2F4157]">Strategic Partner</h3>
              <ul className="mt-5 space-y-5">{STRATEGIC_PARTNERS.map((p) => <LeaderCard key={p.name} p={p} />)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")}>
        <div className={cn(container, "flex flex-col gap-6 md:flex-row md:items-center md:justify-between")}>
          <div>
            <h2 className={h2}>Work with us</h2>
            <p className={cn(lead, "mt-2 max-w-[560px]")}>Universities, schools and organisations can partner with IELS. Members can also join the team.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/partners" className={btnPrimary}>Partner with IELS</Link>
            <Link href="/careers" className={btnSecondary}>Careers at IELS</Link>
            <a href="mailto:hello@ielsco.com" className={btnSecondary}>hello@ielsco.com</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

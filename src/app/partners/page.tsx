"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import CountUp from "react-countup";
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { useState } from "react";
import DemographySection from "@/components/demography/DemographySection";

export default function PartnersPage() {

    const [active] = useState(false);
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#ffffff] text-[#294154] font-geologica">
       <Header />
      {/* ===== HERO SECTION ===== */}
<section className="relative overflow-hidden w-full bg-white py-16 px-4 sm:px-6">
  <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
    <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
        Partner with IELS —<br />
        Build Real Impact Through English Education
            </h1>
      <p className="text-lg text-gray-700 max-w-2xl leading-relaxed">
        IELS collaborates with schools, universities, companies, and communities
        to deliver <b>outcome-driven English learning</b> and
        <b> real global opportunities</b> across Indonesia and Southeast Asia.
      </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E]"><Link
                href="mailto:partnership@ielsco.com"
               >
                Start a Partnership
              </Link></Button>

                <Button asChild className="bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f]">
                  <Link
                href="https://www.canva.com/design/DAG8C9itJGw/3NQtJPsgxKeiDUZGwbRwqg/edit?utm_content=DAG8C9itJGw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton"
                target="_blank"
                rel="noopener noreferrer"
                
              >
                View Partnership Deck
              </Link></Button>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 flex justify-center lg:justify-end">
            <div className="w-[320px] sm:w-[420px] lg:w-[520px]">
              <Image
                src="/images/contents/general/ielspartner.svg"
                alt="IELS mascot handshake"
                width={400}
                height={400}
                className="w-full h-auto object-contain"
              />
              <div className="absolute -bottom-4 right-0 bg-white text-[#294154] px-4 py-2 rounded-full text-sm font-semibold shadow">
               </div>
              </div>
            </div>
          </div>
      
      </section>

 {/* ================= PARTNER CATEGORIES ================= */}
<section className="py-16 px-6">
  <div className="max-w-6xl mx-auto">
    <div className="mb-14 max-w-2xl">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#294154] mb-3">
        Who We Partner With
      </h2>
      <p className="text-gray-700">
        We work with institutions and organizations that share a commitment
        to education, access, and real-world outcomes. <strong> Explore the discussions, below!</strong>
      </p>
    </div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {[
    {
      title: "Schools",
      emoji: "🎓",
      desc: "Structured English programs, curriculum support, and student readiness for academic and global pathways.",
      cta: "I'm from School",
      link: "https://school.ielsco.com",
    },
    {
      title: "Global Universities",
      emoji: "🌍",
      desc: "Exposure programs, mentoring, and international collaboration initiatives.",
      cta: "I'm from University",
      link: "/partners/global-universities",
    },
    {
      title: "Corporate",
      emoji: "💼",
      desc: "English upskilling, career readiness programs, and access to emerging talent.",
      cta: "I'm from Company",
      link: "/partners/companies",
    },
    {
      title: "Media & Community",
      emoji: "📢",
      desc: "Campaigns, events, and storytelling to expand access and awareness.",
      cta: "I'm from Community",
      link: "/partners/media-community",
    },
  ].map((item, i) => (
    <Link
      key={i}
      href={item.link}
      className="
        group relative rounded-3xl bg-white p-6
        border border-[#294154]/10
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-xl hover:border-[#E56668]/50
        active:scale-[0.98]
        flex flex-col
      "
    >
      {/* Accent line */}
      <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-transparent group-hover:bg-[#E56668] transition" />

      {/* CONTENT */}
      <div className="pl-4 space-y-3">
        <div className="text-3xl">{item.emoji}</div>
        <h3 className="font-bold text-lg text-[#294154]">{item.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {item.desc}
        </p>
      </div>

   
      <div className="pl-4 mt-auto pt-4 ">
        <span
          className="
            inline-flex items-center gap-1
            text-sm font-semibold
            bg-[#E56668] text-white font-semibold px-4 py-2 hover:bg-[#C04C4E]
            px-3 py-1.5 rounded-full
            transition-all
            group-hover:bg-[#C04C4E]
            group-hover:text-white
          "
        >
          {item.cta}
        </span>
      </div>
    </Link>
  ))}
</div>
  </div>
</section>


{/* ================= IMPACT AT A GLANCE ================= */}
<section className="bg-[#294154] py-12 sm:py-20 px-4 sm:px-6 text-white">
  <div className="max-w-6xl mx-auto">

    {/* HEADER */}
    <div className=" mb-16 sm:mb-16 text-center">
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
        IELS Impact at a Glance
      </h2>
      <p className="text-white/80 leading-relaxed">
        We don&apos;t measure impact by activity alone —
        but by learners reached, programs delivered,
        <br/>and partnerships that translate into
        <b> real educational outcomes</b>.
      </p>
    </div>

    {/* IMPACT CARDS */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">

      {/* LEARNERS */}
      <div className="group relative rounded-3xl bg-white text-[#294154] p-6 hover:-translate-y-1 hover:shadow-2xl transition-all">
        <img
          src="/images/contents/careers/banner/talent.jpeg"
          alt="IELS Learners"
          className={`h-40 w-full object-cover rounded-xl mb-4 transition-transform duration-500
            ${active ? "scale-105" : "group-hover:scale-105"}
          `}
        />

        <p className="text-4xl font-extrabold text-[#E56668]">
          <CountUp
            end={8700}
            duration={1.8}
            separator=","
            enableScrollSpy
            scrollSpyOnce={false}
          />+
        </p>

        <h4 className="font-bold text-lg mt-2">Learners Reached</h4>

        <p className="text-sm text-gray-600 mt-2">
          Students and young professionals engaged through
          structured English programs and global exposure initiatives.
        </p>
      </div>

      {/* PROGRAMS */}
      <div className="group relative rounded-3xl bg-white text-[#294154] p-6 hover:-translate-y-1 hover:shadow-2xl transition-all">
        <img
          src="/images/contents/events/iels-program.png"
          alt="IELS Programs"
           className={`h-40 w-full object-cover rounded-xl mb-4 transition-transform duration-500
            ${active ? "scale-105" : "group-hover:scale-105"}
          `}
        />

        <p className="text-4xl font-extrabold text-[#E56668]">
          <CountUp
            end={20}
            duration={1.6}
            enableScrollSpy
            scrollSpyOnce={false}
          />+
        </p>

        <h4 className="font-bold text-lg mt-2">Programs & Initiatives</h4>

        <p className="text-sm text-gray-600 mt-2">
          Community learning, institutional programs,
          and international exposure initiatives.
        </p>
      </div>

      {/* PARTNERS */}
      <div className="group relative rounded-3xl bg-white text-[#294154] p-6 hover:-translate-y-1 hover:shadow-2xl transition-all">
        <img
          src="/images/contents/events/sgn-partners.png"
          alt="IELS Partners"
            className={`h-40 w-full object-cover rounded-xl mb-4 transition-transform duration-500
            ${active ? "scale-105" : "group-hover:scale-105"}
          `}  />

        <p className="text-4xl font-extrabold text-[#E56668]">
          <CountUp
            end={10}
            duration={1.4}
            enableScrollSpy
            scrollSpyOnce={false}
          />+
        </p>

        <h4 className="font-bold text-lg mt-2">Partner Institutions</h4>

        <p className="text-sm text-gray-600 mt-2">
          Schools, universities, companies, and communities
          collaborating with IELS nationwide.
        </p>
      </div>
    </div>


  
</div></section>
<DemographySection/>
{/* ===== PARTNER BENEFITS (Enhanced) ===== */}
<section className="relative py-14 sm:py-16 px-4 overflow-hidden">
  {/* Tambahkan pembungkus ini untuk mengunci elemen dekoratif agar tidak bocor ke kanan */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#294154]/10 rounded-full blur-2xl" />
    <div className="absolute -top-16 -right-10 w-52 h-52 bg-[#E56668]/10 rounded-full blur-3xl" />
  </div>

  {/* Subtle top accent line */}
  <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#294154] to-[#E56668]" />

  <div className="max-w-6xl mx-auto text-center relative z-10">
    <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 text-[#294154] leading-tight">
      Why Partner with IELS?
    </h2>

    <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
      Because we don&apos;t just teach English — we build futures.  
      Together with our partners, we&apos;re unlocking access, opportunities, and impact across Indonesia and Southeast Asia.
    </p>

    {/* Benefit Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
      {[
        {
          emoji: "🇮🇩",
          title: "Nationwide Reach",
          desc: "Connect with 2,800+ learners and schools across Indonesia and Southeast Asia through IELS programs and activations.",
        },
        {
          emoji: "🚀",
          title: "High-Impact Programs",
          desc: "Co-create English initiatives that drive measurable change — from language upskilling to career readiness.",
        },
        {
          emoji: "🤝",
          title: "Strong Brand Network",
          desc: "Join a trusted ecosystem of schools, corporations, and NGOs committed to equal education access.",
        },
        {
          emoji: "📊",
          title: "Verified Learner Distribution",
          desc: "Access region-based insights from thousands of real learners, enabling partners to target programs where engagement is already proven",
        },
      ].map((item, i) => (
        <div
          key={i}
          className="
            group relative rounded-3xl bg-white p-8
            border border-[#294154]/10
            transition-all duration-300
            hover:-translate-y-2 hover:shadow-2xl hover:border-[#E56668]/30
            active:scale-[0.98]
          "
        >
          {/* ACCENT BAR */}
          <div className="absolute left-0 top-8 bottom-8 w-1.5 rounded-r-full bg-transparent group-hover:bg-[#E56668] transition-all duration-300" />
          
          <div className="relative z-10">
            <div className="text-4xl mb-3">{item.emoji}</div>
            <h4 className="font-bold text-lg text-[#294154] mb-2">{item.title}</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Impact Summary */}
    <div className="mt-14 sm:mt-16 space-y-2">
      <p className="text-base text-gray-700 font-medium">
        💡 Every partnership fuels our mission to make English learning accessible for every student — from cities to villages.
      </p>
      <p className="text-sm text-gray-600">
        Backed by measurable outcomes, community growth, and nationwide engagement.
      </p>
    </div>

    {/* CTA Button */}
    <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E] mt-6">
      <Link
        href="https://www.canva.com/design/DAG8C9itJGw/3NQtJPsgxKeiDUZGwbRwqg/edit?..."
        target="_blank"
        rel="noopener noreferrer"
      >
        View IELS Impact Report
      </Link>
    </Button>
  </div>
</section>

{/* ================= FLAGSHIP EVENTS (EDITORIAL) ================= */}
<section className="relative py-15 px-6 bg-white">

  {/* SUBTLE BACKGROUND SHAPE */}
  <div className="absolute -top-32 -right-32 w-[420px] h-[420px] bg-[#E56668]/10 rounded-full blur-[140px]" />

  <div className="relative max-w-6xl mx-auto grid gap-14 lg:grid-cols-2 items-center">

    {/* LEFT — EVENT DOCUMENTATION IMAGE */}
    <div
      className="
        group relative h-[360px] sm:h-[420px] w-full
        overflow-hidden rounded-3xl
        shadow-2xl
        transition-all duration-500
        hover:-translate-y-1
      "
    >
      <img
        src="/images/contents/careers/iels_team_0.png"
        alt="IELS Flagship Event Experience"
        className="
          absolute inset-0 w-full h-full object-cover
          transition-transform duration-700
          group-hover:scale-105
        "
      />

      {/* EDITORIAL OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#2F4157]/60 via-[#2F4157]/20 to-transparent" />

      {/* LABEL */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold text-[#2F4157] shadow">
        Documented IELS Programs
      </div>
    </div>

    {/* RIGHT — CONTENT */}
    <div className="flex flex-col gap-8">

      {/* HEADER */}
      <div>
   <p className="uppercase tracking-widest text-sm text-[#E56668] font-semibold mb-3">
  IELS Ecosystem
</p>

<h2 className="text-3xl sm:text-4xl font-extrabold text-[#2F4157] mb-5 leading-tight">
  A Program Ecosystem Built for 
  <span className="text-[#E56668]"> Real Collaboration</span>
</h2>

<p className="text-gray-600 max-w-xl leading-relaxed">
  IELS operates a growing ecosystem of structured programs and flagship initiatives
  designed to connect learners, institutions, and partners through
  <b> practical execution, exposure, and measurable engagement</b>.
</p>
      </div>

      {/* EVENT LIST */}
      <ul className="space-y-4">
        {[
          {
            name: "English Global Festival",
            desc: "National-scale showcase of English, ideas, and youth collaboration.",
          },
          {
            name: "Step Up!",
            desc: "Career acceleration programs for students ready to move beyond campus.",
          },
          {
            name: "IELS Insight Series",
            desc: "Focused discussions with practitioners, mentors, and global partners.",
          },
          {
            name: "Singapore Global Insight Trip",
            desc: "Flagship international exposure connecting global insight with local impact.",
          },
        ].map((event) => (
          <li
            key={event.name}
            className="
              group flex gap-4
              transition-all duration-300
            "
          >
            <span className="mt-2 w-2 h-2 rounded-full bg-[#E56668] flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#2F4157] group-hover:text-[#E56668] transition">
                {event.name}
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                {event.desc}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="pt-4">
        <Button
          asChild
          className="
            bg-[#E56668] text-white
            px-8 py-3 rounded-full
            font-semibold
            hover:bg-[#C04C4E]
            transition-all duration-300
            active:scale-[0.97]
            shadow-lg hover:shadow-xl
            w-full sm:w-auto
          "
        >
          <Link href="/events">
            Explore IELS Programs
          </Link>
        </Button>
      </div>
    </div>

  </div>
</section>

      {/* ===== PREVIOUS PARTNERS ===== */}
      <section className="relative bg-[#294154] flex flex-col gap-3">
        <div className="text-[20px] lg:text-[32px] text-start text-white px-4 lg:px-[28vw] pt-[30px] leading-tight">
          <p className="font-bold block lg:hidden">Global & National Company Partners</p>
          <p className="font-bold hidden lg:block">Global & National</p>
          <p className="hidden lg:block">Company Partners</p>
        </div>

        {/* Decoration Images */}
        <div className="hidden lg:block">
          <Image
            src="/images/contents/general/bookmark_icon.png"
            alt="Bookmark"
            width={80}
            height={80}
            className="absolute top-10 left-10 opacity-30"
          />
        </div>

        {/* Company Logos */}
        <div className="flex flex-col lg:flex-row w-full gap-6">
          <div className="hidden lg:flex bg-white rounded-r-[20px] flex-col gap-4 py-8 pr-8 w-[20%]">
            {[...Array(8)].map((_, i) => (
              <hr key={i} className="h-px bg-black border-0" />
            ))}
          </div>

          <div className="w-full lg:w-[60%] bg-white rounded-[20px] flex items-center justify-center lg:p-0 min-h-[100px]">
            <Image
              src="/images/logos/media-partners/media_partners.png"
              alt="Media Partners"
              width={1000}
              height={0}
              className="w-full px-4 lg:px-[100px] py-6"
            />
          </div>

          <div className="hidden lg:flex bg-white rounded-l-[20px] flex-col gap-4 py-8 pl-8 w-[20%]">
            {[...Array(8)].map((_, i) => (
              <hr key={i} className="h-px bg-black border-0" />
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row w-full gap-6">
          <div className="hidden lg:block bg-white rounded-r-[20px] w-[20%]"></div>
          <div className="w-full lg:w-[60%] bg-white rounded-[20px] flex items-center justify-center p-4 lg:p-0 min-h-[100px]">
            <Image
              src="/images/logos/company/company_logos.png"
              alt="Company Partners"
              width={1000}
              height={80}
              className="w-full object-contain md:p-12"
            />
          </div>
          <div className="hidden lg:flex bg-white rounded-l-[20px] flex-col gap-4 py-8 pl-8 w-[20%]">
            {[...Array(8)].map((_, i) => (
              <hr key={i} className="h-px bg-black border-0" />
            ))}
          </div>
        </div>

        <div className="text-[20px] lg:text-[32px] text-end text-white px-4 lg:px-[28vw] pb-[30px] leading-tight">
          <p className="font-bold block lg:hidden">Media Partners</p>
          <p className="font-bold hidden lg:block">Media</p>
          <p className="hidden lg:block">Partners</p>
        </div>
      </section>
{/* ================= PARTNERSHIP CTA ================= */}
<section className="py-16 sm:py-20 px-6 bg-white border-t border-[#294154]/10">
  <div className="max-w-6xl mx-auto space-y-16">

    {/* HEADER */}
    <div className="max-w-3xl">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#294154] mb-4">
        Let’s Build Meaningful Impact — Together
      </h2>
      <p className="text-gray-700 leading-relaxed">
        IELS partners with schools, universities, companies, and organizations
        that believe <b>English is a gateway to opportunity</b>.
        
        Our collaborations are designed to be structured, measurable,
        and aligned with real educational and workforce outcomes.
      </p>
    </div>

    {/* PROCESS FLOW — SAME STYLE */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        {
          step: "01",
          title: "Share Your Objectives",
          desc: "Tell us about your audience, goals, and the type of impact you want to create.",
        },
        {
          step: "02",
          title: "Design the Collaboration",
          desc: "We co-create programs, exposure initiatives, or campaigns aligned with your needs.",
        },
        {
          step: "03",
          title: "Execute with Structure",
          desc: "Programs are delivered through IELS systems, communities, and partner coordination.",
        },
        {
          step: "04",
          title: "Track & Communicate Impact",
          desc: "Participation, outcomes, and stories are documented transparently for shared value.",
        },
      ].map((item, i) => (
        <div
          key={i}
          className="
            group relative rounded-3xl bg-white p-6
            border border-[#294154]/10
            transition-all duration-300
            hover:-translate-y-1 hover:shadow-xl hover:border-[#E56668]/50
            active:scale-[0.98]
          "
        >
          {/* LEFT ACCENT */}
          <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-transparent group-hover:bg-[#E56668] transition" />

          <div className="pl-4 space-y-3">
            <p className="text-sm font-semibold text-[#E56668]">
              Step {item.step}
            </p>

            <h3 className="font-bold text-lg text-[#294154]">
              {item.title}
            </h3>

            <p className="text-sm text-gray-600 leading-relaxed">
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </div>

    {/* CTA AREA */}
    <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">

      {/* LEFT — TRUST NOTE */}
      <p className="text-sm text-gray-600 max-w-xl">
        Most partnerships start with a short discussion to align goals
        and explore potential collaboration models.
        No commitment required at this stage.
      </p>

      {/* RIGHT — CTA BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-3">

{/* RIGHT — CTA BUTTONS (Responsive for Tablet/iPad) */}
<div className="flex flex-col sm:flex-col md:flex-col lg:flex-row gap-3 w-full lg:w-auto">

               <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E]"><Link
                href="https://wa.me/6288297253491"
                target="_blank"
                rel="noopener noreferrer"
               >
                Start Discussion
              </Link></Button>

                <Button asChild className="bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f]">
                  <Link
                href="mailto:partnership@ielsco.com"
                
              >
                Contact Via Email
              </Link></Button>
</div>

      </div>
    </div>

    {/* FOOTNOTE */}
    <div className="text-sm text-gray-500">
      📱 WhatsApp: +62 882-9725-3491 (Arba — Principal of Operations & Business) ·
      📧 partnership@ielsco.com
    </div>

  </div>
</section>
      <Footer />
    </main>
  );
}

/* Subcomponents */
function PartnerCard({ emoji, title, desc, link }: { emoji: string; title: string; desc: string; link?: string }) {
  const content = (
    <div className="bg-white p-6 rounded-2xl border border-[#294154]/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="text-4xl mb-2">{emoji}</div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-700">{desc}</p>
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

function BenefitCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-[#fdfdfd] p-6 rounded-2xl border border-[#294154]/10 shadow-sm hover:shadow-md transition-all">
      <div className="text-3xl mb-2">{emoji}</div>
      <h4 className="font-semibold text-lg">{title}</h4>
      <p className="text-sm text-gray-700 mt-1">{desc}</p>
    </div>
  );
}
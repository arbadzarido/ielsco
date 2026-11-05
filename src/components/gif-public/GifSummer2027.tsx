import Image from "next/image";
import { container, section, h1, h2, h3, lead, body, eyebrow, card, siteRoot, focusRing } from "@/components/site/ui";
import Footer from "@/components/footer";
import { EarlyBirdCta, EarlyBirdStatus } from "./EarlyBird";

// Content source: GIF Summer 2027 guidebook. Anything the guidebook does not state is shown as "TBA".

const btnYellow = `inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#F9E15B] px-6 text-[16px] font-semibold text-[#284055] transition-colors hover:bg-white ${focusRing}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Global Impact Fellowship (GIF) Summer 2027",
  description:
    "International youth incubation and competition program across Singapore, Malaysia and Thailand, travelling overland by bus, with six months of mentoring and incubation and a Final Pitch for a USD 5,000 project funding pool. Dates are tentative.",
  startDate: "2027-07-27",
  endDate: "2027-08-03",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: [
    { "@type": "Place", name: "Singapore", address: { "@type": "PostalAddress", addressCountry: "SG" } },
    { "@type": "Place", name: "Malaysia", address: { "@type": "PostalAddress", addressCountry: "MY" } },
    { "@type": "Place", name: "Thailand", address: { "@type": "PostalAddress", addressCountry: "TH" } },
  ],
  organizer: { "@type": "Organization", name: "IELSco", url: "https://www.ielsco.com" },
  offers: {
    "@type": "Offer",
    name: "Early Bird (10 slots)",
    price: "800",
    priceCurrency: "USD",
    validThrough: "2026-11-09T23:59:00+07:00",
    availability: "https://schema.org/LimitedAvailability",
    url: "https://www.ielsco.com/events/gif",
  },
};

function Check({ tone = "navy" }: { tone?: "navy" | "red" | "yellow" }) {
  const bg = tone === "red" ? "bg-[#CB2129] text-white" : tone === "yellow" ? "bg-[#F9E15B] text-[#284055]" : "bg-[#284055] text-white";
  return (
    <span aria-hidden="true" className={`mt-[3px] inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${bg}`}>
      {tone === "red" ? "✕" : "✓"}
    </span>
  );
}

function Note({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`mt-4 text-[14px] italic leading-[1.6] ${dark ? "text-white/70" : "text-[#2F4157]/65"}`}>{children}</p>;
}

function Tba() {
  return <span className="rounded-full bg-[#F1F3F6] px-2.5 py-0.5 text-[13px] font-bold uppercase tracking-wider text-[#5C2D2E]">TBA</span>;
}

const stats = [
  ["3", "countries", "Singapore, Malaysia, Thailand, connected overland by bus"],
  ["3", "target universities*", "NUS, Universiti Malaya, Chulalongkorn University"],
  ["10", "speaker sessions*", "2 in Singapore, 4 in Malaysia, 4 in Thailand"],
  ["6", "months of incubation", "Mentoring January to June 2027, included in your fee"],
  ["USD 5,000", "project funding pool", "For winners of the competitive Final Pitch"],
  ["USD 800", "Early Bird fee", "Only 10 slots, USD 300 deposit, until 9 Nov 2026"],
];

const countries = [
  ["SG", "Singapore", "National University of Singapore (NUS)", "Day-one academic session and university experience. 2 speaker sessions."],
  ["MY", "Malaysia", "Universiti Malaya (UM)", "3 days of academic and development sessions. 4 speaker sessions."],
  ["TH", "Thailand", "Chulalongkorn University", "3 days of programming. 4 speaker sessions. Final Pitch."],
];

const stages: [string, string, string, string[]][] = [
  ["Stage 1", "Singapore", "1 day · NUS", ["Morning arrival in Singapore", "Academic session and university experience at NUS", "2 speaker sessions", "Evening departure overland to Malaysia"]],
  ["Stage 2", "Malaysia", "3 days · Universiti Malaya", ["Arrive by bus the following morning", "4 speaker sessions at UM", "Leadership, innovation, social impact, entrepreneurship and project workshops", "Project mentoring and incubation, afternoon departure toward Bangkok"]],
  ["Stage 3", "Thailand", "3 days · Chulalongkorn University", ["Arrive in Bangkok by bus the following morning", "4 speaker sessions at Chulalongkorn", "Final project preparation and Final Pitching Competition", "Awarding Ceremony, program closing and departure"]],
];

const included = [
  "Dormitory accommodation during the program",
  "Meals as specified in the official package",
  "All official academic and program activities",
  "University exposure and campus experiences¹",
  "Speaker sessions and workshops",
  "Six-month mentoring and project incubation",
  "Final Pitching Competition participation",
  "Awarding Ceremony participation",
  "International networking and collaboration",
  "GIF international program certificate²",
  "GIF Letter of Acceptance (LoA)²",
  "Program materials and participant kit",
  "Official program documentation",
  "Overland inter-country transport by bus¹",
];

const comparison = [
  ["Sessions at target universities in 3 countries", "Not typically", "Planned"],
  ["10 planned speaker sessions and workshops", "—", "Included"],
  ["Six-month mentoring and incubation", "—", "Included"],
  ["Final Pitch and USD 5,000 funding opportunity", "—", "Competitive"],
  ["GIF certificate and Letter of Acceptance", "—", "Included"],
  ["ASEAN delegate network and project team", "—", "Included"],
  ["Overland transport between countries", "You arrange", "Organized"],
];

const tbaRows = [
  "Eligibility and age requirements",
  "Application requirements and selection process",
  "Visa and entry requirements",
  "Daily itinerary, transport schedule and session times",
  "Mentoring frequency, mentor profiles and session structure",
  "Official project evaluation criteria",
  "Prize distribution, number of winners and disbursement terms",
  "General registration opening date",
];

export default function GifSummer2027() {
  return (
    <div className={`${siteRoot} bg-white text-[#1A2534]`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[#284055] py-[56px] text-white md:py-[88px]" aria-labelledby="gif-hero">
          <Image src="/images/gif-2027/gif_icon_white.png" alt="" width={440} height={457} aria-hidden="true" className="pointer-events-none absolute -right-[60px] top-[40px] hidden w-[360px] opacity-[0.08] md:block" />
          <div className={`${container} relative`}>
            <div className="flex flex-wrap items-center gap-3">
              <Image src="/images/gif-2027/gif_icon_white.png" alt="Global Impact Fellowship logo" width={44} height={46} />
              <span className="rounded-full border border-white/30 px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.12em]">Official guidebook · Self-funded</span>
            </div>
            <h1 id="gif-hero" className={`${h1} mt-6 !text-white`}>
              Global Impact Fellowship <span className="block text-[#F9E15B]">Summer 2027</span>
            </h1>
            <p className="mt-4 max-w-[720px] text-[19px] font-semibold leading-snug text-white">International Youth Incubation &amp; Competition Program across Southeast Asia</p>
            <p className="mt-3 max-w-[720px] text-[18px] leading-[1.6] text-white/85">
              Singapore, Malaysia and Thailand, travelling overland by bus. Don&rsquo;t just travel internationally. Build something that matters.
            </p>

            <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[16px] font-bold uppercase tracking-[0.12em]" aria-label="Route">
              {["Singapore", "Malaysia", "Thailand"].map((c, i) => (
                <li key={c} className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-[10px] w-[10px] rounded-full bg-[#F9E15B]" />
                  {c}
                  {i < 2 && <span aria-hidden="true" className="text-white/50">→</span>}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[22px] font-semibold">27 July – 3 August 2027 <span className="text-[16px] font-normal text-white/70">(tentative)</span></p>

            <div className="mt-8 grid max-w-[760px] gap-4 rounded-[20px] bg-white p-5 text-[#1A2534] sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-6">
              <div className="border-l-[6px] border-[#F9E15B] pl-4">
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#7A3B3E]">Early Bird · until 9 Nov 2026</p>
                <p className="text-[44px] font-extrabold leading-none text-[#284055]">USD 800</p>
                <p className="mt-1 text-[14px] text-[#2F4157]/70">total program fee, USD 1,000 from 10 Nov</p>
              </div>
              <div className="text-[16px] leading-[1.6]">
                <p className="text-[19px] font-extrabold text-[#7A3B3E]">Only 10 slots</p>
                <p>Secure yours with a <strong>USD 300 deposit</strong>. Six-month incubation included.</p>
              </div>
            </div>

            <dl className="mt-6 flex flex-wrap gap-3 text-[15px]">
              <div className="rounded-full bg-white/10 px-4 py-2"><dt className="inline text-white/70">General registration: </dt><dd className="inline font-bold">Coming soon</dd></div>
              <div className="rounded-full bg-[#F9E15B] px-4 py-2 text-[#284055]"><dt className="inline">Early Bird applications: </dt><EarlyBirdStatus /></div>
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <EarlyBirdCta className={btnYellow} />
              <a href="#program" className={`inline-flex min-h-[46px] items-center justify-center rounded-full border border-white/40 px-6 text-[16px] font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`}>See the program</a>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className={section} aria-labelledby="why">
          <div className={container}>
            <p className={eyebrow}>Why GIF Summer 2027</p>
            <h2 id="why" className={`${h2} mt-3 max-w-[720px]`}>More than a trip. A launchpad for your idea.</h2>
            <p className={`${lead} mt-4 max-w-[720px]`}>
              GIF moves from international exposure to international impact: an international youth incubation and competition program for young people who want to turn an idea into a project.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map(([n, k, d], i) => (
                <li key={k} className={`${card} p-6 ${i >= 3 ? "border-[#7A3B3E]/40" : ""}`}>
                  <p className={`font-extrabold leading-none ${n.length > 3 ? "text-[30px]" : "text-[40px]"} ${i === 5 ? "text-[#7A3B3E]" : "text-[#284055]"}`}>{n}</p>
                  <p className="mt-2 text-[17px] font-bold text-[#1A2534]">{k}</p>
                  <p className="mt-1 text-[15px] leading-[1.55] text-[#2F4157]/70">{d}</p>
                </li>
              ))}
            </ul>
            <Note>*Target institutions and planned sessions are subject to confirmation.</Note>

            <h3 className={`${h3} mt-12`}>Seven elements, one journey</h3>
            <ol className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "International university exposure and student life",
                "Cross-cultural learning and ASEAN networking",
                "Leadership and innovation development",
                "Six months of project mentoring and incubation",
                "An international project competition",
                "Final pitching and awarding ceremony",
                "The opportunity to win project funding",
              ].map((t, i) => (
                <li key={t} className={`flex items-center gap-4 rounded-[14px] border px-4 py-3 ${i >= 3 ? "border-[#7A3B3E] font-semibold" : "border-[#E6E9EE]"}`}>
                  <span className={`text-[18px] font-extrabold ${i >= 3 ? "text-[#7A3B3E]" : "text-[#577E90]"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[16px]">{t}</span>
                </li>
              ))}
            </ol>
            <Note>Highlighted: what is new in GIF 2027.</Note>
          </div>
        </section>

        {/* EXPERIENCE */}
        <section className="bg-[#F5F6F8] py-[64px] md:py-[96px]" aria-labelledby="experience">
          <div className={container}>
            <p className={eyebrow}>Singapore · Malaysia · Thailand</p>
            <h2 id="experience" className={`${h2} mt-3 max-w-[820px]`}>Live and learn like a university student, in three countries</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {countries.map(([code, c, uni, d], i) => (
                <li key={c} className={`${card} relative p-6`}>
                  <span aria-hidden="true" className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#284055] text-[17px] font-extrabold text-[#F9E15B]">{code}</span>
                  <h3 className={`${h3} mt-4`}>{c}</h3>
                  <p className="mt-1 text-[15px] font-bold text-[#7A3B3E]">{uni}</p>
                  <p className={`${body} mt-3`}>{d}</p>
                  {i < 2 && <p className="mt-4 inline-block rounded-full bg-[#7A3B3E] px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-white">Then overland by bus</p>}
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-[20px] bg-[#284055] p-6 text-white md:p-8">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#F9E15B]">The student-life experience</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {["Campus sessions and workshops", "Dormitory living", "Cross-cultural project teams", "ASEAN youth network"].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[16px]"><Check tone="yellow" />{t}</li>
                ))}
              </ul>
            </div>
            <Note>Target institutions. Campus access, sessions and activities are subject to institutional confirmation.</Note>
          </div>
        </section>

        {/* INCUBATION */}
        <section className="bg-[#304156] py-[64px] text-white md:py-[96px]" aria-labelledby="incubation">
          <div className={container}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">Mentoring and incubation · included</p>
            <h2 id="incubation" className="mt-3 max-w-[720px] text-[30px] font-extrabold leading-[1.15] sm:text-[38px]">Six months to build. Not one week to sightsee.</h2>
            <div className="mt-8 flex items-center gap-5">
              <p className="text-[84px] font-extrabold leading-none text-[#F9E15B]" aria-hidden="true">6</p>
              <p className="max-w-[460px] text-[18px] leading-[1.5]"><strong>Months.</strong> January to June 2027, before you fly. Included in your program fee.</p>
            </div>
            <ol className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-7" aria-label="Timeline">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
                <li key={m} className="rounded-full bg-white/15 py-2 text-center text-[14px] font-bold uppercase tracking-wider">{m}</li>
              ))}
              <li className="rounded-full bg-[#F9E15B] py-2 text-center text-[14px] font-bold uppercase tracking-wider text-[#284055]">Jul–Aug</li>
            </ol>
            <div className="mt-8 rounded-[20px] bg-white p-6 text-[#1A2534] md:p-8">
              <h3 className={h3}>During incubation you will</h3>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "Develop and refine your project idea",
                  "Receive mentoring and guidance",
                  "Identify and validate a real problem",
                  "Learn project design, social impact and implementation",
                  "Prepare your proposal and pitch materials",
                  "Build confidence in English and international presenting",
                  "Collaborate with fellow delegates before you meet",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[16px]"><Check />{t}</li>
                ))}
              </ul>
            </div>
            <Note dark>Mentoring frequency, mentor profiles and session structure will be announced by the program team.</Note>
          </div>
        </section>

        {/* CHALLENGE */}
        <section className={section} aria-labelledby="challenge">
          <div className={container}>
            <p className={eyebrow}>The ASEAN Impact Project Challenge</p>
            <h2 id="challenge" className={`${h2} mt-3`}>Your project is the point</h2>
            <p className={`${lead} mt-4 max-w-[720px]`}>
              Every delegate arrives with an idea and leaves having pitched it. Across six months and three campuses, you take one project from problem to pitch.
            </p>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["01", "Identify", "a real problem in your community"],
                ["02", "Validate", "it with the people it affects"],
                ["03", "Design", "a feasible, sustainable solution"],
                ["04", "Pitch", "it at the Final in Bangkok"],
              ].map(([n, k, d], i) => (
                <li key={k} className={`rounded-[20px] border p-6 ${i === 3 ? "border-[#284055] bg-[#284055] text-white" : "border-[#E6E9EE] bg-white"}`}>
                  <p className={`text-[22px] font-extrabold ${i === 3 ? "text-[#F9E15B]" : "text-[#7A3B3E]"}`}>{n}</p>
                  <p className="mt-2 text-[20px] font-extrabold">{k}</p>
                  <p className={`mt-1 text-[15px] leading-[1.55] ${i === 3 ? "text-white/80" : "text-[#2F4157]/70"}`}>{d}</p>
                </li>
              ))}
            </ol>
            <h3 className={`${h3} mt-12`}>What makes a strong project</h3>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Feasibility", "Can it realistically be delivered?"],
                ["Impact", "Does it change something that matters?"],
                ["Innovation", "Does it bring a fresh approach?"],
                ["Sustainability", "Can it last beyond the program?"],
              ].map(([k, d]) => (
                <li key={k} className="rounded-[14px] border border-[#E6E9EE] border-l-[6px] border-l-[#7A3B3E] px-5 py-4">
                  <p className="text-[17px] font-bold text-[#284055]">{k}</p>
                  <p className="text-[15px] text-[#2F4157]/70">{d}</p>
                </li>
              ))}
            </ul>
            <Note>Guiding qualities for project development. Official evaluation criteria will be announced by the program team.</Note>
          </div>
        </section>

        {/* FUNDING */}
        <section className="bg-[#5C2D2E] py-[64px] text-white md:py-[96px]" aria-labelledby="funding">
          <div className={container}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">Final Pitching Competition and Awarding Ceremony</p>
            <h2 id="funding" className="mt-3 text-[30px] font-extrabold leading-[1.15] sm:text-[38px]">Pitch for <span className="block text-[56px] leading-[1.05] text-[#F9E15B] sm:text-[80px]">USD 5,000</span></h2>
            <p className="mt-3 max-w-[620px] text-[19px] leading-[1.5]">in total project funding for the most promising ideas developed during incubation.</p>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Present", "Pitch your project idea to a panel at the Final in Thailand."],
                ["Compete", "Projects go through a competitive selection and evaluation process."],
                ["Get funded", "The most promising projects receive funding to move forward."],
              ].map(([k, d], i) => (
                <li key={k} className="rounded-[20px] border border-white/20 bg-white/5 p-6">
                  <span aria-hidden="true" className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#F9E15B] text-[18px] font-extrabold text-[#284055]">{i + 1}</span>
                  <p className="mt-3 text-[19px] font-bold">{k}</p>
                  <p className="mt-1 text-[15px] leading-[1.55] text-white/80">{d}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 rounded-[14px] border border-[#F9E15B]/60 p-5 text-[15px] leading-[1.6] text-white/90">
              Funding is a competitive opportunity, not a guaranteed benefit for every participant. The prize distribution, number of winners, disbursement terms and judging criteria will be announced by the program team.
            </p>
          </div>
        </section>

        {/* PROGRAM */}
        <section id="program" className={`${section} scroll-mt-[24px]`} aria-labelledby="program-h">
          <div className={container}>
            <p className={eyebrow}>Tentative program overview</p>
            <h2 id="program-h" className={`${h2} mt-3`}>The proposed journey</h2>
            <p className="mt-4 inline-block rounded-full bg-[#284055] px-5 py-2 text-[14px] font-bold uppercase tracking-[0.1em] text-white">27 July – 3 August 2027 · Tentative</p>
            <ol className="mt-8 grid gap-4 lg:grid-cols-3">
              {stages.map(([st, c, sub, items]) => (
                <li key={st} className={`${card} p-6`}>
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#7A3B3E]">{st}</p>
                  <h3 className={`${h3} mt-1 !text-[24px]`}>{c}</h3>
                  <p className="text-[15px] font-semibold text-[#577E90]">{sub}</p>
                  <ul className="mt-4 space-y-2">
                    {items.map((t) => (
                      <li key={t} className="flex gap-3 text-[15px] leading-[1.55] text-[#1A2534]"><span aria-hidden="true" className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#7A3B3E]" />{t}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <Note>The daily itinerary, transport schedule, session times, campus access and institutional activities are tentative and subject to confirmation. All inter-country travel is planned overland by bus.</Note>
          </div>
        </section>

        {/* INCLUDED */}
        <section className="bg-[#F5F6F8] py-[64px] md:py-[96px]" aria-labelledby="included">
          <div className={container}>
            <p className={eyebrow}>Your USD 800 Early Bird fee</p>
            <h2 id="included" className={`${h2} mt-3`}>What&rsquo;s included</h2>
            <ul className="mt-8 grid gap-x-8 gap-y-3 rounded-[20px] border border-[#E6E9EE] bg-white p-6 md:grid-cols-2 md:p-8">
              {included.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[16px]"><Check />{t}</li>
              ))}
            </ul>
            <div className="mt-4 rounded-[20px] bg-[#7A3B3E] p-6 text-white">
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#F9E15B]">Not included</p>
              <p className="mt-3 flex items-start gap-3 text-[18px] font-bold"><Check tone="red" />International airfare to and from the program</p>
              <p className="mt-3 text-[15px] text-white/85">Personal spending and anything not listed above: please confirm with the program team.</p>
            </div>
            <Note>¹ Subject to institutional and final confirmation. ² Issued by GIF/IELSco, subject to official issuance arrangements. University-issued documents are not included unless the respective institution confirms them.</Note>
          </div>
        </section>

        {/* EARLY BIRD */}
        <section className="bg-[#284055] py-[64px] text-white md:py-[96px]" aria-labelledby="earlybird">
          <div className={container}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">GIF Summer 2027 · Early Bird</p>
            <h2 id="earlybird" className="mt-3 text-[30px] font-extrabold leading-[1.15] sm:text-[38px]"><span className="block text-[64px] leading-none text-[#F9E15B] sm:text-[84px]">USD 800</span>total Early Bird program fee</h2>
            <p className="mt-4 inline-block rounded-[14px] border border-[#F9E15B] px-4 py-3 text-[16px]">
              <span className="block text-[13px] font-bold uppercase tracking-[0.12em] text-[#F9E15B]">Early Bird ends</span>
              <strong className="text-[20px]">9 Nov 2026</strong> · then USD 1,000
            </p>
            <p className="mt-8 text-[14px] font-bold uppercase tracking-[0.14em]">Only 10 Early Bird slots</p>
            <ol className="mt-3 flex flex-wrap gap-2" aria-label="10 slots">
              {Array.from({ length: 10 }, (_, i) => (
                <li key={i} className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] border border-[#F9E15B] text-[16px] font-extrabold text-[#F9E15B]">{i + 1}</li>
              ))}
            </ol>
            <div className="mt-8 grid gap-4 rounded-[20px] bg-white p-6 text-[#1A2534] sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#7A3B3E]">Secure your slot with</p>
                <p className="text-[44px] font-extrabold leading-none text-[#284055]">USD 300</p>
              </div>
              <p className="text-[16px] leading-[1.6]">initial deposit. The remaining payment schedule is shared by the program team.</p>
            </div>
            <ul className="mt-6 space-y-3">
              {["Six-month mentoring and incubation included", "Campus experience in three countries", "Final Pitch and USD 5,000 project funding opportunity", "International networking and GIF certification"].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[17px]"><Check tone="yellow" />{t}</li>
              ))}
            </ul>
            <Note dark>Early Bird closes 23:59 GMT+7 on 9 November 2026. From the official public launch on 10 November 2026, the program fee is USD 1,000. The deposit secures an Early Bird slot, subject to the official payment terms. International airfare is not included.</Note>
          </div>
        </section>

        {/* VALUE */}
        <section className={section} aria-labelledby="value">
          <div className={container}>
            <p className={eyebrow}>Value comparison</p>
            <h2 id="value" className={`${h2} mt-3`}>Same three countries. A very different journey.</h2>
            <div className="mt-8 max-w-[760px] space-y-5">
              <div>
                <p className="text-[15px] font-bold text-[#5A6676]">Independently organized trip · 7 days / 6 nights</p>
                <div className="mt-2 rounded-[10px] bg-[#DCDFE3] px-5 py-3 text-[24px] font-extrabold text-[#5A6676]">≈ USD 1,500*</div>
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#284055]">GIF Summer 2027 · Early Bird</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="w-[53%] min-w-[180px] rounded-[10px] bg-[#284055] px-5 py-3 text-[24px] font-extrabold text-[#F9E15B]">USD 800</div>
                  <p className="text-[15px] font-bold text-[#7A3B3E]">+ six months of incubation<br />+ a shot at USD 5,000</p>
                </div>
              </div>
            </div>
            <div className="mt-8 overflow-x-auto rounded-[16px] border border-[#E6E9EE]">
              <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
                <caption className="sr-only">GIF Summer 2027 compared with an independently organized trip</caption>
                <thead>
                  <tr className="bg-[#284055] text-white">
                    <th scope="col" className="px-4 py-3 font-bold">What you get</th>
                    <th scope="col" className="px-4 py-3 text-center font-bold">On your own</th>
                    <th scope="col" className="px-4 py-3 text-center font-bold text-[#F9E15B]">With GIF</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map(([a, b, c], i) => (
                    <tr key={a} className={i % 2 ? "bg-[#F5F6F8]" : "bg-white"}>
                      <th scope="row" className="px-4 py-3 font-normal">{a}</th>
                      <td className="px-4 py-3 text-center text-[#5A6676]">{b}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#284055]">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>*An independently organized 7-day, 6-night trip across Singapore, Malaysia and Thailand could cost approximately USD 1,500, depending on travel arrangements. This is an estimate, not a verified price. The GIF fee excludes international airfare.</Note>
          </div>
        </section>

        {/* STEPS */}
        <section className="bg-[#304156] py-[64px] text-white md:py-[96px]" aria-labelledby="steps">
          <div className={container}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">How to secure your Early Bird slot</p>
            <h2 id="steps" className="mt-3 text-[30px] font-extrabold leading-[1.15] sm:text-[38px]">Four steps to your slot</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Reach out", "Contact the program team at arbadza@ielsco.com to register your interest."],
                ["Pay the deposit", "The program team sends payment details by email. Pay the USD 300 deposit by 9 November 2026."],
                ["Confirm", "Send your transfer proof to the program team for confirmation."],
                ["Get started", "Receive your remaining payment schedule. Incubation begins January 2027."],
              ].map(([k, d], i) => (
                <li key={k} className="flex gap-4 rounded-[20px] border border-white/20 bg-white/5 p-5">
                  <span aria-hidden="true" className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F9E15B] text-[18px] font-extrabold text-[#284055]">{i + 1}</span>
                  <div><p className="text-[18px] font-bold">{k}</p><p className="mt-1 text-[15px] leading-[1.55] text-white/80">{d}</p></div>
                </li>
              ))}
            </ol>
            <Note dark>Please contact the official program team (arbadza@ielsco.com) for payment confirmation and the applicable payment schedule.</Note>
            <div className="mt-6"><EarlyBirdCta className={btnYellow} /></div>
          </div>
        </section>

        {/* TBA */}
        <section className={section} aria-labelledby="tba">
          <div className={container}>
            <p className={eyebrow}>Still to be confirmed</p>
            <h2 id="tba" className={`${h2} mt-3`}>Details to be announced</h2>
            <p className={`${lead} mt-4 max-w-[720px]`}>These details are not yet published. The program team will announce them. For questions, email <a className="font-semibold text-[#284055] underline underline-offset-4" href="mailto:arbadza@ielsco.com">arbadza@ielsco.com</a>.</p>
            <ul className="mt-8 grid gap-3 md:grid-cols-2">
              {tbaRows.map((t) => (
                <li key={t} className="flex items-center justify-between gap-4 rounded-[14px] border border-[#E6E9EE] px-5 py-3 text-[16px]"><span>{t}</span><Tba /></li>
              ))}
            </ul>
          </div>
        </section>

        {/* TRACK RECORD */}
        <section className="bg-[#304156] py-[64px] text-white md:py-[96px]" aria-labelledby="track">
          <div className={container}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">Our journey · Institutional engagement</p>
            <h2 id="track" className="mt-3 max-w-[760px] text-[30px] font-extrabold leading-[1.15] sm:text-[38px]">Built on real international engagement</h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="grid grid-cols-[3fr_2fr] gap-3">
                  <Image src="/images/gif-2027/wsu_group.webp" alt="IELS delegation group photo at Western Sydney University" width={1600} height={901} sizes="(min-width: 1024px) 340px, 60vw" className="h-full w-full rounded-[14px] object-cover" />
                  <Image src="/images/gif-2027/wsu_backdrop.webp" alt="Western Sydney University engagement event backdrop" width={720} height={540} sizes="(min-width: 1024px) 230px, 40vw" className="h-full w-full rounded-[14px] object-cover" />
                </div>
                <h3 className="mt-5 text-[15px] font-bold uppercase tracking-[0.12em] text-[#F9E15B]">Western Sydney University</h3>
                <p className="mt-2 text-[16px] leading-[1.65] text-white/85">IELS has collaborated with Western Sydney University (WSU) through its Indonesia engagement, focused on global academic exposure and international education dialogue: cross-border academic discussions, exposure to international university pathways and structured engagement with Indonesian students.</p>
              </div>
              <div className="rounded-[20px] border border-white/20 bg-white/5 p-6">
                <h3 className="text-[15px] font-bold uppercase tracking-[0.12em] text-[#F9E15B]">National University of Singapore (NUS)</h3>
                <p className="mt-2 text-[16px] leading-[1.65] text-white/85">GIF in Singapore 2026 (Batch 2, 17–20 Nov 2026) runs in collaboration with NUS, with incubation sessions led by NUS SCALE and NUSX and campus life at NUS.</p>
                <ul className="mt-5 space-y-3">
                  {[["NUS SCALE", "Beyond the Classroom · Lead Yourself, Learn for Life"], ["NUSX", "From Problems to Possibilities · From Idea to Impact"]].map(([k, v]) => (
                    <li key={k} className="flex flex-wrap items-center gap-3 text-[15px]"><span className="rounded-full bg-[#F9E15B] px-3 py-1 text-[13px] font-bold text-[#284055]">{k}</span>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Note dark>Shown as track record only. Past and current engagements do not confirm any institutional arrangement for GIF 2027.</Note>
          </div>
        </section>

        {/* WINTER */}
        <section className={section} aria-labelledby="winter">
          <div className={container}>
            <p className={eyebrow}>Coming next</p>
            <h2 id="winter" className={`${h2} mt-3`}>GIF Winter 2027 <span className="text-[#7A3B3E]">China</span></h2>
            <p className={`${lead} mt-4 max-w-[720px]`}>The same build-something-that-matters journey, in a new country. Delegates also prepare through the January–June 2027 mentoring and incubation period.</p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              {[["When", "November 2027", "Exact dates tentative"], ["Fee", "USD 900", "Program fee"], ["Deposit", "USD 300", "To secure a slot"]].map(([k, v, d]) => (
                <div key={k} className={`${card} p-6`}>
                  <dt className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#7A3B3E]">{k}</dt>
                  <dd className="mt-1 text-[26px] font-extrabold text-[#284055]">{v}</dd>
                  <dd className="text-[15px] text-[#2F4157]/70">{d}</dd>
                </div>
              ))}
            </dl>
            <p className={`${body} mt-6 max-w-[720px]`}><strong className="text-[#284055]">Want Winter instead?</strong> Tell the program team you&rsquo;re interested in GIF Winter 2027 and we&rsquo;ll keep you updated as details are confirmed.</p>
            <Note>Itinerary and institutional partners for GIF Winter 2027 will be announced. Dates are tentative.</Note>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#284055] py-[64px] text-white md:py-[88px]" aria-labelledby="cta">
          <div className={container}>
            <h2 id="cta" className="max-w-[720px] text-[32px] font-extrabold leading-[1.15] sm:text-[44px]">Don&rsquo;t just travel internationally. <span className="text-[#F9E15B]">Build something that matters.</span></h2>
            <div className="mt-8 max-w-[640px] rounded-[20px] bg-[#F9E15B] p-6 text-[#284055]">
              <p className="text-[22px] font-extrabold">10 Early Bird slots · USD 800</p>
              <p className="mt-1 text-[16px] font-semibold">Secure yours with a USD 300 deposit by 9 November 2026</p>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#F9E15B]">Get in touch</p>
                <p className="mt-3 text-[17px] font-bold">GIF program team</p>
                <a className="text-[17px] text-[#F9E15B] underline underline-offset-4" href="mailto:arbadza@ielsco.com">arbadza@ielsco.com</a>
                <p className="text-[15px] text-white/70">Arbadza Rido Adzariyat, Founder of IELSco</p>
                <p className="mt-4 text-[17px] font-bold">IELSco</p>
                <p className="text-[17px] text-[#F9E15B]">ielsco.com</p>
              </div>
              <div className="flex flex-col items-start justify-end gap-3">
                <EarlyBirdCta className={btnYellow} />
                <p className="text-[15px] italic text-white/70">Speak Fearlessly, Belong Infinitely</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

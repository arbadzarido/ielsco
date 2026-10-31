"use client";

import Footer from "@/components/footer";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import ReactCountryFlag from "react-country-flag";
import { FaDiscord, FaInstagram } from "react-icons/fa";
import { ArrowRight } from "lucide-react";
import { PublicSessions, CIRCLE_DISCORD_LINK } from "@/components/circle/PublicSessions";
import { btnPrimary, btnSecondary, card, container, eyebrow, focusRing, h2, lead, section, textLink, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";

const ACCOUNT_LINK = "https://ielsco.com/sign-up";
const DISCORD_LINK = CIRCLE_DISCORD_LINK;
const INSTAGRAM_LINK = "https://instagram.com/iels.co";


function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <ReactCountryFlag
      countryCode={code}
      svg
      style={{ width: "1.2em", height: "1.2em" }}
      className={className}
      title={code}
      alt=""
      aria-hidden="true"
    />
  );
}

/* ================= DATA ================= */

type SeaCountry = {
  code: string;
  name: string;
  // sapaan lokal buat ditampilin waktu negara ini dipilih
  greeting: string;
};

const seaCountries: SeaCountry[] = [
  { code: "MM", name: "Myanmar", greeting: "မင်္ဂလာပါ၊ နေကောင်းလား?" },
  { code: "LA", name: "Laos", greeting: "ສະບາຍດີ, ເຈົ້າສະບາຍດີບໍ?" },
  { code: "TH", name: "Thailand", greeting: "สวัสดี สบายดีไหม?" },
  { code: "VN", name: "Vietnam", greeting: "Chào bạn, bạn khỏe không?" },
  { code: "KH", name: "Cambodia", greeting: "សួស្តី តើអ្នកសុខសប្បាយទេ?" },
  { code: "PH", name: "Philippines", greeting: "Kumusta, kamusta ka?" },
  { code: "MY", name: "Malaysia", greeting: "Hai, apa khabar?" },
  { code: "BN", name: "Brunei", greeting: "Hai, apa khabar?" },
  { code: "SG", name: "Singapore", greeting: "Hi, how are you?" },
  { code: "ID", name: "Indonesia", greeting: "Hai, apa kabarmu?" },
  { code: "TL", name: "Timor-Leste", greeting: "Ola, ita diak ka lae?" },
];

// dipakai untuk negara di luar SEA juga (mis. tujuan member story)
type GrowthStep = {
  title: string;
  desc: string;
  mascot: string;
};

const growthJourney: GrowthStep[] = [
  {
    title: "Set Your Goal",
    desc: "Start with what you're chasing — a target score, a scholarship, a job abroad.",
    mascot: "/images/contents/mascot/elco1.png",
  },
  {
    title: "Find Your Partner",
    desc: "Meet someone working toward the same goal in the Circle, so you're never doing it alone.",
    mascot: "/images/contents/mascot/elco2.png",
  },
  {
    title: "Achieve It Together",
    desc: "Practice, push each other, and hit real milestones side by side.",
    mascot: "/images/contents/mascot/elco3.png",
  },
  {
    title: "Inspire & Mentor",
    desc: "Share your story, mentor the next person, and help someone else start their own.",
    mascot: "/images/contents/mascot/elco4.png",
  },
];

type CommunityMoment =
  | {
      kind: "past";
      city: string;
      country: string;
      code: string;
      photo: string;
      eventTitle: string;
      venue: string;
      date: string;
    }
  | {
      kind: "upcoming-group";
      label: string;
      codes: string[];
    };

// 5 kota yang udah pernah kejadian + 1 tile gabungan buat negara yang segera nyusul
const communityMoments: CommunityMoment[] = [
  {
    kind: "past",
    city: "Surabaya",
    country: "Indonesia",
    code: "ID",
    // TODO: ganti dengan foto event asli
    photo: "/images/contents/careers/iels_team_0.png",
    eventTitle: "Hello Sydney! IELSco × Western Sydney University",
    venue: "Western Sydney University Indonesia, Surabaya",
    date: "21 Nov 2025",
  },
  {
    kind: "past",
    city: "Kuala Lumpur",
    country: "Malaysia",
    code: "MY",
    photo: "/images/people/circle/iels-malaysia.png",
    eventTitle: "IELSco Hangout",
    // TODO: ganti dengan nama cafe di KL yang sebenarnya
    venue: "Common Man Coffee Roasters",
    date: "11 Apr 2026",
  },
  {
    kind: "past",
    city: "Bangkok",
    country: "Thailand",
    code: "TH",
    photo: "/images/people/circle/iels-thailand.png",
    eventTitle: "IELSco Hangout",
    venue: "Bangkok University",
    date: "4 Apr 2026",
  },
  {
    kind: "past",
    city: "Phnom Penh",
    country: "Cambodia",
    code: "KH",
    photo: "/images/people/circle/iels-cambodia.png",
    eventTitle: "IELSco Goes to School",
    venue: "Paragon International School, Cambodia",
    date: "24 Mar 2026",
  },
  {
    kind: "past",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    code: "VN",
    photo: "/images/people/circle/iels-vietnam.png",
    eventTitle: "IELSco Hangout",
    // TODO: ganti dengan nama cafe di Ho Chi Minh yang sebenarnya
    venue: "SPACEP - Working & Study Space",
    date: "18 Mar 2026",
  },
  {
    kind: "upcoming-group",
    label: "Philippines & Singapore",
    codes: ["PH", "SG"],
  },
];

// Member stories come from the Member Stories CMS (published, consented stories only).
function CircleStories() {
  const stories = usePublishedStories(3);
  return (
    <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {stories.map((s) => (
        <li key={s.slug} className="w-[80%] shrink-0 snap-start sm:w-[55%] md:w-auto">
          <Link href={`/circle/stories/${s.slug}`} className={cn(card, "flex h-full flex-col overflow-hidden transition-colors hover:border-[#C9D1DC]", focusRing)}>
            <div className="relative aspect-[16/9] bg-[#F1F4F8]">
              {s.bannerImage && <Image src={s.bannerImage} alt="" fill sizes="(min-width: 768px) 360px, 80vw" className="object-cover" />}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <p className="text-[18px] font-bold leading-snug text-[#1A2534]">{s.title}</p>
              <p className="mt-auto pt-5 text-[15px] font-semibold text-[#2F4157]">{s.author.name}</p>
              {s.author.role && <p className="text-[13px] text-[#2F4157]/65">{s.author.role}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ================= PAGE ================= */

export default function IELSCirclePage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeMoment, setActiveMoment] = useState<string | null>(null);
  const selectedCountryData = seaCountries.find((c) => c.name === selectedCountry) ?? null;

  return (
    <div className={cn(siteRoot, "bg-white")} data-testid="circle-page">
      {/* HERO */}
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[80px] md:pt-[64px]">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]")}>
          <div>
            <Image src="/images/logos/events/circleblue.png" alt="IELS Circle" width={180} height={115} priority className="h-auto w-[150px]" />
            <h1 className="mt-6 text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#1A2534] sm:text-[44px] lg:text-[50px]">
              English connects us.<br />
              <span className="text-[#E56668]">Southeast Asia brings us together.</span>
            </h1>
            <p className={cn(lead, "mt-5 max-w-[560px]")}>A growing English community connecting young people across Southeast Asia.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#sessions" className={btnPrimary} data-testid="circle-hero-sessions">Join a weekly session</a>
              <Link href="/circle/stories" className={btnSecondary}>Read member stories</Link>
            </div>
            <p className="mt-6 flex items-center gap-3 text-[14px] text-[#2F4157]/60">
              <span>in collaboration with</span>
              <Image src="/images/logos/company/tofly.png" alt="Tofly.id" width={70} height={20} className="h-5 w-auto" />
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-[#E6E9EE]">
            <Image src="/images/site/online-cohort.webp" alt="An online IELS Circle session on a video call" fill priority sizes="(min-width: 1024px) 600px, 92vw" className="object-cover" />
          </div>
        </div>
      </section>

      <PublicSessions />

      {/* WHERE ARE YOU FROM */}
      <section id="join" className={cn(section, "scroll-mt-[96px] border-t border-[#E6E9EE]")} aria-labelledby="from-heading">
        <div className={cn(container, "text-center")}>
          <h2 id="from-heading" className={h2}>Where are you from?</h2>
          <div className="mx-auto mt-10 grid max-w-[920px] grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {seaCountries.map((c) => {
              const isSelected = selectedCountry === c.name;
              return (
                <button key={c.code} type="button" aria-pressed={isSelected} onClick={() => setSelectedCountry(isSelected ? null : c.name)}
                  className={cn("flex flex-col items-center justify-center gap-2 rounded-[18px] border px-2 py-5 text-[14px] font-semibold transition-colors", focusRing,
                    isSelected ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E6E9EE] text-[#2F4157] hover:border-[#2F4157]")}>
                  <span className="text-[24px]"><Flag code={c.code} /></span>
                  {c.name}
                </button>
              );
            })}
          </div>
          <div aria-live="polite" className="mt-10 min-h-[1px]">
            {selectedCountryData && (
              <div className="mx-auto max-w-[640px]">
                <p className="text-[28px] font-extrabold text-[#1A2534]">{selectedCountryData.greeting}</p>
                <p className={cn(lead, "mt-2")}>That&apos;s &quot;hi, how are you?&quot; in {selectedCountryData.name}. Welcome to the Circle 👋</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <a href={DISCORD_LINK} target="_blank" rel="noopener noreferrer" className={btnPrimary}><FaDiscord aria-hidden="true" /> Join our Discord</a>
                  <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className={btnSecondary}><FaInstagram aria-hidden="true" /> Follow our Instagram</a>
                  <a href={ACCOUNT_LINK} className={btnSecondary}>Create your free account</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* COMMUNITY ACROSS SEA */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="region-heading">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2")}>
          <div>
            <p className={eyebrow}>Our community</p>
            <h2 id="region-heading" className={cn(h2, "mt-3")}>Growing across Southeast Asia</h2>
            <p className={cn(lead, "mt-4")}>
              More than 19,000 learners and teachers have been part of the IELS community, with people joining us from across
              the region and beyond.
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              {[["19K+", "learners & teachers"], ["93%", "from Southeast Asia"], ["7%", "from beyond SEA"]].map(([v, l]) => (
                <div key={l} className={cn(card, "p-4")}>
                  <dt className="sr-only">{l}</dt>
                  <dd><span className="block text-[26px] font-extrabold text-[#1A2534]">{v}</span><span className="text-[14px] text-[#2F4157]/70">{l}</span></dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-[#2F4157]/75">
              <span>🇮🇩 <strong className="text-[#1A2534]">Indonesia 68%</strong></span>
              <span>🇹🇭 Thailand 10%</span><span>🇲🇾 Malaysia 7%</span><span>🇰🇭 Cambodia 5%</span><span>🇻🇳 Vietnam 3%</span>
              <span>+ 7% beyond Southeast Asia</span>
            </p>
          </div>
          <div className="relative aspect-[4/3]">
            <Image src="/images/people/circle/seamaps.png" alt="Map of Southeast Asia" fill sizes="(min-width: 1024px) 540px, 92vw" className="object-contain" />
          </div>
        </div>
      </section>

      {/* MEMBER STORIES */}
      <section id="circle" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="meet-heading">
        <div className={container}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="meet-heading" className={h2}>Meet the Circle</h2>
              <p className={cn(lead, "mt-2")}>Members who studied, interned or volunteered abroad, in their own words.</p>
            </div>
            <Link href="/circle/stories" className={textLink}>See member stories <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <CircleStories />
        </div>
      </section>

      {/* COMMUNITY MOMENTS */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="moments-heading">
        <div className={container}>
          <h2 id="moments-heading" className={h2}>60 events. One growing region.</h2>
          <p className={cn(lead, "mt-3 max-w-[640px]")}>
            Online and offline, we&apos;ve shown up across Southeast Asia since January 2025, and we&apos;re just getting started.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
            {communityMoments.map((m) =>
              m.kind === "past" ? (
                <li key={m.city}>
                  <button type="button" aria-expanded={activeMoment === m.city} onClick={() => setActiveMoment(activeMoment === m.city ? null : m.city)}
                    className={cn("group relative block aspect-square w-full overflow-hidden rounded-[18px] text-left", focusRing)}>
                    <Image src={m.photo} alt={`${m.eventTitle}, ${m.city}`} fill sizes="(min-width: 768px) 360px, 50vw" className="object-cover" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-[#1A2534]"><Flag code={m.code} /> {m.city}</span>
                    <span className={cn("absolute inset-x-0 bottom-0 bg-white/95 p-3 text-[#1A2534] transition-transform duration-300 sm:p-4",
                      activeMoment === m.city ? "translate-y-0" : "translate-y-full group-hover:translate-y-0 group-focus-visible:translate-y-0")}>
                      <span className="block text-[12px] font-semibold text-[#577E90]">{m.date}</span>
                      <span className="block text-[14px] font-bold leading-snug">{m.eventTitle}</span>
                      <span className="block text-[13px] text-[#2F4157]/70">{m.venue}</span>
                    </span>
                  </button>
                </li>
              ) : (
                <li key={m.label} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#C9D1DC] p-4 text-center">
                  <span className="flex gap-2 text-[28px]">{m.codes.map((code) => <Flag key={code} code={code} />)}</span>
                  <span className="text-[15px] font-bold text-[#1A2534]">{m.label}</span>
                  <span className="text-[13px] text-[#2F4157]/65">+ more countries soon</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      {/* GROWTH JOURNEY */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="growth-heading">
        <div className={container}>
          <p className={eyebrow}>The Circle</p>
          <h2 id="growth-heading" className={cn(h2, "mt-3")}>How the Circle keeps growing</h2>
          <p className={cn(lead, "mt-3 max-w-[640px]")}>
            Set a goal, find someone chasing the same one, achieve it together, then inspire the next person to start.
          </p>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {growthJourney.map((step, i) => (
              <li key={step.title} className={cn(card, "flex flex-col items-center p-6 text-center")}>
                <span className="self-start text-[14px] font-bold text-[#577E90]">0{i + 1}</span>
                <Image src={step.mascot} alt="" width={120} height={120} className="h-[110px] w-auto" />
                <h3 className="mt-4 text-[18px] font-bold text-[#1A2534]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#2F4157]/75">{step.desc}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[15px] font-medium text-[#2F4157]/70">↺ Every success becomes someone else&apos;s starting point.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="final-circle-heading">
        <div className={cn(container, "flex flex-col items-center text-center")}>
          <Image src="/images/logos/events/circleblue.png" alt="" width={180} height={115} className="h-auto w-[140px]" />
          <h2 id="final-circle-heading" className={cn(h2, "mt-6 max-w-[720px]")}>Your next connection could start here</h2>
          <p className={cn(lead, "mt-3 max-w-[620px]")}>Join IELS Circle, meet people from across Southeast Asia, and make English part of how you connect with the region.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#sessions" className={btnPrimary}>See this week&apos;s sessions</a>
            <a href={DISCORD_LINK} target="_blank" rel="noopener noreferrer" className={btnSecondary}><FaDiscord aria-hidden="true" /> Join our Discord</a>
            <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" aria-label="Follow IELS Circle on Instagram" className={btnSecondary}><FaInstagram aria-hidden="true" /></a>
          </div>
          <Link href="/circle/agenda" className={cn(textLink, "mt-6")}>See what&apos;s inside IELS Circle <ArrowRight size={16} aria-hidden="true" /></Link>
          <p className="mt-4 text-[14px] text-[#2F4157]/60">Free to join · Open to English learners across Southeast Asia</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ReactCountryFlag from "react-country-flag";
// pastikan react-icons sudah terinstall: npm install react-icons
import { FaDiscord, FaInstagram } from "react-icons/fa";

// TODO: ganti dengan link pembuatan akun IELS (account.ielsco.com atau sejenisnya)
const ACCOUNT_LINK = "https://ielsco.com/sign-up";
// TODO: ganti dengan invite link Discord IELS Circle
const DISCORD_LINK = "https://discord.gg/apFxnhvhWr";
// TODO: ganti kalau handle Instagram-nya beda
const INSTAGRAM_LINK = "https://instagram.com/iels_co";
const CIRCLE_REGISTRATION_LINK = "https://forms.gle/ADAEiK5Uj2aRBgf39";
// halaman yang menjelaskan apa aja yang ada di IELS Circle (agenda, event, dsb.)
const AGENDA_LINK = "https://circle.ielsco.com/agenda";

/* ================= FLAG HELPER ================= */

function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <ReactCountryFlag
      countryCode={code}
      svg
      style={{ width: "1.2em", height: "1.2em" }}
      className={className}
      title={code}
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
const countryCodeMap: Record<string, string> = {
  ...Object.fromEntries(seaCountries.map((c) => [c.name, c.code])),
  Japan: "JP",
};

type MemberStory = {
  name: string;
  photo: string;
  fromCountry: string;
  toCountry: string;
  tag: string;
  story: string;
};

const memberStories: MemberStory[] = [
  {
    name: "Linh",
    photo: "/images/people/circle/linh.png",
    fromCountry: "Vietnam",
    toCountry: "Thailand",
    tag: "Teaching",
    story:
      "Linh started out just wanting to practice her English. These days she's the one teaching it — based in Thailand, working as an English teacher.",
  },
  {
    name: "Rafi",
    photo: "/images/people/circle/rafi.png",
    fromCountry: "Indonesia",
    toCountry: "Singapore",
    tag: "Internship",
    story:
      "Rafi joined the Circle to get more comfortable speaking English before job interviews. A few months later, he landed an internship in Singapore — and still checks in with the group every week.",
  },
  {
    name: "Sokha",
    photo: "/images/people/circle/sokha.png",
    fromCountry: "Cambodia",
    toCountry: "Japan",
    tag: "Exchange",
    story:
      "Sokha practiced his speaking skills in the Circle before applying for an exchange program. He's currently in Japan, still part of the group chat back home.",
  },
];

function StoryCard({
  story,
  className = "",
}: {
  story: MemberStory;
  className?: string;
}) {
  return (
    <div className={`group ${className}`}>
      {/* PHOTO */}
      <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden">
        <Image
          src={story.photo}
          alt={story.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/80 via-transparent to-transparent" />

        <span className="absolute top-4 left-4 text-xs font-semibold bg-white/90 text-[#2F4157] rounded-full px-3 py-1">
          {story.tag}
        </span>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="font-extrabold text-xl">{story.name}</p>
        </div>
      </div>

      {/* COUNTRY ROUTE */}
      <div className="mt-5 flex items-center gap-3">
        {/* FROM */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-[#FAFAFA] border border-gray-200 flex items-center justify-center shadow-sm">
            <span className="text-2xl">
              <Flag code={countryCodeMap[story.fromCountry]} />
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              From
            </p>
            <p className="text-sm font-bold text-[#2F4157]">
              {story.fromCountry}
            </p>
          </div>
        </div>

        {/* ARROW */}
        <span className="text-lg font-bold text-[#E56668] mx-1">→</span>

        {/* TO */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-[#E56668]/5 border border-[#E56668]/20 flex items-center justify-center shadow-sm">
            <span className="text-2xl">
              <Flag code={countryCodeMap[story.toCountry]} />
            </span>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              To
            </p>
            <p className="text-sm font-bold text-[#2F4157]">
              {story.toCountry}
            </p>
          </div>
        </div>
      </div>

      {/* STORY */}
      <p className="mt-4 text-gray-700 leading-relaxed">{story.story}</p>
    </div>
  );
}

// Setting Goals -> Find Partner -> Achieve Goals -> Inspire Others
type GrowthStep = {
  title: string;
  desc: string;
  mascot: string;
};

// TODO: ganti mascot images ini dengan set baru yang sesuai step (goal/partner/achieve/inspire) —
// sementara masih pakai aset lama (meet/speak/connect/grow) sebagai placeholder visual.
const growthJourney: GrowthStep[] = [
  {
    title: "Set Your Goal",
    desc: "Start with what you're chasing — a target score, a scholarship, a job abroad.",
    mascot: "/images/mascot/flywheel/meet.png",
  },
  {
    title: "Find Your Partner",
    desc: "Get matched with someone working toward the same goal, so you're never doing it alone.",
    mascot: "/images/mascot/flywheel/speak.png",
  },
  {
    title: "Achieve It Together",
    desc: "Practice, push each other, and hit real milestones side by side.",
    mascot: "/images/mascot/flywheel/connect.png",
  },
  {
    title: "Inspire & Mentor",
    desc: "Share your story, mentor the next person, and help someone else start their own.",
    mascot: "/images/mascot/flywheel/grow.png",
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
    photo: "/images/contents/community/moments/surabaya.jpg",
    eventTitle: "Hello Sydney! IELSco × Western Sydney University",
    venue: "Western Sydney University Indonesia, Surabaya",
    date: "21 Nov 2025",
  },
  {
    kind: "past",
    city: "Kuala Lumpur",
    country: "Malaysia",
    code: "MY",
    photo: "/images/contents/community/moments/kuala-lumpur.jpg",
    eventTitle: "IELSco Hangout",
    // TODO: ganti dengan nama cafe di KL yang sebenarnya
    venue: "A local café in Kuala Lumpur (TBA)",
    date: "11 Apr 2026",
  },
  {
    kind: "past",
    city: "Bangkok",
    country: "Thailand",
    code: "TH",
    photo: "/images/contents/community/moments/bangkok.jpg",
    eventTitle: "IELSco Hangout",
    venue: "Bangkok University",
    date: "4 Apr 2026",
  },
  {
    kind: "past",
    city: "Phnom Penh",
    country: "Cambodia",
    code: "KH",
    photo: "/images/contents/community/moments/phnom-penh.jpg",
    eventTitle: "IELSco Goes to School",
    venue: "Paragon International School, Cambodia",
    date: "24 Mar 2026",
  },
  {
    kind: "past",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    code: "VN",
    photo: "/images/contents/community/moments/ho-chi-minh-city.jpg",
    eventTitle: "IELSco Hangout",
    // TODO: ganti dengan nama cafe di Ho Chi Minh yang sebenarnya
    venue: "A local café in Ho Chi Minh City (TBA)",
    date: "18 Mar 2026",
  },
  {
    kind: "upcoming-group",
    label: "Philippines & Singapore",
    codes: ["PH", "SG"],
  },
];

/* ================= PAGE ================= */

export default function IELSCirclePage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeMoment, setActiveMoment] = useState<string | null>(null);

  const selectedCountryData =
    seaCountries.find((c) => c.name === selectedCountry) ?? null;

  return (
    <main className="bg-white text-[#2F4157] overflow-x-hidden">
      <Header />

      {/* ================= HERO (satu-satunya section navy) ================= */}
      <section className="relative overflow-hidden bg-[#2F4157]">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] bg-[#E56668]/15 rounded-full blur-[140px]" />

        <div className="relative max-w-7xl mx-auto px-6 py-12 sm:py-14 lg:py-16">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-14 items-center">
            {/* LEFT — MESSAGE */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-[#E56668]" />
                <span className="text-sm font-semibold text-white/70 tracking-[0.16em]">
                  IELS CIRCLE
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight">
                English connects us.
                <br />
                <span className="text-[#E56668]">
                  Southeast Asia brings us together.
                </span>
              </h1>

              <p className="mt-6 text-lg text-white/80 max-w-lg">
                A growing English community connecting young people across
                Southeast Asia.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  className="bg-[#E56668] hover:bg-[#C04C4E] px-8 py-3 rounded-full text-white font-semibold"
                >
                  <Link href="https://forms.gle/ADAEiK5Uj2aRBgf39" target="_blank">Join IELS Circle</Link>
                </Button>
                <Link
                  href="https://circle.ielsco.com/agenda"
                  target="_blank"
                  className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4"
                >
                  Explore the community
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-3 text-white/40 text-sm">
                <Image
                  src="/images/logos/events/iels-circle.png"
                  alt="IELS Circle"
                  width={90}
                  height={24}
                  className="h-5 w-auto brightness-0 invert opacity-70"
                />
                <span>in collaboration with</span>
                {/* TODO: ganti dengan logo Tofly.id */}
                <Image
                  src="/images/logos/company/tofly.png"
                  alt="Tofly.id"
                  width={70}
                  height={20}
                  className="h-4 w-auto opacity-70"
                />
              </div>
            </div>

       {/* RIGHT — HERO IMAGE (foto asli 1800x1350) */}
<div className="relative w-full flex items-center justify-center">
{/* mobile & tablet */}
<div className="relative lg:hidden mx-auto w-[92vw] aspect-[4/3] overflow-hidden">
  <Image
    src="/images/people/circle/seastudent.png"
    alt="IELS Circle members collage"
    fill
    sizes="92vw"
    className="object-contain object-center"
    priority
  />
</div>

  {/* desktop */}
  <div className="hidden lg:block relative w-full max-w-[640px] xl:max-w-[820px] aspect-[4/3] overflow-hidden">
    <Image
      src="/images/people/circle/seastudent.png"
      alt="IELS Circle members collage"
      fill
      sizes="(min-width: 1280px) 820px, 640px"
      className="object-contain object-center"
      priority
    />
  </div>
</div>
          </div>
        </div>
      </section>

      {/* ================= WHERE ARE YOU FROM ================= */}
      <section id="join" className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#2F4157]">
            Where are you from?
          </h2>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {seaCountries.map((c) => {
              const isSelected = selectedCountry === c.name;
              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCountry(isSelected ? null : c.name)}
                  className={`
                    flex flex-col items-center justify-center gap-2
                    rounded-2xl py-5 px-2
                    border transition-all duration-200
                    ${
                      isSelected
                        ? "border-[#E56668] bg-[#E56668]/10 -translate-y-1 shadow-lg"
                        : "border-gray-200 hover:border-[#E56668]/50 hover:-translate-y-0.5"
                    }
                  `}
                >
                  <span className="text-3xl leading-none">
                    <Flag code={c.code} />
                  </span>
                  <span className="text-sm font-semibold text-[#2F4157]">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* GREETING + CTA */}
          <div
            className={`
              mt-10 transition-all duration-300
              ${selectedCountryData ? "opacity-100" : "opacity-0 pointer-events-none h-0"}
            `}
          >
            {selectedCountryData && (
              <>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#E56668]">
                  {selectedCountryData.greeting}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  That&apos;s &quot;hi, how are you?&quot; in {selectedCountryData.name} —
                  welcome to the Circle 👋
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="bg-[#5865F2] hover:bg-[#4752C4] px-6 py-3 rounded-full text-white font-semibold"
                  >
                    <Link
                      href={DISCORD_LINK}
                      target="_blank"
                      className="flex items-center gap-2"
                    >
                      <FaDiscord className="text-lg" /> Join our Discord
                    </Link>
                  </Button>

                  <Button
                    asChild
                    className="bg-white border border-[#E56668] text-[#2F4157] hover:bg-[#E56668]/10 px-6 py-3 rounded-full font-semibold"
                  >
                    <Link
                      href={INSTAGRAM_LINK}
                      target="_blank"
                      className="flex items-center gap-2"
                    >
                      <FaInstagram className="text-lg text-[#E56668]" /> Follow
                      our Instagram
                    </Link>
                  </Button>

                  <Link
                    href={ACCOUNT_LINK}
                    target="_blank"
                    className="text-sm font-semibold text-gray-500 hover:text-[#2F4157] underline underline-offset-4"
                  >
                    Create your free account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================= SOUTHEAST ASIA MAP ================= */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">
              Our community
            </p>

            <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold text-[#2F4157] leading-tight">
              Growing across Southeast Asia.
            </h2>

            <p className="mt-4 text-gray-500 max-w-xl leading-relaxed">
              More than 19,000 learners and teachers have been part of the IELS
              community, with people joining us from across the region and beyond.
            </p>
          </div>

          {/* MAP */}
          <div className="relative mt-10 aspect-[4/3] sm:aspect-[16/10] w-full rounded-3xl bg-[#FAFAFA] border border-gray-200 overflow-hidden">
            <Image
              src="/images/people/circle/seamaps.png"
              alt="Southeast Asia map"
              fill
              className="object-contain p-0 opacity-90 pointer-events-none select-none"
            />
          </div>

          {/* COMMUNITY BREAKDOWN */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-[#FAFAFA] border border-gray-200 p-5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#2F4157]">
                19K+
              </p>
              <p className="mt-1 text-sm text-gray-500">
                learners & teachers
              </p>
            </div>

            <div className="rounded-2xl bg-[#FAFAFA] border border-gray-200 p-5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#E56668]">
                93%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                from Southeast Asia
              </p>
            </div>

            <div className="rounded-2xl bg-[#FAFAFA] border border-gray-200 p-5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#2F4157]">
                68%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                from Indonesia
              </p>
            </div>

            <div className="rounded-2xl bg-[#FAFAFA] border border-gray-200 p-5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#2F4157]">
                7%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                from beyond SEA
              </p>
            </div>
          </div>

          {/* COUNTRY BREAKDOWN */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-500">
            <span>
              🇮🇩 <strong className="text-[#2F4157]">Indonesia 68%</strong>
            </span>
            <span>🇹🇭 Thailand 10%</span>
            <span>🇲🇾 Malaysia 7%</span>
            <span>🇰🇭 Cambodia 5%</span>
            <span>🇻🇳 Vietnam 3%</span>
            <span>+ 7% beyond Southeast Asia</span>
          </div>
        </div>
      </section>

      {/* ================= MEMBER STORIES ================= */}
      <section id="circle" className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-[#2F4157]">
                Meet the Circle.
              </h2>

              <p className="mt-4 text-gray-500 max-w-md">
                Real people. Different countries. Real journeys.
              </p>
            </div>

            <Link
              href="/stories"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#E56668] hover:text-[#C04C4E] transition-colors"
            >
              See member stories
              <span>→</span>
            </Link>
          </div>

          {/* swipe hint — mobile only */}
          <p className="mt-2 text-xs text-gray-400 sm:hidden">
            Swipe to explore →
          </p>

          {/* MOBILE — horizontal slider, Linh → Rafi → Sokha */}
          <div className="mt-6 sm:hidden -mx-6 px-6 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {memberStories.map((m) => (
              <StoryCard
                key={m.name}
                story={m}
                className="w-[78%] shrink-0 snap-center"
              />
            ))}
          </div>

          {/* DESKTOP — grid (unchanged) */}
          <div className="mt-14 hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {memberStories.map((m) => (
              <StoryCard key={m.name} story={m} />
            ))}
          </div>

          {/* MOBILE LINK */}
          <div className="mt-10 sm:hidden">
            <Link
              href="/stories"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E56668]"
            >
              See member stories
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= COMMUNITY MOMENTS ================= */}
      <section className="py-24 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#2F4157] max-w-2xl leading-tight">
            60 events. One growing region.
          </h2>
          <p className="mt-4 text-gray-500 max-w-lg">
            Online and offline, we&apos;ve shown up across Southeast Asia
            since January 2025 — and we&apos;re just getting started.
          </p>
          <p className="mt-2 text-sm font-semibold text-[#E56668]">
            Hover or tap a moment to see what happened →
          </p>

          {/* clean, gapless 3x2 grid — Instagram-style, tap/hover for details */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-200 w-full overflow-hidden">
            {communityMoments.map((m) =>
              m.kind === "past" ? (
                <button
                  key={m.city}
                  type="button"
                  onClick={() =>
                    setActiveMoment(activeMoment === m.city ? null : m.city)
                  }
                  className="group relative aspect-square w-full overflow-hidden bg-white text-left"
                >
                  {/* TODO: ganti dengan foto event asli */}
                  <Image
                    src={m.photo}
                    alt={`${m.city}, ${m.country}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/70 via-transparent to-transparent" />

                  <span className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold bg-white/90 rounded-full px-2.5 py-1 text-[#2F4157]">
                    <Flag code={m.code} /> {m.city}
                  </span>

                  {/* slide-up detail panel: hover on desktop, tap-to-toggle on mobile */}
                  <div
                    className={`
                      absolute inset-x-0 bottom-0 bg-[#2F4157]/95 text-white p-3 sm:p-4
                      transition-transform duration-300 ease-out
                      ${
                        activeMoment === m.city
                          ? "translate-y-0"
                          : "translate-y-full group-hover:translate-y-0"
                      }
                    `}
                  >
                    <p className="text-[10px] sm:text-[11px] font-semibold text-[#E56668] uppercase tracking-wider">
                      {m.date}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm font-bold leading-snug">
                      {m.eventTitle}
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-white/70">
                      {m.venue}
                    </p>
                  </div>
                </button>
              ) : (
                <div
                  key={m.label}
                  className="relative aspect-square flex flex-col items-center justify-center gap-2 bg-[#FAFAFA]"
                >
                  <div className="flex items-center gap-1.5 text-2xl">
                    {m.codes.map((code) => (
                      <Flag key={code} code={code} />
                    ))}
                  </div>
                  <p className="text-sm font-bold text-[#2F4157] text-center px-3">
                    {m.label}
                  </p>
                  <span className="text-xs font-semibold text-[#E56668] bg-[#E56668]/10 rounded-full px-2.5 py-1">
                    + more countries soon
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ================= GROWTH JOURNEY (goal → partner → achieve → inspire) ================= */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">
            The Circle
          </p>

          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#2F4157]">
            How the Circle keeps growing.
          </h2>

          <p className="mt-3 text-gray-500 max-w-lg mx-auto">
            Set a goal, get matched with someone chasing the same one, achieve
            it together — then inspire the next person to start.
          </p>

          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-5">
            {growthJourney.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-3xl bg-[#FAFAFA] border border-gray-200 px-5 pt-6 pb-7"
              >
                {/* step number */}
                <span className="absolute top-4 left-4 text-xs font-bold text-[#E56668]">
                  0{i + 1}
                </span>

                {/* mascot */}
                <div className="h-28 sm:h-32 flex items-end justify-center">
                  <Image
                    src={step.mascot}
                    alt={`${step.title} mascot`}
                    width={140}
                    height={140}
                    className="max-h-28 sm:max-h-32 w-auto object-contain"
                  />
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-[#2F4157]">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {step.desc}
                </p>

                {/* arrow on desktop */}
                {i < growthJourney.length - 1 && (
                  <span className="hidden lg:block absolute top-1/2 -right-[18px] -translate-y-1/2 z-10 text-xl text-[#E56668] bg-white rounded-full px-1">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm font-semibold text-[#E56668]">
            ↺ Every success becomes someone else&apos;s starting point.
          </p>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative bg-white py-16 sm:py-20 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-[#E56668]/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-[#2F4157]/5 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          {/* IELS CIRCLE LOGO */}
          <Image
            src="/images/logo/iels-circle-logo.png"
            alt="IELS Circle"
            width={220}
            height={80}
            className="mx-auto h-14 sm:h-16 w-auto object-contain"
          />

          <h2 className="mt-8 text-4xl sm:text-5xl font-extrabold text-[#2F4157] leading-tight">
            Your next connection could start here.
          </h2>

          <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Join IELS Circle, meet people from across Southeast Asia, and make
            English part of how you connect with the region.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {/* PRIMARY CTA */}
            <Button
              asChild
              className="bg-[#E56668] hover:bg-[#C04C4E] px-8 py-3 rounded-full text-white font-semibold"
            >
              <Link
                href={CIRCLE_REGISTRATION_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                Register for IELS Circle
              </Link>
            </Button>

            {/* DISCORD */}
            <Button
              asChild
              className="bg-[#5865F2] hover:bg-[#4752C4] px-8 py-3 rounded-full text-white font-semibold"
            >
              <Link href={DISCORD_LINK} target="_blank" className="flex items-center gap-2">
                <FaDiscord className="text-lg" />
                Join our Discord
              </Link>
            </Button>

            {/* INSTAGRAM */}
            <Link
              href={INSTAGRAM_LINK}
              aria-label="Follow IELS Circle on Instagram"
              className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
            >
              <FaInstagram className="text-lg" />
            </Link>
          </div>

          {/* WHAT'S INSIDE IELS CIRCLE */}
          <div className="mt-6">
            <Link
              href={AGENDA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#2F4157]/70 hover:text-[#2F4157] underline underline-offset-4"
            >
              See what&apos;s inside IELS Circle →
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            Free to join · Open to English learners across Southeast Asia
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
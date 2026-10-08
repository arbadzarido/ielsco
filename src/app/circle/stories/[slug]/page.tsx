import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ReactCountryFlag from "react-country-flag";
import { FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";
import {
  memberStoriesData,
  subcategoryLabels,
  type MemberStory,
} from "@/data/member-stories";
import { generateSlug } from "@/utils/slug";
import { Metadata } from "next";
import StoryGallery from "@/components/StoryGallery";

interface DetailStoriesPageProps {
  params: Promise<{ slug: string }>;
}

const CIRCLE_LINK = "https://circle.ielsco.com";

/* ================= METADATA ================= */

export async function generateMetadata({
  params,
}: DetailStoriesPageProps): Promise<Metadata> {
  const { slug } = await params;

  const memberStory = memberStoriesData.find(
    (story) => generateSlug(story.title) === slug
  );

  if (!memberStory) {
    return {
      title: "Story Not Found - IELS",
      description: "The requested story could not be found.",
    };
  }

  return {
    title: memberStory.seo.meta_title,
    description: memberStory.seo.meta_description,
    keywords: memberStory.seo.meta_keywords,
    openGraph: {
      title: memberStory.seo.meta_title,
      description: memberStory.seo.meta_description,
      images: [memberStory.bannerImage],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: memberStory.seo.meta_title,
      description: memberStory.seo.meta_description,
      images: [memberStory.author.avatar],
    },
  };
}

/* ================= SMALL HELPERS ================= */

function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

// Interleave quotes as visual "pauses" between story sections, rather than
// dumping them all at the end.
function buildTimeline(story: MemberStory) {
  const sections = story.storySections ?? [];
  const quotes = story.quotes ?? [];

  type Block =
    | { kind: "section"; index: number; section: (typeof sections)[number] }
    | { kind: "quote"; index: number; quote: (typeof quotes)[number] };

  const blocks: Block[] = [];
  let quoteCursor = 0;

  sections.forEach((section, i) => {
    blocks.push({ kind: "section", index: i, section });
    // drop a quote in after the 2nd section (a natural pause), then
    // save any remaining quote(s) for the very end.
    if (i === 1 && quoteCursor < quotes.length) {
      blocks.push({ kind: "quote", index: quoteCursor, quote: quotes[quoteCursor] });
      quoteCursor += 1;
    }
  });

  while (quoteCursor < quotes.length) {
    blocks.push({ kind: "quote", index: quoteCursor, quote: quotes[quoteCursor] });
    quoteCursor += 1;
  }

  return blocks;
}

/* ================= PAGE ================= */

export default async function DetailStoriesPage({
  params,
}: DetailStoriesPageProps) {
  const { slug } = await params;

  const memberStory = memberStoriesData.find(
    (story) => generateSlug(story.title) === slug
  );

  if (!memberStory) {
    return (
      <div>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white pt-32">
          <h1 className="text-2xl font-bold text-[#2F4157] mb-4">
            Story Not Found
          </h1>
          <p className="text-gray-600">
            The story you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  const { author } = memberStory;
  const hasSocial = author.instagram || author.linkedin || author.website;
  const timeline = buildTimeline(memberStory);

  const related = memberStoriesData
    .filter((s) => s.id !== memberStory.id)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  return (
    <div className="bg-white">
      <Header />

      {/* ================= HERO ================= */}
      <section className="relative pt-16 md:pt-0">
        <div className="relative w-full h-[220px] sm:h-[320px] md:h-[420px]">
          <Image
            src={memberStory.bannerImage}
            alt={memberStory.title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/90 via-[#2F4157]/20 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0">
          <div className="relative -mt-20 sm:-mt-24 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="w-[110px] h-[110px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden border-4 border-white bg-white shadow-xl shrink-0">
              <Image
                src={author.avatar}
                alt={author.name}
                width={150}
                height={150}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="pb-1 sm:pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wide text-[#E56668] bg-[#E56668]/10 rounded-full px-3 py-1">
                  {subcategoryLabels[memberStory.subcategory]}
                </span>
              </div>

              <h2 className="mt-2 text-lg sm:text-xl font-extrabold text-[#2F4157] flex items-center gap-2 flex-wrap">
                {author.name}
                {author.country && (
                  <ReactCountryFlag
                    countryCode={author.country}
                    svg
                    style={{ width: "1.1em", height: "1.1em" }}
                    title={author.country}
                  />
                )}
              </h2>
              {author.role && (
                <p className="text-sm text-gray-500 mt-0.5">{author.role}</p>
              )}
            </div>
          </div>

          <h1 className="mt-6 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2F4157] leading-tight max-w-3xl">
            {memberStory.title}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {memberStory.location} · {memberStory.date}
          </p>

          {hasSocial && (
            <div className="mt-4 flex items-center gap-3">
              {author.instagram && (
                <Link
                  href={author.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name} on Instagram`}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
                >
                  <FaInstagram />
                </Link>
              )}
              {author.linkedin && (
                <Link
                  href={author.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name} on LinkedIn`}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
                >
                  <FaLinkedin />
                </Link>
              )}
              {author.website && (
                <Link
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${author.name}'s website`}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
                >
                  <FaGlobe />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================= HIGHLIGHTS ================= */}
      {memberStory.highlights && memberStory.highlights.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0 mt-10 sm:mt-14">
          <div
            className={`grid gap-3 sm:gap-4 ${
              memberStory.highlights.length >= 3
                ? "grid-cols-3"
                : "grid-cols-2"
            }`}
          >
            {memberStory.highlights.map((h, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[#FAFAFA] border border-gray-200 p-4 sm:p-5 text-center"
              >
                <p className="text-xl sm:text-2xl font-extrabold text-[#2F4157]">
                  {h.value}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  {h.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= THE JOURNEY ================= */}
      <section className="max-w-3xl mx-auto px-4 sm:px-8 lg:px-0 mt-14 sm:mt-16">
        {timeline.length > 0 ? (
          <div className="space-y-12 sm:space-y-16">
            {timeline.map((block) =>
              block.kind === "section" ? (
                <div key={`section-${block.index}`}>
                  <p className="text-xs font-bold text-[#E56668] tracking-widest mb-2">
                    {String(block.index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#2F4157] mb-4">
                    {block.section.title}
                  </h3>
                  {block.section.image && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4">
                      <Image
                        src={block.section.image}
                        alt={block.section.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div
                    className="text-gray-700 leading-relaxed text-[15px] sm:text-base [&_p]:mb-3 [&_strong]:text-[#2F4157]"
                    dangerouslySetInnerHTML={{ __html: block.section.content }}
                  />
                </div>
              ) : (
                <blockquote
                  key={`quote-${block.index}`}
                  className="py-8 sm:py-10 border-y border-gray-100 text-center"
                >
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#2F4157] leading-snug max-w-2xl mx-auto">
                    &ldquo;{block.quote.text}&rdquo;
                  </p>
                  {block.quote.attribution && (
                    <p className="mt-4 text-sm font-semibold text-[#E56668]">
                      — {block.quote.attribution}
                    </p>
                  )}
                </blockquote>
              )
            )}
          </div>
        ) : (
          // Fallback for stories without storySections yet — render the
          // legacy full article so nothing breaks.
          <div
            className="text-justify text-sm sm:text-base leading-relaxed text-gray-700 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
            dangerouslySetInnerHTML={{ __html: memberStory.content }}
          />
        )}

        {memberStory.credits && (
          <p className="mt-14 text-xs text-gray-400">
            {memberStory.credits.writer && (
              <>✍️ Written by {memberStory.credits.writer}</>
            )}
            {memberStory.credits.writer && memberStory.credits.designer && " · "}
            {memberStory.credits.designer && (
              <>🎨 Design by {memberStory.credits.designer}</>
            )}
          </p>
        )}
      </section>

      {/* ================= GALLERY ================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0 mt-16 sm:mt-20">
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#2F4157] mb-1">
          Through the Journey
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Moments from {firstName(author.name)}&apos;s experience.
        </p>
        <StoryGallery items={memberStory.gallery} authorName={author.name} />
      </section>

      {/* ================= CONNECT ================= */}
      {hasSocial && (
        <section className="max-w-3xl mx-auto px-4 sm:px-8 lg:px-0 mt-16 sm:mt-20">
          <div className="rounded-3xl border border-gray-200 bg-[#FAFAFA] p-6 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#2F4157]">
              Connect with {firstName(author.name)}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Curious about the journey? Reach out directly.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {author.instagram && (
                <Link
                  href={author.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
                >
                  <FaInstagram /> Instagram
                </Link>
              )}
              {author.linkedin && (
                <Link
                  href={author.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
                >
                  <FaLinkedin /> LinkedIn
                </Link>
              )}
              {author.website && (
                <Link
                  href={author.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
                >
                  <FaGlobe /> Website
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= IELS CIRCLE CTA ================= */}
      <section className="relative bg-[#2F4157] mt-20 sm:mt-24 py-14 sm:py-16 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[360px] h-[360px] bg-[#E56668]/15 rounded-full blur-[120px]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-8 lg:px-0 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#E56668]">
            Meet more SEAblings
          </p>
          <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            This story is one of many journeys happening across Southeast
            Asia.
          </h3>
          <p className="mt-4 text-white/80">
            Practice English. Meet people from Southeast Asia. Exchange
            experiences. Discover opportunities.
          </p>
          <Button
            asChild
            className="mt-7 bg-[#E56668] hover:bg-[#C04C4E] px-8 py-3 rounded-full text-white font-semibold"
          >
            <Link href={CIRCLE_LINK} target="_blank" rel="noopener noreferrer">
              Join IELS Circle
            </Link>
          </Button>
        </div>
      </section>

      {/* ================= RELATED STORIES ================= */}
      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0 py-16 sm:py-20">
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#2F4157] mb-8">
            More SEAblings to meet
          </h3>

          <div className="grid sm:grid-cols-3 gap-6">
            {related.map((s) => (
              <Link
                key={s.id}
                // relatif ke /…/stories/[slug] yang lagi dibuka, jadi aman di lokal (/circle) maupun prod
                href={generateSlug(s.title)}
                className="group block"
              >
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden">
                  <Image
                    src={s.author.avatar}
                    alt={s.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/85 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#E56668] bg-white/90 rounded-full px-2.5 py-1">
                      {subcategoryLabels[s.subcategory]}
                    </span>
                    <p className="mt-2 text-white font-bold leading-snug flex items-center gap-1.5">
                      {s.author.name}
                      {s.author.country && (
                        <ReactCountryFlag
                          countryCode={s.author.country}
                          svg
                          style={{ width: "1em", height: "1em" }}
                          title={s.author.country}
                        />
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {s.seo.meta_description}
                </p>
                <span className="mt-2 inline-block text-sm font-semibold text-[#E56668] group-hover:text-[#C04C4E]">
                  Read the story →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
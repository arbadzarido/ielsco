import Image from "next/image";
import Link from "next/link";
import ReactCountryFlag from "react-country-flag";
import { FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import StoryGallery from "@/components/StoryGallery";
import { sanitizeStoryHtml } from "@/lib/stories/sanitize";
import { CATEGORY_LABELS, type PublicStory } from "@/lib/stories/types";

// The public story layout, shared by circle.ielsco.com/stories/[slug] and the admin preview, so the preview is
// exactly what will be published. All story HTML goes through the allow-list sanitizer.

const CIRCLE_LINK = "https://circle.ielsco.com";

function firstName(fullName: string) {
  return fullName.split(" ")[0] || fullName;
}

// Interleave quotes as visual "pauses" between story sections, rather than dumping them all at the end.
function buildTimeline(story: PublicStory) {
  type Block =
    | { kind: "section"; index: number; section: PublicStory["sections"][number] }
    | { kind: "quote"; index: number; quote: PublicStory["quotes"][number] };
  const blocks: Block[] = [];
  let quoteCursor = 0;
  story.sections.forEach((section, i) => {
    blocks.push({ kind: "section", index: i, section });
    // drop a quote in after the 2nd section (a natural pause), then save the rest for the end.
    if (i === 1 && quoteCursor < story.quotes.length) {
      blocks.push({ kind: "quote", index: quoteCursor, quote: story.quotes[quoteCursor] });
      quoteCursor += 1;
    }
  });
  while (quoteCursor < story.quotes.length) {
    blocks.push({ kind: "quote", index: quoteCursor, quote: story.quotes[quoteCursor] });
    quoteCursor += 1;
  }
  return blocks;
}

const socialBtn =
  "w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors";
const socialPill =
  "inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors";

export default function StoryArticle({
  story,
  related = [],
  preview = false,
}: {
  story: PublicStory;
  related?: PublicStory[];
  preview?: boolean;
}) {
  const { author } = story;
  const hasSocial = author.instagram || author.linkedin || author.website;
  const timeline = buildTimeline(story);
  const unoptimized = preview;

  return (
    <article className="bg-white [&_:is(h1,h2,h3,h4,h5,h6)]:font-sans">
      {/* ================= HERO ================= */}
      <section className={preview ? "relative" : "relative pt-16 md:pt-0"}>
        <div className="relative w-full h-[220px] sm:h-[320px] md:h-[420px] bg-[#F1F4F8]">
          {story.bannerImage && (
            <Image src={story.bannerImage} alt={story.title} fill priority={!preview} unoptimized={unoptimized} className="object-cover" sizes="100vw" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/90 via-[#2F4157]/20 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0">
          <div className="relative -mt-20 sm:-mt-24 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="w-[110px] h-[110px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden border-4 border-white bg-[#F1F4F8] shadow-xl shrink-0">
              {author.avatar && (
                <Image src={author.avatar} alt={author.name} width={150} height={150} unoptimized={unoptimized} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="pb-1 sm:pb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[#E56668] bg-[#E56668]/10 rounded-full px-3 py-1">
                {CATEGORY_LABELS[story.category]}
              </span>
              <h2 className="mt-2 text-lg sm:text-xl font-extrabold text-[#2F4157] flex items-center gap-2 flex-wrap">
                {author.name}
                {author.country && (
                  <ReactCountryFlag countryCode={author.country} svg style={{ width: "1.1em", height: "1.1em" }} title={author.country} />
                )}
              </h2>
              {author.role && <p className="text-sm text-gray-500 mt-0.5">{author.role}</p>}
            </div>
          </div>

          <h1 className="mt-6 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2F4157] leading-tight max-w-3xl">{story.title}</h1>

          {(story.location || story.date) && (
            <p className="mt-2 text-sm text-gray-500">{[story.location, story.date].filter(Boolean).join(" · ")}</p>
          )}

          {hasSocial && (
            <div className="mt-4 flex items-center gap-3">
              {author.instagram && (
                <Link href={author.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${author.name} on Instagram`} className={socialBtn}>
                  <FaInstagram />
                </Link>
              )}
              {author.linkedin && (
                <Link href={author.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${author.name} on LinkedIn`} className={socialBtn}>
                  <FaLinkedin />
                </Link>
              )}
              {author.website && (
                <Link href={author.website} target="_blank" rel="noopener noreferrer" aria-label={`${author.name}'s website`} className={socialBtn}>
                  <FaGlobe />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================= HIGHLIGHTS ================= */}
      {story.highlights.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0 mt-10 sm:mt-14">
          <div className={`grid gap-3 sm:gap-4 ${story.highlights.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {story.highlights.map((h, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#E6E9EE] p-4 sm:p-5 text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-[#2F4157]">{h.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">{h.label}</p>
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
                  <p className="text-xs font-bold text-[#E56668] tracking-widest mb-2">{String(block.index + 1).padStart(2, "0")}</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#2F4157] mb-4">{block.section.title}</h3>
                  {block.section.image && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 bg-[#F1F4F8]">
                      <Image src={block.section.image} alt={block.section.title} fill unoptimized={unoptimized} className="object-cover" sizes="(min-width: 768px) 768px, 100vw" />
                    </div>
                  )}
                  <div
                    className="text-gray-700 leading-relaxed text-[15px] sm:text-base [&_p]:mb-3 [&_strong]:text-[#2F4157] [&_a]:text-[#E56668] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(block.section.content) }}
                  />
                  {block.section.quote && (
                    <p className="mt-4 border-l-4 border-[#E56668] pl-4 text-lg font-semibold text-[#2F4157]">&ldquo;{block.section.quote}&rdquo;</p>
                  )}
                </div>
              ) : (
                <blockquote key={`quote-${block.index}`} className="py-8 sm:py-10 border-y border-gray-100 text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#2F4157] leading-snug max-w-2xl mx-auto">&ldquo;{block.quote.text}&rdquo;</p>
                  {block.quote.attribution && <p className="mt-4 text-sm font-semibold text-[#E56668]">— {block.quote.attribution}</p>}
                </blockquote>
              )
            )}
          </div>
        ) : (
          // Stories without sections: render the legacy full article (sanitized).
          <div
            className="text-justify text-sm sm:text-base leading-relaxed text-gray-700 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
            dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(story.legacyContent) }}
          />
        )}

        {(story.credits.writer || story.credits.designer) && (
          <p className="mt-14 text-xs text-gray-400">
            {story.credits.writer && <>✍️ Written by {story.credits.writer}</>}
            {story.credits.writer && story.credits.designer && " · "}
            {story.credits.designer && <>🎨 Design by {story.credits.designer}</>}
          </p>
        )}
      </section>

      {/* ================= GALLERY ================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0 mt-16 sm:mt-20">
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#2F4157] mb-1">Through the Journey</h3>
        <p className="text-sm text-gray-500 mb-6">Moments from {firstName(author.name)}&apos;s experience.</p>
        <StoryGallery items={story.gallery} authorName={author.name} unoptimized={unoptimized} />
      </section>

      {/* ================= CONNECT ================= */}
      {hasSocial && (
        <section className="max-w-3xl mx-auto px-4 sm:px-8 lg:px-0 mt-16 sm:mt-20">
          <div className="rounded-3xl border border-[#E6E9EE] bg-white p-6 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#2F4157]">Connect with {firstName(author.name)}</h3>
            <p className="mt-2 text-sm text-gray-500">Curious about the journey? Reach out directly.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {author.instagram && (
                <Link href={author.instagram} target="_blank" rel="noopener noreferrer" className={socialPill}>
                  <FaInstagram /> Instagram
                </Link>
              )}
              {author.linkedin && (
                <Link href={author.linkedin} target="_blank" rel="noopener noreferrer" className={socialPill}>
                  <FaLinkedin /> LinkedIn
                </Link>
              )}
              {author.website && (
                <Link href={author.website} target="_blank" rel="noopener noreferrer" className={socialPill}>
                  <FaGlobe /> Website
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= IELS CIRCLE CTA ================= */}
      <section className="relative mt-20 overflow-hidden border-y border-[#E6E9EE] bg-white py-14 sm:mt-24 sm:py-16">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-8 lg:px-0 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#577E90]">Meet more SEAblings</p>
          <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#1A2534] leading-tight">
            This story is one of many journeys happening across Southeast Asia.
          </h3>
          <p className="mt-4 text-[#2F4157]/75">Practice English. Meet people from Southeast Asia. Exchange experiences. Discover opportunities.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-[#2F4157] hover:bg-[#1A2534] px-8 py-3 rounded-full text-white font-semibold">
              <Link href={CIRCLE_LINK} target="_blank" rel="noopener noreferrer">Join IELS Circle</Link>
            </Button>
            {!preview && (
              <Link href="submit" className="text-sm font-semibold text-[#E56668] underline underline-offset-4 hover:text-[#C04C4E]">
                Share your own story
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ================= RELATED STORIES ================= */}
      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-0 py-16 sm:py-20">
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#2F4157] mb-8">More SEAblings to meet</h3>
          <div className="grid sm:grid-cols-3 gap-6">
            {related.map((s) => (
              // relative to /…/stories/[slug], so it works on circle.ielsco.com/stories and locally on /circle/stories
              <Link key={s.id} href={s.slug} className="group block">
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#F1F4F8]">
                  {(s.author.avatar || s.bannerImage) && (
                    <Image src={(s.author.avatar || s.bannerImage)!} alt={s.title} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/85 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#E56668] bg-white/90 rounded-full px-2.5 py-1">{CATEGORY_LABELS[s.category]}</span>
                    <p className="mt-2 text-white font-bold leading-snug flex items-center gap-1.5">
                      {s.author.name}
                      {s.author.country && <ReactCountryFlag countryCode={s.author.country} svg style={{ width: "1em", height: "1em" }} title={s.author.country} />}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2">{s.summary}</p>
                <span className="mt-2 inline-block text-sm font-semibold text-[#E56668] group-hover:text-[#C04C4E]">Read the story →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

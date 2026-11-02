import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import StoryGallery from "@/components/StoryGallery";
import { sanitizeStoryHtml } from "@/lib/stories/sanitize";
import { IELSCO_CATEGORY_LABELS, IELSCO_STORIES_PATH, ielscoStoryPath, type IelscoStory } from "@/lib/stories/ielsco";

// The public IELSco Stories article, shared by /stories/[slug], /id/stories/[slug] and the admin preview (so the preview
// is what will be published). All body HTML goes through the same allow-list sanitizer as Member Stories.

const UI = {
  en: { home: "Home", stories: "IELSco Stories", by: "By", published: "Published", updated: "Updated", other: "Baca dalam Bahasa Indonesia",
    related: "More IELSco Stories", all: "All stories", gallery: "Photos", tags: "Tags", ctaTitle: "Be part of what's next",
    ctaBody: "Practise English every week with IELS Circle, find scholarships and programs on the opportunity board, and join our next event.",
    circle: "Join IELS Circle", opps: "Browse opportunities", events: "See events", locale: "en-GB" },
  id: { home: "Beranda", stories: "IELSco Stories", by: "Oleh", published: "Terbit", updated: "Diperbarui", other: "Read in English",
    related: "IELSco Stories lainnya", all: "Semua cerita", gallery: "Foto", tags: "Tag", ctaTitle: "Jadi bagian dari langkah berikutnya",
    ctaBody: "Latihan bahasa Inggris setiap minggu di IELS Circle, temukan beasiswa dan program di papan peluang, dan ikuti acara kami berikutnya.",
    circle: "Gabung IELS Circle", opps: "Lihat peluang", events: "Lihat acara", locale: "id-ID" },
} as const;

export const formatStoryDate = (iso: string, lang: "en" | "id") =>
  new Date(iso).toLocaleDateString(UI[lang].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

const btnNavy = "inline-flex items-center justify-center gap-2 rounded-full bg-[#2F4157] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1A2534]";
const btnGhost = "inline-flex items-center justify-center gap-2 rounded-full border border-[#D5DBE3] bg-white px-6 py-3 text-[15px] font-semibold text-[#2F4157] transition hover:border-[#2F4157]";

export function IelscoStoryCard({ story, priority = false, unoptimized = false }: { story: IelscoStory; priority?: boolean; unoptimized?: boolean }) {
  return (
    <Link href={ielscoStoryPath(story.lang, story.slug)} data-testid="ielsco-story-card"
      className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#E6E9EE] bg-white transition-all hover:-translate-y-1 hover:border-[#E56668]/40 hover:shadow-xl">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F1F4F8]">
        {story.bannerImage && (
          <Image src={story.bannerImage} alt={story.bannerAlt ?? ""} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" priority={priority} unoptimized={unoptimized}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <span className="self-start rounded-full bg-[#E56668]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#C04C4E]">{IELSCO_CATEGORY_LABELS[story.category][story.lang]}</span>
        <h3 className="mt-3 text-[19px] font-bold leading-snug text-[#1A2534]">{story.title}</h3>
        <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[#2F4157]/75">{story.summary}</p>
        <time dateTime={story.publishedAt} className="mt-auto pt-4 text-[13px] text-[#2F4157]/55">{formatStoryDate(story.publishedAt, story.lang)}</time>
      </div>
    </Link>
  );
}

export default function IelscoStoryArticle({ story, related = [], preview = false }: { story: IelscoStory; related?: IelscoStory[]; preview?: boolean }) {
  const u = UI[story.lang];
  const other = story.lang === "en" ? "id" : "en";
  const cat = IELSCO_CATEGORY_LABELS[story.category][story.lang];
  return (
    <article className="bg-white text-[#2F4157]" lang={story.lang} data-testid="ielsco-story-article">
      <div className="mx-auto max-w-[820px] px-4 pb-16 pt-8 sm:px-6 md:pt-12">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[#2F4157]/60">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:underline">{u.home}</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li><Link href={IELSCO_STORIES_PATH[story.lang]} className="hover:underline">{u.stories}</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li><Link href={`${IELSCO_STORIES_PATH[story.lang]}?category=${story.category}`} className="hover:underline">{cat}</Link></li>
          </ol>
        </nav>
        <p className="mt-6 inline-block rounded-full bg-[#E56668]/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-[#C04C4E]">{cat}</p>
        <h1 className="mt-4 text-[32px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#1A2534] sm:text-[44px]">{story.title}</h1>
        {story.summary && <p className="mt-4 text-[18px] leading-relaxed text-[#2F4157]/80 sm:text-[20px]">{story.summary}</p>}
        <p className="mt-5 text-[14px] text-[#2F4157]/60">
          {u.by} {story.author.name}{story.author.role ? `, ${story.author.role}` : ""} · {u.published} <time dateTime={story.publishedAt}>{formatStoryDate(story.publishedAt, story.lang)}</time>
          {story.updatedAt.slice(0, 10) > story.publishedAt.slice(0, 10) && <> · {u.updated} <time dateTime={story.updatedAt}>{formatStoryDate(story.updatedAt, story.lang)}</time></>}
          {story.location && <> · {story.location}</>}
          {story.translationSlug && <> · <Link href={ielscoStoryPath(other, story.translationSlug)} hrefLang={other} className="font-semibold text-[#2F4157] underline underline-offset-4">{u.other}</Link></>}
        </p>
      </div>

      {story.bannerImage && (
        <figure className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[20px] bg-[#F1F4F8]">
            <Image src={story.bannerImage} alt={story.bannerAlt ?? ""} fill priority sizes="(min-width: 1100px) 1100px, 100vw" unoptimized={preview} className="object-cover" />
          </div>
          {story.bannerCaption && <figcaption className="mx-auto mt-3 max-w-[820px] text-[14px] text-[#2F4157]/60">{story.bannerCaption}</figcaption>}
        </figure>
      )}

      <div className="mx-auto max-w-[760px] space-y-10 px-4 py-12 sm:px-6">
        {story.highlights.length > 0 && (
          <dl className="grid grid-cols-2 gap-4 rounded-[20px] border border-[#E6E9EE] p-6 sm:grid-cols-3">
            {story.highlights.map((h) => <div key={h.label}><dt className="text-[13px] text-[#2F4157]/60">{h.label}</dt><dd className="text-[22px] font-extrabold text-[#1A2534]">{h.value}</dd></div>)}
          </dl>
        )}
        {story.sections.map((s, i) => (
          <section key={i} className="space-y-4">
            {s.title && <h2 className="text-[24px] font-bold leading-snug text-[#1A2534] sm:text-[28px]">{s.title}</h2>}
            <div className="prose-story space-y-4 text-[17px] leading-[1.75] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E56668] [&_blockquote]:pl-4 [&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:text-[#1A2534] [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(s.content) }} />
            {s.image && (
              <figure>
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[16px] bg-[#F1F4F8]">
                  <Image src={s.image} alt={s.imageAlt ?? s.imageCaption ?? ""} fill sizes="(min-width: 760px) 760px, 100vw" unoptimized={preview} className="object-cover" />
                </div>
                {s.imageCaption && <figcaption className="mt-2 text-[14px] text-[#2F4157]/60">{s.imageCaption}</figcaption>}
              </figure>
            )}
            {s.quote && <blockquote className="border-l-4 border-[#E56668] pl-5 text-[20px] font-semibold leading-snug text-[#1A2534]">{s.quote}</blockquote>}
          </section>
        ))}
        {story.quotes.map((q) => (
          <blockquote key={q.text} className="rounded-[20px] bg-[#F7F8FA] p-6 text-[19px] font-semibold leading-snug text-[#1A2534]">
            “{q.text}”{q.attribution && <footer className="mt-3 text-[15px] font-medium text-[#2F4157]/70">— {q.attribution}</footer>}
          </blockquote>
        ))}
        {story.gallery.length > 0 && (
          <section aria-label={u.gallery}><h2 className="mb-4 text-[24px] font-bold text-[#1A2534]">{u.gallery}</h2><StoryGallery items={story.gallery} authorName="IELSco" unoptimized={preview} /></section>
        )}
        {story.tags.length > 0 && (
          <p className="flex flex-wrap gap-2" aria-label={u.tags}>{story.tags.map((t) => <span key={t} className="rounded-full border border-[#E6E9EE] px-3 py-1 text-[13px] text-[#2F4157]/75">#{t}</span>)}</p>
        )}
        {(story.credits.writer || story.credits.designer) && (
          <p className="text-[14px] text-[#2F4157]/60">{[story.credits.writer && `Words: ${story.credits.writer}`, story.credits.designer && `Design: ${story.credits.designer}`].filter(Boolean).join(" · ")}</p>
        )}
        <aside className="rounded-[24px] border border-[#E6E9EE] p-6 sm:p-8">
          <h2 className="text-[22px] font-bold text-[#1A2534]">{u.ctaTitle}</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-[#2F4157]/75">{u.ctaBody}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://circle.ielsco.com/" className={btnNavy}>{u.circle} <ArrowRight size={16} aria-hidden="true" /></a>
            <Link href="/opportunities" className={btnGhost}>{u.opps}</Link>
            <Link href="/events" className={btnGhost}>{u.events}</Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-[#E6E9EE] bg-white">
          <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-[26px] font-bold text-[#1A2534]">{u.related}</h2>
              <Link href={IELSCO_STORIES_PATH[story.lang]} className="text-[15px] font-semibold text-[#2F4157] underline underline-offset-4">{u.all}</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <IelscoStoryCard key={r.id} story={r} unoptimized={preview} />)}</div>
          </div>
        </section>
      )}
    </article>
  );
}

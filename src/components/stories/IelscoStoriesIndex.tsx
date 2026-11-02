"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { IELSCO_CATEGORIES, IELSCO_CATEGORY_LABELS, IELSCO_STORIES_PATH, ielscoStoryPath, type IelscoCategory, type IelscoStory, type StoryLang } from "@/lib/stories/ielsco";
import { IelscoStoryCard, formatStoryDate } from "./IelscoStoryArticle";

// IELSco Stories listing: editorial hero, the newest story as the featured article, category pills (only categories
// that have stories), and a grid. Filtering is client-side over the server-rendered list; ?category= deep-links a filter.

const UI = {
  en: { eyebrow: "IELSco Stories", h1: "News and stories from IELSco",
    lead: "Milestones, events, partnerships and community initiatives from IELSco, an English learning community and opportunity platform for young people across Indonesia and Southeast Asia.",
    all: "All", featured: "Featured", read: "Read the story", empty: "No stories in this category yet.", none: "The first IELSco Stories are on their way. In the meantime, read stories from our members.",
    members: "Read Member Stories", other: "Baca dalam Bahasa Indonesia" },
  id: { eyebrow: "IELSco Stories", h1: "Kabar dan cerita dari IELSco",
    lead: "Pencapaian, acara, kemitraan, dan inisiatif komunitas dari IELSco, komunitas belajar bahasa Inggris dan platform peluang bagi anak muda di Indonesia dan Asia Tenggara.",
    all: "Semua", featured: "Pilihan", read: "Baca ceritanya", empty: "Belum ada cerita di kategori ini.", none: "IELSco Stories pertama segera hadir. Sementara itu, baca cerita dari anggota kami.",
    members: "Baca Cerita Anggota", other: "Read in English" },
} as const;

const pill = (on: boolean) =>
  `rounded-full px-5 py-2 text-[15px] font-semibold transition ${on ? "bg-[#2F4157] text-white" : "border border-[#E6E9EE] bg-white text-[#2F4157] hover:bg-[#F7F8FA]"}`;

export default function IelscoStoriesIndex({ stories, lang }: { stories: IelscoStory[]; lang: StoryLang }) {
  const u = UI[lang];
  const params = useSearchParams();
  const initial = params?.get("category") as IelscoCategory | null;
  const [filter, setFilter] = useState<IelscoCategory | "all">(initial && IELSCO_CATEGORIES.includes(initial) ? initial : "all");
  const used = useMemo(() => IELSCO_CATEGORIES.filter((c) => stories.some((s) => s.category === c)), [stories]);
  const featured = filter === "all" ? stories[0] : undefined;
  const list = stories.filter((s) => filter === "all" || s.category === filter).filter((s) => s !== featured);
  const other = lang === "en" ? "id" : "en";

  return (
    <div className="bg-white text-[#2F4157]" lang={lang} data-testid="ielsco-stories-index">
      <section className="mx-auto max-w-[1180px] px-4 pb-8 pt-8 sm:px-6 md:pt-12">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#577E90]">{u.eyebrow}</p>
        <h1 className="mt-3 max-w-[820px] text-[36px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#1A2534] sm:text-[52px]">{u.h1}</h1>
        <p className="mt-4 max-w-[760px] text-[17px] leading-relaxed text-[#2F4157]/80 sm:text-[19px]">{u.lead}</p>
        <Link href={IELSCO_STORIES_PATH[other]} hrefLang={other} className="mt-4 inline-block text-[15px] font-semibold text-[#2F4157] underline underline-offset-4">{u.other}</Link>
      </section>

      {stories.length === 0 ? (
        <section className="mx-auto max-w-[1180px] px-4 pb-20 sm:px-6">
          <div className="rounded-[24px] border border-[#E6E9EE] p-8 text-center">
            <p className="text-[17px]">{u.none}</p>
            <a href="https://circle.ielsco.com/stories" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2F4157] px-6 py-3 font-semibold text-white">{u.members} <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </section>
      ) : (
        <>
          {featured && (
            <section className="mx-auto max-w-[1180px] px-4 pb-10 sm:px-6" aria-label={u.featured}>
              <Link href={ielscoStoryPath(featured.lang, featured.slug)} data-testid="ielsco-featured-story"
                className="group grid overflow-hidden rounded-[24px] border border-[#E6E9EE] bg-white transition hover:border-[#E56668]/40 hover:shadow-xl lg:grid-cols-[1.25fr_1fr]">
                <div className="relative aspect-[16/9] bg-[#F1F4F8] lg:aspect-auto lg:min-h-[380px]">
                  {featured.bannerImage && <Image src={featured.bannerImage} alt={featured.bannerAlt ?? ""} fill priority sizes="(min-width: 1024px) 660px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <span className="self-start rounded-full bg-[#E56668]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#C04C4E]">{u.featured} · {IELSCO_CATEGORY_LABELS[featured.category][lang]}</span>
                  <h2 className="mt-4 text-[26px] font-extrabold leading-tight text-[#1A2534] sm:text-[32px]">{featured.title}</h2>
                  <p className="mt-3 line-clamp-4 text-[16px] leading-relaxed text-[#2F4157]/75">{featured.summary}</p>
                  <p className="mt-5 flex items-center justify-between gap-4 text-[14px]">
                    <time dateTime={featured.publishedAt} className="text-[#2F4157]/55">{formatStoryDate(featured.publishedAt, lang)}</time>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#E56668]">{u.read} <ArrowRight size={16} aria-hidden="true" /></span>
                  </p>
                </div>
              </Link>
            </section>
          )}

          {used.length > 1 && (
            <div className="mx-auto mb-8 flex max-w-[1180px] flex-wrap gap-3 px-4 sm:px-6" role="group" aria-label="Categories">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={pill(filter === "all")}>{u.all}</button>
              {used.map((c) => <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)} className={pill(filter === c)}>{IELSCO_CATEGORY_LABELS[c][lang]}</button>)}
            </div>
          )}

          <section className="mx-auto max-w-[1180px] px-4 pb-20 sm:px-6">
            {list.length === 0 && !featured ? <p className="text-[16px] text-[#2F4157]/70">{u.empty}</p>
              : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((s) => <IelscoStoryCard key={s.id} story={s} />)}</div>}
          </section>
        </>
      )}
    </div>
  );
}

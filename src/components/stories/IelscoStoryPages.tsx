import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Footer from "@/components/footer";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import {
  IELSCO_CATEGORY_LABELS, IELSCO_STORIES_PATH, getIelscoStories, getIelscoStoryBySlug, ielscoStoryDescription, ielscoStoryPath,
  relatedIelscoStories, type StoryLang,
} from "@/lib/stories/ielsco";
import IelscoStoryArticle from "./IelscoStoryArticle";
import IelscoStoriesIndex from "./IelscoStoriesIndex";
import StoriesSectionTabs from "./StoriesSectionTabs";

// Route bodies for /stories, /id/stories, /stories/[slug] and /id/stories/[slug] (IELSco Stories on www.ielsco.com).

const INDEX_META = {
  en: { title: "IELSco Stories: news, milestones and events | IELSco",
    description: "Official news and stories from IELSco: achievements, events and programs, partnerships and community initiatives for young people across Indonesia and Southeast Asia." },
  id: { title: "IELSco Stories: kabar, pencapaian, dan acara | IELSco",
    description: "Kabar dan cerita resmi dari IELSco: pencapaian, acara dan program, kemitraan, serta inisiatif komunitas bagi anak muda di Indonesia dan Asia Tenggara." },
};

export function ielscoIndexMetadata(lang: StoryLang): Metadata {
  return pageMetadata({ ...INDEX_META[lang], path: IELSCO_STORIES_PATH[lang],
    languages: { en: IELSCO_STORIES_PATH.en, id: IELSCO_STORIES_PATH.id, "x-default": IELSCO_STORIES_PATH.en } });
}

export async function IelscoStoriesIndexPage({ lang }: { lang: StoryLang }) {
  const stories = await getIelscoStories(lang);
  return (
    <div className="bg-white">
      <StoriesSectionTabs active="ielsco" lang={lang} />
      <Suspense fallback={null}><IelscoStoriesIndex stories={stories} lang={lang} /></Suspense>
      <Footer />
    </div>
  );
}

export async function ielscoStoryMetadata(lang: StoryLang, slug: string): Promise<Metadata> {
  const found = await getIelscoStoryBySlug(lang, slug);
  if (found.kind !== "found") return { title: "Story not found | IELSco", robots: { index: false } };
  const s = found.story;
  const title = s.seo.meta_title || `${s.title} | IELSco`;
  const description = ielscoStoryDescription(s);
  const path = ielscoStoryPath(lang, s.slug);
  const other = lang === "en" ? "id" : "en";
  const languages = s.translationSlug
    ? { [lang]: path, [other]: ielscoStoryPath(other, s.translationSlug), "x-default": lang === "en" ? path : ielscoStoryPath("en", s.translationSlug) }
    : undefined;
  const m = pageMetadata({ title, description, path, languages });
  return {
    ...m,
    keywords: s.seo.meta_keywords || (s.tags.length ? s.tags.join(", ") : undefined),
    openGraph: { ...m.openGraph, type: "article", publishedTime: s.publishedAt, modifiedTime: s.updatedAt, locale: lang === "en" ? "en_US" : "id_ID",
      ...(s.bannerImage ? { images: [{ url: s.bannerImage, alt: s.bannerAlt ?? s.title }] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(s.bannerImage ? { images: [s.bannerImage] } : {}) },
  };
}

const NEWS: string[] = ["achievements", "events", "partnerships", "press"];

export async function IelscoStoryPage({ lang, slug }: { lang: StoryLang; slug: string }) {
  const found = await getIelscoStoryBySlug(lang, slug);
  if (found.kind === "redirect") permanentRedirect(ielscoStoryPath(found.lang, found.slug));
  if (found.kind !== "found") notFound();
  const { story, all } = found;
  const url = `${SITE_URL}${ielscoStoryPath(lang, story.slug)}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": NEWS.includes(story.category) ? "NewsArticle" : "Article",
        headline: story.title, description: ielscoStoryDescription(story), inLanguage: lang, url, mainEntityOfPage: url,
        datePublished: story.publishedAt, dateModified: story.updatedAt,
        ...(story.bannerImage ? { image: [story.bannerImage] } : {}),
        articleSection: IELSCO_CATEGORY_LABELS[story.category][lang],
        ...(story.tags.length ? { keywords: story.tags.join(", ") } : {}),
        author: { "@type": "Organization", name: story.author.name || "IELSco", url: `${SITE_URL}/` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "IELSco", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "IELSco Stories", item: `${SITE_URL}${IELSCO_STORIES_PATH[lang]}` },
          { "@type": "ListItem", position: 3, name: story.title, item: url },
        ],
      },
    ],
  };
  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <IelscoStoryArticle story={story} related={relatedIelscoStories(story, all)} />
      <Footer />
    </div>
  );
}

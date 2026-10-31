import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/footer";
import { body, cardLink, container, eyebrow, h1, h3, lead, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import { ARTICLES, articlePath, findArticle } from "@/content/articles";
import { ARTICLES_PATH, PILLARS, type Lang } from "@/content/articles/types";
import { ArticleBody } from "./ArticleBody";

// Article index and article pages, shared by /articles (English) and /id/artikel (Bahasa Indonesia). Each page has its own
// canonical URL and hreflang links to the other language. The root <html lang> is "en", so Indonesian content is
// wrapped in lang="id".
const UI = {
  en: { indexTitle: "Articles: English, community and global opportunities", indexH1: "Articles", indexEyebrow: "IELSco articles",
    indexLead: "Practical guides on English, scholarships and programs abroad, and stories from IELSco's community. Written and checked by the IELSco team.",
    indexDesc: "Practical guides from IELSco on learning English, finding an English-speaking community, scholarship applications and international programs, plus community stories.",
    read: "Read", other: "Baca dalam Bahasa Indonesia", otherIndex: "Artikel dalam Bahasa Indonesia", by: "By the IELSco team", published: "Published", updated: "Updated",
    sources: "Sources", accessed: "accessed", all: "All articles", dateLocale: "en-GB" },
  id: { indexTitle: "Artikel: bahasa Inggris, komunitas, dan peluang global", indexH1: "Artikel", indexEyebrow: "Artikel IELSco",
    indexLead: "Panduan praktis tentang bahasa Inggris, beasiswa, dan program luar negeri, serta cerita dari komunitas IELSco. Ditulis dan diperiksa oleh tim IELSco.",
    indexDesc: "Panduan praktis dari IELSco tentang belajar bahasa Inggris, mencari komunitas berbahasa Inggris, pendaftaran beasiswa, dan program internasional, serta cerita komunitas.",
    read: "Baca", other: "Read in English", otherIndex: "Articles in English", by: "Oleh tim IELSco", published: "Terbit", updated: "Diperbarui",
    sources: "Sumber", accessed: "diakses", all: "Semua artikel", dateLocale: "id-ID" },
} as const;

const other = (lang: Lang): Lang => (lang === "en" ? "id" : "en");
const date = (d: string, lang: Lang) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString(UI[lang].dateLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

export function indexMetadata(lang: Lang): Metadata {
  return pageMetadata({ title: `${UI[lang].indexTitle} | IELSco`, description: UI[lang].indexDesc, path: ARTICLES_PATH[lang],
    languages: { en: ARTICLES_PATH.en, id: ARTICLES_PATH.id, "x-default": ARTICLES_PATH.en } });
}

export function ArticlesIndex({ lang }: { lang: Lang }) {
  const u = UI[lang];
  return (
    <div className={cn(siteRoot, "bg-white")} lang={lang} data-testid="articles-index">
      <section className="pb-[40px] pt-[40px] md:pt-[64px]">
        <div className={container}>
          <p className={eyebrow}>{u.indexEyebrow}</p>
          <h1 className={cn(h1, "mt-3")}>{u.indexH1}</h1>
          <p className={cn(lead, "mt-4 max-w-[720px]")}>{u.indexLead}</p>
          <Link href={ARTICLES_PATH[other(lang)]} hrefLang={other(lang)} className={cn(textLink, "mt-4")}>{u.otherIndex}</Link>
        </div>
      </section>
      <section className="pb-[80px]">
        <ul className={cn(container, "grid gap-5 md:grid-cols-2")}>
          {ARTICLES.map((a) => (
            <li key={a.key}>
              <Link href={articlePath(a, lang)} className={cn(cardLink, "h-full p-6")} data-testid={`article-card-${a.key}`}>
                <span className={eyebrow}>{PILLARS[a.pillar][lang]}</span>
                <span className={cn(h3, "mt-2 block")}>{a[lang].title}</span>
                <span className={cn(body, "mt-2 block")}>{a[lang].excerpt}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157]">{u.read} <ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Footer />
    </div>
  );
}

export function articleMetadata(lang: Lang, slug: string): Metadata {
  const a = findArticle(lang, slug);
  if (!a) return { title: "Not found | IELSco", robots: { index: false } };
  const m = pageMetadata({ title: `${a[lang].title} | IELSco`, description: a[lang].description, path: articlePath(a, lang),
    languages: { en: articlePath(a, "en"), id: articlePath(a, "id"), "x-default": articlePath(a, "en") } });
  return { ...m, openGraph: { ...m.openGraph, type: "article", publishedTime: a.published, modifiedTime: a.updated, locale: lang === "en" ? "en_US" : "id_ID" } };
}

export function ArticlePage({ lang, slug }: { lang: Lang; slug: string }) {
  const a = findArticle(lang, slug);
  if (!a) notFound();
  const u = UI[lang], v = a[lang], url = `${SITE_URL}${articlePath(a, lang)}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Article", headline: v.title, description: v.description, inLanguage: lang,
    datePublished: a.published, dateModified: a.updated, mainEntityOfPage: url, url,
    author: { "@type": "Organization", name: "IELSco", url: `${SITE_URL}/` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(a.sources.length ? { citation: a.sources.map((s) => s.url) } : {}),
  };
  return (
    <div className={cn(siteRoot, "bg-white")} lang={lang} data-testid="article-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <article className={cn(container, "max-w-[780px] pb-[80px] pt-[40px] md:pt-[64px]")}>
        <Link href={ARTICLES_PATH[lang]} className={textLink}>{u.all}</Link>
        <p className={cn(eyebrow, "mt-6")}>{PILLARS[a.pillar][lang]}</p>
        <h1 className="mt-3 text-[34px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#1A2534] sm:text-[44px]">{v.title}</h1>
        <p className={cn(lead, "mt-4")}>{v.excerpt}</p>
        <p className="mt-4 text-[14px] text-[#2F4157]/65">
          {u.by} · {u.published} <time dateTime={a.published}>{date(a.published, lang)}</time>
          {a.updated !== a.published && <> · {u.updated} <time dateTime={a.updated}>{date(a.updated, lang)}</time></>}
          {" · "}<Link href={articlePath(a, other(lang))} hrefLang={other(lang)} className="underline underline-offset-4">{u.other}</Link>
        </p>
        <div className="mt-10"><ArticleBody blocks={v.body} /></div>
        {a.sources.length > 0 && (
          <section className="mt-12 border-t border-[#E6E9EE] pt-6" aria-labelledby="sources">
            <h2 id="sources" className="text-[18px] font-bold text-[#1A2534]">{u.sources}</h2>
            <ul className="mt-3 space-y-2 text-[15px] text-[#2F4157]/80">
              {a.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{s.label}</a> ({u.accessed} {date(s.accessed, lang)})</li>)}
            </ul>
          </section>
        )}
      </article>
      <Footer />
    </div>
  );
}

export const articleParams = (lang: Lang) => ARTICLES.map((a) => ({ slug: a[lang].slug }));

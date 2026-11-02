import type { MetadataRoute } from "next";
import { eventsData } from "@/data/events";
import { divisions } from "@/data/careers/divisions";
import { getPublishedStories } from "@/lib/stories/public";
import { listPublishedOpportunities } from "@/lib/opportunities";
import { listPublishedProfessional } from "@/lib/professional/queries";
import { generateSlug } from "@/utils/slug";
import { CIRCLE_URL, SCHOOL_URL, SITE_URL } from "@/lib/seo";
import { ARTICLES, articlePath } from "@/content/articles";
import { IELSCO_STORIES_PATH, getIelscoStories, ielscoStoryPath } from "@/lib/stories/ielsco";
import { ARTICLES_PATH } from "@/content/articles/types";

// Public pages meant for search results, at their canonical URLs. Sign-in pages, the dashboard, tests behind access
// codes and internal demos are left out (they are noindex). Rebuilt hourly so newly published member stories and
// opportunities appear. Circle and Schools are listed on their own subdomains, which are their canonical hosts.
export const revalidate = 3600;

const PAGES = ["/", "/opportunities", "/opportunities/professional", "/membership", "/about", "/products", "/products/courses", "/products/resources", "/events",
  "/events/gif", "/events/launchpad", "/partners", "/careers", "/privacy-policy", "/terms-of-service"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ stories }, opportunities, jobs, ielscoStories] = await Promise.all([getPublishedStories(), listPublishedOpportunities(), listPublishedProfessional(), getIelscoStories()]);
  return [
    ...PAGES.map((p) => ({ url: `${SITE_URL}${p === "/" ? "/" : p}` })),
    ...opportunities.map((o) => ({ url: `${SITE_URL}/opportunities/${o.slug}`, lastModified: new Date(o.updated_at) })),
    ...jobs.map((o) => ({ url: `${SITE_URL}/opportunities/professional/${o.slug}`, lastModified: new Date(o.updated_at) })),
    ...eventsData.map((e) => ({ url: `${SITE_URL}/events/${generateSlug(e.title)}` })),
    ...divisions.map((d) => ({ url: `${SITE_URL}/careers/${d.slug}` })),
    { url: `${SITE_URL}${IELSCO_STORIES_PATH.en}` },
    { url: `${SITE_URL}${IELSCO_STORIES_PATH.id}` },
    ...ielscoStories.map((s) => {
      const other = s.lang === "en" ? "id" : "en";
      return { url: `${SITE_URL}${ielscoStoryPath(s.lang, s.slug)}`, lastModified: new Date(s.updatedAt),
        ...(s.translationSlug ? { alternates: { languages: { [s.lang]: `${SITE_URL}${ielscoStoryPath(s.lang, s.slug)}`, [other]: `${SITE_URL}${ielscoStoryPath(other, s.translationSlug)}` } } } : {}) };
    }),
    { url: `${SITE_URL}${ARTICLES_PATH.en}` },
    { url: `${SITE_URL}${ARTICLES_PATH.id}` },
    ...ARTICLES.flatMap((a) => (["en", "id"] as const).map((lang) => ({ url: `${SITE_URL}${articlePath(a, lang)}`, lastModified: new Date(a.updated),
      alternates: { languages: { en: `${SITE_URL}${articlePath(a, "en")}`, id: `${SITE_URL}${articlePath(a, "id")}` } } }))),
    { url: `${CIRCLE_URL}/` },
    { url: `${CIRCLE_URL}/agenda` },
    { url: `${CIRCLE_URL}/stories` },
    ...stories.map((s) => ({ url: `${CIRCLE_URL}/stories/${s.slug}` })),
    { url: `${SCHOOL_URL}/` },
  ];
}

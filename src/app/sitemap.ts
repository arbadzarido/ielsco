import type { MetadataRoute } from "next";
import { eventsData } from "@/data/events";
import { divisions } from "@/data/careers/divisions";
import { getPublishedStories } from "@/lib/stories/public";
import { listPublishedOpportunities } from "@/lib/opportunities";
import { generateSlug } from "@/utils/slug";
import { CIRCLE_URL, SCHOOL_URL, SITE_URL } from "@/lib/seo";
import { ARTICLES, articlePath } from "@/content/articles";
import { ARTICLES_PATH } from "@/content/articles/types";

// Public pages meant for search results, at their canonical URLs. Sign-in pages, the dashboard, tests behind access
// codes and internal demos are left out (they are noindex). Rebuilt hourly so newly published member stories and
// opportunities appear. Circle and Schools are listed on their own subdomains, which are their canonical hosts.
export const revalidate = 3600;

const PAGES = ["/", "/opportunities", "/membership", "/about", "/products", "/products/courses", "/products/resources", "/events",
  "/events/gif", "/events/launchpad", "/partners", "/careers", "/privacy-policy", "/terms-of-service"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ stories }, opportunities] = await Promise.all([getPublishedStories(), listPublishedOpportunities()]);
  return [
    ...PAGES.map((p) => ({ url: `${SITE_URL}${p === "/" ? "/" : p}` })),
    ...opportunities.map((o) => ({ url: `${SITE_URL}/opportunities/${o.slug}`, lastModified: new Date(o.updated_at) })),
    ...eventsData.map((e) => ({ url: `${SITE_URL}/events/${generateSlug(e.title)}` })),
    ...divisions.map((d) => ({ url: `${SITE_URL}/careers/${d.slug}` })),
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

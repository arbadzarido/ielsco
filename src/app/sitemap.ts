import type { MetadataRoute } from "next";
import { eventsData } from "@/data/events";
import { divisions } from "@/data/careers/divisions";
import { getPublishedStories } from "@/lib/stories/public";
import { generateSlug } from "@/utils/slug";
import { CIRCLE_URL, SCHOOL_URL, SITE_URL } from "@/lib/seo";

// Public pages meant for search results, at their canonical URLs. Sign-in pages, the dashboard, tests behind access
// codes and internal demos are left out (they are noindex). Rebuilt hourly so newly published member stories appear.
export const revalidate = 3600;

const PAGES = ["/", "/about", "/products", "/products/courses", "/products/resources", "/events", "/events/gif", "/events/launchpad",
  "/partners", "/careers", "/privacy-policy", "/terms-of-service"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { stories } = await getPublishedStories();
  return [
    ...PAGES.map((p) => ({ url: `${SITE_URL}${p === "/" ? "/" : p}` })),
    ...eventsData.map((e) => ({ url: `${SITE_URL}/events/${generateSlug(e.title)}` })),
    ...divisions.map((d) => ({ url: `${SITE_URL}/careers/${d.slug}` })),
    { url: `${CIRCLE_URL}/` },
    { url: `${CIRCLE_URL}/agenda` },
    { url: `${CIRCLE_URL}/stories` },
    ...stories.map((s) => ({ url: `${CIRCLE_URL}/stories/${s.slug}` })),
    { url: `${SCHOOL_URL}/` },
  ];
}

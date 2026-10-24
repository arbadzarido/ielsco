import type { MetadataRoute } from "next";
import { divisions } from "@/data/careers/divisions";
import { eventsData } from "@/data/events";
import { generateSlug } from "@/utils/slug";
import { listPublishedOpportunities } from "@/lib/opportunities";

const BASE = "https://ielsco.com";
export const revalidate = 3600;

// Public pages only. Opportunities come from the database (published rows), events and careers from repo data.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, priority = 0.7, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly") =>
    ({ url: `${BASE}${path}`, lastModified: now, changeFrequency, priority });
  const opportunities = await listPublishedOpportunities();
  return [
    page("/", 1, "weekly"),
    page("/opportunities", 0.9, "weekly"),
    page("/membership", 0.9),
    page("/products", 0.7),
    page("/products/courses", 0.8),
    page("/products/resources", 0.8),
    page("/school", 0.7),
    page("/partners", 0.6),
    page("/careers", 0.5),
    page("/about", 0.5),
    page("/events", 0.7, "weekly"),
    page("/events/gif", 0.6),
    page("/circle", 0.7, "weekly"),
    page("/circle/stories", 0.6, "weekly"),
    page("/circle/agenda", 0.5),
    page("/privacy-policy", 0.2, "yearly"),
    page("/terms-of-service", 0.2, "yearly"),
    ...divisions.map((d) => page(`/careers/${d.slug}`, 0.4)),
    ...eventsData.map((e) => page(`/events/${generateSlug(e.title)}`, 0.4)),
    ...opportunities.map((o) => ({ url: `${BASE}/opportunities/${o.slug}`, lastModified: new Date(o.updated_at), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}

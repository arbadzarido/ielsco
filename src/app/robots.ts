import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Served on every host of this deployment (www, circle., school.: see the matcher in src/proxy.ts), so the Circle and
// Schools URLs in the www sitemap are covered too. Robots rules are not access control: /dashboard and /api protect
// themselves. AI crawlers fall under "*"; to opt out of model training only, add a group for GPTBot or Google-Extended.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/school/dashboard", "/monitoring"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

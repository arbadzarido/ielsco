import type { MetadataRoute } from "next";

// Member areas, admin and APIs are never indexed (they are also behind sign-in / RLS).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/school/dashboard", "/admin", "/api/", "/sign-in", "/sign-up", "/welcome", "/auth/", "/sentry-example-page"] }],
    sitemap: "https://ielsco.com/sitemap.xml",
    host: "https://ielsco.com",
  };
}

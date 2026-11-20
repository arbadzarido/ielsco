import type { MetadataRoute } from "next";

const SITE = (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  if (process.env.GIF_NOINDEX === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/portal", "/admin", "/api", "/login"] }], sitemap: `${SITE}/sitemap.xml` };
}

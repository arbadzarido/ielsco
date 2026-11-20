import type { MetadataRoute } from "next";
import { LEGAL_DOCS } from "@/lib/legal-docs";

const SITE = (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");
const PAGES = ["", "/about", "/program", "/opportunities", "/fully-funded", "/mentoring", "/self-funded", "/selection-process", "/sponsorship", "/previous-gif", "/faq", "/apply", "/application-status"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...PAGES, ...Object.keys(LEGAL_DOCS).map((d) => `/${d}`)].map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
}

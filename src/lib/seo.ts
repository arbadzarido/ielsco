import type { Metadata } from "next";

// One place for the site's public URLs and per-page metadata. www.ielsco.com is the primary host (ielsco.com redirects
// to it); IELS Circle and IELS for Schools are served on their own subdomains, which are their canonical URLs.
export const SITE_URL = "https://www.ielsco.com";
export const CIRCLE_URL = "https://circle.ielsco.com";
export const SCHOOL_URL = "https://school.ielsco.com";
export const SITE_NAME = "IELS";
export const DEFAULT_OG_IMAGE = "/images/contents/general/iels_gathering.png";

// Title, description, canonical URL and Open Graph for a public page. `path` is relative to SITE_URL or absolute.
// Only use it on a leaf route: Next.js passes a layout's canonical down to child pages that don't set their own.
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website", images: [DEFAULT_OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Sign-in pages, internal tools and demos: reachable, but not for search results.
export const NOINDEX: Metadata = { robots: { index: false, follow: true } };

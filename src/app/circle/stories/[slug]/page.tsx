import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import Footer from "@/components/footer";
import StoryArticle from "@/components/stories/StoryArticle";
import { getPublishedStories, getStoryBySlug } from "@/lib/stories/public";
import { relatedStories, storyDescription } from "@/lib/stories/types";

// Published stories come from Supabase (public.published_member_stories). Pages are cached and refreshed every
// 5 minutes, and immediately when an admin saves (tag revalidation). Unknown or unpublished slugs return a 404;
// old slugs of a published story redirect permanently to the current one.
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { stories } = await getPublishedStories();
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getStoryBySlug(slug);
  if (found.kind !== "found") return { title: "Story not found | IELS Circle", robots: { index: false } };
  const { story } = found;
  const title = story.seo.meta_title || `${story.title} | IELS Circle`;
  const description = storyDescription(story);
  return {
    // Absolute URLs for og:image etc. The internal /circle/... path is served on www.ielsco.com too.
    metadataBase: new URL("https://www.ielsco.com"),
    title,
    description,
    keywords: story.seo.meta_keywords || undefined,
    alternates: { canonical: `https://circle.ielsco.com/stories/${story.slug}` },
    // og:image / twitter:image come from ./opengraph-image.tsx (generated from this record).
    openGraph: { title, description, type: "article", url: `https://circle.ielsco.com/stories/${story.slug}`, siteName: "IELS Circle" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const found = await getStoryBySlug(slug);

  if (found.kind === "redirect") {
    const host = (await headers()).get("host") ?? "";
    const base = host.startsWith("circle.") ? "/stories" : "/circle/stories";
    permanentRedirect(`${base}/${found.slug}`);
  }
  if (found.kind !== "found") notFound();

  const { story, all } = found;
  return (
    <div className="bg-white">
      <StoryArticle story={story} related={relatedStories(story, all)} />
      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import Footer from "@/components/footer";
import StoriesBrowser from "@/components/stories/StoriesBrowser";
import { getPublishedStories } from "@/lib/stories/public";

// Listing of published member stories (Supabase, cached; refreshed every 5 minutes and on admin saves).
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Member Stories | IELS Circle",
  description: "Real people, real journeys across Southeast Asia: internships, exchanges and the everyday wins of using English with confidence.",
  alternates: { canonical: "https://circle.ielsco.com/stories" },
  openGraph: {
    title: "Member Stories | IELS Circle",
    description: "Real people, real journeys across Southeast Asia.",
    url: "https://circle.ielsco.com/stories",
    images: ["/images/contents/general/iels_gathering.png"],
  },
};

export default async function StoriesPage() {
  const { stories } = await getPublishedStories();
  return (
    <div className="bg-white [&_:is(h1,h2,h3,h4,h5,h6)]:font-sans">
      <StoriesBrowser stories={stories} />
      <Footer />
    </div>
  );
}

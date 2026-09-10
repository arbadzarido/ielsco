import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import { programUpdatesData } from "@/data/program-updates";
import { partnerUpdatesData } from "@/data/partner-updates";
import { memberStoriesData } from "@/data/member-stories";
import { generateSlug } from "@/utils/slug";
import { Metadata } from "next";
import Link from "next/link";

interface DetailStoriesPageProps {
  params: Promise<{ slug: string }>;
}

type SidebarItem = {
  type: "story" | "program" | "partner";
  title: string;
  image: string;
  category: string;
  description?: string;
  link: string;
};

export async function generateMetadata({
  params,
}: DetailStoriesPageProps): Promise<Metadata> {
  const { slug } = await params;

  const memberStory = memberStoriesData.find(
    (story) => generateSlug(story.title) === slug
  );

  if (!memberStory) {
    return {
      title: "Story Not Found - IELS",
      description: "The requested story could not be found.",
    };
  }

  return {
    title: memberStory.seo.meta_title,
    description: memberStory.seo.meta_description,
    keywords: memberStory.seo.meta_keywords,
    openGraph: {
      title: memberStory.seo.meta_title,
      description: memberStory.seo.meta_description,
      images: [memberStory.bannerImage],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: memberStory.seo.meta_title,
      description: memberStory.seo.meta_description,
      images: [memberStory.author.avatar],
    },
  };
}

export default async function DetailStoriesPage({
  params,
}: DetailStoriesPageProps) {
  const { slug } = await params;

  const memberStory = memberStoriesData.find(
    (story) => generateSlug(story.title) === slug
  );

  if (!memberStory) {
    return (
      <div>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
          <h1 className="text-2xl font-bold text-[#2F4157] mb-4">
            Story Not Found
          </h1>
          <p className="text-gray-600">
            The story you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  /* ================================
     BUILD SIDEBAR CONTENT (UNIFIED)
  ================================= */

  const sidebarItems: SidebarItem[] = [
    ...memberStoriesData
      .filter((s) => generateSlug(s.title) !== slug)
      .map((s) => ({
        type: "story" as const,
        title: s.title,
        image: s.author.avatar,
        category: "Member Story",
        description: s.content.replace(/<[^>]+>/g, "").slice(0, 140),
        link: `/stories/${generateSlug(s.title)}`,
      })),

    ...programUpdatesData.map((p) => ({
      type: "program" as const,
      title: p.title,
      image: p.image,
      category: p.category,
      description: p.description,
      link: p.link,
    })),

    ...partnerUpdatesData.map((p) => ({
      type: "partner" as const,
      title: p.title,
      image: p.image,
      category: p.category,
      description: p.description,
      link: p.link,
    })),
  ];

  const sidebarContent = sidebarItems
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  return (
    <div>
      <Header />

      <div className="flex flex-col bg-white md:gap-[65px] pb-12">
        {/* ===== BANNER ===== */}
        <div className="relative">
          <Image
            src={memberStory.bannerImage}
            alt={memberStory.title}
            width={1300}
            height={500}
            className="w-screen md:h-[335px] h-[180px] object-cover"
          />

          {/* === MOBILE OVERLAP AVATAR === */}
          <div className="absolute left-6 -bottom-[80px] md:hidden">
            <div className="w-[160px] h-[160px] rounded-full overflow-hidden bg-white border-4 border-white">
              <Image
                src={memberStory.author.avatar}
                alt={memberStory.author.name}
                width={160}
                height={160}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row w-full px-4 sm:px-8 lg:px-[100px] gap-6 lg:gap-[100px] mt-20 md:mt-0">
          {/* ===== MAIN CONTENT ===== */}
          <div className="flex flex-col md:gap-6 w-full lg:w-3/4">
            {/* === DESKTOP HEADER === */}
            <div className="hidden md:flex justify-between gap-8">
              <div className="flex gap-3">
                <div className="w-[147px] h-[147px] rounded-full overflow-hidden bg-gray-200">
                  <Image
                    src={memberStory.author.avatar}
                    alt={memberStory.author.name}
                    width={147}
                    height={147}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[24px] font-bold text-[#2F4157] max-w-[520px] mb-3">
                    {memberStory.title}
                  </p>
                  <p className="text-sm text-[#2F4157]">
                    {memberStory.author.name}
                  </p>
                </div>
              </div>

              <div className="text-sm font-bold">
                {memberStory.location}, {memberStory.date}
              </div>
            </div>

            {/* === MOBILE TITLE === */}
            <div className="md:hidden flex flex-col gap-4 mt-3 mb-6">
              <p className="text-xl font-bold text-[#2F4157]">
                {memberStory.title}
              </p>
              <p className="text-sm text-[#2F4157]">
                {memberStory.author.name}
              </p>
            </div>

            <div
              className="text-justify text-sm sm:text-base leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
              dangerouslySetInnerHTML={{ __html: memberStory.content }}
            />
          </div>

          {/* ===== SIDEBAR ===== */}
          <div className="flex flex-col gap-6 w-full lg:w-1/4">
            <Image
              src="/images/contents/general/iels_insight.png"
              alt="IELS Insight"
              width={300}
              height={50}
              className="w-full max-w-[300px]"
            />

            <div className="flex flex-col gap-6">
              {sidebarContent.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="relative w-[120px] h-[120px] rounded-[12px] overflow-hidden bg-gray-200 flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <p className="text-[11px] font-bold uppercase text-red-500">
                      {item.category}
                    </p>
                    <p className="font-bold text-[#2F4157] leading-snug">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-[#2F4157]/80 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <Link
                      href={item.link}
                      className="text-sm font-semibold text-[#2F4157] hover:underline w-fit"
                    >
                      Read More →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
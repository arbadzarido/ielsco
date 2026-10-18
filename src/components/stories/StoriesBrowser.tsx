"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import ReactCountryFlag from "react-country-flag";
import Pagination from "@/components/Pagination";
import { CATEGORIES, CATEGORY_LABELS, type PublicStory, type StoryCategory } from "@/lib/stories/types";

type Filter = "all" | StoryCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All Stories" },
  ...CATEGORIES.map((c) => ({ key: c as Filter, label: CATEGORY_LABELS[c] })),
];

const BTN_NAVY =
  "inline-flex items-center justify-center rounded-full bg-[#2F4157] text-white font-semibold px-6 py-3 hover:bg-[#1A2534] transition active:scale-[0.97]";
const BTN_GHOST =
  "inline-flex items-center justify-center rounded-full border border-gray-200 text-[#294154] font-medium px-5 py-2 hover:bg-gray-50 transition";

const PER_PAGE = 4;

export default function StoriesBrowser({ stories }: { stories: PublicStory[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  // Links are built from this page's path, so they work locally (/circle/stories/[slug]) and on
  // circle.ielsco.com/stories/[slug].
  const pathname = usePathname() ?? "/stories";
  const base = pathname.replace(/\/$/, "");

  const filtered = stories.filter((s) => filter === "all" || s.category === filter);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const current = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="px-4 sm:px-6 lg:px-[100px] pt-1 pb-8 sm:pb-12 lg:pb-16 bg-white text-[#2F4157]">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="p-4 sm:p-6 lg:p-8 xl:p-12 mb-2">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
            <div className="w-full lg:w-2/6 text-[#2F4157]">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 lg:mb-8">
                <Image src="/images/contents/general/iels_insight.png" alt="IELS Insight Logo" width={300} height={50} className="h-auto w-full max-w-[250px] sm:max-w-[300px]" />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-[24px] font-bold mb-3 sm:mb-4">Meet the Circle</h1>
              <p className="text-sm sm:text-[15px] leading-relaxed max-w-lg">
                Real people, real journeys across Southeast Asia — from internships and exchanges to the everyday wins of
                using English with confidence.
              </p>
              <Link href={`${base}/submit`} className={`${BTN_NAVY} mt-6 text-sm`} data-testid="stories-submit-cta">
                Share your story
              </Link>
            </div>
            <div className="w-full lg:w-4/6">
              <Image src="/images/contents/general/iels_gathering.png" alt="IELS Community" width={600} height={400} priority className="w-full h-auto rounded-[15px] sm:rounded-[20px]" />
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="mb-8 sm:mb-10 lg:mb-12 px-4">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4" role="group" aria-label="Filter stories">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
                className={filter === f.key ? BTN_NAVY : BTN_GHOST}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stories grid */}
        {current.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-2xl font-bold text-[#2F4157] mb-4 text-center">No Stories Yet in This Category</h3>
            <p className="text-gray-600 text-center max-w-md leading-relaxed">
              We&apos;re gathering more journeys from across Southeast Asia. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10 lg:mb-12 px-4 sm:px-0">
            {current.map((story) => (
              <Link
                key={story.id}
                href={`${base}/${story.slug}`}
                data-testid="story-card"
                className="group flex flex-col rounded-[20px] border border-gray-200 bg-white p-6 sm:p-7 transition-all hover:-translate-y-1 hover:border-[#E56668]/50 hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-4 ring-[#E56668]/10">
                    {story.author.avatar && (
                      <Image src={story.author.avatar} alt={story.author.name} width={96} height={96} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#E56668] bg-[#E56668]/10 rounded-full px-2.5 py-1">
                      {CATEGORY_LABELS[story.category]}
                    </span>
                    <p className="mt-2 flex items-center gap-1.5 text-base sm:text-lg font-extrabold text-[#2F4157]">
                      {story.author.name}
                      {story.author.country && (
                        <ReactCountryFlag countryCode={story.author.country} svg style={{ width: "1em", height: "1em" }} title={story.author.country} />
                      )}
                    </p>
                    {story.author.role && <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{story.author.role}</p>}
                  </div>
                </div>
                <h3 className="mt-5 text-base sm:text-lg font-bold text-[#2F4157] leading-snug">{story.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">{story.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#E56668] group-hover:text-[#C04C4E]">
                  Read the story <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {current.length > 0 && totalPages > 1 && (
          <Pagination pageCount={totalPages} onPageChange={(sel) => setPage(sel.selected + 1)} currentPage={page - 1} />
        )}

        <div className="text-center pt-4 sm:pt-6 px-4">
          <p className="text-gray-600 mb-2 text-sm sm:text-base">Got a story to tell?</p>
          <Link href={`${base}/submit`} className="text-red-500 hover:text-red-600 transition-colors underline text-sm sm:text-base">
            Share it with us here.
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import ReactCountryFlag from "react-country-flag";
import Pagination from "@/components/Pagination";
import LoadingOverlay from "@/components/LoadingOverlay";
import {
  memberStoriesData,
  subcategoryLabels,
  type MemberStory,
} from "@/data/member-stories";
import { generateSlug } from "@/utils/slug";

type SubFilter = "All" | MemberStory["subcategory"];

const FILTERS: { key: SubFilter; label: string }[] = [
  { key: "All", label: "All Stories" },
  { key: "Internals", label: subcategoryLabels.Internals },
  { key: "Lounge", label: subcategoryLabels.Lounge },
  { key: "Speakers", label: subcategoryLabels.Speakers },
  { key: "Inspires", label: subcategoryLabels.Inspires },
];

const BTN_NAVY =
  "inline-flex items-center justify-center rounded-full bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f] transition active:scale-[0.97]";
const BTN_GHOST =
  "inline-flex items-center justify-center rounded-full border border-gray-200 text-[#294154] font-medium px-5 py-2 hover:bg-gray-50 transition";

// Month name to number mapping (English only)
const monthMap: { [key: string]: number } = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function parseDateString(dateStr: string): Date {
  const parts = dateStr.split(" ");
  if (parts.length !== 3) return new Date();
  const monthName = parts[0].toLowerCase();
  const day = parseInt(parts[1].replace(",", ""));
  const year = parseInt(parts[2]);
  const monthNumber = monthMap[monthName] || 1;
  return new Date(year, monthNumber - 1, day);
}

export default function Stories() {
  const [activeSubFilter, setActiveSubFilter] = useState<SubFilter>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Link dibangun dari path halaman ini, jadi otomatis bener di dua kondisi:
  // lokal  -> /circle/stories/[slug]
  // prod   -> circle.ielsco.com/stories/[slug]
  const pathname = usePathname() ?? "/stories";
  const storiesBase = pathname.replace(/\/$/, "");

  const filteredStories = memberStoriesData.filter(
    (s) => activeSubFilter === "All" || s.subcategory === activeSubFilter
  );

  const sortedStories = [...filteredStories].sort(
    (a, b) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime()
  );

  const itemsPerPage = 4;
  const totalPages = Math.ceil(sortedStories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStories = sortedStories.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (key: SubFilter) => {
    setActiveSubFilter(key);
    setCurrentPage(1);
  };

  const handleReadMore = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div>
      <Header />
      <LoadingOverlay isLoading={isLoading} message="Loading story..." />

      <div className="px-4 sm:px-6 lg:px-[100px] pt-1 pb-8 sm:pb-12 lg:pb-16 bg-white text-[#2F4157]">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="p-4 sm:p-6 lg:p-8 xl:p-12 mb-2">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
              <div className="w-full lg:w-2/6 text-[#2F4157]">
                <div className="flex items-center gap-3 mb-4 sm:mb-6 lg:mb-8">
                  <Image
                    src="/images/contents/general/iels_insight.png"
                    alt="IELS Insight Logo"
                    width={300}
                    height={50}
                    className="h-auto w-full max-w-[250px] sm:max-w-[300px]"
                  />
                </div>

                <h1 className="text-lg sm:text-xl lg:text-[24px] font-bold mb-3 sm:mb-4">
                  Meet the Circle
                </h1>

                <p className="text-sm sm:text-[15px] leading-relaxed max-w-lg">
                  Real people, real journeys across Southeast Asia — from
                  internships and exchanges to the everyday wins of using
                  English with confidence.
                </p>
              </div>

              <div className="w-full lg:w-4/6">
                <Image
                  src="/images/contents/general/iels_gathering.png"
                  alt="IELS Community"
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-[15px] sm:rounded-[20px]"
                />
              </div>
            </div>
          </div>

          {/* Filter pills */}
          <div className="mb-8 sm:mb-10 lg:mb-12 px-4">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={activeSubFilter === f.key ? BTN_NAVY : BTN_GHOST}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stories grid */}
          {currentStories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-[#2F4157] mb-4 text-center">
                No Stories Yet in This Category
              </h3>
              <p className="text-gray-600 text-center max-w-md leading-relaxed">
                We&apos;re gathering more journeys from across Southeast Asia.
                Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10 lg:mb-12 px-4 sm:px-0">
              {currentStories.map((story) => (
                <Link
                  key={story.id}
                  href={`${storiesBase}/${generateSlug(story.title)}`}
                  onClick={handleReadMore}
                  className="group flex flex-col rounded-[20px] border border-gray-200 bg-white p-6 sm:p-7 transition-all hover:-translate-y-1 hover:border-[#E56668]/50 hover:shadow-xl"
                >
                  {/* Profile header */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-4 ring-[#E56668]/10">
                      <Image
                        src={story.author.avatar}
                        alt={story.author.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#E56668] bg-[#E56668]/10 rounded-full px-2.5 py-1">
                        {subcategoryLabels[story.subcategory]}
                      </span>
                      <p className="mt-2 flex items-center gap-1.5 text-base sm:text-lg font-extrabold text-[#2F4157]">
                        {story.author.name}
                        {story.author.country && (
                          <ReactCountryFlag
                            countryCode={story.author.country}
                            svg
                            style={{ width: "1em", height: "1em" }}
                            title={story.author.country}
                          />
                        )}
                      </p>
                      {story.author.role && (
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                          {story.author.role}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Story hook */}
                  <h3 className="mt-5 text-base sm:text-lg font-bold text-[#2F4157] leading-snug">
                    {story.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {story.seo.meta_description}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#E56668] group-hover:text-[#C04C4E]">
                    Read the story <span aria-hidden>→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {currentStories.length > 0 && (
            <Pagination
              pageCount={totalPages}
              onPageChange={(selectedItem) =>
                setCurrentPage(selectedItem.selected + 1)
              }
              currentPage={currentPage - 1}
            />
          )}

          <div className="text-center pt-4 sm:pt-6 px-4">
            <p className="text-gray-600 mb-2 text-sm sm:text-base">
              Got a story to tell?
            </p>
            <Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSdpfik-xAviTLsauSN_h4yVI-Af19ydbRC6-nM0QGDmuPEWIA/viewform"
              className="text-red-500 hover:text-red-600 transition-colors underline text-sm sm:text-base"
              target="_blank"
            >
              Share it with us here.
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
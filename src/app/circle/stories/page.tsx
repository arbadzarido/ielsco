"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Pagination from "@/components/Pagination";
import LoadingOverlay from "@/components/LoadingOverlay";
import { memberStoriesData, MemberStory } from "@/data/member-stories";
import { programUpdatesData, ProgramUpdate } from "@/data/program-updates";
import { partnerUpdatesData, PartnerUpdate } from "@/data/partner-updates";
import { generateSlug } from "@/utils/slug";
import { Button } from "@/components/ui/button"

type NewsItem =
  | (MemberStory & { type: "member"; subcategory?: "All" | "Internals" | "Lounge" | "Speakers" | "Inspires" })
  | (ProgramUpdate & { type: "program" })
  | (PartnerUpdate & { type: "partner" });


// Combine all data into a single array
const newsData: NewsItem[] = [
  ...memberStoriesData.map((item) => ({
    ...item,
    type: "member" as const,
  })),
  ...programUpdatesData.map((item) => ({
    ...item,
    type: "program" as const,
  })),
  ...partnerUpdatesData.map((item) => ({
    ...item,
    type: "partner" as const,
  })),
];

export default function News() {
  const [activeFilter, setActiveFilter] = useState<
    "member" | "program" | "partner"
  >("member");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSubFilter, setActiveSubFilter] = useState<
  "All" | "Internals" | "Lounge" | "Speakers" | "Inspires"
>("All");

const filteredNews = newsData.filter((item) => {
  if (item.type !== activeFilter) return false;
    if (activeFilter === "member") {
      if (activeSubFilter === "All") return true; // ✅ tampilkan semua subkategori
    const memberItem = item as MemberStory & { type: "member" };
    return memberItem.subcategory === activeSubFilter;
  }
  return true; // untuk partner & program
});


  // Month name to number mapping (English Only)
  const monthMap: { [key: string]: number } = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12,
  };

  // Function to parse date string and convert to sortable format
  const parseDateString = (dateStr: string): Date => {
    const parts = dateStr.split(" ");
    if (parts.length !== 3) return new Date(); // fallback

    const monthName = parts[0].toLowerCase();
    const day = parseInt(parts[1].replace(",", ""));
    const year = parseInt(parts[2]);

    const monthNumber = monthMap[monthName] || 1; // fallback to January

    return new Date(year, monthNumber - 1, day);
  };

  const sortedFilteredNews = filteredNews.sort((a, b) => {
    if (a.type === "member" && b.type === "member") {
      // Sort member stories by date (newest to oldest)
      const dateA = parseDateString(a.date);
      const dateB = parseDateString(b.date);
      return dateB.getTime() - dateA.getTime();
    } else if (a.type === "program" && b.type === "program") {
      // Sort program updates by ID (highest to lowest)
      return parseInt(b.id) - parseInt(a.id);
    } else if (a.type === "partner" && b.type === "partner") {
      // Sort partner updates by ID (highest to lowest)
      return parseInt(b.id) - parseInt(a.id);
    }
    return 0;
  });
  const BTN_NAVY =
  "inline-flex items-center justify-center rounded-full bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f] transition active:scale-[0.97]";

const BTN_GHOST =
  "inline-flex items-center justify-center rounded-full border border-gray-200 text-[#294154] font-medium px-5 py-2 hover:bg-gray-50 transition";
  const itemsPerPage = activeFilter === "member" ? 4 : 3;
  const totalPages = Math.ceil(sortedFilteredNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNews = sortedFilteredNews.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleFilterChange = (newFilter: "member" | "program" | "partner") => {
    if (newFilter === activeFilter) return;

    setIsAnimating(true);
    setActiveFilter(newFilter);
    setCurrentPage(1);

    setTimeout(() => setIsAnimating(false), 300);
  };

  const getActiveIndex = () => {
    const filters = ["member", "program", "partner"];
    return filters.indexOf(activeFilter);
  };

  const handleReadMore = () => {
    setIsLoading(true);
    // Simulate loading time for navigation
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Empty state components
  const EmptyState = ({ category }: { category: string }) => {
    const getEmptyMessage = () => {
      switch (category) {
        case "member":
          return {
            title: "No Member Stories Yet",
            message:
              "We're working on gathering inspiring stories from our community members. Check back soon for amazing journeys and experiences!",
            icon: "👥",
          };
        case "program":
          return {
            title: "No Program Updates Available",
            message:
              "We're preparing exciting program updates and announcements. Stay tuned for the latest developments in our educational offerings!",
            icon: "📚",
          };
        case "partner":
          return {
            title: "No Partner Updates Yet",
            message:
              "We're building partnerships and collaborations that will bring you valuable opportunities. More updates coming soon!",
            icon: "🤝",
          };
        default:
          return {
            title: "No Content Available",
            message:
              "We're working on bringing you fresh content. Please check back later!",
            icon: "📝",
          };
      }
    };

    const { title, message, icon } = getEmptyMessage();

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-2xl font-bold text-[#2F4157] mb-4 text-center">
          {title}
        </h3>
        <p className="text-gray-600 text-center max-w-md leading-relaxed">
          {message}
        </p>
      </div>
    );
  };

  return (
    <div className="">
      <Header />
      <LoadingOverlay isLoading={isLoading} message="Loading story..." />
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-[100px] pt-1 pb-8 sm:pb-12 lg:pb-16 bg-white text-[#2F4157]">
        <div className="max-w-7xl mx-auto">
          {/* Hero Card */}
          <div className="p-4 sm:p-6 lg:p-8 xl:p-12 mb-2">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
              {/* Left Content */}
              <div className="w-full lg:w-2/6 text-[#2F4157]">
                {/* IELS Insight Logo */}
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
                  Stories From Our Community
                </h1>

                <p className="text-sm sm:text-[15px] leading-relaxed max-w-lg">
                  Discover how IELS members, programs, and partners are creating
                  impact. Explore real experiences, achievements, and updates
                  that show learning, growth, and opportunities in action.
                </p>
              </div>

              {/* Right Image */}
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

 {/* Filter Buttons */}
<div className="mb-8 sm:mb-10 lg:mb-12 px-4">
  <div className="flex flex-wrap justify-center gap-3 sm:gap-4">

    {/* MEMBER STORIES DROPDOWN */}
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setActiveFilter("member");
          setIsDropdownOpen((prev) => !prev);
          setCurrentPage(1);
        }}
        className={activeFilter === "member" ? BTN_NAVY : BTN_GHOST}
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
      >
        <span>
          {activeSubFilter === "All"
            ? "Member Stories"
            : `Member · ${
                activeSubFilter[0].toUpperCase() +
                activeSubFilter.slice(1)
              }`}
        </span>

        <svg
          className={`ml-2 h-4 w-4 transition-transform ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

     {/* Dropdown panel */}
      {isDropdownOpen && activeFilter === "member" && (
        <div
          className="absolute left-0 z-50 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
        >
          <div className="py-1">
            <button
              onClick={() => {
                setActiveSubFilter("All");
                setIsDropdownOpen(false);
              }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              All Members
            </button>
            <button
              onClick={() => {
                setActiveSubFilter("Internals");
                setIsDropdownOpen(false);
              }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              IELS Internals
            </button>
            <button
              onClick={() => {
                setActiveSubFilter("Lounge");
                setIsDropdownOpen(false);
              }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              IELS Lounge Members
            </button>
            <button
              onClick={() => {
                setActiveSubFilter("Speakers");
                setIsDropdownOpen(false);
              }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              IELS Speakers
            </button>
            <button
              onClick={() => {
                setActiveSubFilter("Inspires");
                setIsDropdownOpen(false);
              }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              IELS Inspires
            </button>
          </div>
        </div>
      )}
    </div>

    {/* PROGRAM UPDATES */}
    <button
      onClick={() => {
        setActiveFilter("program");
        setActiveSubFilter("All");
        setIsDropdownOpen(false);
        setCurrentPage(1);
      }}
      className={activeFilter === "program" ? BTN_NAVY : BTN_GHOST}
    >
      Program Updates
    </button>

    {/* PARTNER UPDATES */}
    <button
      onClick={() => {
        setActiveFilter("partner");
        setActiveSubFilter("All");
        setIsDropdownOpen(false);
        setCurrentPage(1);
      }}
      className={activeFilter === "partner" ? BTN_NAVY : BTN_GHOST}
    >
      Partner Updates
    </button>

  </div>
</div>
</div>

          {/* News Grid */}
          {currentNews.length === 0 ? (
            <EmptyState category={activeFilter} />
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 lg:mb-12 px-4 sm:px-0 ${
                activeFilter === "member"
                  ? "sm:grid-cols-1 lg:grid-cols-2"
                  : "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {currentNews.map((news) => (
                <div key={news.id}>
                  {/* Member Stories - Original Layout */}
                  {news.type === "member" && (
                    <div className="bg-white rounded-[15px] sm:rounded-[20px] overflow-hidden shadow-sm lg:shadow-none">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-6">
                        {/* Author Avatar */}
                        <div className="flex-shrink-0 mx-auto sm:mx-0">
                          <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] lg:w-[147px] lg:h-[147px] rounded-full bg-gray-200 overflow-hidden">
                            <Image
                              src={news.author.avatar}
                              alt={news.author.name}
                              width={147}
                              height={147}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 text-center sm:text-left">
                          <h3 className="text-lg sm:text-xl font-bold text-[#2F4157] mb-2 sm:mb-3 leading-tight">
                            {news.title}
                          </h3>
                          <p className="text-sm sm:text-[15px] text-[#2F4157] leading-relaxed mb-3 sm:mb-4">
                            {news.seo.meta_description}
                          </p>
                          <Button
                        asChild
                        className="bg-[#E56668] text-white px-6 py-2 hover:bg-[#C04C4E] mt-4"
                      ><Link
                            href={`/stories/${generateSlug(news.title)}`}
                            onClick={handleReadMore}
                          >
                            
                              Read More
                            
                          </Link></Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Program Updates & Partner Updates - Event Card Style */}
                  {(news.type === "program" || news.type === "partner") && (
                    <div className="flex flex-col gap-3 sm:gap-4 w-full">
                      {/* Image Container with 50% height crop */}
                      <div className="relative w-full h-[200px] sm:h-[250px] lg:h-[300px] overflow-hidden rounded-[15px] sm:rounded-[20px]">
                        <Image
                          src={news.image!}
                          alt={news.title}
                          width={450}
                          height={450}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Category Label */}
                      <div className="flex flex-col gap-2">
                        <p className="text-red-500 font-bold text-xs sm:text-sm uppercase tracking-wide">
                          {news.category}
                        </p>
                        <p className="font-bold text-lg sm:text-xl lg:text-[24px] text-[#2F4157] leading-tight">
                          {news.title}
                        </p>
                        <p className="text-sm sm:text-[15px] text-[#2F4157] leading-relaxed">
                          {news.description.length > 215
                            ? `${news.description.substring(0, 215)}...`
                            : news.description}
                        </p>
                      </div>
                      <Link href={news.link}>
                        <button className="border-1 border-[#2F4157] cursor-pointer rounded-[15px] sm:rounded-[20px] px-2 sm:px-3 py-1 sm:py-1.5 w-fit mt-4 sm:mt-6 lg:mt-8 hover:bg-[#2F4157] hover:text-white transition-colors text-[#2F4157] text-sm sm:text-base">
                          Read More
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {currentNews.length > 0 && (
            <Pagination
              pageCount={totalPages}
              onPageChange={(selectedItem) =>
                setCurrentPage(selectedItem.selected + 1)
              }
              currentPage={currentPage - 1}
            />
          )}

          {/* Call to Action */}
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
      

      <Footer />
    </div>
      )}
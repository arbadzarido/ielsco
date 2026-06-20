"use client";

import Footer from "@/components/footer";
import Header from "@/components/header";
import Image from "next/image";
import Link from "next/link";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import CancelIcon from "@mui/icons-material/Cancel";
import EventIcon from "@mui/icons-material/Event";
import EventCard from "@/components/events/EventCard";
import Pagination from "@/components/Pagination";
import LoadingOverlay from "@/components/LoadingOverlay";
import { eventsData } from "@/data/events";
import { generateSlug } from "@/utils/slug";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button"

function SGITHighlightCard() {
  return (
    <Link
      href="/events/gif"
      className="
        group relative overflow-hidden rounded-3xl
        bg-white text-[#2F4157]
        p-8
        border border-gray-200
        transition-all duration-300

        hover:-translate-y-1 hover:shadow-2xl hover:border-[#E56668]/60
        active:scale-[0.98] active:shadow-xl
      "
    >
        {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0">
        <Image
          src="/images/contents/stories/member-stories/banner/singapore-banner.png"
          alt="Global Impact Fellowship in Singapore"
          fill
          className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-white/60" />
      </div>
      {/* ACCENT BAR */}
      <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#E56668] rounded-full opacity-0 group-hover:opacity-100 transition" />

      <div className="relative flex flex-col h-full justify-between pl-4">

        <div>
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-3">
            🌏 Flagship Global Program
          </p>
<div className="mb-6">
  <Image
    src="/images/logos/events/gif.png"
    alt="Global Impact Fellowship in Singapore"
    width={270}
    height={72}
    className="
      h-20 w-auto
      
      opacity-90
    "
    priority
  />
</div>

          <p className="text-gray-600 leading-relaxed max-w-md">
            A selective international exposure program connecting Southeast Asian youth
            to global academic and career ecosystems — and translating that exposure
            into <b>real local impact</b>.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            🚀 Open Registration • February 2025
          </span>
          <span className="font-semibold text-[#E56668]">
            Learn more →
          </span>
        </div>
      </div>
    </Link>
  );
}

function LaunchpadHighlightCard() {
  return (
    <Link
      href="/events/launchpad"
      className="
        group relative overflow-hidden rounded-3xl
        bg-white text-[#2F4157]
        p-8
        border border-gray-200
        transition-all duration-300

        hover:-translate-y-1 hover:shadow-2xl hover:border-[#E56668]/60
        active:scale-[0.98] active:shadow-xl
      "
    >
            {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0">
        <Image
          src="/images/contents/careers/iels_team_0.png"
          alt="English Students Launchpad Community"
          fill
          className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-white/60" />
      </div>
      {/* ACCENT BAR */}
      <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#E56668] rounded-full opacity-0 group-hover:opacity-100 transition" />

      <div className="relative flex flex-col h-full justify-between pl-4">

        <div>
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-3">
            🎓 Career Incubation Program
          </p>

<div className="mb-6">
  <Image
    src="/images/logos/events/esl.png"
    alt="English Student Launchpad"
    width={270}
    height={72}
    className="
      h-15 w-auto
      
      opacity-90
    "
    priority
  />
</div>

          <p className="text-gray-600 leading-relaxed max-w-md">
            An intensive career launch journey for English Education & Literature students
            to turn their major into <b>global opportunities</b> —
            from remote work and teaching abroad to international portfolios.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            🗓 Registration • Jan – Feb 2025
          </span>
          <span className="font-semibold text-[#E56668]">
            Explore program →
          </span>
        </div>
      </div>
    </Link>
  );
}



export default function Events() {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<typeof eventsData>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const eventsPerPage = 3;

  // Check if eventsData is empty
  const isEmpty = eventsData.length === 0;

  // Find all upcoming events (not just the closest one)
  const upcomingEvents = useMemo(() => {
    if (isEmpty) return [];

    const now = new Date();

    const validEvents = eventsData.filter((event) => {
      // Parse deadline date and time - treat as GMT+7
      const [year, month, day] = event.registrationDateDeadline
        .split("-")
        .map(Number);
      const [hours, minutes] = event.registrationTimeDeadline
        .split(":")
        .map(Number);

      // Create deadline date in UTC (GMT+7 time minus 7 hours = UTC)
      const deadlineUTC = new Date(
        Date.UTC(year, month - 1, day, hours - 7, minutes, 0)
      );

      return deadlineUTC > now;
    });

    // Sort by deadline date (closest first)
    return validEvents.sort((a, b) => {
      const [aYear, aMonth, aDay] = a.registrationDateDeadline
        .split("-")
        .map(Number);
      const [aHours, aMinutes] = a.registrationTimeDeadline
        .split(":")
        .map(Number);
      const aDeadlineUTC = new Date(
        Date.UTC(aYear, aMonth - 1, aDay, aHours - 7, aMinutes, 0)
      );

      const [bYear, bMonth, bDay] = b.registrationDateDeadline
        .split("-")
        .map(Number);
      const [bHours, bMinutes] = b.registrationTimeDeadline
        .split(":")
        .map(Number);
      const bDeadlineUTC = new Date(
        Date.UTC(bYear, bMonth - 1, bDay, bHours - 7, bMinutes, 0)
      );

      return aDeadlineUTC.getTime() - bDeadlineUTC.getTime();
    });
  }, [isEmpty]);

  // Format date for display in GMT+7
  const formatEventDate = (dateString: string) => {
    // Parse the date string and convert to GMT+7
    const date = new Date(`${dateString}T00:00:00+07:00`);
    const month = date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "Asia/Jakarta", // GMT+7 timezone
    });
    const day = date.getDate();
    const year = date.getFullYear();
    return { month, day, year };
  };

  // Search function
  const handleSearch = () => {
    console.log("Search function called with query:", searchQuery);

    if (searchQuery.trim() === "") {
      setFilteredEvents([]);
      setIsSearching(false);
      return;
    }

    const filtered = eventsData.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    console.log("Filtered results:", filtered.length);

    setFilteredEvents(filtered);
    setIsSearching(true);
    setCurrentPage(0);
  };

  // Clear search function
  const clearSearch = () => {
    console.log("Clear search function called");
    setSearchQuery("");
    setFilteredEvents([]);
    setIsSearching(false);
    setCurrentPage(0);
  };

  // Handle event click for loading
  const handleEventClick = () => {
    setIsLoading(true);
    // Simulate loading time for navigation
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Handle search icon click
  const handleSearchIconClick = () => {
    console.log("Search icon clicked, query:", searchQuery);
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  // Sort events by start date (newest to oldest)
  const sortEventsByDate = (events: typeof eventsData) => {
    return events.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
  };

  // Calculate pagination for desktop
  const eventsToShow = isSearching
    ? sortEventsByDate(filteredEvents)
    : sortEventsByDate(eventsData);
  const totalPages = Math.ceil(eventsToShow.length / eventsPerPage);
  const startIndex = currentPage * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = eventsToShow.slice(startIndex, endIndex);

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
  };

  // Empty State Component
  const EmptyState = ({ isSearch = false }: { isSearch?: boolean }) => (
    <div className="flex flex-col items-center justify-center py-[150px] px-6">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <EventIcon className="text-gray-400 text-6xl" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-700 mb-4">
        {isSearch ? "No Events Found" : "No Events Yet"}
      </h3>
      <p className="text-gray-500 text-center max-w-md mb-6">
        {isSearch
          ? `We couldn't find any events matching "${searchQuery}". Try searching with different keywords.`
          : "IELS doesn't have any events scheduled at the moment. Please check back later for exciting upcoming events!"}
      </p>
      {isSearch && (
        <button
          onClick={clearSearch}
          className="bg-[#2F4157] text-white px-6 py-2 rounded-[15px] hover:bg-[#4B5B6E] transition-colors"
        >
          Clear Search
        </button>
      )}
    </div>
  );

  // If eventsData is completely empty, show empty state
  if (isEmpty) {
    return (
      <div>
        <Header />
        <div className="flex flex-col bg-white px-4 lg:px-[100px] w-full py-12 overflow-x-hidden">
          <EmptyState />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
 {/* ================= FLAGSHIP PROGRAMS ================= */}
<section className="relative bg-[#2F4157] px-6 lg:px-[100px] py-20 overflow-hidden">

  {/* SUBTLE GLOW */}
  <div className="absolute -top-32 -right-32 w-[420px] h-[420px] bg-[#E56668]/20 rounded-full blur-[140px]" />
  <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] bg-white/10 rounded-full blur-[140px]" />

  <div className="relative max-w-6xl mx-auto">

    {/* HEADER */}
    <div className="mb-14 max-w-3xl">
      <p className="text-sm uppercase tracking-widest text-white/60 mb-3">
        ⭐ Flagship Programs
      </p>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
        Built for Global Exposure & Real Impact
      </h2>
      <p className="text-white/80 leading-relaxed">
        These are not one-off events.  
        They are <b>long-term, impact-driven programs</b> designed to prepare
        students for global opportunities — academically, professionally, and strategically 🌍
      </p>
    </div>

    {/* GRID */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <SGITHighlightCard />
      <LaunchpadHighlightCard />
    </div>

  </div>
</section>
      <LoadingOverlay isLoading={isLoading} message="Loading event..." />
      <div className="flex flex-col bg-white px-4 lg:px-[100px] w-full py-12 overflow-x-hidden">
        <div>
          {/* Mobile Design - Completely Different Layout */}
          <div className="block lg:hidden">
            {/* Mobile Upcoming Events Slider */}
            {upcomingEvents.length > 0 && (
              <div className="mb-6">
                <div className="bg-gradient-to-br from-[#2F4157] to-[#4B5B6E] rounded-[20px] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 rounded-full px-3 py-1">
                      <p className="text-white text-sm">Upcoming Events</p>
                    </div>
                    {upcomingEvents.length > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentSlide(Math.max(0, currentSlide - 1))
                          }
                          className="bg-white/20 rounded-full p-2 disabled:opacity-50"
                          disabled={currentSlide === 0}
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                        <span className="text-white text-sm">
                          {currentSlide + 1} / {upcomingEvents.length}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentSlide(
                              Math.min(
                                upcomingEvents.length - 1,
                                currentSlide + 1
                              )
                            )
                          }
                          className="bg-white/20 rounded-full p-2 disabled:opacity-50"
                          disabled={currentSlide === upcomingEvents.length - 1}
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative overflow-hidden">
                    <div
                      className="flex transition-transform duration-300 ease-in-out"
                      style={{
                        transform: `translateX(-${currentSlide * 100}%)`,
                      }}
                    >
                      {upcomingEvents.map((event) => (
                        <div key={event.id} className="w-full flex-shrink-0">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                              <Image
                                src="/images/contents/general/calendar_icon.png"
                                alt="Calendar"
                                width={20}
                                height={20}
                                className="w-5 h-5"
                              />
                              <span className="text-white text-sm font-bold">
                                {formatEventDate(event.startDate).month}{" "}
                                {formatEventDate(event.startDate).day},{" "}
                                {formatEventDate(event.startDate).year}
                              </span>
                            </div>
                          </div>

                          <h1 className="text-white text-3xl font-bold mb-4 text-center">
                            {event.title}
                          </h1>

                          <div className="relative mb-6 flex justify-center">
                            <Image
                              src={event.poster}
                              width={280}
                              height={350}
                              alt={event.title}
                              className="max-w-full h-auto aspect-[4/5] rounded-[15px] object-cover"
                            />
                          </div>

                          <p className="text-white/90 text-center mb-6 leading-relaxed">
                            {event.seo.meta_description}
                          </p>

                          <div className="flex flex-col gap-3">
                           <Button
                          asChild
                          className="bg-[#E56668] text-white px-6 py-3 hover:bg-[#C04C4E]"
                        >
                          <Link
                            href={event.registrationLink}
                            target="_blank"
                          >
                            Register Now
                          </Link>
                        </Button>
                            <Button
                              asChild
                              className="bg-white text-[#E56668] px-6 py-3 hover:bg-white/80"
                            >
                              <Link
                                href={`/events/${generateSlug(event.title)}`}
                                onClick={handleEventClick}
                              >
                                Read More
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dots indicator */}
                  {upcomingEvents.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {upcomingEvents.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentSlide ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Search Section */}
            <div className="bg-[#F5F5F5] rounded-[20px] p-4">
              <h3 className="text-[#2F4157] font-semibold mb-3 text-center">
                Search Past Events
              </h3>
              <div className="flex items-center bg-white rounded-[15px] p-3 shadow-sm">
                <MenuIcon className="text-gray-500 mr-3" />
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  className="flex-1 outline-none text-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  type="button"
                  className="text-gray-500 ml-3 cursor-pointer hover:text-gray-700 p-1"
                  onClick={isSearching ? clearSearch : handleSearchIconClick}
                >
                  {isSearching ? (
                    <CancelIcon className="text-gray-500 hover:text-gray-700" />
                  ) : (
                    <SearchIcon />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Design - Original Layout */}
          <div className="hidden lg:block">
            {upcomingEvents.length > 0 && (
              <div className="flex bg-[#4B5B6E] rounded-[20px] h-[500px] items-stretch">
                <div className="relative w-full flex bg-[#2F4157] rounded-[20px] items-stretch p-12">
                  <div className="relative w-[450px]">
                    <Image
                      src={upcomingEvents[currentSlide].poster}
                      width={430}
                      height={430}
                      alt={upcomingEvents[currentSlide].title}
                      className="absolute top-0 left-0 w-[410px] h-auto rounded-[10px]"
                    />
                  </div>
                  <div className="w-[30vw] pl-6 text-white py-12 flex flex-col gap-4 text-[15px] justify-center">
                    <p>Upcoming Events</p>
                    <p className="text-[32px]">
                      {upcomingEvents[currentSlide].title}
                    </p>
                    <p className="w-[30vw]">
                      {upcomingEvents[currentSlide].seo.meta_description}
                    </p>
                    <div className="flex gap-5 pt-6">
                      <Button
                        asChild
                        className="bg-[#E56668] text-white px-6 py-3 hover:bg-[#C04C4E]"
                      ><Link
                        href={`/events/${generateSlug(
                          upcomingEvents[currentSlide].title
                        )}`}
                      >
                        Read More
                      </Link></Button>
                      <Button
                        asChild
                        className="bg-[#E56668] text-white px-6 py-3 hover:bg-[#C04C4E]"
                      ><Link
                        href={upcomingEvents[currentSlide].registrationLink}
                        target="_blank"
                      >
                        Register
                      </Link></Button>
                    </div>
                  </div>
                </div>
                <div className="w-[20vw] items-center justify-center flex flex-col gap-1">
                  <Image
                    src="/images/contents/general/calendar_icon.png"
                    alt="Calendar Icon"
                    width={62}
                    height={62}
                    className="w-[62px] h-auto"
                  />
                  <div className="flex flex-col">
                    <p className="text-white text-[15px] text-end">
                      <span className="font-bold">
                        {
                          formatEventDate(
                            upcomingEvents[currentSlide].startDate
                          ).month
                        }{" "}
                        {
                          formatEventDate(
                            upcomingEvents[currentSlide].startDate
                          ).day
                        }
                      </span>{" "}
                      <br />
                      {
                        formatEventDate(upcomingEvents[currentSlide].startDate)
                          .year
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Navigation - Only show if multiple events */}
            {upcomingEvents.length > 1 && (
              <div className="flex justify-end gap-4 mt-6 mb-[50px]">
                <button
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  className="bg-[#2F4157] text-white rounded-full p-3 disabled:opacity-50 hover:bg-[#4B5B6E] transition-colors cursor-pointer"
                  disabled={currentSlide === 0}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-[#2F4157] text-lg font-semibold flex items-center">
                  {currentSlide + 1} / {upcomingEvents.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentSlide(
                      Math.min(upcomingEvents.length - 1, currentSlide + 1)
                    )
                  }
                  className="bg-[#2F4157] text-white rounded-full p-3 disabled:opacity-50 hover:bg-[#4B5B6E] transition-colors cursor-pointer"
                  disabled={currentSlide === upcomingEvents.length - 1}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="w-full flex pt-4 pl-12 justify-between">
              <div className="w-[450px]"></div>
              <div className="w-[45vw] flex rounded-[20px] bg-[#D3D3D3] items-end p-3 ml-[1.5vw]">
                <div className="flex gap-2 items-center w-full">
                  <MenuIcon className="text-gray-600" />
                  <input
                    type="text"
                    placeholder="Search Past Events"
                    className="px-2 w-full outline-none bg-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button
                    type="button"
                    className="text-gray-600 cursor-pointer hover:text-gray-800 p-1"
                    onClick={isSearching ? clearSearch : handleSearchIconClick}
                  >
                    {isSearching ? (
                      <CancelIcon className="text-gray-500 hover:text-gray-700" />
                    ) : (
                      <SearchIcon />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Events - Pagination */}
        <div className="block lg:hidden">
          {/* Search Results Indicator */}
          {isSearching && (
            <div className="px-6 pt-4">
              <p className="text-gray-600 text-sm">
                {filteredEvents.length > 0
                  ? `Found ${filteredEvents.length} event${
                      filteredEvents.length === 1 ? "" : "s"
                    } for "${searchQuery}"`
                  : `No events found for "${searchQuery}"`}
              </p>
            </div>
          )}

          {/* Show empty state for search results or events */}
          {currentEvents.length === 0 ? (
            <EmptyState isSearch={isSearching} />
          ) : (
            <>
              <div className="pt-[50px] grid grid-cols-1 gap-6 p-6">
                {currentEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventClick={handleEventClick}
                  />
                ))}
              </div>

              <Pagination
                pageCount={totalPages}
                onPageChange={handlePageChange}
                currentPage={currentPage}
              />
            </>
          )}
        </div>

        {/* Desktop Events - Pagination */}
        <div className="hidden lg:block">
          {/* Show empty state for search results or events */}
          {currentEvents.length === 0 ? (
            <EmptyState isSearch={isSearching} />
          ) : (
            <>
              <div className="pt-[50px] grid grid-cols-3 gap-8 p-12">
                {currentEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEventClick={handleEventClick}
                  />
                ))}
              </div>

              <Pagination
                pageCount={totalPages}
                onPageChange={handlePageChange}
                currentPage={currentPage}
              />
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

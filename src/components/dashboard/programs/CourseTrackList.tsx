"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COURSE_TRACKS, trackInfo } from "@/data/dashboard/courses";
import { focusRing } from "../ui";
import { TUTOR_PRICE_LABEL } from "@/components/tutoring/links";
import { cn } from "@/lib/utils";

// Tutoring focus areas as an editorial index list (real data from src/data/courses.ts). Not purchasable courses: a private
// tutor session is requested per session at Rp90,000.
export function CourseTrackList() {
  return (
    <section id="tutoring" aria-labelledby="courses-heading" data-testid="course-track-list">
      <h2 id="courses-heading" className="text-2xl font-bold md:text-3xl">Private tutoring focus areas</h2>
      <p className="mb-4 text-base text-[#2F4157]/65">Pick what you want to work on with a human tutor. {TUTOR_PRICE_LABEL}, requested per session. Learning and test practice live in Elco AI.</p>
      <ol className="divide-y divide-[#E3E7ED]/70 border-y border-[#E3E7ED]/70">
        {COURSE_TRACKS.map((t, i) => {
          const { label, packages, mentor } = trackInfo(t);
          return (
            <li key={t}>
              <Link href={`/dashboard/programs/courses/${t}`} data-testid={`course-track-${t}`} className={cn("group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:gap-8", focusRing)}>
                <span className="w-8 text-lg font-bold text-[#577E90]">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-xl font-bold group-hover:underline underline-offset-4">{label}</span>
                  <span className="block text-base text-[#2F4157]/60">
                    {packages[0]?.level} · {mentor ? mentor.name : "Tutor confirmed on request"}
                  </span>
                </span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

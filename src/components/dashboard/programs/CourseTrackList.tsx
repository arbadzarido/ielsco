"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COURSE_TRACKS, formatIDR, trackInfo } from "@/data/dashboard/courses";
import { focusRing } from "../ui";
import { cn } from "@/lib/utils";

// Course tracks as an editorial index list (real data from src/data/courses.ts).
export function CourseTrackList() {
  return (
    <section aria-labelledby="courses-heading" data-testid="course-track-list">
      <h2 id="courses-heading" className="text-2xl font-bold md:text-3xl">IELS Courses</h2>
      <p className="mb-4 text-base text-[#2F4157]/65">Paid, mentor-led English courses. Each track comes as an 8-session intensive or a 21-session extensive package.</p>
      <ol className="divide-y divide-[#E3E7ED]/70 border-y border-[#E3E7ED]/70">
        {COURSE_TRACKS.map((t, i) => {
          const { label, packages, mentor } = trackInfo(t);
          const from = Math.min(...packages.map((p) => p.totalPrice));
          return (
            <li key={t}>
              <Link href={`/dashboard/programs/courses/${t}`} data-testid={`course-track-${t}`} className={cn("group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:gap-8", focusRing)}>
                <span className="w-8 text-lg font-bold text-[#577E90]">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-xl font-bold group-hover:underline underline-offset-4">{label}</span>
                  <span className="block text-base text-[#2F4157]/60">
                    {packages[0]?.level} · {mentor ? mentor.name : "Facilitator to be confirmed"} · from {formatIDR(from)}
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

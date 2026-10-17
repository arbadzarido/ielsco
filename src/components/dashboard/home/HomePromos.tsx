"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { formatSessionWib, upcomingSessions } from "@/lib/circle/sessions";
import { formatIDR, trackInfo, type CourseTrack } from "@/data/dashboard/courses";
import { btnLink, focusRing } from "../ui";
import { cn } from "@/lib/utils";

// Next weekly Circle session (Wed 19:00 / Sat 13:00 WIB). Check-in happens on the Circle page.
export function CircleActivityBanner() {
  const [session] = upcomingSessions(1);
  const { day, time } = formatSessionWib(session.start);
  return (
    <section data-testid="circle-activity-banner" className="grid gap-6 rounded-3xl bg-[#2F4157] p-6 text-white md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
      <CalendarDays size={28} className="text-white/70" aria-hidden="true" />
      <div>
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-white/60">Next Circle session · {day} · {time}</p>
        <h2 className="mt-1 text-[24px] font-bold">{session.topic.title}</h2>
        <p className="text-[16px] text-white/75">{session.topic.description}</p>
      </div>
      <Link href="/dashboard/circle" data-testid="circle-banner-link" className={cn("inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-[#2F4157] hover:bg-[#F7F8FA]", focusRing)}>
        Check in <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

// Understated course promotion. Only real course data from src/data/courses.ts.
export function CoursePromo({ track, reason }: { track: CourseTrack; reason: string }) {
  const { label, packages, mentor } = trackInfo(track);
  if (packages.length === 0) return null;
  const from = Math.min(...packages.map((p) => p.totalPrice));
  return (
    <section data-testid={`course-promo-${track}`} className="flex flex-col gap-5 border-y border-[#E3E7ED]/70 py-6 md:flex-row md:items-center">
      {mentor && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#E9E3DA]">
          <Image src={mentor.image} alt="" fill sizes="64px" className="object-cover" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">IELS Course · {reason}</p>
        <h2 className="text-xl font-bold">{label}</h2>
        <p className="text-base text-[#2F4157]/70">
          {packages.map((p) => `${p.sessions} sessions`).join(" or ")} · from {formatIDR(from)}
          {mentor ? ` · with ${mentor.name}` : " · facilitator to be confirmed"}
        </p>
      </div>
      <Link href={`/dashboard/programs/courses/${track}`} data-testid={`course-promo-link-${track}`} className={btnLink}>
        View course <ArrowRight size={16} />
      </Link>
    </section>
  );
}

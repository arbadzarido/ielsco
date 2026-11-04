"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, Notice } from "../PageStates";
import { ResourceRow } from "../resources/ResourceRow";
import { btnLink, btnPrimary, btnSecondary } from "../ui";
import { CATEGORY_TO_TRACK, isCourseTrack, trackInfo } from "@/data/dashboard/courses";
import { TUTOR_PRICE_LABEL, tutorRequestUrl } from "@/components/tutoring/links";
import { elcoHref } from "@/lib/elco";
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import { cn } from "@/lib/utils";

export function CourseDetailView({ user, track }: DashboardCtx & { track: string }) {
  if (!isCourseTrack(track)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState title="Course not found" body="See all private tutoring focus areas on the Programs page." action={<Link href="/dashboard/programs" className={btnPrimary}>Programs</Link>} />
      </div>
    );
  }
  const { label, packages, mentor } = trackInfo(track);
  const freeMaterials = DEMO_RESOURCES.filter((r) => CATEGORY_TO_TRACK[r.category] === track && r.url).slice(0, 4);

  return (
    <article data-testid={`course-detail-${track}`} className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link href="/dashboard/programs" className={btnLink}><ArrowLeft size={16} /> Programs</Link>
      <header className="mt-6 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">Private tutoring focus · {TUTOR_PRICE_LABEL}</p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{label}</h1>
          <p className="mt-3 max-w-2xl text-lg text-[#2F4157]/75">{packages[0]?.description}</p>
        </div>
        {mentor ? (
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[#E9E3DA]"><Image src={mentor.image} alt="" fill sizes="64px" className="object-cover object-top" /></div>
            <div><p className="text-sm text-[#2F4157]/55">Tutor</p><p className="text-lg font-bold">{mentor.name}</p></div>
          </div>
        ) : (
          <p data-testid="course-mentor-tbc" className="text-base text-[#2F4157]/60">Tutor confirmed when you request a session</p>
        )}
      </header>

      {packages[0] && (
        <section className="mt-10 rounded-3xl bg-white p-6 md:p-8" data-testid={`course-outline-${track}`}>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">Level {packages[0].level}</p>
          <h2 className="mt-2 text-2xl font-bold">What a tutor can work on with you</h2>
          <p className="mt-1 text-base text-[#2F4157]/75">{packages[0].description}</p>
          <ul className="mt-4 space-y-1.5 text-base text-[#2F4157]/80">
            {packages[0].outcomes.filter((o) => !/certificate/i.test(o)).map((o) => <li key={o} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#577E90]" />{o}</li>)}
          </ul>
          <details className="mt-5">
            <summary className="cursor-pointer text-base font-semibold text-[#2F4157] underline-offset-4 hover:underline">Sample session outline</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-base text-[#2F4157]/80">{packages[0].curriculum.map((c) => <li key={c.session}>{c.title}</li>)}</ol>
          </details>
        </section>
      )}

      <section className="mt-10 space-y-4">
        <Notice testId="course-checkout-note">
          Elco AI is where you learn and practise English, including test preparation. A private tutor is a person who works with you one to one at {TUTOR_PRICE_LABEL}. You request each session on WhatsApp and the IELSco team confirms the tutor, time and payment. Nothing is charged on this page.
        </Notice>
        <div className="flex flex-wrap gap-3">
          <a href={tutorRequestUrl(label)} target="_blank" rel="noopener noreferrer" data-testid="course-whatsapp-cta" className={btnPrimary}>Request a private tutor <ExternalLink size={15} /></a>
          <a href={elcoHref(`tutoring-${track}`)} target="_blank" rel="noopener noreferrer" data-testid="course-elco-cta" className={btnSecondary}>Access Elco AI <ExternalLink size={15} /></a>
          <Link href="/products/courses" className={cn(btnLink, "self-center")}>See the public tutoring page</Link>
        </div>
      </section>

      {freeMaterials.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Try free materials first</h2>
          <p className="text-base text-[#2F4157]/60">Free resources on the same topic, from the Explore library.</p>
          <ul className="mt-2 divide-y divide-[#E3E7ED]/60">{freeMaterials.map((r) => <ResourceRow key={r.id} resource={r} userId={user.id} />)}</ul>
        </section>
      )}
    </article>
  );
}

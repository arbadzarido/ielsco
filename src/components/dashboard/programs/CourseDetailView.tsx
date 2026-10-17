"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, Notice } from "../PageStates";
import { ResourceRow } from "../resources/ResourceRow";
import { btnLink, btnPrimary, btnSecondary } from "../ui";
import { CATEGORY_TO_TRACK, GOOGLE_FORM_URL, WHATSAPP_URL, formatIDR, isCourseTrack, trackInfo } from "@/data/dashboard/courses";
import { PRICE_PER_SESSION } from "@/data/courses";
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import { cn } from "@/lib/utils";

export function CourseDetailView({ user, track }: DashboardCtx & { track: string }) {
  if (!isCourseTrack(track)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState title="Course not found" body="See all IELS courses on the Programs page." action={<Link href="/dashboard/programs" className={btnPrimary}>Programs</Link>} />
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
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">IELS Course · Paid</p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{label}</h1>
          <p className="mt-3 max-w-2xl text-lg text-[#2F4157]/75">{packages[0]?.description}</p>
        </div>
        {mentor ? (
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[#E9E3DA]"><Image src={mentor.image} alt="" fill sizes="64px" className="object-cover object-top" /></div>
            <div><p className="text-sm text-[#2F4157]/55">Mentor</p><p className="text-lg font-bold">{mentor.name}</p></div>
          </div>
        ) : (
          <p data-testid="course-mentor-tbc" className="text-base text-[#2F4157]/60">Facilitator to be confirmed</p>
        )}
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {packages.map((p) => (
          <section key={p.id} data-testid={`course-package-${p.id}`} className="rounded-3xl bg-white p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">{p.type === "intensive" ? "Intensive" : "Extensive"} · {p.sessions} live sessions</p>
            <p className="mt-2 text-3xl font-bold">{formatIDR(p.totalPrice)}</p>
            <p className="text-sm text-[#2F4157]/55">
              {p.sessions} × {formatIDR(PRICE_PER_SESSION)} (prices from the IELS course catalogue)
            </p>
            <p className="mt-4 text-base"><span className="font-semibold">Level:</span> {p.level}</p>
            <p className="mt-1 text-base text-[#2F4157]/75">{p.description}</p>
            <h3 className="mt-5 text-base font-semibold">You&apos;ll be able to</h3>
            <ul className="mt-2 space-y-1.5 text-base text-[#2F4157]/80">
              {p.outcomes.map((o) => <li key={o} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#577E90]" />{o}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-10 space-y-4">
        <Notice testId="course-checkout-note">
          Online checkout isn&apos;t set up yet. Register with the IELS form or ask on WhatsApp. The IELS team then confirms your schedule, session length and payment. Nothing is charged on this page.
        </Notice>
        <div className="flex flex-wrap gap-3">
          <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" data-testid="course-register-cta" className={btnPrimary}>Register interest <ExternalLink size={15} /></a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-testid="course-whatsapp-cta" className={btnSecondary}>Ask on WhatsApp <ExternalLink size={15} /></a>
          <Link href="/products/courses" className={cn(btnLink, "self-center")}>See the full public course page</Link>
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { MENTORS } from "@/data/courses";
import { TRACK_META } from "@/data/courses";
import { WHATSAPP_URL, type CourseTrack } from "@/data/dashboard/courses";
import { btnPrimary, btnSecondary, focusRing } from "../ui";
import { cn } from "@/lib/utils";

// Real mentors from src/data/courses.ts. Languages, session length and availability aren't in the source,
// so they're not shown. There's no online booking calendar, so the CTA is the existing IELS WhatsApp contact.
export function MentorDirectory() {
  const [skill, setSkill] = useState<CourseTrack | "">("");
  const tracks = Array.from(new Set(MENTORS.flatMap((m) => m.tracks)));
  const mentors = MENTORS.filter((m) => !skill || m.tracks.includes(skill));

  return (
    <section aria-labelledby="mentors-heading" data-testid="mentor-directory" className="space-y-6">
      <div>
        <h2 id="mentors-heading" className="text-2xl font-bold md:text-3xl">Mentors</h2>
        <p className="text-base text-[#2F4157]/65">The IELS team members who teach our courses. Filter by what you want to work on.</p>
      </div>
      <div role="group" aria-label="Filter mentors by skill" className="flex flex-wrap gap-2">
        {[{ id: "" as const, label: "All skills" }, ...tracks.map((t) => ({ id: t, label: TRACK_META[t].label }))].map((t) => (
          <button
            key={t.id || "all"}
            type="button"
            data-testid={`mentor-filter-${t.id || "all"}`}
            aria-pressed={skill === t.id}
            onClick={() => setSkill(t.id)}
            className={cn("rounded-full border px-3.5 py-1.5 text-base font-medium", focusRing, skill === t.id ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white hover:border-[#577E90]")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        {mentors.map((m) => (
          <article key={m.id} data-testid={`mentor-${m.id}`} className="flex gap-5">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#E9E3DA]">
              <Image src={m.image} alt={`Photo of ${m.name}`} fill sizes="96px" className="object-cover object-top" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#577E90]">{m.tagline}</p>
              <h3 className="text-xl font-bold">{m.name}</h3>
              <p className="mb-2 text-base text-[#2F4157]/60">{m.role}</p>
              <ul className="mb-3 space-y-1 text-base text-[#2F4157]/80">
                {m.highlights.map((h) => <li key={h.text}>{h.text}</li>)}
              </ul>
              <p className="mb-3 text-sm text-[#2F4157]/55">
                Teaches: {m.tracks.map((t) => TRACK_META[t].label).join(", ")} · Sessions run as part of IELS courses. Length and availability are confirmed when you register.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-testid={`mentor-contact-${m.id}`} className={cn(btnPrimary, "px-4 py-2")}>
                  Ask about a session <ExternalLink size={14} />
                </a>
                <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "px-4 py-2")}>LinkedIn</a>
                <Link href={`/dashboard/programs/courses/${m.tracks[0]}`} className={cn(btnSecondary, "px-4 py-2")}>Their course</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-[#2F4157]/55">There&apos;s no online booking calendar yet. &quot;Ask about a session&quot; opens the IELS WhatsApp contact.</p>
    </section>
  );
}

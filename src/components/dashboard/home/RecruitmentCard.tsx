"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";
import { btnPrimary, btnSecondary, cardGloss } from "../ui";
import { cn } from "@/lib/utils";
import { ROLE_COUNT } from "@/data/careers/divisions";
import { APPLY_PATH, RECRUITMENT, STATUS_COPY, recruitmentPhase } from "@/data/careers/recruitment";

type Mine = { kind: "none" } | { kind: "draft" } | { kind: "applied"; status: string };

// Home card for the Open Recruitment 2027: "IELSco & Elco AI are recruiting". It follows the member's own state (apply,
// continue a saved draft, or see the status of their application) and disappears after the window unless they applied.
export function RecruitmentCard({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [mine, setMine] = useState<Mine | null>(null);
  const phase = recruitmentPhase();

  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.rpc("my_career_application"),
      supabase.from("career_application_drafts").select("user_id").eq("user_id", userId).maybeSingle(),
    ]).then(([app, draft]) => {
      if (!live) return;
      const a = app.data as { status: string } | null;
      setMine(a ? { kind: "applied", status: a.status } : draft.data ? { kind: "draft" } : { kind: "none" });
    }).catch(() => live && setMine({ kind: "none" }));
    return () => { live = false; };
  }, [supabase, userId]);

  if (phase === "upcoming") return null;
  if (phase === "closed" && mine?.kind !== "applied") return null;

  const applied = mine?.kind === "applied";
  return (
    <section aria-labelledby="recruit-heading" data-testid="home-recruitment" className={cn(cardGloss, "relative overflow-hidden")}>
      <div className="grid md:grid-cols-[1.35fr_1fr]">
        <div className="relative z-10 p-6 md:p-8">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#577E90]">{RECRUITMENT.cohortName}</p>
          <h2 id="recruit-heading" className="mt-1 text-[24px] font-bold leading-tight sm:text-[28px]">
            {applied ? "Your application" : "IELSco & Elco AI are recruiting"}
          </h2>
          {applied ? (
            <p className="mt-2 text-[16px] text-[#2F4157]/75" data-testid="home-recruitment-status">
              Status: <strong className="text-[#1A2534]">{STATUS_COPY[mine.status]?.label ?? mine.status}</strong>. {STATUS_COPY[mine.status]?.text}
            </p>
          ) : (
            <p className="mt-2 max-w-[520px] text-[16px] text-[#2F4157]/75">
              Join the team behind IELSco and Elco AI: {ROLE_COUNT} roles in 7 divisions, fully remote, for 1st–3rd year students.
              Apply with your Elco-Pass by {RECRUITMENT.closesLabel}.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={APPLY_PATH} className={btnPrimary} data-testid="home-recruitment-cta">
              {applied ? "View application" : mine?.kind === "draft" ? "Continue application" : "Apply now"} <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {!applied && <Link href="/careers" className={btnSecondary} data-testid="home-recruitment-roles">See the roles</Link>}
          </div>
        </div>
        <div className="relative hidden min-h-[220px] md:block" aria-hidden="true">
          <Image src="/images/careers/2027/team-expo.webp" alt="" fill sizes="(min-width: 768px) 40vw, 0px" className="object-cover object-[50%_35%] grayscale" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/30 to-transparent" />
          <span className="absolute right-5 top-5 rounded-full bg-[#F9E15B] px-3 py-1 text-[13px] font-bold text-[#1A2534]">+ you</span>
        </div>
      </div>
    </section>
  );
}

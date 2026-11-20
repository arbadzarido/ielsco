"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProgramme, type Assessment, type Assignment, type ProgrammeDay, type Submission, type SubmissionFile } from "@/lib/gif/portal";
import type { Category, Requirement, Review, Signals, VerificationRequest } from "@/lib/gif/eligibility";

export interface TeamMember { team_id: string; team_number: number; team_name: string; delegate_id: string; full_name: string; is_me: boolean }
export interface GifNotification { id: string; submission_id: string | null; kind: string; message: string; created_at: string; read_at: string | null }
export interface PortalData {
  delegateId: string;
  team: TeamMember[];
  teamId: string | null;
  days: ProgrammeDay[];
  assignments: Assignment[];      // programme Day 1–4 tasks only
  allAssignments: Assignment[];   // + GIF Summer 2027 eligibility tasks
  submissions: Submission[];
  files: SubmissionFile[];
  assessments: Assessment[];
  notifications: GifNotification[];
  categories: Category[];
  requirements: Requirement[];
  reviews: Review[];
  requests: VerificationRequest[];
  signals: Signals | null;
}
type State = { s: "loading" } | { s: "error"; message: string } | { s: "ready"; data: PortalData };

// Everything the delegate portal shows, read with the delegate's own session. RLS returns only their own records and
// their team's group work, so no filtering here is security-relevant.
export function useDelegatePortal(supabase: SupabaseClient, delegateId: string) {
  const [state, setState] = useState<State>({ s: "loading" });

  const load = useCallback(async () => {
    try {
      const [team, days, assignments, submissions, notifications, categories, requirements, reviews, requests, signals] = await Promise.all([
        supabase.rpc("gif_my_team"),
        supabase.from("gif_programme_days").select("*").order("day_number"),
        supabase.from("gif_assignments").select("*").order("day_number").order("sort_order"),
        supabase.from("gif_submissions").select("*"),
        supabase.from("gif_notifications").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("gif_eligibility_categories").select("*").order("sort_order"),
        supabase.from("gif_eligibility_requirements").select("*").order("sort_order"),
        supabase.from("gif_eligibility_reviews").select("*").order("created_at", { ascending: false }),
        supabase.from("gif_verification_requests").select("*").order("created_at", { ascending: false }),
        supabase.rpc("gif_my_eligibility_signals"),
      ]);
      const err = team.error || days.error || assignments.error || submissions.error || notifications.error
        || categories.error || requirements.error || reviews.error || requests.error || signals.error;
      if (err) throw err;
      const subIds = (submissions.data ?? []).map((s) => s.id);
      const [files, assessments] = subIds.length
        ? await Promise.all([
            supabase.from("gif_submission_files").select("*").in("submission_id", subIds).order("uploaded_at"),
            supabase.from("gif_assessments").select("*").in("submission_id", subIds).order("created_at", { ascending: false }),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      if (files.error || assessments.error) throw files.error || assessments.error;
      const members = (team.data ?? []) as TeamMember[];
      setState({
        s: "ready",
        data: {
          delegateId,
          team: members,
          teamId: members[0]?.team_id ?? null,
          days: (days.data ?? []) as ProgrammeDay[],
          assignments: ((assignments.data ?? []) as Assignment[]).filter(isProgramme),
          allAssignments: (assignments.data ?? []) as Assignment[],
          submissions: (submissions.data ?? []) as Submission[],
          files: (files.data ?? []) as SubmissionFile[],
          assessments: (assessments.data ?? []) as Assessment[],
          notifications: (notifications.data ?? []) as GifNotification[],
          categories: (categories.data ?? []) as Category[],
          requirements: (requirements.data ?? []) as Requirement[],
          reviews: (reviews.data ?? []) as Review[],
          requests: (requests.data ?? []) as VerificationRequest[],
          signals: ((signals.data ?? []) as Signals[])[0] ?? null,
        },
      });
    } catch (e) {
      setState({ s: "error", message: (e as { message?: string })?.message || "Couldn't load your assignments." });
    }
  }, [supabase, delegateId]);

  useEffect(() => { void load(); }, [load]);
  // Pick up Arba's assessments when the delegate comes back to the tab.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);

  return { state, reload: load };
}

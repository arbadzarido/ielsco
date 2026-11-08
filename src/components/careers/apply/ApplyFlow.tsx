"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, CloudOff, Download, ExternalLink, FileText, Instagram, Link2, Loader2,
  Pencil, ShieldCheck, Upload, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadMemberProfile } from "@/lib/dashboard/profile";
import { useElcoState } from "@/lib/elco-state";
import { ELCO_LINK_URL } from "@/data/membership";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ROLE_COUNT, allRoles, divisions, roleById, type LeadKey } from "@/data/careers/divisions";
import { APPLY_PATH, CAMPAIGN_TASKS, DECLARATION, RECRUITMENT, recruitmentPhase } from "@/data/careers/recruitment";
import {
  EMPTY_DRAFT, MAX_FILE_BYTES, MOTIVATION_MAX, MOTIVATION_MIN, STEPS, explainSubmitError, instagramHandle, linkedinUrl,
  normalizeWhatsapp, sanitizeDraft, validateStep, type ApplicationDraft, type Errors, type StepId,
} from "@/lib/careers/application";
import { ApplicationStatus, type MyApplication } from "./ApplicationStatus";

// Careers 2027 application: the signed-in member (Elco-Pass = their IELSco account) fills a six-step form. Progress is
// saved to public.career_application_drafts (own row, RLS); PDFs go to the private bucket career-applications under
// applicants/<user id>/; public.submit_my_career_application() validates and stores the application (or updates it while
// it is still 'submitted'). No service-role key.

const BUCKET = "career-applications";
const ROLE_IDS = allRoles.map((r) => r.id);
const TASK_KEYS = CAMPAIGN_TASKS.map((t) => t.key);

const input = "mt-2 block w-full rounded-[14px] border border-[#D5DBE3] bg-white px-4 py-3 text-[16px] font-normal text-[#1A2534] placeholder:text-[#2F4157]/40 hover:border-[#B8C2CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-1 aria-[invalid=true]:border-[#C04C4E]";
const label = "block text-[15px] font-semibold text-[#1A2534]";
const hint = "mt-1.5 block text-[13px] font-normal leading-relaxed text-[#2F4157]/60";
const errText = "mt-1.5 block text-[13px] font-semibold text-[#C04C4E]";
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";
const btnPrimary = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#2F4157] px-6 text-[16px] font-semibold text-white transition-colors hover:bg-[#1A2534] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`;
const btnSecondary = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#D5DBE3] bg-white px-6 text-[16px] font-semibold text-[#2F4157] hover:border-[#2F4157] disabled:opacity-60 ${focus}`;
const panel = "rounded-[24px] border border-[#E6E9EE] bg-white p-5 sm:p-8";

const rand = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
const ordinal = (y: string) => (y === "1" ? "1st" : y === "2" ? "2nd" : y === "3" ? "3rd" : "");

type Loaded = { user: User; app: MyApplication | null; draft: ApplicationDraft; step: number; fromDraft: boolean };

export function ApplyFlow() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace(`/sign-in?next=${encodeURIComponent(APPLY_PATH)}`); return; }
    const user = auth.user;
    try {
      const [appRes, draftRes, profile] = await Promise.all([
        supabase.rpc("my_career_application"),
        supabase.from("career_application_drafts").select("step, data").eq("user_id", user.id).maybeSingle(),
        loadMemberProfile(supabase, user).then((r) => r.profile).catch(() => null),
      ]);
      if (appRes.error) throw new Error(appRes.error.message);
      const app = (appRes.data as MyApplication | null) ?? null;
      let draft: ApplicationDraft;
      let step = 0;
      let fromDraft = false;
      if (draftRes.data?.data && Object.keys(draftRes.data.data as object).length) {
        draft = sanitizeDraft(draftRes.data.data);
        step = Math.min(Math.max(draftRes.data.step ?? 0, 0), STEPS.length - 1);
        fromDraft = true;
      } else if (app) {
        draft = fromApplication(app);
      } else {
        // Reuse what the member already told IELSco (Elco-Pass profile) so they don't type it twice.
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        draft = {
          ...EMPTY_DRAFT, tasks: {},
          full_name: String(meta.full_name ?? meta.name ?? profile?.display_name ?? "").slice(0, 120),
          instagram: profile?.instagram_url ?? "",
          linkedin_url: profile?.linkedin_url ?? "",
          portfolio_url: profile?.portfolio_url ?? "",
        };
      }
      setLoaded({ user, app, draft, step, fromDraft });
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [supabase, router]);
  useEffect(() => { load(); }, [load]);

  if (loadError) {
    return (
      <div className={cn(panel, "text-center")} role="alert" data-testid="apply-load-error">
        <p className="text-[18px] font-bold text-[#1A2534]">We couldn&apos;t load your application</p>
        <p className="mt-2 text-[15px] text-[#2F4157]/75">Please check your connection and try again.</p>
        <button type="button" onClick={load} className={cn(btnPrimary, "mt-6")}>Try again</button>
      </div>
    );
  }
  if (!loaded) return <div className="flex justify-center py-24" data-testid="apply-loading"><Loader2 className="h-7 w-7 animate-spin text-[#2F4157]" aria-label="Loading" /></div>;

  const phase = recruitmentPhase();
  if (loaded.app && !editing) {
    return <ApplicationStatus app={loaded.app} supabase={supabase} onEdit={loaded.app.editable ? () => setEditing(true) : undefined} />;
  }
  if (phase !== "open") {
    return (
      <div className={panel} data-testid={phase === "upcoming" ? "apply-upcoming" : "apply-closed"}>
        <p className="text-[22px] font-bold text-[#1A2534]">{phase === "upcoming" ? `Applications open on ${RECRUITMENT.opensLabel}` : "Applications for 2027 are closed"}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-[#2F4157]/75">
          {phase === "upcoming" ? `You can apply here from ${RECRUITMENT.opensLabel} until ${RECRUITMENT.closesLabel}, 23:59 WIB.` : `Applications closed on ${RECRUITMENT.closesLabel}. We'll share the next intake on the careers page.`}
        </p>
        <Link href="/careers" className={cn(btnSecondary, "mt-6")}>Back to Careers</Link>
      </div>
    );
  }
  return (
    <Wizard
      supabase={supabase} user={loaded.user} initial={loaded.draft} initialStep={loaded.step} fromDraft={loaded.fromDraft}
      updating={!!loaded.app} onCancelEdit={loaded.app ? () => setEditing(false) : undefined}
      onSubmitted={() => { setEditing(false); setLoaded(null); load(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
    />
  );
}

function fromApplication(a: MyApplication): ApplicationDraft {
  return {
    ...EMPTY_DRAFT,
    full_name: a.full_name, whatsapp: a.whatsapp, university: a.university, academic_year: String(a.academic_year),
    batch_year: a.batch_year ? String(a.batch_year) : "", role_id: a.role_id ?? "", role_2_id: a.role_2_id ?? "",
    instagram: a.instagram_url, linkedin_url: a.linkedin_url, motivation: a.motivation ?? "",
    portfolio_mode: a.portfolio_path ? "file" : "link", portfolio_url: a.portfolio_url ?? "",
    cv_path: a.cv_path, cv_name: "CV already on your application.pdf", portfolio_path: a.portfolio_path ?? "",
    portfolio_name: a.portfolio_path ? "Portfolio already on your application.pdf" : "",
    tasks: Object.fromEntries(TASK_KEYS.map((k) => [k, true])), privacy: false, declaration: false,
  };
}

// ── Wizard ────────────────────────────────────────────────────────────────────────────────────────────────────────
function Wizard({ supabase, user, initial, initialStep, fromDraft, updating, onCancelEdit, onSubmitted }: {
  supabase: SupabaseClient; user: User; initial: ApplicationDraft; initialStep: number; fromDraft: boolean; updating: boolean;
  onCancelEdit?: () => void; onSubmitted: () => void;
}) {
  const [d, setD] = useState<ApplicationDraft>(initial);
  const [step, setStep] = useState(initialStep);
  const [errors, setErrors] = useState<Errors>({});
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">(fromDraft ? "saved" : "idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const dirty = useRef(false);
  const stepId = STEPS[step].id as StepId;

  const set = <K extends keyof ApplicationDraft>(k: K, v: ApplicationDraft[K]) => {
    dirty.current = true;
    setD((cur) => ({ ...cur, [k]: v }));
    setErrors((e) => { if (!e[k as string]) return e; const n = { ...e }; delete n[k as string]; return n; });
  };

  // Saved progress: the draft row is written a moment after each change, and on every step change.
  const persist = useCallback(async (draft: ApplicationDraft, s: number) => {
    setSave("saving");
    const { error } = await supabase.from("career_application_drafts").upsert({ user_id: user.id, cohort: RECRUITMENT.cohort, step: s, data: draft }, { onConflict: "user_id" });
    setSave(error ? "error" : "saved");
  }, [supabase, user.id]);
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => persist(d, step), 1200);
    return () => clearTimeout(t);
  }, [d, step, persist]);

  const go = (next: number) => {
    setStep(next);
    dirty.current = true;
    setSubmitError(null);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const nextStep = () => {
    const e = validateStep(stepId, d, ROLE_IDS, TASK_KEYS);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => (document.querySelector("[aria-invalid=true], [data-error=true]") as HTMLElement | null)?.focus());
      return;
    }
    go(step + 1);
  };

  async function submit() {
    const e = validateStep("review", d, ROLE_IDS, TASK_KEYS);
    setErrors(e);
    if (Object.keys(e).length) {
      const firstBad = STEPS.findIndex((s) => Object.keys(validateStep(s.id as StepId, d, ROLE_IDS, TASK_KEYS)).length && s.id !== "review");
      if (firstBad >= 0 && firstBad !== step) { go(firstBad); setErrors(validateStep(STEPS[firstBad].id as StepId, d, ROLE_IDS, TASK_KEYS)); }
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.rpc("submit_my_career_application", {
      p_full_name: d.full_name.trim(), p_whatsapp: d.whatsapp, p_university: d.university.trim(), p_academic_year: Number(d.academic_year),
      p_batch_year: d.batch_year ? Number(d.batch_year) : null, p_role_id: d.role_id, p_role_2_id: d.role_2_id || null,
      p_instagram: d.instagram, p_linkedin_url: d.linkedin_url, p_cv_path: d.cv_path,
      p_portfolio_path: d.portfolio_mode === "file" ? d.portfolio_path || null : null,
      p_portfolio_url: d.portfolio_mode === "link" ? d.portfolio_url.trim() : null, p_motivation: d.motivation.trim(),
      p_tasks_confirmed: TASK_KEYS.every((k) => d.tasks[k]), p_privacy_accepted: d.privacy, p_declaration_accepted: d.declaration,
    });
    setSubmitting(false);
    if (error) {
      const x = explainSubmitError(error.message);
      setSubmitError(x.text);
      if (x.step) { const i = STEPS.findIndex((s) => s.id === x.step); if (i >= 0 && i !== step) setStep(i); }
      return;
    }
    track("career_application_submitted", { roles: d.role_2_id ? 2 : 1, updated: updating });
    onSubmitted();
  }

  return (
    <div ref={topRef} className="scroll-mt-24" data-testid="apply-wizard">
      <Progress step={step} onJump={(i) => i < step && go(i)} save={save} />
      {fromDraft && step === initialStep && (
        <p className="mb-4 rounded-[14px] bg-[#EEF2F7] px-4 py-3 text-[14px] text-[#2F4157]" data-testid="apply-resumed">Welcome back. We saved your progress, so you can carry on where you left off.</p>
      )}
      {updating && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E6E9EE] bg-[#F7F8FA] px-4 py-3 text-[14px] text-[#2F4157]" data-testid="apply-updating">
          <span>You&apos;re changing your submitted application. Submit again to save the changes.</span>
          {onCancelEdit && <button type="button" onClick={onCancelEdit} className="font-semibold underline">Cancel changes</button>}
        </div>
      )}
      <div className={panel}>
        {stepId === "account" && <AccountStep supabase={supabase} user={user} />}
        {stepId === "about" && <AboutStep d={d} set={set} errors={errors} email={user.email ?? ""} />}
        {stepId === "roles" && <RolesStep d={d} set={set} errors={errors} />}
        {stepId === "profiles" && <ProfilesStep d={d} set={set} errors={errors} supabase={supabase} userId={user.id} setErrors={setErrors} />}
        {stepId === "tasks" && <TasksStep d={d} set={set} errors={errors} />}
        {stepId === "review" && <ReviewStep d={d} set={set} errors={errors} email={user.email ?? ""} onEdit={go} supabase={supabase} />}

        {submitError && <p className="mt-6 rounded-[12px] bg-[#FDF1F1] px-4 py-3 text-[15px] text-[#A23B3D]" role="alert" data-testid="apply-submit-error">{submitError}</p>}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E6E9EE] pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? <button type="button" onClick={() => go(step - 1)} className={btnSecondary} data-testid="apply-back"><ArrowLeft size={18} aria-hidden="true" /> Back</button> : <span />}
          {stepId !== "review"
            ? <button type="button" onClick={nextStep} className={btnPrimary} data-testid="apply-next">{stepId === "account" ? "Start application" : "Continue"} <ArrowRight size={18} aria-hidden="true" /></button>
            : <button type="button" onClick={submit} disabled={submitting} className={btnPrimary} data-testid="apply-submit">
                {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {submitting ? "Sending…" : updating ? "Save changes" : "Submit application"}
              </button>}
        </div>
      </div>
    </div>
  );
}

function Progress({ step, onJump, save }: { step: number; onJump: (i: number) => void; save: "idle" | "saving" | "saved" | "error" }) {
  return (
    <div className="mb-6" data-testid="apply-progress">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-[#577E90]">Step {step + 1} of {STEPS.length} · {STEPS[step].title}</p>
        <p className="flex items-center gap-1.5 text-[13px] text-[#2F4157]/60" aria-live="polite" data-testid="apply-save-state">
          {save === "saving" && <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…</>}
          {save === "saved" && <><Cloud size={14} aria-hidden="true" /> Progress saved</>}
          {save === "error" && <><CloudOff size={14} aria-hidden="true" /> Not saved, check your connection</>}
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Application progress">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button type="button" onClick={() => onJump(i)} disabled={i >= step} aria-current={i === step ? "step" : undefined}
              className={cn("group block w-full text-left disabled:cursor-default", focus)} aria-label={`${s.title}${i < step ? " (done, go back)" : ""}`}>
              <span className={cn("block h-1.5 rounded-full transition-colors", i < step ? "bg-[#2F4157]" : i === step ? "bg-[#577E90]" : "bg-[#E6E9EE]")} />
              <span className={cn("mt-2 hidden text-[12px] font-semibold lg:block", i <= step ? "text-[#1A2534]" : "text-[#2F4157]/45")}>{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

type StepProps = { d: ApplicationDraft; set: <K extends keyof ApplicationDraft>(k: K, v: ApplicationDraft[K]) => void; errors: Errors };
const Err = ({ id, msg }: { id: string; msg?: string }) => (msg ? <span id={id} className={errText} role="alert">{msg}</span> : null);
const StepTitle = ({ title, text }: { title: string; text: string }) => (
  <div className="mb-6"><h2 className="text-[24px] font-bold leading-tight text-[#1A2534] sm:text-[28px]">{title}</h2><p className="mt-2 text-[16px] leading-relaxed text-[#2F4157]/75">{text}</p></div>
);

// ── Step 1: Elco-Pass account + optional Elco link ────────────────────────────────────────────────────────────────
function AccountStep({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  const { elco } = useElcoState(supabase);
  return (
    <div data-testid="apply-step-account">
      <StepTitle title="Your Elco-Pass" text="You apply with your Elco-Pass, the one account you use across IELSco and Elco AI. Your email comes from it, and you can follow your application here after you submit." />
      <div className="flex items-start gap-4 rounded-[18px] border border-[#E6E9EE] bg-[#F7F8FA] p-4 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-white"><ShieldCheck size={20} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#1A2534]">Signed in</p>
          <p className="truncate text-[15px] text-[#2F4157]/80" data-testid="apply-account-email">{user.email}</p>
          <p className="mt-1 text-[13px] text-[#2F4157]/60">Not you? <a href="/sign-in" onClick={async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.assign(`/sign-in?next=${encodeURIComponent(APPLY_PATH)}`); }} className="font-semibold underline">Sign in with another account</a></p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-4 rounded-[18px] border border-[#E6E9EE] p-4 sm:p-5" data-testid="apply-elco-link">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF2F7]"><Image src="/images/contents/mascot/elco.svg" alt="" width={30} height={30} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#1A2534]">Elco AI account <span className="font-normal text-[#2F4157]/60">(optional)</span></p>
          {!elco ? <p className="text-[14px] text-[#2F4157]/60">Checking…</p> : elco.linked ? (
            <p className="flex items-center gap-1.5 text-[15px] text-[#2D7A58]" data-testid="apply-elco-linked"><CheckCircle2 size={16} aria-hidden="true" /> Connected{elco.elco_display_name ? ` as ${elco.elco_display_name}` : ""}</p>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed text-[#2F4157]/75">Already learning on Elco AI? Connect it to your IELSco account. You confirm on both sides, nothing is matched by email, and you can disconnect at any time. It doesn&apos;t affect your application.</p>
              <a href={ELCO_LINK_URL} className={cn("mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157] underline-offset-4 hover:underline", focus)} data-testid="apply-elco-connect"><Link2 size={16} aria-hidden="true" /> Connect Elco account</a>
              <p className="mt-1 text-[13px] text-[#2F4157]/60">You&apos;ll return to IELSco Settings afterwards. Your answers stay saved: come back with Apply Now on your dashboard.</p>
            </>
          )}
        </div>
      </div>
      <ul className="mt-6 space-y-2 text-[15px] text-[#2F4157]/80">
        <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" /> About 10 minutes. Your progress is saved as you go.</li>
        <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" /> Have your CV ready as a PDF (up to 10 MB), and your portfolio as a PDF or a link.</li>
        <li className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" /> We never ask for your ID card, date of birth or home address.</li>
      </ul>
    </div>
  );
}

// ── Step 2: About you ─────────────────────────────────────────────────────────────────────────────────────────────
function AboutStep({ d, set, errors, email }: StepProps & { email: string }) {
  return (
    <div data-testid="apply-step-about">
      <StepTitle title="About you" text="We've filled in what we already know from your Elco-Pass. Please check it." />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Full name
          <input value={d.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} autoComplete="name" className={input} aria-invalid={!!errors.full_name} aria-describedby="e-name" data-testid="f-full-name" />
          <Err id="e-name" msg={errors.full_name} />
        </label>
        <label className={label}>Email
          <input value={email} readOnly className={cn(input, "bg-[#F7F8FA] text-[#2F4157]/75")} aria-describedby="h-email" data-testid="f-email" />
          <span id="h-email" className={hint}>From your Elco-Pass. All updates go here.</span>
        </label>
        <label className={label}>WhatsApp number
          <input value={d.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} type="tel" inputMode="tel" maxLength={24} autoComplete="tel" placeholder="+62 812 3456 7890" className={input} aria-invalid={!!errors.whatsapp} aria-describedby="e-wa" data-testid="f-whatsapp" />
          <Err id="e-wa" msg={errors.whatsapp} />
        </label>
        <label className={label}>University
          <input value={d.university} onChange={(e) => set("university", e.target.value)} maxLength={200} autoComplete="organization" className={input} aria-invalid={!!errors.university} aria-describedby="e-uni" data-testid="f-university" />
          <Err id="e-uni" msg={errors.university} />
        </label>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-[1.4fr_1fr]">
        <div role="radiogroup" aria-labelledby="year-label" aria-describedby="e-year" data-error={!!errors.academic_year} tabIndex={errors.academic_year ? -1 : undefined}>
          <p id="year-label" className={label}>Current year of study</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["1", "2", "3"].map((y) => (
              <label key={y} className="flex min-h-[48px] cursor-pointer items-center justify-center rounded-[14px] border border-[#D5DBE3] px-3 text-[15px] font-semibold text-[#2F4157] has-[:checked]:border-[#2F4157] has-[:checked]:bg-[#EEF2F7] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90]">
                <input type="radio" name="academic_year" value={y} checked={d.academic_year === y} onChange={() => set("academic_year", y)} className="sr-only" data-testid={`f-year-${y}`} />{ordinal(y)} year
              </label>
            ))}
          </div>
          <Err id="e-year" msg={errors.academic_year} />
        </div>
        <label className={label}>Batch (year you started) <span className="font-normal text-[#2F4157]/60">(optional)</span>
          <input value={d.batch_year} onChange={(e) => set("batch_year", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2024" className={input} aria-invalid={!!errors.batch_year} aria-describedby="e-batch" data-testid="f-batch" />
          <Err id="e-batch" msg={errors.batch_year} />
        </label>
      </div>
    </div>
  );
}

// ── Step 3: Roles (1–2, by position) ──────────────────────────────────────────────────────────────────────────────
function RolesStep({ d, set, errors }: StepProps) {
  const pick = (id: string) => {
    if (d.role_id === id) { set("role_id", d.role_2_id); set("role_2_id", ""); return; }
    if (d.role_2_id === id) { set("role_2_id", ""); return; }
    if (!d.role_id) { set("role_id", id); return; }
    set("role_2_id", id);
  };
  const swap = () => { const a = d.role_id; set("role_id", d.role_2_id); set("role_2_id", a); };
  const r1 = roleById(d.role_id), r2 = roleById(d.role_2_id);
  return (
    <div data-testid="apply-step-roles">
      <StepTitle title="Choose your roles" text={`Pick one role, or two if you'd be happy in either. Choose by position: the two can be in different divisions. All ${ROLE_COUNT} roles are below.`} />
      <div className="sticky top-[64px] z-10 -mx-2 mb-5 grid gap-2 border-b border-[#E6E9EE] bg-white px-2 pb-3 pt-2 sm:grid-cols-2" aria-live="polite" data-testid="role-choices">
        {[{ r: r1, n: "1st choice", e: errors.role_id }, { r: r2, n: "2nd choice (optional)", e: errors.role_2_id }].map((c) => (
          <div key={c.n} className={cn("flex min-h-[52px] items-center justify-between gap-2 rounded-[14px] border px-3 py-1.5 sm:px-4", c.r ? "border-[#2F4157] bg-[#EEF2F7]" : "border-dashed border-[#C9D1DC]", c.e && "border-[#C04C4E]")} data-error={!!c.e} tabIndex={c.e ? -1 : undefined}>
            <span className="min-w-0"><span className="block text-[12px] font-semibold uppercase tracking-wide text-[#577E90]">{c.n}</span><span className="block truncate text-[15px] font-semibold text-[#1A2534]">{c.r ? `${c.r.title} · ${c.r.divisionTitle}` : "Not chosen"}</span></span>
            {c.r && <button type="button" onClick={() => pick(c.r!.id)} className={cn("rounded-full p-1.5 text-[#2F4157] hover:bg-white", focus)} aria-label={`Remove ${c.r.title}`}><X size={16} aria-hidden="true" /></button>}
          </div>
        ))}
        {r1 && r2 && <button type="button" onClick={swap} className="justify-self-start text-[13px] font-semibold text-[#577E90] underline sm:col-span-2">Swap 1st and 2nd choice</button>}
        {(errors.role_id || errors.role_2_id) && <span className={cn(errText, "sm:col-span-2")} role="alert">{errors.role_id || errors.role_2_id}</span>}
      </div>
      <div className="space-y-7">
        {(["arbadza", "farrel"] as LeadKey[]).map((lead) => divisions.filter((x) => x.lead === lead).map((div) => (
          <fieldset key={div.slug}>
            <legend className="flex w-full items-baseline justify-between gap-3 text-[17px] font-bold text-[#1A2534]">{div.title}<span className="text-[12px] font-medium text-[#2F4157]/55">Led by {lead === "farrel" ? "Farrel" : "Arbadza"}</span></legend>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {div.roles.map((r) => {
                const rank = d.role_id === r.id ? 1 : d.role_2_id === r.id ? 2 : 0;
                const full = !rank && !!d.role_id && !!d.role_2_id;
                return (
                  <button key={r.id} type="button" onClick={() => pick(r.id)} aria-pressed={!!rank} data-testid={`role-option-${r.id}`}
                    className={cn("relative flex h-full flex-col rounded-[16px] border p-4 text-left transition-colors", focus, rank ? "border-[#2F4157] bg-[#EEF2F7]" : "border-[#E6E9EE] hover:border-[#B8C2CF]", full && "opacity-80")}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[16px] font-bold text-[#1A2534]">{r.title}{r.isNew && <span className="ml-2 rounded-full bg-[#F9E15B] px-2 py-0.5 align-middle text-[11px] font-bold uppercase text-[#1A2534]">New</span>}</span>
                      {rank ? <span className="shrink-0 rounded-full bg-[#2F4157] px-2.5 py-0.5 text-[12px] font-bold text-white">{rank === 1 ? "1st" : "2nd"}</span> : null}
                    </span>
                    <span className="mt-1 text-[13px] text-[#2F4157]/60">{r.scope}</span>
                    <span className="mt-2 text-[14px] leading-relaxed text-[#2F4157]/80">{r.summary}</span>
                    {full && <span className="mt-2 text-[12px] font-semibold text-[#577E90]">Replaces your 2nd choice</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )))}
      </div>
      <p className="mt-6 text-[14px] text-[#2F4157]/65">Want the details first? <Link href="/careers#divisions" target="_blank" className="font-semibold underline">Role descriptions</Link> open in a new tab.</p>
    </div>
  );
}

// ── Step 4: Profiles, motivation, documents ───────────────────────────────────────────────────────────────────────
function ProfilesStep({ d, set, errors, supabase, userId, setErrors }: StepProps & { supabase: SupabaseClient; userId: string; setErrors: (f: (e: Errors) => Errors) => void }) {
  const [busy, setBusy] = useState<"cv" | "portfolio" | null>(null);
  const upload = async (kind: "cv" | "portfolio", f: File | null) => {
    const key = kind === "cv" ? "cv" : "portfolio";
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setErrors((e) => ({ ...e, [key]: `${f.name} isn't a PDF. Please export it as PDF first.` }));
    if (f.size > MAX_FILE_BYTES) return setErrors((e) => ({ ...e, [key]: `${f.name} is larger than 10 MB. Please compress it${kind === "portfolio" ? " or share a link instead" : ""}.` }));
    setBusy(kind);
    const path = `applicants/${userId}/${kind}-${rand()}.pdf`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: "application/pdf", upsert: false });
    setBusy(null);
    if (error) return setErrors((e) => ({ ...e, [key]: /row-level|policy/i.test(error.message) ? "Uploads are closed right now." : `Uploading ${f.name} failed. Please check your connection and try again.` }));
    if (kind === "cv") { set("cv_path", path); set("cv_name", f.name); } else { set("portfolio_path", path); set("portfolio_name", f.name); }
  };
  const ig = instagramHandle(d.instagram);
  const li = linkedinUrl(d.linkedin_url);
  return (
    <div data-testid="apply-step-profiles">
      <StepTitle title="Profiles and documents" text="We use your Instagram to check the campaign tasks and LinkedIn for your background. Keep your Instagram public until results are out." />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Instagram profile
          <input value={d.instagram} onChange={(e) => set("instagram", e.target.value)} maxLength={200} placeholder="https://www.instagram.com/yourname" className={input} aria-invalid={!!errors.instagram} aria-describedby="e-ig" data-testid="f-instagram" />
          {ig && !errors.instagram && <span className={hint}>We&apos;ll check @{ig}</span>}
          <Err id="e-ig" msg={errors.instagram} />
        </label>
        <label className={label}>LinkedIn profile
          <input value={d.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} maxLength={300} inputMode="url" placeholder="https://www.linkedin.com/in/yourname" className={input} aria-invalid={!!errors.linkedin_url} aria-describedby="e-li" data-testid="f-linkedin" />
          {li && !errors.linkedin_url && <span className={cn(hint, "truncate")}>{li}</span>}
          <Err id="e-li" msg={errors.linkedin_url} />
        </label>
      </div>
      <label className={cn(label, "mt-5")}>Why do you want to join, and why these roles?
        <textarea value={d.motivation} onChange={(e) => set("motivation", e.target.value)} rows={5} maxLength={MOTIVATION_MAX} className={input} aria-invalid={!!errors.motivation} aria-describedby="e-mot h-mot" data-testid="f-motivation" />
        <span id="h-mot" className={cn(hint, "flex justify-between")}><span>A few honest sentences are enough.</span><span>{d.motivation.trim().length}/{MOTIVATION_MAX}{d.motivation.trim().length < MOTIVATION_MIN ? ` · at least ${MOTIVATION_MIN}` : ""}</span></span>
        <Err id="e-mot" msg={errors.motivation} />
      </label>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <FileBox title="CV / résumé" help="Required · PDF, up to 10 MB" name={d.cv_name} busy={busy === "cv"} error={errors.cv} onFile={(f) => upload("cv", f)} onClear={() => { set("cv_path", ""); set("cv_name", ""); }} testId="f-cv" />
        <div>
          <p className={label} id="pf-label">Portfolio</p>
          <span className={hint}>Work you&apos;re proud of: designs, videos, writing, projects, events or class work.</span>
          <div className="mt-2 inline-flex rounded-full border border-[#D5DBE3] p-1" role="group" aria-labelledby="pf-label">
            {(["link", "file"] as const).map((m) => (
              <button key={m} type="button" onClick={() => set("portfolio_mode", m)} aria-pressed={d.portfolio_mode === m} data-testid={`pf-mode-${m}`}
                className={cn("rounded-full px-4 py-1.5 text-[14px] font-semibold", focus, d.portfolio_mode === m ? "bg-[#2F4157] text-white" : "text-[#2F4157]")}>{m === "file" ? "Upload PDF" : "Share a link"}</button>
            ))}
          </div>
          <div className="mt-3">
            {d.portfolio_mode === "file"
              ? <FileBox title="Portfolio PDF" help="PDF, up to 10 MB" name={d.portfolio_name} busy={busy === "portfolio"} error={errors.portfolio} onFile={(f) => upload("portfolio", f)} onClear={() => { set("portfolio_path", ""); set("portfolio_name", ""); }} testId="f-portfolio" />
              : <label className="block"><span className="sr-only">Portfolio link</span>
                  <input value={d.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} type="url" maxLength={500} placeholder="https://drive.google.com/…" className={cn(input, "mt-0")} aria-invalid={!!errors.portfolio_url} aria-describedby="e-pf" data-testid="f-portfolio-url" />
                  <span className={hint}>Google Drive, Behance, YouTube, a website… Make sure anyone with the link can view it.</span>
                  <Err id="e-pf" msg={errors.portfolio_url} />
                </label>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileBox({ title, help, name, busy, error, onFile, onClear, testId }: { title: string; help: string; name: string; busy: boolean; error?: string; onFile: (f: File | null) => void; onClear: () => void; testId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div data-error={!!error} tabIndex={error ? -1 : undefined}>
      <p className={label}>{title}</p>
      <span className={hint}>{help}</span>
      {name ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-[14px] border border-[#CFE3D8] bg-[#F3FAF6] px-4 py-3 text-[15px] text-[#1A2534]" data-testid={`${testId}-done`}>
          <span className="flex min-w-0 items-center gap-2"><FileText size={18} className="shrink-0 text-[#2D7A58]" aria-hidden="true" /><span className="truncate">{name}</span></span>
          <button type="button" onClick={() => { onClear(); if (ref.current) ref.current.value = ""; }} className={cn("shrink-0 text-[14px] font-semibold text-[#2F4157] underline", focus)}>Replace</button>
        </div>
      ) : (
        <label className={cn("mt-2 flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed px-4 py-4 text-center text-[15px] text-[#2F4157] hover:border-[#2F4157] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90]", error ? "border-[#C04C4E]" : "border-[#B8C2CF]")}>
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Upload size={20} aria-hidden="true" />}
          <span className="font-semibold">{busy ? "Uploading…" : "Choose a PDF"}</span>
          <input ref={ref} type="file" accept="application/pdf,.pdf" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0] ?? null)} data-testid={testId} aria-label={title} />
        </label>
      )}
      {error && <span className={errText} role="alert">{error}</span>}
    </div>
  );
}

// ── Step 5: Instagram campaign tasks ──────────────────────────────────────────────────────────────────────────────
export function taskLink(kind?: string): { href: string; label: string; download?: boolean } | null {
  const ig = RECRUITMENT.instagram;
  if (kind === "ielsco") return { href: ig.ielsco.url, label: ig.ielsco.handle };
  if (kind === "elco") return { href: ig.elco.url, label: ig.elco.handle };
  if (kind === "post") return ig.campaignPostUrl ? { href: ig.campaignPostUrl, label: "Open the campaign post" } : { href: ig.ielsco.url, label: `Find the post on ${ig.ielsco.handle}` };
  if (kind === "twibbon") return ig.twibbonUrl ? { href: ig.twibbonUrl, label: "Open the Twibbon / Add Yours" } : { href: ig.storyTemplate, label: "Download the recruitment Story", download: true };
  return null;
}

function TasksStep({ d, set, errors }: StepProps) {
  const done = TASK_KEYS.filter((k) => d.tasks[k]).length;
  return (
    <div data-testid="apply-step-tasks">
      <StepTitle title="Instagram campaign tasks" text="Complete all seven with the Instagram account you gave us, then tick each one. You don't need screenshots: the recruitment team checks them by hand on Instagram." />
      <p className="mb-3 text-[14px] font-semibold text-[#577E90]" aria-live="polite">{done} of {TASK_KEYS.length} done</p>
      <ol className="space-y-2.5" data-error={!!errors.tasks} tabIndex={errors.tasks ? -1 : undefined}>
        {CAMPAIGN_TASKS.map((t, i) => {
          const l = taskLink(t.link);
          const on = !!d.tasks[t.key];
          return (
            <li key={t.key} className={cn("flex items-start gap-3 rounded-[16px] border p-4 transition-colors", on ? "border-[#CFE3D8] bg-[#F3FAF6]" : "border-[#E6E9EE]")}>
              <input id={`task-${t.key}`} type="checkbox" checked={on} onChange={(e) => set("tasks", { ...d.tasks, [t.key]: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-[#2F4157]" data-testid={`task-${t.key}`} />
              <div className="min-w-0 flex-1">
                <label htmlFor={`task-${t.key}`} className="block cursor-pointer text-[16px] font-semibold text-[#1A2534]"><span className="text-[#577E90]">{i + 1}.</span> {t.title}</label>
                <p className="mt-0.5 text-[14px] leading-relaxed text-[#2F4157]/75">{t.detail}</p>
                {l && <a href={l.href} target={l.download ? undefined : "_blank"} rel="noopener noreferrer" download={l.download ? "IELSco-Elco-Recruitment-2027-Story.jpg" : undefined}
                  className={cn("mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2F4157] underline-offset-4 hover:underline", focus)}>
                  {l.download ? <Download size={15} aria-hidden="true" /> : <Instagram size={15} aria-hidden="true" />}{l.label}{!l.download && <ExternalLink size={13} aria-hidden="true" />}
                </a>}
              </div>
            </li>
          );
        })}
      </ol>
      {errors.tasks && <span className={errText} role="alert">{errors.tasks}</span>}
      <p className="mt-4 text-[13px] leading-relaxed text-[#2F4157]/60">Ticking a task means you&apos;ve done it. Each task is verified by hand and its result appears on your application status.</p>
    </div>
  );
}

// ── Step 6: Review, privacy notice and declaration ────────────────────────────────────────────────────────────────
function ReviewStep({ d, set, errors, email, onEdit, supabase }: StepProps & { email: string; onEdit: (i: number) => void; supabase: SupabaseClient }) {
  const r1 = roleById(d.role_id), r2 = roleById(d.role_2_id);
  const idx = (id: StepId) => STEPS.findIndex((s) => s.id === id);
  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid gap-0.5 py-2 sm:grid-cols-[180px_1fr] sm:gap-4"><dt className="text-[14px] text-[#2F4157]/60">{k}</dt><dd className="min-w-0 break-words text-[15px] text-[#1A2534]">{v}</dd></div>;
  const Section = ({ title, step, children }: { title: string; step: StepId; children: React.ReactNode }) => (
    <section className="border-b border-[#E6E9EE] py-4 last:border-0">
      <div className="flex items-center justify-between"><h3 className="text-[16px] font-bold text-[#1A2534]">{title}</h3><button type="button" onClick={() => onEdit(idx(step))} className={cn("inline-flex items-center gap-1 text-[14px] font-semibold text-[#577E90] hover:text-[#2F4157]", focus)} data-testid={`review-edit-${step}`}><Pencil size={14} aria-hidden="true" /> Edit</button></div>
      <dl className="mt-1">{children}</dl>
    </section>
  );
  return (
    <div data-testid="apply-step-review">
      <StepTitle title="Review and submit" text="Check your answers, read the privacy notice and confirm the declaration." />
      <div className="rounded-[18px] border border-[#E6E9EE] px-4 sm:px-5" data-testid="apply-review">
        <Section title="About you" step="about">
          <Row k="Full name" v={d.full_name} /><Row k="Email" v={email} /><Row k="WhatsApp" v={normalizeWhatsapp(d.whatsapp) ?? d.whatsapp} /><Row k="University" v={d.university} />
          <Row k="Year" v={`${ordinal(d.academic_year)} year${d.batch_year ? ` · batch ${d.batch_year}` : ""}`} />
        </Section>
        <Section title="Roles" step="roles">
          <Row k="1st choice" v={r1 ? `${r1.title} · ${r1.divisionTitle}` : "—"} /><Row k="2nd choice" v={r2 ? `${r2.title} · ${r2.divisionTitle}` : "None"} />
        </Section>
        <Section title="Profiles and documents" step="profiles">
          <Row k="Instagram" v={instagramHandle(d.instagram) ? `@${instagramHandle(d.instagram)}` : d.instagram} /><Row k="LinkedIn" v={linkedinUrl(d.linkedin_url) ?? d.linkedin_url} />
          <Row k="CV" v={d.cv_path.startsWith("applicants/") ? <button type="button" onClick={() => openFile(d.cv_path)} className="font-semibold underline">{d.cv_name || "CV (PDF)"}</button> : d.cv_name} />
          <Row k="Portfolio" v={d.portfolio_mode === "link" ? d.portfolio_url : d.portfolio_path.startsWith("applicants/") ? <button type="button" onClick={() => openFile(d.portfolio_path)} className="font-semibold underline">{d.portfolio_name || "Portfolio (PDF)"}</button> : d.portfolio_name} />
          <Row k="Motivation" v={<span className="whitespace-pre-line">{d.motivation}</span>} />
        </Section>
        <Section title="Campaign tasks" step="tasks">
          <Row k="Confirmed" v={`${TASK_KEYS.filter((k) => d.tasks[k]).length} of ${TASK_KEYS.length}`} />
        </Section>
      </div>

      <div className="mt-6 rounded-[18px] bg-[#F7F8FA] p-4 text-[14px] leading-relaxed text-[#2F4157]/85 sm:p-5" data-testid="privacy-notice">
        <p className="text-[15px] font-bold text-[#1A2534]">Privacy notice</p>
        <p className="mt-2">IELSco (PT English Space Berkah Indonesia) and Elco AI (PT Elco Edukasi Berkah Indonesia) use the details and documents in this application only to run the 2027 recruitment: to assess your application, check the Instagram campaign tasks, contact you about sessions and decisions, and onboard you if you join. Your CV and portfolio are stored privately and opened only by the recruitment team. We don&apos;t ask for your ID card, date of birth or home address. You can ask us to correct or delete your application at <a className="font-semibold underline" href="mailto:careers@ielsco.com">careers@ielsco.com</a>. More in our <Link className="font-semibold underline" href="/privacy-policy" target="_blank">privacy policy</Link>.</p>
      </div>
      <div className="mt-4 space-y-3">
        <label className={cn("flex gap-3 rounded-[14px] border p-4 text-[15px] leading-relaxed text-[#2F4157]", errors.privacy ? "border-[#C04C4E]" : "border-[#E6E9EE]")}>
          <input type="checkbox" checked={d.privacy} onChange={(e) => set("privacy", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#2F4157]" aria-invalid={!!errors.privacy} data-testid="f-privacy" />
          <span>I have read the privacy notice.</span>
        </label>
        {errors.privacy && <span className={errText} role="alert">{errors.privacy}</span>}
        <label className={cn("flex gap-3 rounded-[14px] border p-4 text-[15px] leading-relaxed text-[#2F4157]", errors.declaration ? "border-[#C04C4E]" : "border-[#E6E9EE]")}>
          <input type="checkbox" checked={d.declaration} onChange={(e) => set("declaration", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#2F4157]" aria-invalid={!!errors.declaration} data-testid="f-declaration" />
          <span><span className="font-semibold text-[#1A2534]">Applicant declaration.</span> I confirm that:
            <ul className="mt-2 list-disc space-y-1 pl-5">{DECLARATION.map((x) => <li key={x}>{x}</li>)}</ul>
          </span>
        </label>
        {errors.declaration && <span className={errText} role="alert">{errors.declaration}</span>}
      </div>
    </div>
  );
}

export default ApplyFlow;

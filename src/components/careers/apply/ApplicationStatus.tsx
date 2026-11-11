"use client";

import Image from "next/image";
import { useLocalFormat } from "@/components/time/TimeZoneProvider";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, Circle, Clock, FileText, Mail, Pencil, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleById } from "@/data/careers/divisions";
import { countryName } from "@/lib/dashboard/countries";
import { CAMPAIGN_TASKS, RECRUITMENT, STATUS_COPY } from "@/data/careers/recruitment";

// The applicant's own application (from public.my_career_application(): no admin notes) with its status, the per-task
// Instagram verification and the next dates. Shown right after submitting and whenever they come back.
export type MyApplication = {
  id: string; full_name: string; email: string; whatsapp: string; university: string; academic_year: number; batch_year: number | null;
  domicile_country: string | null; domicile_city: string | null;
  division: string; role_id: string | null; role_2_id: string | null; instagram_url: string; linkedin_url: string; cv_path: string;
  portfolio_path: string | null; portfolio_url: string | null; motivation: string | null; status: string; campaign_verification: string;
  campaign_tasks: Record<string, string>; tasks_confirmed_at: string | null; privacy_accepted_at: string | null;
  declaration_accepted_at: string | null; submitted_at: string; updated_at: string; editable: boolean;
};

const STAGES = [
  { key: "submitted", label: "Submitted", when: `By ${RECRUITMENT.closesLabel}` },
  { key: "review", label: "Campaign check & review", when: "From 30 Nov" },
  { key: "session", label: "Group session", when: "1 – 4 Dec" },
  { key: "decision", label: "Decision", when: "9 Dec" },
];
const stageIndex = (status: string) =>
  ({ submitted: 0, under_review: 1, invited: 2, shortlisted: 2, accepted: 3, reserve: 3, rejected: 3, withdrawn: 0 } as Record<string, number>)[status] ?? 0;

export function ApplicationStatus({ app, supabase, onEdit }: { app: MyApplication; supabase: SupabaseClient; onEdit?: () => void }) {
  const fmt = useLocalFormat();
  const copy = STATUS_COPY[app.status] ?? STATUS_COPY.submitted;
  const at = stageIndex(app.status);
  const r1 = roleById(app.role_id), r2 = roleById(app.role_2_id);
  const open = async (path: string) => {
    const { data } = await supabase.storage.from("career-applications").createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const ownFile = (p: string | null) => !!p && p.startsWith("applicants/");
  return (
    <div className="space-y-5" data-testid="application-status">
      <section className="overflow-hidden rounded-[24px] bg-[#2F4157] text-white">
        <div className="flex items-start gap-5 p-6 sm:p-8">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">{RECRUITMENT.cohortName}</p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight sm:text-[34px]">{app.status === "submitted" ? "Application received" : copy.label}</h1>
            <p className="mt-2 max-w-[560px] text-[16px] leading-relaxed text-white/80" data-testid="application-status-text">{copy.text}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold" data-testid="application-status-pill">Status: {copy.label}</p>
          </div>
          <Image src="/images/contents/mascot/poses/happy.png" alt="" width={112} height={112} className="hidden h-[112px] w-[112px] shrink-0 object-contain sm:block" />
        </div>
        <ol className="grid grid-cols-4 border-t border-white/10" aria-label="Recruitment stages">
          {STAGES.map((s, i) => (
            <li key={s.key} className={cn("px-3 py-4 sm:px-5", i > 0 && "border-l border-white/10")} aria-current={i === at ? "step" : undefined}>
              <span className={cn("block h-1 rounded-full", i <= at ? "bg-[#F9E15B]" : "bg-white/15")} />
              <span className={cn("mt-2 block text-[12px] font-semibold sm:text-[14px]", i <= at ? "text-white" : "text-white/55")}>{s.label}</span>
              <span className="block text-[11px] text-white/55 sm:text-[12px]">{s.when}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[24px] border border-[#E6E9EE] bg-white p-5 sm:p-7" data-testid="application-tasks">
        <h2 className="text-[18px] font-bold text-[#1A2534]">Instagram campaign tasks</h2>
        <p className="mt-1 text-[14px] text-[#2F4157]/70">Checked by hand on <a className="font-semibold underline" href={app.instagram_url} target="_blank" rel="noopener noreferrer">{app.instagram_url.replace("https://www.instagram.com/", "@").replace(/\/$/, "")}</a>. Keep your account public and the Story and repost up until results are out.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {CAMPAIGN_TASKS.map((t) => {
            const s = app.campaign_tasks?.[t.key] ?? "pending";
            return (
              <li key={t.key} className="flex items-center gap-2.5 rounded-[14px] border border-[#E6E9EE] px-3.5 py-2.5 text-[14px]" data-testid={`status-task-${t.key}`}>
                {s === "verified" ? <CheckCircle2 size={18} className="shrink-0 text-[#2D7A58]" aria-hidden="true" /> : s === "not_found" ? <XCircle size={18} className="shrink-0 text-[#C04C4E]" aria-hidden="true" /> : <Clock size={18} className="shrink-0 text-[#577E90]" aria-hidden="true" />}
                <span className="min-w-0 flex-1 text-[#1A2534]">{t.title}</span>
                <span className={cn("shrink-0 text-[12px] font-semibold", s === "verified" ? "text-[#2D7A58]" : s === "not_found" ? "text-[#C04C4E]" : "text-[#2F4157]/55")}>{s === "verified" ? "Verified" : s === "not_found" ? "Not found" : "To be checked"}</span>
              </li>
            );
          })}
        </ul>
        {Object.values(app.campaign_tasks ?? {}).includes("not_found") && <p className="mt-3 text-[14px] text-[#A23B3D]">A task marked &ldquo;Not found&rdquo; couldn&apos;t be seen on your profile. Please complete it and email careers@ielsco.com.</p>}
      </section>

      <section className="rounded-[24px] border border-[#E6E9EE] bg-white p-5 sm:p-7" data-testid="application-summary">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold text-[#1A2534]">Your application</h2>
          {onEdit && <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DBE3] px-4 py-2 text-[14px] font-semibold text-[#2F4157] hover:border-[#2F4157]" data-testid="application-edit"><Pencil size={14} aria-hidden="true" /> Change application</button>}
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
          <div><dt className="text-[13px] text-[#2F4157]/60">1st choice</dt><dd className="font-semibold text-[#1A2534]" data-testid="application-role-1">{r1 ? `${r1.title} · ${r1.divisionTitle}` : "—"}</dd></div>
          <div><dt className="text-[13px] text-[#2F4157]/60">2nd choice</dt><dd className="font-semibold text-[#1A2534]" data-testid="application-role-2">{r2 ? `${r2.title} · ${r2.divisionTitle}` : "None"}</dd></div>
          <div><dt className="text-[13px] text-[#2F4157]/60">Name</dt><dd className="text-[#1A2534]">{app.full_name}</dd></div>
          <div><dt className="text-[13px] text-[#2F4157]/60">Lives in</dt><dd className="text-[#1A2534]" data-testid="application-domicile">{app.domicile_city ? `${app.domicile_city}, ${app.domicile_country ? countryName(app.domicile_country) : ""}` : "Not given yet"}</dd></div>
          <div><dt className="text-[13px] text-[#2F4157]/60">University</dt><dd className="text-[#1A2534]">{app.university} · year {app.academic_year}{app.batch_year ? ` · batch ${app.batch_year}` : ""}</dd></div>
          <div><dt className="text-[13px] text-[#2F4157]/60">Documents</dt><dd className="flex flex-wrap gap-x-3 text-[#1A2534]">
            {ownFile(app.cv_path) ? <button type="button" onClick={() => open(app.cv_path)} className="inline-flex items-center gap-1 font-semibold underline"><FileText size={14} aria-hidden="true" />CV</button> : <span>CV received</span>}
            {app.portfolio_url ? <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Portfolio link</a> : ownFile(app.portfolio_path) ? <button type="button" onClick={() => open(app.portfolio_path!)} className="font-semibold underline">Portfolio</button> : app.portfolio_path ? <span>Portfolio received</span> : null}
          </dd></div>
          <div><dt className="text-[13px] text-[#2F4157]/60">Submitted</dt><dd className="text-[#1A2534]" data-testid="application-submitted-at">{fmt.dateTime(app.submitted_at)}{app.updated_at && app.updated_at !== app.submitted_at ? <span className="block text-[13px] text-[#2F4157]/60">Last updated {fmt.dateTime(app.updated_at)}</span> : null}</dd></div>
        </dl>
        {!onEdit && app.status === "submitted" && <p className="mt-4 text-[13px] text-[#2F4157]/60">Applications are closed, so it can&apos;t be changed here any more.</p>}
      </section>

      <section className="flex flex-col gap-4 rounded-[24px] bg-[#F7F8FA] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="text-[16px] font-bold text-[#1A2534]">What happens next</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[#2F4157]/75">On 30 November everyone with a complete application gets the group-session schedule at <strong className="text-[#1A2534]">{app.email}</strong>. Check your spam folder too.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a href="mailto:careers@ielsco.com" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157] underline-offset-4 hover:underline"><Mail size={16} aria-hidden="true" />careers@ielsco.com</a>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#577E90] hover:text-[#2F4157]"><Circle size={8} aria-hidden="true" className="fill-current" />Go to your dashboard</Link>
        </div>
      </section>
    </div>
  );
}

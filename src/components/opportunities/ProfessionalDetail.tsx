"use client";

import { ElcoPractice } from "@/components/elco/ElcoCallout";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowUpRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { body, btnPrimary, btnSecondary, card, eyebrow, h3, lead, pill, textLink } from "@/components/site/ui";
import { CountryFlag } from "@/components/dashboard/goals/CountryFlag";
import {
  ageLabel, countryName, dateLabel, EMPLOYMENT_LABEL, GENDER_LABEL, locationLabel, partnerDestination, STATUS_LABEL, type ProfessionalOpportunity,
} from "@/lib/professional/model";
import { SalaryText, StatusPill } from "./JobCard";
import { InterestForm } from "./InterestForm";
import { Disclaimer, PartnerCard, RoleSplit } from "./PartnerPanel";

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-[#E6E9EE] pt-8" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className={cn(h3, "flex items-baseline gap-3")}><span className="text-[14px] font-semibold text-[#577E90]">{String(n).padStart(2, "0")}</span>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed text-[#2F4157]/80">{items.map((x) => <li key={x}>{x}</li>)}</ul>
);
const Missing = ({ children }: { children: ReactNode }) => <p className={cn(body, "italic")}>{children}</p>;

// One listing, used by /opportunities/professional/[slug] and the dashboard page of the same listing.
export function ProfessionalDetail({ o, backHref, backLabel, source, defaults }: {
  o: ProfessionalOpportunity; backHref: string; backLabel: string; source: "public" | "dashboard"; defaults?: { fullName?: string; email?: string };
}) {
  const partner = o.partner;
  const dest = partnerDestination(o);
  const age = ageLabel(o);
  const facts: [string, ReactNode][] = [
    ["Country", <span key="c" className="inline-flex items-center gap-2"><CountryFlag code={o.country_code} size={13} />{countryName(o.country_code)}</span>],
    ["City", o.city ?? "To be confirmed"],
    ["Industry", o.industry],
    ["Salary", <SalaryText key="s" o={o} />],
    ["Type", EMPLOYMENT_LABEL[o.employment_type]],
    ["Contract", o.contract_duration ?? "Ask the partner"],
    ["Hours", o.working_hours ?? "Ask the partner"],
    ["Status", STATUS_LABEL[o.status]],
    ["Last updated", dateLabel(o.updated_at) ?? "–"],
  ];
  return (
    <article data-testid="professional-detail">
      <Link href={backHref} className={cn(textLink, "text-[15px]")} data-testid="detail-back"><ArrowLeft size={16} aria-hidden="true" /> {backLabel}</Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <p className={eyebrow}>{o.industry} · Work abroad</p>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#1A2534] sm:text-[44px]">{o.title}</h1>
          <p className="mt-4 flex items-center gap-2 text-[16px] text-[#2F4157]/80"><CountryFlag code={o.country_code} size={16} />{locationLabel(o)}{o.city ? "" : " · city to be confirmed"}</p>
          <p className={cn(lead, "mt-5")}>{o.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusPill status={o.status} />
            <span className={pill}><SalaryText o={o} /></span>
            <span className={pill}>{EMPLOYMENT_LABEL[o.employment_type]}</span>
            {o.openings && <span className={pill}>{o.openings} places</span>}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {o.status !== "closed" && <a href="#interest" className={btnPrimary} data-testid="express-interest-cta"><Send size={17} aria-hidden="true" /> Express Interest</a>}
            {dest && <a href={dest} target="_blank" rel="noopener noreferrer" className={btnSecondary} data-testid="contact-partner-cta">Contact Official Recruitment Partner <ArrowUpRight size={17} aria-hidden="true" /></a>}
          </div>
          <Disclaimer partner={partner?.name} className="mt-8" />
          {o.confirm_notes.length > 0 && (
            <div className="mt-4 flex gap-3 rounded-[16px] border border-[#F2D7A6] bg-[#FFF8EB] p-5 text-[14.5px] leading-relaxed text-[#7A5310]" data-testid="confirm-notes">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div><p className="font-semibold">Contact the partner for confirmation</p><ul className="mt-1 list-disc space-y-1 pl-5">{o.confirm_notes.map((n) => <li key={n}>{n}</li>)}</ul></div>
            </div>
          )}

          <div className="mt-12 space-y-10">
            <Section id="overview" n={1} title="Overview">
              {o.description && <p className={body}>{o.description}</p>}
              {o.positions.length > 0 && (<><p className="mt-4 text-[15px] font-semibold text-[#1A2534]">Positions in this listing</p><div className="mt-2 flex flex-wrap gap-2">{o.positions.map((p) => <span key={p} className={pill}>{p}</span>)}</div></>)}
            </Section>
            <Section id="responsibilities" n={2} title="Job responsibilities">
              {o.responsibilities.length ? <List items={o.responsibilities} /> : <Missing>The partner&apos;s material doesn&apos;t list detailed duties for this role. Ask {partner?.name ?? "the partner"} for the job description.</Missing>}
            </Section>
            <Section id="requirements" n={3} title="Requirements and qualifications">
              <dl className="mb-4 grid gap-2 text-[15px] sm:grid-cols-3">
                <div><dt className="font-semibold text-[#1A2534]">Open to</dt><dd className="text-[#2F4157]/80">{GENDER_LABEL[o.gender]}</dd></div>
                {age && <div><dt className="font-semibold text-[#1A2534]">Age</dt><dd className="text-[#2F4157]/80">{age}</dd></div>}
                {o.experience && <div><dt className="font-semibold text-[#1A2534]">Experience</dt><dd className="text-[#2F4157]/80">{o.experience}</dd></div>}
              </dl>
              {o.requirements.length > 0 && <List items={o.requirements} />}
            </Section>
            <Section id="salary" n={4} title="Salary and compensation">
              <p className="text-[22px] font-bold text-[#1A2534]"><SalaryText o={o} /></p>
              {o.salary_note && <p className={cn(body, "mt-2")}>{o.salary_note}</p>}
            </Section>
            <Section id="benefits" n={5} title="Benefits">
              {o.benefits.length ? <List items={o.benefits} /> : <Missing>No benefits are listed yet. Ask the partner.</Missing>}
            </Section>
            <Section id="contract" n={6} title="Employment contract">
              <dl className="grid gap-3 text-[15.5px] sm:grid-cols-3">
                <div><dt className="font-semibold text-[#1A2534]">Type</dt><dd className="text-[#2F4157]/80">{EMPLOYMENT_LABEL[o.employment_type]}</dd></div>
                <div><dt className="font-semibold text-[#1A2534]">Duration</dt><dd className="text-[#2F4157]/80">{o.contract_duration ?? "Ask the partner"}</dd></div>
                <div><dt className="font-semibold text-[#1A2534]">Working hours</dt><dd className="text-[#2F4157]/80">{o.working_hours ?? "Ask the partner"}</dd></div>
              </dl>
              <p className={cn(body, "mt-4 text-[15px]")}>The employment contract is issued through {partner?.name ?? "the recruitment partner"}, not IELSco. Read it carefully before you sign.</p>
            </Section>
            <Section id="location" n={7} title="Location and country">
              <p className="flex items-center gap-2 text-[16px] font-semibold text-[#1A2534]"><CountryFlag code={o.country_code} size={15} />{locationLabel(o)}</p>
              {o.location_note ? <p className={cn(body, "mt-2")}>{o.location_note}</p> : <Missing>The work city hasn&apos;t been confirmed yet. Ask the partner.</Missing>}
            </Section>
            <Section id="partner" n={8} title="Recruitment partner">
              {partner ? <PartnerCard partner={partner} destination={dest} /> : <Missing>Partner details are being updated.</Missing>}
              {o.application_instructions && <p className={cn(body, "mt-4")}><strong className="text-[#1A2534]">Applying officially:</strong> {o.application_instructions}</p>}
              {o.documents.length > 0 && (
                <div className="mt-4"><p className="text-[15px] font-semibold text-[#1A2534]">Documents the partner asks for in its own process</p>
                  <p className="mt-1 text-[14px] text-[#2F4157]/65">IELSco never asks for these. Give them only to the partner, through its official channels.</p>
                  <div className="mt-2"><List items={o.documents} /></div></div>
              )}
              <div className="mt-6"><RoleSplit /></div>
              <ElcoPractice context="job" refId="opportunity-job" className="mt-6" />
            </Section>
            <Section id="interest" n={9} title="How to express interest">
              <div className={cn(card, "p-5 sm:p-7")}>
                <p className="text-[20px] font-bold text-[#1A2534]">Interested in This Opportunity?</p>
                <p className={cn(body, "mt-2 mb-6")}>Submit your interest through IELSco, and our team will help direct you to the appropriate official recruitment channel.</p>
                <InterestForm o={o} source={source} defaults={defaults} />
              </div>
            </Section>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <dl className={cn(card, "divide-y divide-[#E6E9EE]")} data-testid="detail-facts">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-6 py-3.5 text-[15px]"><dt className="font-semibold text-[#1A2534]">{k}</dt><dd className="text-[#2F4157]/80">{v}</dd></div>
            ))}
          </dl>
          {partner && (
            <div className={cn(card, "p-6")}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#577E90]">Official recruitment partner</p>
              <p className="mt-2 text-[17px] font-bold text-[#1A2534]">{partner.name}</p>
              {dest && <a href={dest} target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-3 text-[15px]")}>Official channel <ArrowUpRight size={15} aria-hidden="true" /></a>}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

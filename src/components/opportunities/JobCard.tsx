"use client";

import Image from "next/image";
import Link from "next/link";
import { opportunityCover } from "@/lib/covers";
import { ArrowRight, Briefcase, Handshake, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, focusRing, pill } from "@/components/site/ui";
import { CountryFlag } from "@/components/dashboard/goals/CountryFlag";
import { EMPLOYMENT_LABEL, locationLabel, salaryLabel, STATUS_LABEL, type JobStatus, type ProfessionalOpportunity } from "@/lib/professional/model";

export function StatusPill({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span className={cn(pill, status === "open" && "border-[#2D7A58]/30 bg-[#F3FAF6] text-[#2D7A58]", status === "coming_soon" && "border-[#8A5A00]/25 bg-[#FDF8EE] text-[#8A5A00]",
      status === "closed" && "text-[#2F4157]/60", className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", status === "open" ? "bg-[#2D7A58]" : status === "coming_soon" ? "bg-[#C08A1E]" : "bg-[#2F4157]/40")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SalaryText({ o, className }: { o: ProfessionalOpportunity; className?: string }) {
  const s = salaryLabel(o);
  return (
    <span className={className}>
      {s.text ?? "Ask the partner"}
      {s.text && s.confirm && <span className="ml-1.5 whitespace-nowrap text-[13px] font-semibold text-[#8A5A00]">· to be confirmed</span>}
    </span>
  );
}

export function JobCard({ o, href }: { o: ProfessionalOpportunity; href: string }) {
  return (
    <li className={cn(card, "group relative flex flex-col overflow-hidden p-6 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#C9D1DC] hover:shadow-[0_12px_32px_rgba(26,37,52,0.08)] motion-reduce:hover:translate-y-0")}
      data-testid={`job-${o.slug}`}>
      <div className="relative -mx-6 -mt-6 mb-5 aspect-[16/7] bg-[#F1F4F8]">
        <Image src={opportunityCover("job")} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{o.industry}</span>
        <StatusPill status={o.status} />
      </div>
      <h3 className="mt-3 text-[20px] font-bold leading-snug text-[#1A2534]">
        {/* The whole card is clickable through this link's stretched pseudo-element. */}
        <Link href={href} className={cn("rounded after:absolute after:inset-0 after:rounded-[20px] after:content-['']", focusRing)}>{o.title}</Link>
      </h3>
      <p className="mt-2 flex items-center gap-2 text-[14.5px] text-[#2F4157]/75">
        <CountryFlag code={o.country_code} size={14} />
        <span>{locationLabel(o)}{o.city ? "" : " · city to be confirmed"}</span>
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#2F4157]/80">{o.summary}</p>
      <dl className="mt-4 space-y-2 text-[14.5px]">
        <div className="flex items-start gap-2"><dt className="sr-only">Salary</dt><Wallet size={16} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
          <dd className="font-semibold text-[#1A2534]"><SalaryText o={o} /></dd></div>
        <div className="flex items-start gap-2"><dt className="sr-only">Employment</dt><Briefcase size={16} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
          <dd className="text-[#2F4157]/80">{EMPLOYMENT_LABEL[o.employment_type]}{o.contract_duration ? ` · ${o.contract_duration}` : ""}{o.openings ? ` · ${o.openings} places` : ""}</dd></div>
      </dl>
      {o.benefits.length > 0 && (
        <p className="mt-4 line-clamp-2 text-[14px] text-[#2F4157]/70">{o.benefits.slice(0, 3).join(" · ")}</p>
      )}
      <div className="flex-1" />
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E6E9EE] pt-4">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-[#2F4157]/60"><Handshake size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">Via {o.partner?.name ?? "recruitment partner"}</span></span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-[#2F4157] group-hover:text-[#E56668]" aria-hidden="true">
          View <ArrowRight size={16} />
        </span>
      </div>
    </li>
  );
}

export function JobCardSkeleton() {
  return <li className="h-[340px] animate-pulse rounded-[20px] bg-[#F1F4F8]" aria-hidden="true" />;
}

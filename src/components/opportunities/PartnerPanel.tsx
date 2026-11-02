"use client";

import { ArrowUpRight, Building2, Info, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary, card } from "@/components/site/ui";
import { professionalDisclaimer, whatsappLink, type RecruitmentPartner } from "@/lib/professional/model";

// The partner's official channels. Shown on the directory (one card per partner) and on each listing.
export function PartnerCard({ partner, destination, compact }: { partner: RecruitmentPartner; destination?: string | null; compact?: boolean }) {
  const site = destination ?? partner.website_url;
  const wa = whatsappLink(partner.whatsapp);
  return (
    <div className={cn(card, "p-6")} data-testid={`partner-${partner.slug}`}>
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#577E90]">
        <ShieldCheck size={16} aria-hidden="true" /> Official recruitment partner
      </p>
      <p className="mt-3 flex items-center gap-2 text-[20px] font-bold text-[#1A2534]"><Building2 size={20} className="shrink-0 text-[#2F4157]/50" aria-hidden="true" />{partner.name}</p>
      {!compact && partner.about && <p className="mt-2 text-[15px] leading-relaxed text-[#2F4157]/75">{partner.about}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {site && (
          <a href={site} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="partner-website">
            Visit Official Recruitment Partner <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        )}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={btnSecondary}><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>}
      </div>
      {(partner.email || partner.phone) && (
        <ul className="mt-4 space-y-1.5 text-[14px] text-[#2F4157]/75">
          {partner.email && <li className="flex items-center gap-2"><Mail size={15} aria-hidden="true" /><a className="underline-offset-4 hover:underline" href={`mailto:${partner.email}`}>{partner.email}</a></li>}
          {partner.phone && <li className="flex items-center gap-2"><Phone size={15} aria-hidden="true" />{partner.phone}</li>}
        </ul>
      )}
    </div>
  );
}

export function Disclaimer({ partner, className }: { partner?: string; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-[16px] border border-[#E6E9EE] bg-[#F8FAFC] p-5 text-[14.5px] leading-relaxed text-[#2F4157]", className)} data-testid="professional-disclaimer">
      <Info size={20} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
      <p>{professionalDisclaimer(partner)}</p>
    </div>
  );
}

// Who does what. Keeps IELSco clearly distinct from the licensed recruiter.
export function RoleSplit() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="role-split">
      <div className="rounded-[16px] border border-[#E6E9EE] p-5">
        <p className="text-[15px] font-bold text-[#1A2534]">What IELSco does</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px] text-[#2F4157]/75">
          <li>Publishes information from the partner&apos;s official material</li>
          <li>Receives your expression of interest and points you to the partner</li>
        </ul>
      </div>
      <div className="rounded-[16px] border border-[#E6E9EE] p-5">
        <p className="text-[15px] font-bold text-[#1A2534]">What the recruitment partner does</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px] text-[#2F4157]/75">
          <li>Official recruitment, selection and placement</li>
          <li>Employment contracts, permits and legal processes</li>
        </ul>
      </div>
    </div>
  );
}

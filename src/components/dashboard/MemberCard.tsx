import { AtSign, Globe2, UserPlus } from "lucide-react";
import type { DirectoryMember } from "@/lib/dashboard/types";
import { directionLabel, SEA_FLAGS } from "@/lib/dashboard/options";
import { Avatar } from "./Avatar";
import { card, focusRing, tag } from "./ui";
import { cn } from "@/lib/utils";

const linkClass = cn(
  "inline-flex items-center gap-1.5 rounded-full border border-[#E3E7ED] px-3 py-1.5 text-sm font-semibold text-[#2F4157] hover:border-[#577E90]",
  focusRing
);

function MemberLinks({ member }: { member: DirectoryMember }) {
  if (member.is_demo) return <p className="text-sm text-[#2F4157]/50">Fictional demo profile · no contact links</p>;
  if (!member.linkedin_url && !member.instagram_url && !member.portfolio_url) {
    return <p className="text-sm text-[#2F4157]/50">No public links shared</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {member.linkedin_url && (
        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className={linkClass} data-testid={`member-linkedin-${member.id}`}>
          <UserPlus size={14} /> Connect on LinkedIn
        </a>
      )}
      {member.instagram_url && (
        <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label={`${member.display_name} on Instagram`}>
          <AtSign size={14} /> Instagram
        </a>
      )}
      {member.portfolio_url && (
        <a href={member.portfolio_url} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label={`${member.display_name}'s portfolio`}>
          <Globe2 size={14} /> Portfolio
        </a>
      )}
    </div>
  );
}

export function MemberCard({ member, reasons = [] }: { member: DirectoryMember; reasons?: string[] }) {
  const meta = [member.role_status, member.country && `Lives in ${member.country}`].filter(Boolean).join(" · ");
  const goal = [directionLabel(member.direction), member.destination_country && `→ ${member.destination_country}`]
    .filter(Boolean)
    .join(" ");

  return (
    <article data-testid={`member-card-${member.id}`} className={cn(card, "flex h-full flex-col p-5")}>
      <div className="mb-3 flex items-start gap-3">
        <Avatar name={member.display_name} url={member.avatar_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold">{member.display_name}</h3>
            {member.is_demo && (
              <span className="rounded-full border border-[#577E90]/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#577E90]">
                Demo
              </span>
            )}
          </div>
          {member.origin_country && (
            <p data-testid={`member-origin-${member.id}`} className="text-base font-medium text-[#2F4157]/80">
              {SEA_FLAGS[member.origin_country] && <span aria-hidden="true">{SEA_FLAGS[member.origin_country]} </span>}
              From {member.origin_country}
            </p>
          )}
          {meta && <p className="text-base text-[#2F4157]/60">{meta}</p>}
        </div>
      </div>

      {goal && <p className="mb-2 text-base font-semibold text-[#2F4157]">{goal}</p>}
      {!member.bio && !member.role_status && !member.country && (
        <p className="mb-2 text-sm text-[#2F4157]/50">Profile not filled in yet</p>
      )}
      {member.bio && <p className="mb-3 line-clamp-2 text-base text-[#2F4157]/75">{member.bio}</p>}

      {member.interests.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {member.interests.slice(0, 3).map((i) => (
            <span key={i} className={tag}>{i}</span>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <p data-testid={`member-similarity-${member.id}`} className="mb-3 text-sm font-medium text-[#577E90]">
          You both: {reasons.slice(0, 3).join(", ")}
        </p>
      )}

      <div className="mt-auto border-t border-[#E3E7ED]/50 pt-3">
        <MemberLinks member={member} />
      </div>
    </article>
  );
}

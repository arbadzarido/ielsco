"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Member identity shown above a story title: profile photo, name and (only when the record has one) the verified
// role / achievement. Without a photo it falls back to initials, same pattern as dashboard/Avatar. Nothing is
// invented: a missing role renders nothing.
const SIZES = {
  sm: { box: 36, name: "text-[14px]", role: "text-[12px]", gap: "gap-2.5" },
  md: { box: 48, name: "text-[16px]", role: "text-[13px]", gap: "gap-3" },
  lg: { box: 64, name: "text-[18px]", role: "text-[14px]", gap: "gap-4" },
} as const;

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export interface StoryAuthorLineProps {
  name: string;
  avatar?: string | null;
  role?: string | null;
  size?: keyof typeof SIZES;
  /** Allow the role to wrap to more lines (default clamps to 2). */
  className?: string;
  /** Skip optimisation for admin previews with external URLs. */
  unoptimized?: boolean;
}

export default function StoryAuthorLine({ name, avatar, role, size = "md", className, unoptimized }: StoryAuthorLineProps) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size];
  const roleText = role?.trim();
  return (
    <div className={cn("flex min-w-0 items-center", s.gap, className)}>
      {avatar && !failed ? (
        <Image
          src={avatar}
          alt=""
          width={s.box}
          height={s.box}
          unoptimized={unoptimized}
          onError={() => setFailed(true)}
          style={{ width: s.box, height: s.box }}
          className="shrink-0 rounded-full bg-[#F1F4F8] object-cover ring-2 ring-white"
        />
      ) : (
        <span
          aria-hidden="true"
          style={{ width: s.box, height: s.box, fontSize: s.box * 0.36 }}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#577E90]/15 font-bold text-[#2F4157]"
        >
          {initials(name)}
        </span>
      )}
      <div className="min-w-0">
        <p className={cn("truncate font-extrabold leading-tight text-[#2F4157]", s.name)}>{name}</p>
        {roleText && <p className={cn("line-clamp-2 leading-snug text-[#2F4157]/65", s.role)}>{roleText}</p>}
      </div>
    </div>
  );
}

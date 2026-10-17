"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import type { MemberProfile } from "@/lib/dashboard/types";
import { btnSecondary, card } from "../ui";
import { cn } from "@/lib/utils";

export function VisibilityCard({ profile }: { profile: MemberProfile }) {
  const Icon = profile.is_public ? Eye : EyeOff;
  return (
    <div data-testid="visibility-card" className={cn(card, "flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between")}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-1 shrink-0 text-[#577E90]" />
        <div>
          <p className="text-lg font-bold">
            {profile.is_public ? "You're visible in the directory" : "You're hidden from the directory"}
          </p>
          <p className="text-base text-[#2F4157]/65">
            {profile.is_public
              ? "Other members see only the fields you chose to share. Your email and phone are never shown."
              : "Opt in from your profile so people with similar goals can find you. You choose what's shown."}
          </p>
        </div>
      </div>
      <Link href="/dashboard/profile#privacy" data-testid="visibility-edit-link" className={cn(btnSecondary, "shrink-0")}>
        {profile.is_public ? "Edit what's shown" : "Set up my profile"}
      </Link>
    </div>
  );
}

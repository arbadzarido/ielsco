import Link from "next/link";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { btnSecondary } from "./ui";
import { cn } from "@/lib/utils";
import ElcoActor from "@/components/brand/ElcoActorLazy";
import ElcoLoader from "@/components/feedback/ElcoLoader";
import FeedbackErrorState from "@/components/feedback/ErrorState";
import { SkeletonList, SkeletonPage } from "@/components/feedback/Skeleton";
import { classifyError } from "@/lib/errorKind";

// Loading, error and empty states for dashboard pages. They use the shared components (components/feedback, mirroring
// Elco AI): a skeleton right away, Elco and a tip only if the wait is long; errors told apart as offline / session /
// our side with a retry; empty states with Elco and a next step. The exports keep their old names and props.
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <ElcoLoader testid="loading-state" message={label === "Loading…" ? undefined : label} label={label}
        skeleton={<SkeletonPage><SkeletonList rows={4} /></SkeletonPage>} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const kind = classifyError({ message });
  return (
    <div className="px-4 py-10">
      <FeedbackErrorState kind={kind} body={kind === "server" ? message : undefined} onRetry={onRetry} testid="error-state" retryTestid="error-retry-button" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div data-testid="empty-state" className="rounded-2xl border border-dashed border-[#E3E7ED] bg-white/60 px-6 py-10 text-center">
      <span className="mx-auto mb-3 flex h-[84px] w-[84px] items-end justify-center rounded-full bg-[#EEF2F6]">
        <ElcoActor pose="thinking" act="think" style={{ height: 76 }} testid="empty-elco" />
      </span>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mx-auto mb-5 max-w-md text-lg text-[#2F4157]/70">{body}</p>
      {action}
    </div>
  );
}

export function Notice({ children, testId = "notice" }: { children: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} className="flex items-start gap-3 rounded-xl border border-[#577E90]/30 bg-[#577E90]/10 px-4 py-3 text-base text-[#2F4157]">
      <Info size={18} className="mt-0.5 shrink-0 text-[#577E90]" />
      <div>{children}</div>
    </div>
  );
}

// Shown while public.member_profiles doesn't exist yet. Nothing is stored anywhere in the meantime.
export function ProfilePendingNotice() {
  return (
    <Notice testId="profile-pending-notice">
      Saving goals and profile details isn&apos;t switched on yet (IELS database update pending). You can look around;
      anything you enter won&apos;t be saved until then.
    </Notice>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-lg text-[#2F4157]/70">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className={cn(btnSecondary, "px-4 py-2 text-sm")}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

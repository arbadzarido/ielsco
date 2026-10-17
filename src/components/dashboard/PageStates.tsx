import Link from "next/link";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { btnPrimary, btnSecondary, card } from "./ui";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" data-testid="loading-state" className="flex min-h-[50vh] items-center justify-center gap-3 text-lg text-[#2F4157]/70">
      <Loader2 className="animate-spin text-[#577E90]" size={22} /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" data-testid="error-state" className={cn(card, "mx-auto my-12 max-w-lg p-8 text-center")}>
      <AlertCircle className="mx-auto mb-3 text-[#E56668]" size={28} />
      <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="mb-6 text-lg text-[#2F4157]/70">{message}</p>
      {onRetry && (
        <button type="button" data-testid="error-retry-button" onClick={onRetry} className={btnPrimary}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div data-testid="empty-state" className="rounded-2xl border border-dashed border-[#E3E7ED] bg-white/60 px-6 py-12 text-center">
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

import DashboardLayout from "./DashboardLayout";
import ElcoLoader from "@/components/feedback/ElcoLoader";
import { Skeleton, SkeletonCard, SkeletonGrid, SkeletonList, SkeletonPage, SkeletonStats, SkeletonTable } from "@/components/feedback/Skeleton";

// What a dashboard page looks like while its data loads: the real sidebar and header (so nothing jumps when the page
// arrives) with the shape of the page in the content area. Used by the app-router loading.tsx files under /dashboard
// and by LoadingState (PageStates) while the member profile loads.
export type DashboardVariant = "page" | "grid" | "list" | "table" | "detail" | "home";

export function DashboardSkeleton({ variant = "page" }: { variant?: DashboardVariant }) {
  const body = {
    page: <SkeletonList rows={4} />,
    list: <SkeletonList rows={6} />,
    grid: (
      <>
        <Skeleton className="mb-6 h-[48px] w-full max-w-[520px]" rounded="rounded-full" />
        <SkeletonGrid count={6} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" card={{ media: "image", chip: true }} />
      </>
    ),
    table: (
      <>
        <Skeleton className="mb-6 h-[48px] w-full max-w-[420px]" rounded="rounded-full" />
        <SkeletonTable rows={8} cols={4} />
      </>
    ),
    detail: (
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SkeletonCard media="image" className="min-h-[280px]" />
        <SkeletonCard media="icon" chip />
      </div>
    ),
    home: (
      <div className="space-y-8">
        <SkeletonStats count={3} />
        <SkeletonGrid count={3} className="grid gap-5 md:grid-cols-3" card={{ media: "image" }} />
        <SkeletonList rows={3} />
      </div>
    ),
  }[variant];
  return <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10"><SkeletonPage>{body}</SkeletonPage></div>;
}

export function DashboardContentLoading({ variant = "page", label = "Loading" }: { variant?: DashboardVariant; label?: string }) {
  return <ElcoLoader label={label} skeleton={<DashboardSkeleton variant={variant} />} />;
}

export default function DashboardLoading({ variant = "page", label = "Loading" }: { variant?: DashboardVariant; label?: string }) {
  return <DashboardLayout><DashboardContentLoading variant={variant} label={label} /></DashboardLayout>;
}

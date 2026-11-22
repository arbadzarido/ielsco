import ElcoLoader from "@/components/feedback/ElcoLoader";
import { Skeleton, SkeletonGrid, SkeletonList, SkeletonText } from "@/components/feedback/Skeleton";
import { container } from "./ui";
import { cn } from "@/lib/utils";

// Loading shape for public pages (same hero spacing and container as the real pages: eyebrow, headline, intro, then the
// body), so the page doesn't jump when the content arrives. The site header comes from the root layout and stays put.
export type PublicVariant = "directory" | "article" | "list" | "page";

export default function PublicLoading({ variant = "directory", label = "Loading" }: { variant?: PublicVariant; label?: string }) {
  const body = {
    directory: (
      <>
        <Skeleton className="h-[48px] w-full max-w-[520px]" rounded="rounded-full" />
        <div className="mt-4 flex flex-wrap gap-2">{[88, 96, 80, 104, 92].map((w, i) => <Skeleton key={i} className="h-[38px]" style={{ width: w }} rounded="rounded-full" />)}</div>
        <SkeletonGrid count={4} className="mt-10 grid gap-5 md:grid-cols-2" card={{ media: "image", chip: true }} />
      </>
    ),
    list: <SkeletonList rows={5} className="mt-10" />,
    article: (
      <div className="mt-6 max-w-[760px]">
        <Skeleton className="aspect-[16/8] w-full" rounded="rounded-3xl" />
        <SkeletonText lines={5} className="mt-8" />
        <SkeletonText lines={4} className="mt-6" />
      </div>
    ),
    page: <SkeletonGrid count={3} className="mt-10 grid gap-5 md:grid-cols-3" card={{ media: "icon" }} />,
  }[variant];
  return (
    <ElcoLoader label={label} skeleton={
      <div className="min-h-screen overflow-x-hidden bg-white" data-testid="public-loading">
        <section className="pb-[32px] pt-[40px] md:pt-[64px]">
          <div className={cn(container)}>
            <Skeleton className="h-[14px] w-[120px]" rounded="rounded-full" />
            <Skeleton className="mt-5 h-[44px] w-full max-w-[760px] md:h-[56px]" rounded="rounded-2xl" />
            <SkeletonText lines={2} className="mt-6 max-w-[640px]" />
          </div>
        </section>
        <section className="pb-[64px] md:pb-[96px]"><div className={cn(container)}>{body}</div></section>
      </div>
    } />
  );
}

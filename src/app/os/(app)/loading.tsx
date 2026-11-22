import { SkeletonPage, SkeletonRegion, SkeletonTable } from "@/components/feedback/Skeleton";

// Company OS pages load their records on the client; this is the shape of a list page while the route opens.
export default function Loading() {
  return (
    <SkeletonRegion label="Loading" className="px-4 py-6 md:px-8">
      <SkeletonPage><SkeletonTable rows={8} cols={4} /></SkeletonPage>
    </SkeletonRegion>
  );
}

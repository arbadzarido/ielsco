import PublicLoading from "@/components/site/PublicLoading";

// Fallback for every route without a closer loading.tsx (About, Circle, Partners, School, Events pages, auth…).
export default function Loading() {
  return <PublicLoading variant="page" />;
}

import { ArticlesIndex, indexMetadata } from "@/components/articles/ArticleViews";

export const metadata = indexMetadata("id");

export default function Page() {
  return <ArticlesIndex lang="id" />;
}

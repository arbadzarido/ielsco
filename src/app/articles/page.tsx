import { ArticlesIndex, indexMetadata } from "@/components/articles/ArticleViews";

export const metadata = indexMetadata("en");

export default function Page() {
  return <ArticlesIndex lang="en" />;
}

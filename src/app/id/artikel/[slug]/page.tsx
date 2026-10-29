import { ArticlePage, articleMetadata, articleParams } from "@/components/articles/ArticleViews";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return articleParams("id");
}

export async function generateMetadata({ params }: Props) {
  return articleMetadata("id", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <ArticlePage lang="id" slug={(await params).slug} />;
}

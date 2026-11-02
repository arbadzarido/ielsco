import { IelscoStoryPage, ielscoStoryMetadata } from "@/components/stories/IelscoStoryPages";

type Props = { params: Promise<{ slug: string }> };

// One IELSco story (id). Rendered on demand and cached (5 minutes, revalidated on editor saves).
export const revalidate = 300;

export async function generateMetadata({ params }: Props) {
  return ielscoStoryMetadata("id", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <IelscoStoryPage lang="id" slug={(await params).slug} />;
}

import { IelscoStoryPage, ielscoStoryMetadata } from "@/components/stories/IelscoStoryPages";

type Props = { params: Promise<{ slug: string }> };

// One IELSco story (en). Rendered on demand and cached (5 minutes, revalidated on editor saves).
export const revalidate = 300;

export async function generateMetadata({ params }: Props) {
  return ielscoStoryMetadata("en", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <IelscoStoryPage lang="en" slug={(await params).slug} />;
}

import { IelscoStoriesIndexPage, ielscoIndexMetadata } from "@/components/stories/IelscoStoryPages";

// IELSco Stories listing (id). Published stories come from the CMS; refreshed every 5 minutes and on editor saves.
export const revalidate = 300;
export const metadata = ielscoIndexMetadata("id");

export default function Page() {
  return <IelscoStoriesIndexPage lang="id" />;
}

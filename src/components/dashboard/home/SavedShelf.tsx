"use client";

import Link from "next/link";
import { useBookmarks } from "../bookmarks/BookmarksProvider";
import { ResourceRow } from "../resources/ResourceRow";
import { getResource } from "@/data/dashboard/resources";
import { getCollection } from "@/data/dashboard/collections";
import { btnLink } from "../ui";

// Compact "My Learning Shelf" on Home — only shown when the member has saved something.
export function SavedShelf({ userId }: { userId: string }) {
  const bookmarks = useBookmarks();
  if (!bookmarks || bookmarks.status !== "ready" || bookmarks.saved.length === 0) return null;

  const resources = bookmarks.saved
    .filter((k) => k.startsWith("resource:"))
    .map((k) => getResource(k.slice(9)))
    .filter(Boolean)
    .slice(0, 3);
  const collections = bookmarks.saved
    .filter((k) => k.startsWith("collection:"))
    .map((k) => getCollection(k.slice(11)))
    .filter(Boolean);

  return (
    <section data-testid="home-saved-shelf" aria-labelledby="saved-heading">
      <div className="mb-2 flex items-end justify-between gap-4">
        <h2 id="saved-heading" className="text-xl font-bold md:text-2xl">Your learning shelf</h2>
        <Link href="/dashboard/shelf" data-testid="home-saved-see-all" className={btnLink}>See all saved</Link>
      </div>
      {collections.length > 0 && (
        <p className="text-base text-[#2F4157]/65">
          Saved collections:{" "}
          {collections.map((c, i) => (
            <span key={c!.id}>
              {i > 0 && ", "}
              <Link href={`/dashboard/explore/collections/${c!.id}`} className="font-semibold underline-offset-4 hover:underline">{c!.title}</Link>
            </span>
          ))}
        </p>
      )}
      <ul className="divide-y divide-[#E3E7ED]/60">
        {resources.map((r) => <ResourceRow key={r!.id} resource={r!} userId={userId} />)}
      </ul>
    </section>
  );
}

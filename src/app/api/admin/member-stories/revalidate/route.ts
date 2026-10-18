// POST — refresh the cached public story pages right after an admin saves, publishes or unpublishes a story.
// Admins only. Without this call the pages still refresh within 5 minutes.
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoryAdmin } from "@/lib/stories/admin-auth";
import { STORIES_CACHE_TAG } from "@/lib/stories/types";

export async function POST() {
  const auth = await requireStoryAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Admins only." }, { status: auth.status });
  revalidateTag(STORIES_CACHE_TAG, { expire: 0 });
  revalidatePath("/circle/stories", "layout");
  return NextResponse.json({ ok: true });
}

// POST — refresh the cached public opportunity pages right after staff save, publish or unpublish an academic
// opportunity, a job abroad or a recruitment partner. Admins only (same check as the story editor). Without this call the
// pages still refresh within 5 minutes (lib/supabase/public.ts: cachedPublicSupabase).
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoryAdmin } from "@/lib/stories/admin-auth";
import { OPPORTUNITIES_CACHE_TAG } from "@/lib/supabase/public";

export async function POST() {
  const auth = await requireStoryAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Admins only." }, { status: auth.status });
  revalidateTag(OPPORTUNITIES_CACHE_TAG, { expire: 0 });
  revalidatePath("/opportunities", "layout");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}

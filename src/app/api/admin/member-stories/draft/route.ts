// POST { submissionId } — (re)generate the AI first draft for a submission. Admins only (staff_roles via RLS).
// The original answers are never modified; the draft is stored separately and a failure is recorded so the editor
// can retry or write the story by hand.
import { NextResponse, type NextRequest } from "next/server";
import { requireStoryAdmin } from "@/lib/stories/admin-auth";
import { generateStoryDraft } from "@/lib/stories/ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireStoryAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Sign in first." : "Admins only." }, { status: auth.status });
  const { supabase } = auth;

  const body = (await req.json().catch(() => null)) as { submissionId?: string } | null;
  const id = body?.submissionId;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Missing submissionId." }, { status: 400 });

  const { data: sub, error } = await supabase
    .from("member_story_submissions")
    .select("id, name, country, answers, images")
    .eq("id", id)
    .maybeSingle();
  if (error || !sub) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  await supabase.from("member_story_submissions").update({ ai_status: "generating", ai_error: null }).eq("id", id);
  const answers = (sub.answers ?? {}) as Record<string, unknown>;
  const images = ((sub.images ?? []) as { path: string; note?: string }[]).filter((im) => im?.path);

  try {
    const { draft, model } = await generateStoryDraft({
      name: sub.name,
      preferredName: typeof answers.preferred_name === "string" ? answers.preferred_name : undefined,
      country: sub.country,
      answers,
      images,
    });
    const { error: saveErr } = await supabase
      .from("member_story_submissions")
      .update({ ai_status: "ready", ai_draft: draft, ai_model: model, ai_error: null, ai_generated_at: new Date().toISOString() })
      .eq("id", id);
    if (saveErr) throw new Error(saveErr.message);
    return NextResponse.json({ ok: true, draft, model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI drafting failed.";
    await supabase.from("member_story_submissions").update({ ai_status: "failed", ai_error: message.slice(0, 1000) }).eq("id", id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

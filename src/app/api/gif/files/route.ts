// POST /api/gif/files — register a file a delegate has just uploaded to a GIF submission.
//
// The browser uploads the object straight to Supabase Storage (storage RLS: own folder, editable submission only), then
// calls this route. Here, on the server, we:
//   1. identify the caller from their Supabase session cookie (never from the request body);
//   2. ask the database, as the caller, whether they may edit the submission (gif_can_edit_submission) and who they are;
//   3. check the path layout, the field config (type, accepted formats, max files);
//   4. read the first bytes of the stored object and check its REAL type (magic bytes) and its size;
//   5. only then write the gif_submission_files row (service role; delegates have no INSERT privilege on that table).
// Anything that fails validation is removed from Storage again.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FILES_BUCKET, STORY_BUCKET, pathMatches, sniffType, validateUpload, type Assignment, type FieldDef,
} from "@/lib/gif/portal";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { submissionId?: string; fieldKey?: string; path?: string; originalName?: string; description?: string; storyDay?: number }
    | null;
  const submissionId = body?.submissionId ?? "", fieldKey = body?.fieldKey ?? "", path = body?.path ?? "";
  if (!UUID.test(submissionId) || !/^[a-z][a-z0-9_]{0,40}$/.test(fieldKey) || !path) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const [{ data: canEdit }, { data: delegateId }] = await Promise.all([
    supabase.rpc("gif_can_edit_submission", { p_submission: submissionId }),
    supabase.rpc("gif_my_delegate_id"),
  ]);
  if (canEdit !== true || typeof delegateId !== "string") {
    return NextResponse.json({ error: "This submission can't be changed right now." }, { status: 403 });
  }

  // The caller can see this submission (RLS) — read its assignment's field config.
  const { data: sub } = await supabase.from("gif_submissions").select("id, assignment_id").eq("id", submissionId).maybeSingle();
  if (!sub) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  const { data: assignment } = await supabase.from("gif_assignments").select("id, fields").eq("id", sub.assignment_id).maybeSingle();
  const field = ((assignment as Pick<Assignment, "fields"> | null)?.fields ?? []).find((f: FieldDef) => f.key === fieldKey);
  if (!field || (field.type !== "files" && field.type !== "story_proof")) {
    return NextResponse.json({ error: "This field doesn't accept uploads." }, { status: 400 });
  }
  const kind = field.type === "story_proof" ? "story_proof" : "file";
  const bucket = kind === "story_proof" ? STORY_BUCKET : FILES_BUCKET;
  if (!pathMatches(kind, path, { delegateId, submissionId })) {
    return NextResponse.json({ error: "Invalid file location." }, { status: 400 });
  }

  const admin = service();
  if (!admin) return NextResponse.json({ error: "Uploads are not configured on the server." }, { status: 500 });
  const { data: existing } = await admin.from("gif_submission_files").select("id").eq("bucket", bucket).eq("storage_path", path).maybeSingle();
  if (existing) return NextResponse.json({ error: "This file is already registered." }, { status: 409 });
  const reject = async (status: number, error: string) => {
    await admin.storage.from(bucket).remove([path]);
    return NextResponse.json({ error }, { status });
  };

  const maxFiles = field.max_files ?? (kind === "story_proof" ? 20 : 5);
  const { count } = await admin.from("gif_submission_files").select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId).eq("field_key", fieldKey).is("deleted_at", null);
  if ((count ?? 0) >= maxFiles) return reject(409, `You can upload at most ${maxFiles} file${maxFiles === 1 ? "" : "s"} here.`);

  // Size from Storage metadata, real type from the first bytes.
  const folder = path.slice(0, path.lastIndexOf("/")), name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await admin.storage.from(bucket).list(folder, { search: name, limit: 5 });
  const obj = listed?.find((o) => o.name === name);
  if (!obj) return NextResponse.json({ error: "The upload wasn't found. Please try again." }, { status: 404 });
  const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0);

  const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 60);
  if (!signed?.signedUrl) return reject(500, "Couldn't check the file. Please try again.");
  const head = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-63" } }).then((r) => r.arrayBuffer()).catch(() => null);
  if (!head) return reject(500, "Couldn't check the file. Please try again.");
  const sniffed = sniffType(new Uint8Array(head), body?.originalName ?? "");
  const invalid = validateUpload({ size, sniffed }, kind, field.accept);
  if (invalid) return reject(415, invalid);

  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) || null : null;
  const { data: row, error } = await admin.from("gif_submission_files").insert({
    submission_id: submissionId,
    field_key: fieldKey,
    kind,
    bucket,
    storage_path: path,
    original_name: (body?.originalName ?? "").slice(0, 200) || null,
    mime_type: sniffed,
    size_bytes: size,
    // a field with day_options lets the delegate pick the day (validated against the field config)
    story_day: kind !== "story_proof" ? null
      : field.day_options?.length ? (field.day_options.includes(Number(body?.storyDay)) ? Number(body?.storyDay) : field.day_options[0])
      : field.story_day ?? null,
    description,
    uploaded_by: user.id,
  }).select("*").single();
  if (error || !row) return reject(500, "Couldn't save the file record. Please try again.");
  return NextResponse.json({ file: row });
}

// gif-story-retention — deletes GIF Instagram Story proof screenshots 7 days after upload.
//
// Called once a day by Supabase Cron (migration 20261122000100). Auth: header `x-gif-cron-secret` must match the Vault
// secret `gif_retention_cron_secret` (checked by public.gif_retention_secret_ok, service_role only).
// Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, which Supabase provides to every Edge Function as secrets.
//
// Safe to run any number of times:
//   * only rows with kind = 'story_proof', bucket = 'gif-story-proofs', expires_at <= now() and not yet deleted are touched;
//   * a Storage object that is already gone counts as deleted;
//   * failures are recorded (retention_status = 'deletion_failed', attempts + error) and retried on the next run;
//   * submission, assessment and notification rows are never modified; no other bucket is ever touched.
//   * orphaned objects in gif-story-proofs (no file row, older than 7 days, e.g. an upload whose registration failed)
//     are removed too, because that bucket only ever holds story proofs.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "gif-story-proofs";
const BATCH = 100;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "function is not configured" }, 500);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const secret = req.headers.get("x-gif-cron-secret") ?? "";
  const { data: ok, error: authErr } = await db.rpc("gif_retention_secret_ok", { p_secret: secret });
  if (authErr || ok !== true) return json({ error: "unauthorized" }, 401);

  const { data: run } = await db.from("gif_retention_runs").insert({}).select("id").single();
  const details: Record<string, unknown>[] = [];
  let scanned = 0, deleted = 0, failed = 0, orphans = 0;
  const nowIso = new Date().toISOString();

  // 1) expired story proofs
  for (;;) {
    const { data: rows, error } = await db
      .from("gif_submission_files")
      .select("id, storage_path, deletion_attempts")
      .eq("kind", "story_proof").eq("bucket", BUCKET)
      .is("deleted_at", null)
      .in("retention_status", ["active", "expired", "deletion_failed"])
      .lte("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(BATCH);
    if (error) { details.push({ step: "select", error: error.message }); break; }
    if (!rows?.length) break;
    scanned += rows.length;

    await db.from("gif_submission_files").update({ retention_status: "expired" })
      .in("id", rows.map((r) => r.id)).eq("retention_status", "active");

    const { error: rmErr } = await db.storage.from(BUCKET).remove(rows.map((r) => r.storage_path));
    if (rmErr) {
      failed += rows.length;
      for (const r of rows) {
        await db.from("gif_submission_files").update({
          retention_status: "deletion_failed",
          deletion_attempts: (r.deletion_attempts ?? 0) + 1,
          last_deletion_error: rmErr.message.slice(0, 500),
        }).eq("id", r.id);
      }
      details.push({ step: "remove", error: rmErr.message, ids: rows.map((r) => r.id) });
      break; // retry next run; avoid looping on the same rows
    }

    // Confirm each object is really gone before marking it deleted.
    const stillThere = new Set<string>();
    const byFolder = new Map<string, string[]>();
    for (const r of rows) {
      const i = r.storage_path.lastIndexOf("/");
      const folder = r.storage_path.slice(0, i), name = r.storage_path.slice(i + 1);
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), name]);
    }
    for (const [folder, names] of byFolder) {
      const { data: listed } = await db.storage.from(BUCKET).list(folder, { limit: 1000 });
      for (const o of listed ?? []) if (names.includes(o.name)) stillThere.add(`${folder}/${o.name}`);
    }

    for (const r of rows) {
      if (stillThere.has(r.storage_path)) {
        failed++;
        await db.from("gif_submission_files").update({
          retention_status: "deletion_failed",
          deletion_attempts: (r.deletion_attempts ?? 0) + 1,
          last_deletion_error: "object still present after remove",
        }).eq("id", r.id);
      } else {
        deleted++;
        await db.from("gif_submission_files").update({
          retention_status: "deleted",
          deleted_at: new Date().toISOString(),
          deletion_attempts: (r.deletion_attempts ?? 0) + 1,
          last_deletion_error: null,
        }).eq("id", r.id).is("deleted_at", null);
      }
    }
    if (stillThere.size) break;
    if (rows.length < BATCH) break;
  }

  // 2) orphaned objects older than 7 days (bucket holds only story proofs)
  try {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    const { data: delegates } = await db.storage.from(BUCKET).list("", { limit: 1000 });
    for (const d of delegates ?? []) {
      if (d.id) continue; // a file at the root, not a folder
      const { data: subs } = await db.storage.from(BUCKET).list(d.name, { limit: 1000 });
      for (const s of subs ?? []) {
        if (s.id) continue;
        const folder = `${d.name}/${s.name}`;
        const { data: objs } = await db.storage.from(BUCKET).list(folder, { limit: 1000 });
        const old = (objs ?? []).filter((o) => o.id && o.created_at && Date.parse(o.created_at) < cutoff).map((o) => `${folder}/${o.name}`);
        if (!old.length) continue;
        const { data: known } = await db.from("gif_submission_files").select("storage_path").eq("bucket", BUCKET).in("storage_path", old);
        const knownSet = new Set((known ?? []).map((k) => k.storage_path));
        // known rows are handled by step 1 (they expire at the same moment); only remove unregistered objects here
        const orphanPaths = old.filter((p) => !knownSet.has(p));
        if (orphanPaths.length) {
          const { error } = await db.storage.from(BUCKET).remove(orphanPaths);
          if (error) details.push({ step: "orphans", error: error.message });
          else orphans += orphanPaths.length;
        }
      }
    }
  } catch (e) {
    details.push({ step: "orphans", error: String(e) });
  }

  const summary = { scanned, deleted, failed, orphans_deleted: orphans, details };
  if (run?.id) {
    await db.from("gif_retention_runs").update({ ...summary, finished_at: new Date().toISOString() }).eq("id", run.id);
  }
  return json({ ok: failed === 0, ...summary });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

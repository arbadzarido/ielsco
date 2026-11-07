import { NextResponse } from "next/server";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { checkDrift, driveError } from "@/lib/os/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Access-drift check for one document: read its Drive sharing and location and record what doesn't match its Company
// OS sensitivity. Read-only towards Drive. The caller must be able to see the document (checked through RLS).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Bad request");
  const { id } = await ctx.params;
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: doc } = await auth.supabase.from("os_documents")
    .select("id, company_code, division_id, doc_type, sensitivity, drive_file_id, folder_route_id").eq("id", id).maybeSingle();
  if (!doc) return jsonError("Document not found.", 404);
  if (!doc.drive_file_id) return jsonError("This document has no Drive file yet.", 409);
  const service = osServiceClient();
  if (!service) return jsonError("Google Drive isn't connected on this deployment yet.", 503);

  let expected: string | null = null;
  const { data: routes } = await service.from("os_folder_routes").select("drive_folder_id, division_id, doc_type")
    .eq("status", "approved").eq("company_code", doc.company_code).eq("sensitivity", doc.sensitivity);
  const score = (r: { division_id: string | null; doc_type: string | null }) => (r.division_id === doc.division_id ? 2 : r.division_id === null ? 0 : -99) + (r.doc_type === doc.doc_type ? 1 : r.doc_type === null ? 0 : -99);
  expected = (routes ?? []).filter((r) => score(r) >= 0).sort((a, b) => score(b) - score(a))[0]?.drive_folder_id ?? null;
  const { data: people } = await service.from("os_people").select("google_account").in("status", ["active", "onboarding"]).not("google_account", "is", null);
  const known = new Set((people ?? []).map((p) => String(p.google_account).toLowerCase()));

  try {
    const r = await checkDrift(doc.drive_file_id, doc.sensitivity, expected, known);
    await service.from("os_documents").update({ drift_findings: r.findings, drive_checked_at: new Date().toISOString(), drive_modified_at: r.modifiedTime }).eq("id", id);
    return NextResponse.json({ findings: r.findings });
  } catch (e) {
    console.error("[os documents] drift check failed", (e as { code?: number })?.code ?? "unknown");
    return jsonError(driveError(e), 502);
  }
}

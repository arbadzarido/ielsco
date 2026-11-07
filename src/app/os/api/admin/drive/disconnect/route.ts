import { NextResponse } from "next/server";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { driveConnection, removeDriveConnection } from "@/lib/os/drive-oauth";
import { osServiceClient } from "@/lib/os/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Founders only: revoke and forget the connected Google account. Existing Drive files are not touched.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Not allowed.", 403);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: founder } = await auth.supabase.rpc("os_is_founder");
  if (!founder) return jsonError("Founders only.", 403);
  const c = await driveConnection();
  await removeDriveConnection();
  if (c) await osServiceClient()?.from("os_audit_log").insert({ actor_person_id: auth.personId, action: "drive.disconnected", target_type: "os_drive_connection", target_id: "drive", detail: { google_email: c.google_email } });
  return NextResponse.json({ ok: true });
}

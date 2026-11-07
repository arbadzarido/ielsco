import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { checkFolderAccess } from "@/lib/os/drive";
import { osServiceClient } from "@/lib/os/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Founders: check that a route's Drive folder exists, the service account reads it and the Drive writer can add files.
// Reads Drive only; records the result on the route.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Not allowed.", 403);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: founder } = await auth.supabase.rpc("os_is_founder");
  if (!founder) return jsonError("Founders only.", 403);
  const body = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError("Bad request.");
  const { data: route } = await auth.supabase.from("os_folder_routes").select("id, drive_folder_id").eq("id", body.data.id).maybeSingle();
  if (!route) return jsonError("Not found.", 404);
  const r = await checkFolderAccess(route.drive_folder_id as string);
  await osServiceClient()?.from("os_folder_routes").update({ access_ok: r.ok, access_detail: r.detail, access_checked_at: new Date().toISOString() }).eq("id", route.id);
  return NextResponse.json(r);
}

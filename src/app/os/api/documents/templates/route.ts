import { NextResponse } from "next/server";
import { requireOsPerson } from "@/lib/os/api";
import { driveError, listTemplates } from "@/lib/os/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The master templates in Drive (02.1 Master Templates). Staff only.
export async function GET() {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: staff } = await auth.supabase.rpc("os_is_staff");
  if (!staff) return NextResponse.json({ error: "Templates are for staff." }, { status: 403 });
  try {
    return NextResponse.json({ templates: await listTemplates() });
  } catch (e) {
    console.error("[os documents] templates failed", (e as { code?: number })?.code ?? "unknown");
    return NextResponse.json({ error: driveError(e), templates: [] }, { status: 503 });
  }
}

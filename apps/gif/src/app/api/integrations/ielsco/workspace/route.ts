import { NextResponse } from "next/server";
import { bridgeSecrets, verifyWorkspaceRequest } from "@/lib/ielsco-bridge";
import { workspaceFor } from "@/lib/workspace";
import { logDbError } from "@/lib/db";

// POST /api/integrations/ielsco/workspace — server-to-server from the IELSco app (never from browsers). Body
// {sub, email} of the signed-in IELSco user, signed with IELSCO_GIF_SSO_SECRET (X-IELSco-Signature). Read-only:
// returns that person's GIF journey for the GIF workspace in the IELSco dashboard. Exempt from the Origin check in
// proxy.ts because it authenticates with the signature instead.
export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 2000) return json(413, { error: "too_large" });
  const v = verifyWorkspaceRequest(req.headers.get("x-ielsco-signature"), raw, bridgeSecrets());
  if (!v.ok) return json(v.error === "not_configured" ? 503 : 401, { error: v.error });
  try {
    return json(200, await workspaceFor({ id: v.identity.sub, email: v.identity.email }));
  } catch (e) {
    logDbError("ielsco-workspace", e);
    return json(503, { error: "unavailable" });
  }
}

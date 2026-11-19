import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { recordConsents } from "@/lib/applications";
import { clientIp, userAgent } from "@/lib/request";

// Records the analytics choice against the account when the visitor is signed in (anonymous visitors: browser only).
export async function POST(req: Request) {
  const a = await getAccount().catch(() => null);
  if (!a) return new NextResponse(null, { status: 204 });
  const b = (await req.json().catch(() => ({}))) as { accepted?: unknown };
  await recordConsents(a.id, null, null, { analytics: b.accepted === true }, { ip: await clientIp(), userAgent: await userAgent() }).catch(() => {});
  return new NextResponse(null, { status: 204 });
}

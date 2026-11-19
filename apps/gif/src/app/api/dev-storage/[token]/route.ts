import { NextResponse } from "next/server";
import { localRead, localWrite, verifyLocalToken } from "@/lib/storage";

// Local/test storage only (GIF_STORAGE_DRIVER=local). Refused on Vercel production by lib/storage.
function enabled() {
  return process.env.GIF_STORAGE_DRIVER === "local" && process.env.VERCEL_ENV !== "production";
}

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!enabled()) return NextResponse.json({ error: "not found" }, { status: 404 });
  const key = verifyLocalToken((await params).token, "put");
  if (!key) return NextResponse.json({ error: "invalid token" }, { status: 403 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > 105 * 1024 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });
  await localWrite(key, buf);
  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!enabled()) return NextResponse.json({ error: "not found" }, { status: 404 });
  const key = verifyLocalToken((await params).token, "get");
  if (!key) return NextResponse.json({ error: "invalid token" }, { status: 403 });
  try {
    return new NextResponse(new Uint8Array(await localRead(key)), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": "attachment" } });
  } catch { return NextResponse.json({ error: "not found" }, { status: 404 }); }
}

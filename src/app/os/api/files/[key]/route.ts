import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireOsPerson } from "@/lib/os/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Internal presentations kept with the code (src/content/os/files) and served only to Company OS staff, only on the
// OS host (the proxy never routes /os on public hosts). The file list is fixed: nothing from the URL reaches the path.
const FILES: Record<string, { file: string; name: string }> = {
  "hq-leaders-meeting-01": { file: "hq-leaders-meeting-01.pptx", name: "HQ-Leaders-Meeting-01-2026-11-26.pptx" },
  "learning-circle": { file: "learning-circle.pptx", name: "IELS-Circle-Project-Overview-and-Team-Learning.pptx" },
  "learning-gif": { file: "learning-gif.pptx", name: "Global-Impact-Fellowship-Project-Overview-and-Team-Learning.pptx" },
  "learning-elco": { file: "learning-elco.pptx", name: "Elco-AI-Project-Overview-and-Team-Learning.pptx" },
  "learning-course": { file: "learning-course.pptx", name: "IELS-Course-Project-Overview-and-Team-Learning.pptx" },
};

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const f = Object.prototype.hasOwnProperty.call(FILES, key) ? FILES[key] : null;
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: staff } = await auth.supabase.rpc("os_is_staff");
  if (!staff) return NextResponse.json({ error: "Staff only." }, { status: 403 });
  const body = await readFile(join(process.cwd(), "src", "content", "os", "files", f.file));
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${f.name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// GET /api/gif/admin/export?report=statuses|individual|teams|scores|pending — CSV reports for GIF admins only.
// Authorised on the server (gif_is_admin via the caller's session); every query also runs under RLS as that admin.
import { NextResponse, type NextRequest } from "next/server";
import { requireGifAdmin } from "@/lib/gif/admin-auth";
import { REPORTS, buildReport, type ReportKind, type RosterRow } from "@/lib/gif/report";
import type { Assessment, Assignment, Submission } from "@/lib/gif/portal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireGifAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Sign in first." : "Admins only." }, { status: auth.status });
  const kind = req.nextUrl.searchParams.get("report") as ReportKind | null;
  if (!kind || !REPORTS.some((r) => r.kind === kind)) return NextResponse.json({ error: "Unknown report." }, { status: 400 });

  const { supabase } = auth;
  const [roster, assignments, submissions, assessments] = await Promise.all([
    supabase.rpc("gif_admin_roster"),
    supabase.from("gif_assignments").select("*"),
    supabase.from("gif_submissions").select("*"),
    supabase.from("gif_assessments").select("*"),
  ]);
  const err = roster.error || assignments.error || submissions.error || assessments.error;
  if (err) return NextResponse.json({ error: "Couldn't build the report." }, { status: 500 });

  const { filename, csv } = buildReport(kind, (roster.data ?? []) as RosterRow[], (assignments.data ?? []) as Assignment[],
    (submissions.data ?? []) as Submission[], (assessments.data ?? []) as Assessment[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { driveConfigured } from "@/lib/os/drive";
import { driveConnection, oauthConfigured } from "@/lib/os/drive-oauth";
import { matchRoute, missingRouteText, type FolderRoute } from "@/lib/os/routes";
import { companyName } from "@/lib/os/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Before "Create in Drive": which approved folder this document would go to, or exactly which route is missing, plus
// whether the person may create it and whether Drive file creation is connected. Reads routes as the person (RLS).
const TYPES = ["GOV", "POL", "SOP", "TPL", "PLN", "RPT", "MIN", "PRP", "CTR", "FIN", "REF", "LET", "MOM"];
const SENS = ["Internal", "Confidential", "Restricted"];

export async function GET(req: Request) {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const u = new URL(req.url);
  const company = u.searchParams.get("company") ?? "", docType = u.searchParams.get("doc_type") ?? "", sensitivity = u.searchParams.get("sensitivity") ?? "Internal";
  const division = u.searchParams.get("division") || null;
  if (!["HQ", "IEL", "ELC"].includes(company) || !TYPES.includes(docType) || !SENS.includes(sensitivity) || (division && !/^DIV-0[1-9]$/.test(division))) return jsonError("Choose a company, type and sensitivity.");
  const [{ data: routes }, { data: canCreate }, { data: div }] = await Promise.all([
    auth.supabase.from("os_folder_routes").select("id, company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, status, access_ok").eq("company_code", company).eq("sensitivity", sensitivity).in("status", ["approved", "proposed"]),
    auth.supabase.rpc("os_can_create", { p_company: company, p_division: division, p_sensitivity: sensitivity }),
    division ? auth.supabase.from("os_divisions").select("name").eq("id", division).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const q = { company, division, docType, sensitivity };
  const route = matchRoute((routes ?? []) as FolderRoute[], q);
  const proposed = route ? null : matchRoute((routes ?? []) as FolderRoute[], q, "proposed");
  const conn = oauthConfigured() ? await driveConnection().catch(() => null) : null;
  const writer = { reading: driveConfigured(), configured: oauthConfigured(), connected: Boolean(conn) };
  const problems: string[] = [];
  if (!canCreate) problems.push("You can't create documents for that company, division and sensitivity.");
  if (!route) problems.push(missingRouteText(q, { company: companyName(company), division: (div as { name?: string } | null)?.name ?? null }, proposed));
  if (route && route.access_ok === false) problems.push(`The approved folder “${route.folder_name}” failed its last access check. A founder can re-check it in Admin → Drive folder routes.`);
  if (!writer.reading) problems.push("Google Drive isn't connected on the server.");
  else if (!writer.connected) problems.push("Creating files in Drive needs a founder to connect Google Drive in Admin → Integration health.");
  return NextResponse.json({
    ok: problems.length === 0,
    route: route ? { id: route.id, folder_name: route.folder_name, specific_division: route.division_id !== null, specific_type: route.doc_type !== null } : null,
    missing: route ? null : { company, division, doc_type: docType, sensitivity, proposed_route: proposed ? { id: proposed.id, folder_name: proposed.folder_name } : null },
    can_create: Boolean(canCreate), writer, problems,
  });
}

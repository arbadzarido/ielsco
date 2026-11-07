import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { copyTemplate, driveConfigured, driveError, driveIdFromUrl, uploadFile } from "@/lib/os/drive";
import { matchRoute, missingRouteText, type FolderRoute } from "@/lib/os/routes";
import { companyName } from "@/lib/os/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates a document three ways: from a master template (Drive copy), by uploading a file, or by registering a file
// that already exists in Drive. The register row is written with the caller's own session, so RLS decides whether they
// may create a document for that company, division and sensitivity. Files land only in an APPROVED folder route; no
// folder is ever created and no sharing is changed.
const TYPES = ["GOV", "POL", "SOP", "TPL", "PLN", "RPT", "MIN", "PRP", "CTR", "FIN", "REF", "LET", "MOM"];
const SENS = ["Internal", "Confidential", "Restricted"];
const LINKABLE = ["project", "task", "meeting", "partnership", "decision", "campaign", "objective", "kpi"];
const MAX_UPLOAD = 25 * 1024 * 1024;


export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad request", 400);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Send the form as multipart/form-data.");
  const s = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string).trim() : "");
  const mode = s("mode");
  const title = s("title");
  const company = s("company_code");
  const division = s("division_id") || null;
  const docType = s("doc_type");
  const sensitivity = s("sensitivity") || "Internal";
  if (!["template", "upload", "register"].includes(mode)) return jsonError("Choose how to add the document.");
  if (!title || title.length > 300) return jsonError("Give the document a title (up to 300 characters).");
  if (!["HQ", "IEL", "ELC"].includes(company)) return jsonError("Choose a company.");
  if (!TYPES.includes(docType)) return jsonError("Choose a document type.");
  if (!SENS.includes(sensitivity)) return jsonError("Choose a sensitivity.");
  const linkType = s("link_type"), linkId = s("link_id");
  if (linkType && !LINKABLE.includes(linkType)) return jsonError("That record type can't have documents.");

  const service = osServiceClient();
  if (mode !== "register" && (!service || !driveConfigured())) return jsonError("Google Drive isn't connected on this deployment yet, so new files can't be created. You can still register a file that already exists in Drive.", 503);

  // Folder routing: the most specific APPROVED route for company, division, type and sensitivity.
  let route: FolderRoute | null = null;
  if (mode !== "register") {
    const { data: routes } = await supabase.from("os_folder_routes").select("id, company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, status")
      .in("status", ["approved", "proposed"]).eq("company_code", company).eq("sensitivity", sensitivity);
    const q = { company, division, docType, sensitivity };
    route = matchRoute((routes ?? []) as FolderRoute[], q);
    if (!route) {
      const { data: div } = division ? await supabase.from("os_divisions").select("name").eq("id", division).maybeSingle() : { data: null };
      return NextResponse.json({ error: missingRouteText(q, { company: companyName(company), division: (div as { name?: string } | null)?.name ?? null }, matchRoute((routes ?? []) as FolderRoute[], q, "proposed")), missing_route: q }, { status: 409 });
    }
  }

  let driveUrl: string | null = null;
  if (mode === "register") {
    driveUrl = s("drive_url");
    if (!/^https:\/\/(docs|drive)\.google\.com\//.test(driveUrl) || !driveIdFromUrl(driveUrl)) return jsonError("Paste a Google Docs or Drive link.");
  }
  const file = form.get("file");
  if (mode === "upload") {
    if (!(file instanceof File) || file.size === 0) return jsonError("Choose a file to upload.");
    if (file.size > MAX_UPLOAD) return jsonError("Files can be up to 25 MB.");
  }
  const templateId = s("template_file_id");
  if (mode === "template" && !/^[A-Za-z0-9_-]{20,}$/.test(templateId)) return jsonError("Choose a template.");

  // 1. The register row, as the caller (RLS).
  const { data: doc, error } = await supabase.from("os_documents").insert({
    title, company_code: company, division_id: division, doc_type: docType, sensitivity, category: s("category") || null,
    owner_person_id: auth.personId, status: "Draft", drive_url: driveUrl,
  }).select("id").single();
  if (error || !doc) return jsonError(/row-level|permission/i.test(error?.message ?? "") ? "You can't add documents for that company, division or sensitivity." : "The document couldn't be saved.", 403);

  if (mode === "register") {
    if (service) await service.from("os_documents").update({ drive_file_id: driveIdFromUrl(driveUrl!) }).eq("id", doc.id);
    if (linkType && linkId) await supabase.from("os_document_links").insert({ document_id: doc.id, entity_type: linkType, entity_id: linkId });
    return NextResponse.json({ id: doc.id });
  }

  // 2. A document number, reserved as the caller (os_next_doc_number checks they work in the company).
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date()));
  const { data: n, error: nErr } = await supabase.rpc("os_next_doc_number", { p_company: company, p_type: docType, p_year: year });
  if (nErr || typeof n !== "number") {
    await service!.from("os_documents").delete().eq("id", doc.id);
    return jsonError("A document number couldn't be reserved.", 403);
  }
  const reference = `${company}-${docType}-${year}-${String(n).padStart(3, "0")}`;
  // Naming follows the existing Drive convention ("HQ-TPL — Title"): reference, em dash, title.
  const name = `${reference} — ${title}`;

  // 3. The file in Drive.
  try {
    const f = mode === "template"
      ? await copyTemplate(templateId, name, route!.drive_folder_id)
      : await uploadFile(name, (file as File).type || "application/octet-stream", Readable.from(Buffer.from(await (file as File).arrayBuffer())), route!.drive_folder_id);
    await service!.from("os_documents").update({
      reference_number: reference, drive_file_id: f.id, drive_url: f.webViewLink, drive_mime_type: f.mimeType, drive_folder_id: route!.drive_folder_id,
      folder_route_id: route!.id, template_file_id: mode === "template" ? templateId : null, drive_modified_at: f.modifiedTime,
    }).eq("id", doc.id);
  } catch (e) {
    console.error("[os documents] drive step failed", (e as { code?: number })?.code ?? (e as Error)?.message);
    await service!.from("os_documents").delete().eq("id", doc.id);
    return jsonError((e as Error)?.message === "not-a-template" ? "That file isn't a master template." : driveError(e), 502);
  }
  if (linkType && linkId) await supabase.from("os_document_links").insert({ document_id: doc.id, entity_type: linkType, entity_id: linkId });
  return NextResponse.json({ id: doc.id, reference });
}

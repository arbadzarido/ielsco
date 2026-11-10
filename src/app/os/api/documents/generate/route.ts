import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { jsonError, requireOsPerson, sameOrigin } from "@/lib/os/api";
import { osServiceClient } from "@/lib/os/server";
import { copyTemplate, createDocFromHtml, driveConfigured, driveError } from "@/lib/os/drive";
import { driveConnection, oauthConfigured } from "@/lib/os/drive-oauth";
import { companyName } from "@/lib/os/meta";
import { type FolderRoute } from "@/lib/os/routes";
import { divisionFor, legalState, missingConfiguration, resolveStorage, TEMPLATE_COLUMNS, validateInputs, type DocTemplate } from "@/lib/os/doc-templates";
import { MANAGER_AGREEMENT_KEY, managerAgreementTitle, readManagerAgreement, renderManagerAgreementHtml, withFields, type RenderContext } from "@/lib/os/manager-agreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Template-first generation. The template decides company options, division, type, sensitivity, readers, fields and
// folder; the person only fills in the fields. Three modes:
//   check    eligibility + where it would be filed (or exactly what is missing)
//   preview  the filled document, for review. Needs no folder and no Drive connection, so a draft can always be previewed.
//   save     creates the register row (as the caller, so the database re-checks everything), then the Google file in the
//            APPROVED folder only. Never a proposed route, never a fallback folder.
const LEGAL_COMPANIES: Record<string, string> = { IEL: "PT English Space Berkah Indonesia", ELC: "PT Elco Edukasi Berkah Indonesia" };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Bad request", 400);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { supabase, personId } = auth;
  const body = await req.json().catch(() => null) as { template_id?: unknown; mode?: unknown; company?: unknown; division?: unknown; title?: unknown; inputs?: unknown } | null;
  if (!body) return jsonError("Send JSON.");
  const mode = body.mode === "save" || body.mode === "preview" || body.mode === "check" ? body.mode : null;
  const templateId = typeof body.template_id === "string" ? body.template_id : "";
  if (!mode || !templateId) return jsonError("Choose a template.");
  const inputs = (body.inputs && typeof body.inputs === "object" ? body.inputs : {}) as Record<string, unknown>;

  // The template, as the caller (RLS only returns active templates they may generate).
  const { data: row } = await supabase.from("os_doc_templates").select(TEMPLATE_COLUMNS).eq("id", templateId).maybeSingle();
  if (!row) return jsonError("That template isn't available to you.", 404);
  const t = withFields(row as DocTemplate);
  const { data: allowed } = await supabase.rpc("os_template_can_generate", { p_template: t.id });
  if (!allowed) return jsonError("You can't generate documents from this template.", 403);

  // Company: the only valid ones are the template's.
  const requested = typeof body.company === "string" ? body.company : "";
  const company = requested || (t.company_codes.length === 1 ? t.company_codes[0] : "");
  if (!company || !t.company_codes.includes(company)) return jsonError(t.company_codes.length > 1 ? "Choose the company this is for." : "That company isn't supported by this template.");

  // Division: fixed by the template, or chosen from the ones it supports.
  const divisionChoice = typeof body.division === "string" && body.division ? body.division : null;
  const division = divisionFor(t, divisionChoice);
  if (!t.storage_division_id && !division && t.division_ids !== null) return jsonError("Choose the division this is for.");
  if (!t.storage_division_id && divisionChoice && t.division_ids && !t.division_ids.includes(divisionChoice)) return jsonError("That division isn't supported by this template.");

  const [{ data: routes }, { data: divRows }] = await Promise.all([
    supabase.from("os_folder_routes").select("id, company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, status, access_ok").in("status", ["approved", "proposed"]).eq("company_code", company),
    supabase.from("os_divisions").select("id, name"),
  ]);
  const divName = new Map(((divRows ?? []) as { id: string; name: string }[]).map((d) => [d.id, d.name]));
  const res = resolveStorage({ ...t, company_codes: [company] }, (routes ?? []) as FolderRoute[], { company: companyName, division: (d) => divName.get(d) ?? null }, division)[0];
  const missing = missingConfiguration(res, t, companyName(company), res.division ? divName.get(res.division) ?? null : null);
  const legal = legalState(t);
  // Creating files needs the connected writer account. Copying a Drive master template also needs the service account to read it.
  const writerOk = oauthConfigured() && Boolean(await driveConnection().catch(() => null)) && (t.kind === "builtin" || driveConfigured());

  if (mode === "check") {
    return NextResponse.json({ ok: Boolean(res.route) && writerOk, folder: res.route ? { name: res.route.folder_name, specific_division: res.route.division_id !== null } : null, missing, writer_connected: writerOk, legal });
  }

  // Fields. A Drive-copy template has none beyond the title.
  let html = "", title = typeof body.title === "string" ? body.title.trim() : "", subject: string | null = null, stored: Record<string, unknown> | null = null;
  if (t.kind === "builtin" && t.builtin_key === MANAGER_AGREEMENT_KEY) {
    const parsed = readManagerAgreement(inputs);
    const errs = { ...validateInputs(t.fields.filter((f) => !["number"].includes(f.type)), inputs), ...parsed.errors };
    if (!(await divisionExists(supabase, parsed.values.manager_division))) errs.manager_division = "Choose the manager's division.";
    if (Object.keys(errs).length) return NextResponse.json({ error: "Check the highlighted fields.", field_errors: errs }, { status: 422 });
    const mode2: RenderContext["mode"] = legal === "execution_ready" ? "execution_ready" : "internal_draft";
    const ctx: RenderContext = { companyLegalName: LEGAL_COMPANIES[company] ?? companyName(company), companyName: companyName(company), divisionName: divName.get(parsed.values.manager_division) ?? parsed.values.manager_division, mode: mode2, generatedOn: new Date().toISOString().slice(0, 10) };
    html = renderManagerAgreementHtml(parsed.values, ctx);
    title = managerAgreementTitle(parsed.values, mode2);
    subject = parsed.values.manager_person || null;
    stored = { ...parsed.values };
    if (mode === "preview") return NextResponse.json({ html, title, warnings: parsed.warnings, legal, folder: res.route?.folder_name ?? null, missing });
  } else {
    const errs = validateInputs(t.fields, inputs);
    if (!title || title.length > 300) errs.title = "Give the document a title (up to 300 characters).";
    if (Object.keys(errs).length) return NextResponse.json({ error: "Check the highlighted fields.", field_errors: errs }, { status: 422 });
    if (mode === "preview") return NextResponse.json({ html: null, title, warnings: [], legal, folder: res.route?.folder_name ?? null, missing });
  }

  // ── save ──
  if (!res.route) return NextResponse.json({ error: `No approved Drive folder yet. ${missing.join(" ")}`, missing }, { status: 409 });
  const service = osServiceClient();
  if (!service) return jsonError("Company OS isn't fully configured on this deployment, so the file can't be created.", 503);
  if (!writerOk) return jsonError("Creating files in Drive needs a founder to connect Google Drive in Admin → Integration health.", 503);
  if (subject && !(await personExists(service, subject))) return jsonError("That Company OS profile wasn't found.", 422);

  // 1. The register row, as the caller. The database re-checks the template, company, division, type and sensitivity.
  const { data: doc, error } = await supabase.from("os_documents").insert({
    title, company_code: company, division_id: res.division, doc_type: t.doc_type, sensitivity: t.sensitivity, category: t.category,
    owner_person_id: personId, status: "Draft", template_id: t.id, subject_person_id: subject,
  }).select("id").single();
  if (error || !doc) return jsonError(/row-level|permission|can't generate|isn't available/i.test(error?.message ?? "") ? "You can't generate this document for that company or division." : "The document couldn't be saved.", 403);

  // 2. A document number, reserved as the caller.
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date()));
  const { data: n, error: nErr } = await supabase.rpc("os_next_doc_number", { p_company: company, p_type: t.doc_type, p_year: year });
  if (nErr || typeof n !== "number") { await service.from("os_documents").delete().eq("id", doc.id); return jsonError("A document number couldn't be reserved.", 403); }
  const reference = `${company}-${t.doc_type}-${year}-${String(n).padStart(3, "0")}`;
  const name = `${reference} — ${title}`;

  // 3. The file, in the approved folder.
  try {
    const f = t.kind === "builtin" ? await createDocFromHtml(name, html, res.route.drive_folder_id) : await copyTemplate(t.drive_template_file_id!, name, res.route.drive_folder_id);
    await service.from("os_documents").update({
      reference_number: reference, drive_file_id: f.id, drive_url: f.webViewLink, drive_mime_type: f.mimeType, drive_folder_id: res.route.drive_folder_id,
      folder_route_id: res.route.id, template_file_id: t.kind === "drive_copy" ? t.drive_template_file_id : null, drive_modified_at: f.modifiedTime,
      inputs: stored, version: `v${t.version}`, status: t.approval_required ? "In Review" : "Draft",
      notes: legal === "internal_draft" ? "Internal draft: the template is pending legal review. Not for signature." : null,
    }).eq("id", doc.id);
  } catch (e) {
    console.error("[os documents] generate drive step failed", (e as { code?: number })?.code ?? (e as Error)?.message);
    await service.from("os_documents").delete().eq("id", doc.id);
    return jsonError((e as Error)?.message === "not-a-template" ? "That file isn't a master template." : driveError(e), 502);
  }
  await service.from("os_audit_log").insert({ actor_person_id: personId, action: "document.generate", target_type: "document", target_id: doc.id, detail: { template_id: t.id, template_version: t.version, company, division: res.division, legal } });
  return NextResponse.json({ id: doc.id, reference, legal, needs_approval: t.approval_required });
}

async function divisionExists(client: SupabaseClient, id: string) {
  if (!id) return false;
  const { data } = await client.from("os_divisions").select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}
async function personExists(client: SupabaseClient, id: string) {
  const { data } = await client.from("os_people").select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}

import { NextResponse } from "next/server";
import { requireOsPerson } from "@/lib/os/api";
import { companyName } from "@/lib/os/meta";
import { type FolderRoute } from "@/lib/os/routes";
import { companyOptions, legalState, recommend, resolveStorage, TEMPLATE_COLUMNS, type DocTemplate } from "@/lib/os/doc-templates";
import { withFields } from "@/lib/os/manager-agreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The template catalog for this person: the active templates their role allows (RLS decides), with for each company the
// approved folder it would be filed in, or exactly what is missing. Reads as the person.
export async function GET() {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { supabase, personId } = auth;
  const [{ data: rows }, { data: routes }, { data: recentDocs }, { data: mine }, { data: divisions }] = await Promise.all([
    supabase.from("os_doc_templates").select(TEMPLATE_COLUMNS).eq("active", true).order("category").order("name"),
    supabase.from("os_folder_routes").select("id, company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, status, access_ok").in("status", ["approved", "proposed"]),
    supabase.from("os_documents").select("template_id").eq("owner_person_id", personId).not("template_id", "is", null).order("created_at", { ascending: false }).limit(30),
    supabase.from("os_person_divisions").select("division_id").eq("person_id", personId),
    supabase.from("os_divisions").select("id, name"),
  ]);
  const divName = new Map(((divisions ?? []) as { id: string; name: string }[]).map((d) => [d.id, d.name]));
  const templates = ((rows ?? []) as DocTemplate[]).map(withFields);
  const canCache = new Map<string, boolean>();
  const canCreate = async (c: string, d: string | null, s: string) => {
    const k = `${c}|${d}|${s}`;
    if (!canCache.has(k)) canCache.set(k, Boolean((await supabase.rpc("os_can_create", { p_company: c, p_division: d, p_sensitivity: s })).data));
    return canCache.get(k)!;
  };
  const out: (DocTemplate & { legal: ReturnType<typeof legalState>; options: ReturnType<typeof companyOptions>; needsDivision: boolean; divisionChoices: string[] })[] = [];
  for (const t of templates) {
    const res = resolveStorage(t, (routes ?? []) as FolderRoute[], { company: companyName, division: (d) => divName.get(d) ?? null });
    for (const r of res) await canCreate(r.company, r.division, t.sensitivity);
    const options = companyOptions(t, res, { isFounder: false, divisionIds: [], canCreate: (c, d, s) => canCache.get(`${c}|${d}|${s}`) ?? false }, companyName);
    out.push({
      ...t, legal: legalState(t), options,
      needsDivision: !t.storage_division_id && !(t.division_ids?.length === 1),
      divisionChoices: t.storage_division_id ? [] : (t.division_ids ?? [...divName.keys()]),
    });
  }
  const recent = Array.from(new Set(((recentDocs ?? []) as { template_id: string }[]).map((r) => r.template_id))).filter((id) => out.some((t) => t.id === id)).slice(0, 4);
  const recommended = recommend(templates, { divisionIds: ((mine ?? []) as { division_id: string }[]).map((m) => m.division_id) }).map((t) => t.id).filter((id) => !recent.includes(id));
  return NextResponse.json({ templates: out, recent, recommended });
}

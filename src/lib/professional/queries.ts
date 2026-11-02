// One loader for every surface (public page, landing section, dashboard): pass the anonymous server client or the
// browser client. RLS returns published listings and active partners only (staff also see drafts, so callers that
// render public lists filter on publication through the query below).
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicSupabase } from "@/lib/supabase/public";
import { attachPartners, JOB_COLUMNS, PARTNER_COLUMNS, type ProfessionalOpportunity, type RecruitmentPartner } from "./model";

type Row = Omit<ProfessionalOpportunity, "partner">;

async function withPartners(supabase: SupabaseClient, rows: Row[]) {
  const ids = [...new Set(rows.map((r) => r.partner_id))];
  if (!ids.length) return [];
  const { data } = await supabase.from("recruitment_partners").select(PARTNER_COLUMNS).in("id", ids);
  return attachPartners(rows, (data as RecruitmentPartner[]) ?? []);
}

// Throws on a database error so dashboard loaders can show their retry state; the server wrappers below swallow it.
export async function loadProfessional(supabase: SupabaseClient, opts: { featuredOnly?: boolean; limit?: number } = {}): Promise<ProfessionalOpportunity[]> {
  let q = supabase.from("professional_opportunities").select(JOB_COLUMNS).eq("publication", "published");
  if (opts.featuredOnly) q = q.eq("featured", true);
  q = q.order("featured", { ascending: false }).order("title");
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return withPartners(supabase, (data as Row[]) ?? []);
}

export async function loadProfessionalBySlug(supabase: SupabaseClient, slug: string): Promise<ProfessionalOpportunity | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  const { data, error } = await supabase.from("professional_opportunities").select(JOB_COLUMNS).eq("slug", slug).eq("publication", "published").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return (await withPartners(supabase, [data as Row]))[0] ?? null;
}

export async function listPublishedProfessional(): Promise<ProfessionalOpportunity[]> {
  try { return await loadProfessional(publicSupabase()); } catch { return []; }
}

export async function getProfessional(slug: string): Promise<ProfessionalOpportunity | null> {
  try { return await loadProfessionalBySlug(publicSupabase(), slug); } catch { return null; }
}

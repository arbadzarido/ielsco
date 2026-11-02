import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countryName } from "@/lib/professional/model";
import { notifyInterest } from "@/lib/professional/notify";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const opt = (max: number) => z.string().trim().max(max).optional().default("");

// Expression of interest for a professional listing. Stored through public.submit_opportunity_interest() (validated,
// de-duplicated and rate-limited in the database) with the visitor's own session, so no service key is needed; then the
// careers inbox is emailed when email is configured. The optional CV was uploaded by the browser beforehand.
// `website` is a honeypot.
const Body = z.object({
  id: z.string().uuid(),
  opportunityId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().min(8).max(24),
  countryOfInterest: z.string().trim().min(2).max(80),
  position: z.string().trim().min(2).max(120),
  statement: z.string().trim().min(20).max(1500),
  occupation: opt(160),
  experience: opt(1500),
  linkedin: opt(300),
  cvPath: opt(200),
  preferredContact: z.enum(["whatsapp", "email"]),
  consent: z.literal(true),
  consentVersion: z.string().min(4).max(40),
  source: z.enum(["public", "dashboard"]),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "form");
    return NextResponse.json({ error: "invalid", field }, { status: 400, headers: noStore });
  }
  const b = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_opportunity_interest", {
    p_id: b.id, p_opportunity_id: b.opportunityId, p_full_name: b.fullName, p_email: b.email, p_whatsapp: b.whatsapp,
    p_country_of_interest: b.countryOfInterest, p_position: b.position, p_statement: b.statement, p_occupation: b.occupation,
    p_experience: b.experience, p_linkedin_url: b.linkedin, p_cv_path: b.cvPath, p_preferred_contact: b.preferredContact,
    p_consent: b.consent, p_consent_version: b.consentVersion, p_source: b.source,
  });
  if (error) {
    const m = error.message ?? "";
    if (/already_submitted/.test(m)) return NextResponse.json({ error: "already_submitted" }, { status: 409, headers: noStore });
    if (/opportunity_closed/.test(m)) return NextResponse.json({ error: "closed" }, { status: 409, headers: noStore });
    if (/too_many/.test(m)) return NextResponse.json({ error: "too_many" }, { status: 429, headers: noStore });
    const field = m.match(/invalid: (\w+)/)?.[1];
    if (field) return NextResponse.json({ error: "invalid", field }, { status: 400, headers: noStore });
    console.error("[interest] insert failed", error.code);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: noStore });
  }
  const row = (data ?? {}) as { title?: string; country_code?: string; partner?: string | null };
  const notified = await notifyInterest({
    id: b.id, title: row.title ?? "Opportunity", country: countryName(row.country_code ?? ""), partner: row.partner ?? null,
    fullName: b.fullName, email: b.email, whatsapp: b.whatsapp, countryOfInterest: b.countryOfInterest, position: b.position,
    statement: b.statement, occupation: b.occupation, experience: b.experience, linkedin: b.linkedin, hasCv: !!b.cvPath,
    preferredContact: b.preferredContact, source: b.source,
  });
  return NextResponse.json({ ok: true, notified }, { headers: noStore });
}

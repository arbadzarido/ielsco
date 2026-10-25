import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const opt = (max: number) => z.string().trim().max(max).optional().default("");

// Partnership, school, careers-interest and membership-waitlist forms. Stored through public.submit_inquiry() (validated
// and rate-limited in the database) with the visitor's own session, so no service key is needed. `website` is a honeypot.
const Body = z.object({
  kind: z.enum(["partner", "school", "careers", "membership_waitlist"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  organization: opt(200),
  role: opt(120),
  phone: opt(40),
  topic: opt(80),
  message: opt(3000),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "form");
    return NextResponse.json({ error: "invalid", field, message: `Please check the ${field} field.` }, { status: 400, headers: noStore });
  }
  const b = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_inquiry", {
    p_kind: b.kind, p_name: b.name, p_email: b.email, p_organization: b.organization, p_role: b.role,
    p_phone: b.phone, p_topic: b.topic, p_message: b.message,
  });
  if (error) {
    if (/too_many/.test(error.message)) return NextResponse.json({ error: "too_many", message: "We've already received several messages from this email today. We'll be in touch." }, { status: 429, headers: noStore });
    console.error("[inquiries] insert failed", error.code);
    return NextResponse.json({ error: "server_error", message: "We couldn't send your message. Please email hello@ielsco.com instead." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}

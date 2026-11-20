"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requestLoginCode, verifyLoginCode, signOut, signInWithIelsco, linkIelscoAccount, requireAccount } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { recordGuardianConsent } from "@/lib/guardian";
import { userAgent } from "@/lib/request";
import { q } from "@/lib/db";
import { overLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { sendEmail } from "@/lib/email/send";
import { sponsorshipReceivedEmail } from "@/lib/email/templates";
import { recordServerEvent } from "@/lib/analytics";
import { COUNTRY_CODES, normalizePhone } from "@/lib/validation";

export type FormState = { ok?: boolean; error?: string; errors?: Record<string, string>; step?: string; email?: string } | null;

function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return /^\/(portal|admin|apply)([/?][\w\-/?=&.%]*)?$/.test(v) && !v.includes("//") ? v : "/portal";
}

export async function requestCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  const r = await requestLoginCode(email);
  if (!r.ok) return { error: r.error, step: "email", email };
  return { ok: true, step: "code", email: email.trim().toLowerCase() };
}

export async function verifyCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  const r = await verifyLoginCode(email, String(fd.get("code") ?? ""));
  if (!r.ok) return { error: r.error, step: "code", email };
  redirect(safeNext(fd.get("next")));
}

export async function signOutAction() {
  await signOut();
  redirect("/login?signed_out=1");
}

const sponsorship = z.object({
  name: z.string().trim().min(2, "Your name is required.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  whatsapp: z.string().transform(normalizePhone).refine((v) => /^\+[1-9]\d{6,14}$/.test(v), "Include the country code, e.g. +62 812 3456 7890."),
  institution: z.string().trim().min(2, "Institution is required.").max(160),
  country: z.string().trim().toUpperCase().refine((c) => COUNTRY_CODES.includes(c), "Choose a country."),
  applicant_type: z.enum(["individual", "team"]),
  amount: z.union([z.literal(""), z.coerce.number().positive().max(1_000_000_000)]).optional(),
  currency: z.enum(["IDR", "USD"]),
  sponsorship_type: z.string().trim().min(2, "Choose a sponsorship type.").max(80),
  notes: z.string().trim().max(2000).optional(),
  acknowledge: z.literal("on", { message: "Please confirm you understand sponsorship is not guaranteed." }),
});

export async function sponsorshipAction(_: FormState, fd: FormData): Promise<FormState> {
  if (String(fd.get("website") ?? "")) return { ok: true }; // honeypot
  const ip = (await clientIp()) ?? "unknown";
  if (await overLimit(`sponsorship:${ip}`, 5, 3600)) return { error: "Too many requests from this network. Please try again later." };
  const parsed = sponsorship.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const d = parsed.data;
  await q(`insert into gif.sponsorship_requests (cohort_id, name, email, whatsapp, institution, country, applicant_type, amount, currency, sponsorship_type, notes)
    select id, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10 from gif.cohorts where is_current`,
    [d.name, d.email, d.whatsapp, d.institution, d.country, d.applicant_type, d.amount === "" || d.amount === undefined ? null : d.amount, d.currency, d.sponsorship_type, d.notes || null]);
  await sendEmail({ to: d.email, template: "sponsorship_received", ...sponsorshipReceivedEmail(d.name) });
  await recordServerEvent("sponsorship_submitted", {});
  return { ok: true };
}

export async function ielscoSignInAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  const r = await signInWithIelsco(email, String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error, email: email.slice(0, 254) };
  redirect(safeNext(fd.get("next")));
}

export async function linkIelscoAction(_: FormState, fd: FormData): Promise<FormState> {
  const a = await requireAccount();
  const r = await linkIelscoAccount(a.id, String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error };
  revalidatePath("/portal", "layout");
  return { ok: true };
}

export async function guardianConsentAction(_: FormState, fd: FormData): Promise<FormState> {
  const ip = (await clientIp()) ?? "unknown";
  if (await overLimit(`guardian-ip:${ip}`, 20, 3600)) return { error: "Too many attempts. Please try again later." };
  if (fd.get("participate") !== "on" || fd.get("data") !== "on" || fd.get("responsible") !== "on") return { error: "Please tick the three statements to give consent." };
  const media = fd.get("media");
  const r = await recordGuardianConsent(String(fd.get("token") ?? ""), { name: String(fd.get("name") ?? ""), relation: String(fd.get("relation") ?? ""), media: media === "yes" ? true : media === "no" ? false : null },
    { ip, userAgent: await userAgent() });
  return r.ok ? { ok: true } : { error: r.error };
}

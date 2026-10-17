// Private account details (public.users): the information events, certificates and check-in need.
// Nothing here is shown in People; public profile data (display name, photo, bio, socials, goals) lives in
// public.member_profiles and is edited on /dashboard/profile.

import type { SupabaseClient, User } from "@supabase/supabase-js";

export const OCCUPATIONS = ["Student", "Worker", "Job Seeker", "Other"] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

export const GENDERS = ["Male", "Female", "Prefer not to say"] as const;

export interface AccountDetails {
  full_name: string;
  email: string;
  member_code: string | null;
  phone: string;
  birth_date: string;
  gender: string;
  domicile: string;
  occupation: Occupation | "";
  institution_name: string;
  institution_role: string;
}

export type EditableField = Exclude<keyof AccountDetails, "email" | "member_code">;

// Students and workers are asked for their school/company; job seekers and "other" aren't.
export const needsInstitution = (occupation: AccountDetails["occupation"]) => occupation === "Student" || occupation === "Worker";

// What an event registration needs before it can go through with one click.
export function missingForEvents(d: AccountDetails): EditableField[] {
  const required: EditableField[] = ["full_name", "phone", "domicile", "occupation"];
  if (needsInstitution(d.occupation)) required.push("institution_name");
  return required.filter((k) => !String(d[k] ?? "").trim());
}

export const FIELD_LABELS: Record<EditableField, string> = {
  full_name: "Full name",
  phone: "WhatsApp number",
  birth_date: "Date of birth",
  gender: "Gender",
  domicile: "City of residence",
  occupation: "Current status",
  institution_name: "School or company",
  institution_role: "Major or job title",
};

export async function loadAccountDetails(supabase: SupabaseClient, user: User): Promise<AccountDetails> {
  const { data, error } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(`Couldn't load your account details: ${error.message}`);
  const occupation = OCCUPATIONS.includes(data?.occupation) ? (data!.occupation as Occupation) : "";
  return {
    full_name: data?.full_name || user.user_metadata?.full_name || "",
    email: user.email ?? "",
    member_code: data?.user_id_code || null,
    phone: data?.phone || "",
    birth_date: data?.birth_date || "",
    gender: data?.gender || "",
    domicile: data?.domicile || "",
    occupation,
    // Older rows used `institution`.
    institution_name: data?.institution_name || data?.institution || "",
    institution_role: data?.institution_role || "",
  };
}

export async function saveAccountDetails(supabase: SupabaseClient, userId: string, d: AccountDetails) {
  const v = (s: string) => s.trim() || null;
  const { error } = await supabase
    .from("users")
    .update({
      full_name: v(d.full_name),
      phone: v(d.phone),
      birth_date: v(d.birth_date),
      gender: v(d.gender),
      domicile: v(d.domicile),
      occupation: v(d.occupation),
      institution_name: v(d.institution_name),
      institution_role: v(d.institution_role),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(`Couldn't save your account details: ${error.message}`);
}

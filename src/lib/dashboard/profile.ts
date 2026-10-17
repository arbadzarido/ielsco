// Load/save the signed-in member's profile and query the privacy-safe member directory.
// Primary storage: public.member_profiles (+ RPC list_member_directory). See supabase/migrations.
// If the migration has not been applied yet, the profile is prefilled from the account (read-only) and saving
// fails with a clear message. There is deliberately no localStorage fallback: a save either reaches the database
// or the member is told it didn't. Other Supabase errors are thrown, never swallowed.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { DirectoryMember, Direction, MemberProfile, ProfileStorage } from "./types";
import { codeForName, countryName, isCountryCode, MAX_DESTINATIONS } from "./countries";

// PostgREST / Postgres codes for "table or function does not exist".
export function isMissingRelation(error: { code?: string } | null) {
  return !!error && ["PGRST205", "PGRST202", "42P01", "42883"].includes(error.code ?? "");
}

// "Column does not exist" (a later migration, e.g. destination_countries, isn't applied yet).
const isMissingColumn = (error: { code?: string } | null) => !!error && ["PGRST204", "42703"].includes(error.code ?? "");

export const PROFILE_UNAVAILABLE_MESSAGE =
  "Saving isn't switched on yet: the IELS database update for member profiles is pending. Your answers are still on this page, but nothing was saved.";

export class ProfileUnavailableError extends Error {
  constructor() {
    super(PROFILE_UNAVAILABLE_MESSAGE);
    this.name = "ProfileUnavailableError";
  }
}

export function emptyProfile(userId: string): MemberProfile {
  return {
    user_id: userId,
    display_name: "",
    avatar_url: null,
    origin_country: null,
    country: null,
    role_status: null,
    bio: null,
    destination_country: null,
    destination_countries: [],
    destination_other: null,
    direction: null,
    interests: [],
    english_level: null,
    linkedin_url: null,
    instagram_url: null,
    portfolio_url: null,
    is_public: false,
    public_fields: ["country", "role_status", "goals"],
    onboarding_completed_at: null,
  };
}

export function normalizeUrl(value: string | null | undefined, kind?: "instagram"): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (kind === "instagram" && !v.includes("/")) return `https://instagram.com/${v.replace(/^@/, "")}`;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

// Rows saved before destination_countries existed only have the single destination_country name.
function withDestinations(p: MemberProfile): MemberProfile {
  if (p.destination_countries?.length || p.destination_other) return { ...p, destination_countries: p.destination_countries ?? [] };
  const code = codeForName(p.destination_country);
  return {
    ...p,
    destination_countries: code ? [code] : [],
    destination_other: !code && p.destination_country && p.destination_country !== "Not decided yet" ? p.destination_country : null,
  };
}

// Clean and validate destinations before saving, and keep the legacy single column in sync (English name of the
// first destination) so the existing directory function keeps working.
export function normalizeDestinations(p: MemberProfile): MemberProfile {
  const codes = [...new Set(p.destination_countries.filter(isCountryCode))].slice(0, MAX_DESTINATIONS);
  const other = p.destination_other?.trim().slice(0, 60) || null;
  return {
    ...p,
    destination_countries: codes,
    destination_other: other,
    destination_country: codes[0] ? countryName(codes[0], "en") : other ?? null,
  };
}

// Read-only prefill from the existing public.users row (never written to from the dashboard).
async function prefillFromAccount(supabase: SupabaseClient, user: User): Promise<MemberProfile> {
  const base = emptyProfile(user.id);
  base.display_name = user.user_metadata?.full_name ?? "";
  base.avatar_url = user.user_metadata?.avatar_url ?? null;

  const { data, error } = await supabase
    .from("users")
    // public.users has no `bio` column (it lives in user_profiles); selecting it made this whole
    // prefill query fail, so new members never got their account data prefilled.
    .select("full_name, avatar_url, domicile, occupation, linkedin, instagram, english_level")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[member-profile] Could not prefill from users table:", error.message);
    return base;
  }
  if (!data) return base;

  return {
    ...base,
    display_name: data.full_name || base.display_name,
    avatar_url: data.avatar_url || base.avatar_url,
    country: data.domicile || null,
    role_status: data.occupation || null,
    linkedin_url: normalizeUrl(data.linkedin),
    instagram_url: normalizeUrl(data.instagram, "instagram"),
    english_level: data.english_level || null,
  };
}

export async function loadMemberProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ profile: MemberProfile; storage: ProfileStorage }> {
  const { data, error } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && !isMissingRelation(error)) {
    throw new Error(`Could not load your profile: ${error.message}`);
  }
  if (error) {
    return { profile: await prefillFromAccount(supabase, user), storage: "unavailable" };
  }
  if (data) {
    return {
      profile: withDestinations({ ...emptyProfile(user.id), ...data, interests: data.interests ?? [], public_fields: data.public_fields ?? [] }),
      storage: "supabase",
    };
  }
  return { profile: await prefillFromAccount(supabase, user), storage: "supabase" };
}

export async function saveMemberProfile(
  supabase: SupabaseClient,
  profile: MemberProfile,
  storage: ProfileStorage
): Promise<ProfileStorage> {
  if (storage === "unavailable") throw new ProfileUnavailableError();
  const { error } = await supabase
    .from("member_profiles")
    .upsert({ ...normalizeDestinations(profile), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (!error) return "supabase";
  if (isMissingRelation(error) || isMissingColumn(error)) throw new ProfileUnavailableError();
  throw new Error(`Couldn't save: ${error.message}. Check your connection and try again; your answers are still here.`);
}

export async function fetchDirectoryPage(
  supabase: SupabaseClient,
  opts: DirectoryQuery & { offset: number; limit: number }
): Promise<{ members: DirectoryMember[]; available: boolean }> {
  const { data, error } = await supabase.rpc("list_member_directory", {
    p_direction: opts.direction,
    p_search: opts.search.trim() || null,
    p_origin: opts.origin || null,
    p_destination: opts.destination || null,
    p_interest: opts.interest || null,
    p_limit: opts.limit,
    p_offset: opts.offset,
  });
  if (error && isMissingRelation(error)) return { members: [], available: false };
  if (error) throw new Error(`Could not load members: ${error.message}`);
  const rows = (data ?? []) as Omit<DirectoryMember, "is_demo">[];
  return { members: rows.map((r) => ({ ...r, interests: r.interests ?? [], is_demo: false })), available: true };
}

export interface DirectoryQuery {
  direction: Direction | null;
  search: string;
  origin: string;
  destination: string;
  interest: string;
}

// How the member appears to others, applying their chosen public fields.
// "Prefer not to say" is never displayed as an origin.
export function toPublicPreview(p: MemberProfile): DirectoryMember {
  const show = (f: MemberProfile["public_fields"][number]) => p.public_fields.includes(f);
  return {
    id: p.user_id,
    display_name: p.display_name || "IELS member",
    avatar_url: p.avatar_url,
    origin_country: show("origin") && p.origin_country !== "Prefer not to say" ? p.origin_country : null,
    country: show("country") ? p.country : null,
    role_status: show("role_status") ? p.role_status : null,
    bio: show("bio") ? p.bio : null,
    destination_country: show("goals") ? p.destination_country : null,
    direction: show("goals") ? p.direction : null,
    interests: show("goals") ? p.interests : [],
    linkedin_url: show("links") ? p.linkedin_url : null,
    instagram_url: show("links") ? p.instagram_url : null,
    portfolio_url: show("links") ? p.portfolio_url : null,
    is_demo: false,
  };
}

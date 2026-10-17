// Shared types for the authenticated IELS dashboard (Home, Explore, People, Programs, Circle, Profile).

export type Direction = "study" | "work" | "explore";

// Fields a member can choose to show in the People directory.
export type PublicField = "origin" | "country" | "role_status" | "bio" | "goals" | "links";

// One row of public.member_profiles (see supabase/migrations/*_member_profiles.sql).
export interface MemberProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  // Country of origin / identifies as being from. Distinct from `country` (where they live now).
  origin_country: string | null;
  country: string | null;
  role_status: string | null;
  bio: string | null;
  // Legacy single destination (display name). Kept in sync with destination_countries for the directory.
  destination_country: string | null;
  // ISO 3166-1 alpha-2 codes, up to MAX_DESTINATIONS (lib/dashboard/countries.ts). Empty = not decided yet.
  destination_countries: string[];
  // "Other": a place not in the list, free text.
  destination_other: string | null;
  direction: Direction | null;
  interests: string[];
  english_level: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  public_fields: PublicField[];
  onboarding_completed_at: string | null;
}

// "supabase" = loads and saves in member_profiles. "unavailable" = the member_profiles migration isn't applied
// yet: nothing can be saved, and the UI says so (there is no browser-only fallback).
export type ProfileStorage = "supabase" | "unavailable";

// What other members are allowed to see (already privacy-masked).
export interface DirectoryMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
  origin_country: string | null;
  country: string | null;
  role_status: string | null;
  bio: string | null;
  destination_country: string | null;
  direction: Direction | null;
  interests: string[];
  linkedin_url: string | null;
  instagram_url: string | null;
  portfolio_url: string | null;
  is_demo: boolean;
  // Server-side score from list_member_directory (shared direction/destination/origin/interests).
  match_score?: number;
}

export type ResourceType =
  | "Website"
  | "Article"
  | "Video"
  | "Podcast"
  | "Course"
  | "Official page"
  | "Tool"
  | "Template";

export type ResourceCategory =
  | "English Speaking"
  | "English for Interviews"
  | "Workplace Communication"
  | "Academic English"
  | "Writing & Applications"
  | "Vocabulary & Grammar"
  | "Learning Strategies";

export type ResourceLevel = "Beginner" | "Intermediate" | "Advanced" | "All levels";

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  level: ResourceLevel;
  // Direction keys ("study" | "work" | "explore") and/or interest labels from lib/dashboard/options.ts
  goalTags: string[];
  source: string;
  url: string | null;
  isFree: boolean;
  // "curated" = external public link (verify before launch). "ielsco-demo" = placeholder IELSco template.
  origin: "curated" | "ielsco-demo";
  // Date the URL last returned HTTP 200 from an automated check; null = needs a manual check.
  linkCheckedOn: string | null;
  // Only set when verified. Never estimate.
  duration?: string;
  // Only an image you have rights to that genuinely represents this resource.
  image?: string;
}

export interface Collection {
  id: string;
  title: string;
  outcome: string;
  description: string;
  level: string;
  cover: string;
  coverAlt: string;
  coverCredit: string;
  resourceIds: string[];
  courseTrack: string | null;
}

export type BookmarkType = "resource" | "collection";

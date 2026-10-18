"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiDraft } from "@/lib/stories/ai";
import { STORY_IMAGE } from "@/lib/stories/questionnaire";
import {
  rowToStory,
  type GalleryItemData,
  type PublicStory,
  type StoryCategory,
  type StoryHighlightData,
  type StoryQuoteData,
  type StoryRow,
  type StorySectionData,
  type StorySeo,
  type StoryStatus,
  type StoryType,
} from "@/lib/stories/types";

// Admin-side data access for the Member Stories CMS. Every call runs with the admin's own session, so RLS
// (public.is_story_admin()) is the real gate.

export interface AdminStory {
  id: string;
  legacy_id: string | null;
  kind: "story" | "placeholder";
  status: StoryStatus;
  slug: string;
  title: string;
  summary: string | null;
  category: StoryCategory;
  legacy_subcategory: string | null;
  story_type: StoryType;
  author_name: string;
  author_country: string | null;
  author_location: string | null;
  author_role: string | null;
  author_bio: string | null;
  author_avatar: string | null;
  social: { instagram?: string; linkedin?: string; website?: string };
  banner_image: string | null;
  legacy_content: string | null;
  sections: StorySectionData[];
  quotes: StoryQuoteData[];
  highlights: StoryHighlightData[];
  gallery: GalleryItemData[];
  credits: { writer?: string; designer?: string };
  seo: StorySeo;
  story_date: string | null;
  sort_date: string | null;
  location: string | null;
  publication_authorized: boolean;
  submission_id: string | null;
  target_country: string | null;
  editorial_brief: { topic_direction?: string; interview_questions?: string[]; media_requirements?: string[]; consent_requirements?: string[] };
  issues: string[];
  editor_notes: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionImage { path: string; bucket?: string; note?: string }

export interface AdminSubmission {
  id: string;
  created_at: string;
  source: "form" | "editorial_import";
  status: string;
  name: string;
  email: string | null;
  country: string | null;
  answers: Record<string, unknown>;
  images: SubmissionImage[];
  consent_review: boolean;
  consent_identity: boolean;
  consent_instagram: boolean;
  consent_at: string | null;
  ai_status: "none" | "generating" | "ready" | "failed";
  ai_draft: AiDraft | null;
  ai_model: string | null;
  ai_error: string | null;
  ai_generated_at: string | null;
  story_id: string | null;
  editor_notes: string | null;
}

export const STORY_LIST_COLUMNS =
  "id, legacy_id, kind, status, slug, title, category, story_type, author_name, author_country, sort_date, story_date, publication_authorized, submission_id, target_country, issues, updated_at, created_at, published_at";
export type StoryListRow = Pick<AdminStory, "id" | "legacy_id" | "kind" | "status" | "slug" | "title" | "category" | "story_type" | "author_name" | "author_country" | "sort_date" | "story_date" | "publication_authorized" | "submission_id" | "target_country" | "issues" | "updated_at" | "created_at" | "published_at">;
export const SUBMISSION_LIST_COLUMNS = "id, created_at, source, status, name, country, consent_review, consent_identity, consent_instagram, ai_status, story_id";
export type SubmissionListRow = Pick<AdminSubmission, "id" | "created_at" | "source" | "status" | "name" | "country" | "consent_review" | "consent_identity" | "consent_instagram" | "ai_status" | "story_id">;

export const EDITABLE_FIELDS = [
  "status", "slug", "title", "summary", "category", "story_type", "author_name", "author_country", "author_location", "author_role",
  "author_bio", "author_avatar", "social", "banner_image", "sections", "quotes", "highlights", "gallery", "credits", "seo", "story_date",
  "sort_date", "location", "publication_authorized", "issues", "editor_notes",
] as const;

export function emptyStory(): AdminStory {
  return {
    id: "", legacy_id: null, kind: "story", status: "draft", slug: "", title: "", summary: "", category: "circle", legacy_subcategory: null,
    story_type: "other", author_name: "", author_country: null, author_location: null, author_role: null, author_bio: null, author_avatar: null,
    social: {}, banner_image: null, legacy_content: null, sections: [], quotes: [], highlights: [], gallery: [], credits: {}, seo: {},
    story_date: null, sort_date: null, location: null, publication_authorized: false, submission_id: null, target_country: null,
    editorial_brief: {}, issues: [], editor_notes: null, published_at: null, created_at: "", updated_at: "",
  };
}

// New stories use a strict slug (letters, digits, single hyphens). Legacy slugs keep their original form.
export function slugify(text: string) {
  return text
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
export const RESERVED_SLUGS = new Set(["submit", "opengraph-image"]);

// Is `slug` free for story `id`? Checks live slugs and other stories' old slugs (redirects).
export async function slugAvailable(supabase: SupabaseClient, slug: string, id: string | null): Promise<{ ok: boolean; reason?: string }> {
  if (!/^[a-z0-9_-]+$/.test(slug)) return { ok: false, reason: "Use lowercase letters, numbers and hyphens only." };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: "This slug is reserved." };
  const [live, redirect] = await Promise.all([
    supabase.from("member_stories").select("id, title").eq("slug", slug).limit(1),
    supabase.from("member_story_redirects").select("story_id").eq("old_slug", slug).limit(1),
  ]);
  const other = live.data?.find((r) => r.id !== id);
  if (other) return { ok: false, reason: `Already used by "${other.title}".` };
  const red = redirect.data?.find((r) => r.story_id !== id);
  if (red) return { ok: false, reason: "Still redirects to another story (an old slug)." };
  return { ok: true };
}

export async function revalidatePublicPages() {
  try {
    await fetch("/api/admin/member-stories/revalidate", { method: "POST" });
  } catch {
    // Pages still refresh within 5 minutes.
  }
}

// ── Media ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Public, approved media: bucket member-stories (public URLs). Submitted media: bucket member-story-submissions
// (private), referenced in story fields as "submission://<path>" until an admin approves (copies) it.
export const PRIVATE_PREFIX = "submission://";
export const isPrivateRef = (v: string | null | undefined) => !!v && v.startsWith(PRIVATE_PREFIX);

function randomName(ext: string) {
  return `${Date.now().toString(36)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${ext}`;
}
const extFor = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");

export function validateImage(file: File): string | null {
  if (!STORY_IMAGE.types.includes(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > STORY_IMAGE.maxBytes) return "Images must be 8 MB or smaller.";
  return null;
}

export async function uploadStoryImage(supabase: SupabaseClient, storyKey: string, file: File | Blob, type: string): Promise<string> {
  const path = `stories/${storyKey}/${randomName(extFor(type))}`;
  const { error } = await supabase.storage.from("member-stories").upload(path, file, { contentType: type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("member-stories").getPublicUrl(path).data.publicUrl;
}

// Approve a submitted image: copy it from the private bucket into the public one (new collision-safe name).
export async function approveSubmissionImage(supabase: SupabaseClient, storyKey: string, ref: string): Promise<string> {
  const path = ref.startsWith(PRIVATE_PREFIX) ? ref.slice(PRIVATE_PREFIX.length) : ref;
  const { data, error } = await supabase.storage.from("member-story-submissions").download(path);
  if (error || !data) throw new Error(error?.message ?? "Couldn't read the submitted image.");
  const type = data.type || (path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg");
  return uploadStoryImage(supabase, storyKey, data, type);
}

export async function signedUrls(supabase: SupabaseClient, paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await supabase.storage.from("member-story-submissions").createSignedUrls(unique, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

// Every private reference used by a story's fields.
export function privateRefs(s: Pick<AdminStory, "banner_image" | "author_avatar" | "sections" | "gallery">): string[] {
  return [s.banner_image, s.author_avatar, ...s.sections.map((x) => x.image), ...s.gallery.map((g) => g.image)].filter(isPrivateRef) as string[];
}

// Story -> public shape for the preview, with private references swapped for short-lived signed URLs.
export function toPreview(s: AdminStory, signed: Record<string, string>): PublicStory {
  const r = (v: string | null | undefined) => (isPrivateRef(v) ? signed[v!.slice(PRIVATE_PREFIX.length)] ?? null : v ?? null);
  const row: StoryRow = {
    ...s,
    slug: s.slug || "preview",
    banner_image: r(s.banner_image),
    author_avatar: r(s.author_avatar),
    sections: s.sections.map((x) => ({ ...x, image: r(x.image) ?? undefined })),
    gallery: s.gallery.map((g) => ({ ...g, image: r(g.image) ?? "" })).filter((g) => g.image),
  };
  return rowToStory(row);
}

export const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  needs_info: "Needs info",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

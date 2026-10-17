import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberProfile } from "./types";
import { normalizeDestinations } from "./profile";

// Member profile photos: validated and re-encoded in the browser (square, max 512 px, WebP or JPEG), which also strips
// EXIF data such as location. The bucket enforces type (JPEG/PNG/WebP) and size (2 MB) again, and a database trigger
// only accepts the member's own photo in member_profiles.avatar_url (supabase/migrations/*_member_avatars.sql).
export const AVATAR_BUCKET = "member-avatars";
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const SIZE = 512;

export const AVATAR_CHANGED_EVENT = "iels:avatar-changed";

export function avatarFileError(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "That image is larger than 5 MB. Please choose a smaller one.";
  return null;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));

export async function prepareAvatar(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const img = await decode(file); // throws for files that aren't really images
  const w = img.width, h = img.height, side = Math.min(w, h);
  if (!side) throw new Error("empty image");
  const out = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
  if ("close" in img) img.close();
  let blob = await toBlob(canvas, "image/webp", 0.86);
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.88); // Safari < 17
  if (!blob) throw new Error("encode failed");
  return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg" };
}

// Path of the member's own stored photo inside the bucket, or null (Google photo, default avatar, anything else).
export function ownAvatarPath(url: string | null | undefined, uid: string): string | null {
  const marker = `/${AVATAR_BUCKET}/${uid}/`;
  const i = (url || "").indexOf(marker);
  return i === -1 ? null : `${uid}/${url!.slice(i + marker.length)}`;
}

const randomName = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(36).slice(2, 12)}`).replace(/-/g, "");

// Store avatar_url on the member's profile row (creating the row from the current form state if there is none yet).
async function writeAvatarUrl(supabase: SupabaseClient, profile: MemberProfile, url: string | null) {
  const { data, error } = await supabase.from("member_profiles").update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("user_id", profile.user_id).select("user_id");
  if (error) throw new Error(error.message);
  if (data && data.length) return;
  const { error: insErr } = await supabase.from("member_profiles")
    .upsert({ ...normalizeDestinations({ ...profile, avatar_url: url }), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (insErr) throw new Error(insErr.message);
}

export async function uploadAvatar(supabase: SupabaseClient, profile: MemberProfile, prepared: { blob: Blob; ext: string }) {
  const uid = profile.user_id;
  const path = `${uid}/${randomName()}.${prepared.ext}`;
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { error } = await bucket.upload(path, prepared.blob, { contentType: prepared.blob.type, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error("Upload failed. Check your connection and try again.");
  const url = bucket.getPublicUrl(path).data.publicUrl;
  try {
    await writeAvatarUrl(supabase, profile, url);
  } catch (e) {
    await bucket.remove([path]); // don't leave an unused public file behind
    throw e;
  }
  const old = ownAvatarPath(profile.avatar_url, uid);
  if (old && old !== path) await bucket.remove([old]);
  window.dispatchEvent(new CustomEvent(AVATAR_CHANGED_EVENT, { detail: url }));
  return url;
}

export async function removeAvatar(supabase: SupabaseClient, profile: MemberProfile) {
  await writeAvatarUrl(supabase, profile, null);
  const old = ownAvatarPath(profile.avatar_url, profile.user_id);
  if (old) await supabase.storage.from(AVATAR_BUCKET).remove([old]);
  window.dispatchEvent(new CustomEvent(AVATAR_CHANGED_EVENT, { detail: null }));
}

import "server-only";
import { randomUUID } from "node:crypto";
import { one, q } from "./db";
import { createUploadUrl, inspect, removeObject } from "./storage";
import { UPLOAD_RULES, safeFilename, sniffMatches, sniffMime } from "./validation";
import { overLimit } from "./ratelimit";

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "video/mp4": "mp4", "video/quicktime": "mov",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx" };

export class UploadError extends Error {}

// Step 1: reserve a document row and return a signed upload URL (valid for a short time, for this one object key).
export async function beginUpload(accountId: string, applicationId: string, cohortId: string, kind: string, filename: string, mime: string, size: number, participantId: string | null) {
  const rule = UPLOAD_RULES[kind];
  if (!rule) throw new UploadError("Unknown document type.");
  if (!rule.mimes.includes(mime)) throw new UploadError(`${rule.label}: this file type is not accepted.`);
  if (!(size > 0) || size > rule.maxMb * 1024 * 1024) throw new UploadError(`${rule.label}: files up to ${rule.maxMb} MB.`);
  if (await overLimit(`upload:${accountId}`, 40, 3600)) throw new UploadError("Too many uploads in the last hour. Try again later.");
  const key = `${cohortId}/${applicationId}/${kind}/${randomUUID()}.${EXT[mime]}`;
  const row = await one<{ id: string }>(`insert into gif.documents (application_id, participant_id, kind, storage_key, filename, mime, size_bytes, uploaded_by)
    values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`, [applicationId, participantId, kind, key, safeFilename(filename), mime, size, accountId]);
  const { url, method } = await createUploadUrl(key);
  return { documentId: row!.id, url, method };
}

// Step 2: after the browser uploaded, check the stored object (exists, size within limit and as declared, bytes match type).
export async function finishUpload(accountId: string, documentId: string) {
  const doc = await one<{ id: string; storage_key: string; mime: string; size_bytes: number; kind: string; status: string; uploaded_by: string }>(
    "select id, storage_key, mime, size_bytes, kind, status, uploaded_by from gif.documents where id = $1", [documentId]);
  if (!doc || doc.uploaded_by !== accountId) throw new UploadError("Upload not found.");
  if (doc.status !== "pending_upload") return { ok: true };
  const info = await inspect(doc.storage_key);
  const rule = UPLOAD_RULES[doc.kind];
  const reject = async (msg: string) => {
    await removeObject(doc.storage_key).catch(() => {});
    await q("update gif.documents set status = 'deleted', review_note = $2 where id = $1", [doc.id, msg]);
    throw new UploadError(msg);
  };
  if (!info) return reject("The upload did not arrive. Please try again.");
  if (info.size > rule.maxMb * 1024 * 1024) return reject(`${rule.label}: files up to ${rule.maxMb} MB.`);
  if (!sniffMatches(doc.mime, sniffMime(info.head))) return reject(`${rule.label}: the file's contents don't match its type.`);
  await q("update gif.documents set status = 'uploaded', size_bytes = $2 where id = $1", [doc.id, info.size]);
  return { ok: true };
}

export async function deleteOwnDocument(accountId: string, documentId: string) {
  const doc = await one<{ storage_key: string; status: string }>("select storage_key, status from gif.documents where id = $1 and uploaded_by = $2", [documentId, accountId]);
  if (!doc || doc.status === "verified") throw new UploadError("This document can't be removed.");
  const used = await one("select 1 from gif.submissions where submitted_at is not null and $1 in (essay_doc_id, deck_doc_id, video_doc_id)", [documentId]);
  if (used) throw new UploadError("This file is part of a submitted phase and can't be removed.");
  await removeObject(doc.storage_key).catch(() => {});
  await q("update gif.documents set status = 'deleted' where id = $1", [documentId]);
}

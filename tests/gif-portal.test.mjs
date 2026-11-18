// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canDelegateEdit, combineStatuses, csvCell, missingRequired, pathMatches, progressCounts, retentionInfo, rubricTotal, sniffType,
  storagePath, submissionFor, validateFieldsConfig, validateRubricConfig, validateUpload,
} from "../src/lib/gif/portal.ts";
import { buildReport, delegateProgress, kpis } from "../src/lib/gif/report.ts";

const bytes = (...b) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const D1 = "11111111-1111-4111-8111-111111111111", S1 = "22222222-2222-4222-8222-222222222222", U = "33333333-3333-4333-8333-333333333333";

test("sniffType detects real types from magic bytes, not names", () => {
  assert.equal(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(sniffType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(sniffType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0])), "image/webp");
  assert.equal(sniffType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d)), "application/pdf");
  assert.equal(sniffType(bytes(0x50, 0x4b, 0x03, 0x04), "deck.pptx"), "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  assert.equal(sniffType(bytes(0x50, 0x4b, 0x03, 0x04), "virus.exe"), null);
  assert.equal(sniffType(bytes(0x4d, 0x5a, 0x90, 0x00), "screenshot.png"), null); // a Windows .exe renamed to .png
  assert.equal(sniffType(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])), "video/mp4");
});

test("story proof validation: images only, 10 MB each", () => {
  assert.equal(validateUpload({ size: 1000, sniffed: "image/png" }, "story_proof"), null);
  assert.match(validateUpload({ size: 1000, sniffed: "application/pdf" }, "story_proof"), /JPG, PNG or WEBP/);
  assert.match(validateUpload({ size: 11 * 1024 * 1024, sniffed: "image/jpeg" }, "story_proof"), /too large/);
  assert.match(validateUpload({ size: 10, sniffed: null }, "story_proof"), /JPG, PNG or WEBP/);
  assert.equal(validateUpload({ size: 1000, sniffed: "application/pdf" }, "file", "application/pdf"), null);
  assert.match(validateUpload({ size: 1000, sniffed: "video/mp4" }, "file", "application/pdf"), /isn't accepted/);
});

test("storage paths follow gif-story-proofs/{delegate_id}/{submission_id}/{file}", () => {
  const p = storagePath("story_proof", { delegateId: D1, submissionId: S1 }, "image/png", U);
  assert.equal(p, `${D1}/${S1}/${U}.png`);
  assert.ok(pathMatches("story_proof", p, { delegateId: D1, submissionId: S1 }));
  assert.ok(!pathMatches("story_proof", p, { delegateId: U, submissionId: S1 }));
  assert.ok(!pathMatches("story_proof", `${D1}/${S1}/../x.png`, { delegateId: D1, submissionId: S1 }));
  assert.ok(pathMatches("file", `${S1}/${U}.pdf`, { delegateId: D1, submissionId: S1 }));
});

test("retention: 7 days from upload; warning within 48 h; deleted stays visible as deleted", () => {
  const up = Date.parse("2026-11-18T10:00:00Z"), exp = new Date(up + 7 * 86400000).toISOString();
  assert.equal(exp, "2026-11-25T10:00:00.000Z");
  const f = { kind: "story_proof", expires_at: exp, retention_status: "active", deleted_at: null };
  assert.equal(retentionInfo(f, up).state, "active");
  assert.equal(retentionInfo(f, Date.parse("2026-11-24T12:00:00Z")).state, "warning");
  assert.equal(retentionInfo(f, Date.parse("2026-11-25T10:00:01Z")).state, "expired");
  assert.equal(retentionInfo({ ...f, retention_status: "deleted", deleted_at: exp }).state, "deleted");
  assert.equal(retentionInfo({ ...f, kind: "file", expires_at: null }), null);
});

test("status combination and progress counts", () => {
  assert.equal(combineStatuses([]), "not_started");
  assert.equal(combineStatuses(["approved", "approved"]), "approved");
  assert.equal(combineStatuses(["approved", "revision_required"]), "revision_required");
  assert.equal(combineStatuses(["submitted", "approved"]), "submitted");
  assert.equal(combineStatuses(["under_review", "approved"]), "under_review");
  assert.equal(combineStatuses(["submitted", "not_started"]), "in_progress");
  const c = progressCounts(["approved", "submitted", "under_review", "revision_required", "in_progress", "not_started", "not_started", "approved"]);
  assert.deepEqual(c, { total: 8, completed: 4, pending: 3, awaitingReview: 2, revision: 1, percent: 50 });
});

test("required fields mirror the database rule, incl. link-or-upload", () => {
  const fields = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "link", label: "Link", type: "url", required: true, or_field: "file" },
    { key: "file", label: "File", type: "files" },
    { key: "proof", label: "Proof", type: "story_proof", required: true, min_files: 2 },
    { key: "ok", label: "OK", type: "checkbox", required: true },
    { key: "m", label: "Members", type: "members" },
  ];
  assert.deepEqual(missingRequired(fields, {}, {}), ["name", "link", "proof", "ok"]);
  assert.deepEqual(missingRequired(fields, { name: "A", ok: true }, { file: 1, proof: 2 }), []);
  assert.deepEqual(missingRequired(fields, { name: " ", link: "https://x.y", ok: true }, { proof: 1 }), ["name", "proof"]);
});

test("delegates can edit only open, unlocked work", () => {
  const a = { is_active: true, opens_at: null, due_at: "2026-11-20T15:59:00Z", allow_late: false };
  const before = Date.parse("2026-11-19T00:00:00Z"), after = Date.parse("2026-11-21T00:00:00Z");
  assert.ok(canDelegateEdit(a, null, before));
  assert.ok(!canDelegateEdit(a, null, after));
  assert.ok(canDelegateEdit(a, { status: "revision_required" }, after));
  assert.ok(!canDelegateEdit(a, { status: "under_review" }, before));
  assert.ok(!canDelegateEdit(a, { status: "approved" }, before));
  assert.ok(!canDelegateEdit({ ...a, is_active: false }, null, before));
  assert.ok(canDelegateEdit({ ...a, allow_late: true }, null, after));
});

test("group work is shared by the team; individual work is per delegate", () => {
  const subs = [
    { id: "g", assignment_id: "A", team_id: "T1", delegate_id: null, status: "submitted" },
    { id: "i", assignment_id: "B", team_id: null, delegate_id: "D1", status: "approved" },
  ];
  assert.equal(submissionFor({ id: "A", submission_type: "group" }, subs, "D2", "T1")?.id, "g");
  assert.equal(submissionFor({ id: "A", submission_type: "group" }, subs, "D3", "T2"), null);
  assert.equal(submissionFor({ id: "B", submission_type: "individual" }, subs, "D1", "T1")?.id, "i");
  assert.equal(submissionFor({ id: "B", submission_type: "individual" }, subs, "D2", "T1"), null);
});

test("rubric total and config validation", () => {
  const rubric = [{ key: "a", label: "A" }, { key: "b", label: "B" }];
  assert.deepEqual(rubricTotal(rubric, { a: 4 }), { score: 4, max: 10, scored: 1 });
  assert.ok(validateRubricConfig(rubric).ok);
  assert.ok(!validateRubricConfig([{ key: "a", label: "A" }, { key: "a", label: "B" }]).ok);
  assert.ok(validateFieldsConfig([{ key: "x", label: "X", type: "text" }]).ok);
  assert.ok(!validateFieldsConfig([{ key: "Bad Key", label: "X", type: "text" }]).ok);
  assert.ok(!validateFieldsConfig([{ key: "s", label: "S", type: "select" }]).ok);
  assert.ok(!validateFieldsConfig([{ key: "l", label: "L", type: "url", or_field: "missing" }]).ok);
});

test("CSV export escapes quotes and blocks formula injection", () => {
  assert.equal(csvCell('He said "hi", ok'), '"He said ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell(null), "");
});

test("reports and KPIs come from the rows", () => {
  const roster = [
    { delegate_id: "D1", participant_id: "P1", full_name: "Ana", email: "a@x", linked: true, team_id: "T1", team_number: 1, team_name: "Team 1" },
    { delegate_id: "D2", participant_id: "P2", full_name: "Ben", email: "b@x", linked: true, team_id: "T1", team_number: 1, team_name: "Team 1" },
  ];
  const mk = (id, day, type) => ({ id, day_number: day, sort_order: type === "group" ? 1 : 2, submission_type: type, is_active: true, title: id, rubric: [{ key: "q", label: "Quality" }] });
  const assignments = [mk("G1", 1, "group"), mk("I1", 1, "individual")];
  const subs = [
    { id: "s1", assignment_id: "G1", team_id: "T1", delegate_id: null, status: "approved", submitted_at: "2026-11-17T10:00:00Z", updated_at: "2026-11-17T10:00:00Z" },
    { id: "s2", assignment_id: "I1", team_id: null, delegate_id: "D1", status: "submitted", submitted_at: "2026-11-17T11:00:00Z", updated_at: "2026-11-17T11:00:00Z" },
  ];
  const p = delegateProgress(roster, assignments, subs);
  assert.equal(p[0].percent, 100);
  assert.equal(p[1].percent, 50);
  assert.deepEqual(kpis(p, subs), { delegates: 2, completionPercent: 75, fullyCompleted: 1, pendingAssignments: 1, awaitingReview: 1, revisionRequired: 0 });
  const assessments = [{ id: "x", submission_id: "s1", status: "approved", rubric_scores: { q: 5 }, score: 5, max_score: 5, feedback: "Great", revision_instructions: null, submission_version: 1, created_at: "2026-11-18T00:00:00Z" }];
  const statuses = buildReport("statuses", roster, assignments, subs, assessments).csv;
  assert.match(statuses, /Ana,Team 1,Approved,Submitted,100/);
  assert.match(buildReport("scores", roster, assignments, subs, assessments).csv, /Quality: 5/);
  const pending = buildReport("pending", roster, assignments, subs, assessments).csv;
  assert.match(pending, /Awaiting review,1,I1,individual,Ana/);
  assert.match(pending, /Missing \/ incomplete,1,I1,individual,Ben/);
  assert.doesNotMatch(pending, /G1/);
});

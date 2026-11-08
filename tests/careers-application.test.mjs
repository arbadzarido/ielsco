// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_DRAFT, explainSubmitError, instagramHandle, linkedinUrl, normalizeWhatsapp, sanitizeDraft, validateStep } from "../src/lib/careers/application.ts";

const ROLES = ["G1", "G2", "G3", "G4", "K1", "K2", "C1", "C2", "L1", "L2", "R1", "R2", "R3", "O1", "O2", "P1", "P2"];
const TASKS = ["follow_ielsco", "follow_elco", "comment_mention", "share_story", "twibbon", "story_24h", "repost"];
const full = {
  ...EMPTY_DRAFT, full_name: "Alya Putri", whatsapp: "0812 3456 7890", university: "Universitas Brawijaya", academic_year: "2", batch_year: "2024",
  role_id: "G4", instagram: "@alya.putri", linkedin_url: "id.linkedin.com/in/alya", motivation: "I want to help students reach global opportunities.",
  cv_path: "applicants/u/cv-abc.pdf", portfolio_mode: "link", portfolio_url: "https://behance.net/alya", tasks: Object.fromEntries(TASKS.map((k) => [k, true])),
  privacy: true, declaration: true,
};

test("17 roles, 7 tasks: a complete one-role application passes review", () => {
  assert.equal(ROLES.length, 17);
  assert.deepEqual(validateStep("review", full, ROLES, TASKS), {});
});
test("two roles, no duplicates", () => {
  assert.deepEqual(validateStep("roles", { ...full, role_2_id: "O1" }, ROLES, TASKS), {});
  assert.ok(validateStep("roles", { ...full, role_2_id: "G4" }, ROLES, TASKS).role_2_id);
  assert.ok(validateStep("roles", { ...full, role_id: "" }, ROLES, TASKS).role_id);
});
test("normalisation mirrors the database", () => {
  assert.equal(normalizeWhatsapp("0812-3456-7890"), "+6281234567890");
  assert.equal(normalizeWhatsapp("12"), null);
  assert.equal(instagramHandle("https://www.instagram.com/alya.putri/?hl=en"), "alya.putri");
  assert.equal(instagramHandle("https://instagram.com/p/xyz"), null);
  assert.equal(linkedinUrl("https://id.linkedin.com/in/alya?trk=1"), "https://www.linkedin.com/in/alya/");
  assert.equal(linkedinUrl("https://linkedin.com/company/x"), null);
});
test("each step blocks what it owns", () => {
  assert.ok(validateStep("profiles", { ...full, cv_path: "" }, ROLES, TASKS).cv);
  assert.ok(validateStep("profiles", { ...full, portfolio_mode: "file", portfolio_path: "" }, ROLES, TASKS).portfolio);
  assert.ok(validateStep("profiles", { ...full, motivation: "short" }, ROLES, TASKS).motivation);
  assert.ok(validateStep("tasks", { ...full, tasks: { follow_ielsco: true } }, ROLES, TASKS).tasks);
  assert.ok(validateStep("review", { ...full, privacy: false }, ROLES, TASKS).privacy);
  assert.ok(validateStep("review", { ...full, declaration: false }, ROLES, TASKS).declaration);
  assert.ok(validateStep("about", { ...full, academic_year: "4" }, ROLES, TASKS).academic_year);
});
test("drafts from the database are sanitised", () => {
  const d = sanitizeDraft({ full_name: "A", tasks: { repost: true, "bad key!": true, x: "yes" }, privacy: "true", evil: 1, portfolio_mode: "ftp" });
  assert.equal(d.full_name, "A");
  assert.deepEqual(d.tasks, { repost: true });
  assert.equal(d.privacy, false);
  assert.equal(d.portfolio_mode, "link");
  assert.equal("evil" in d, false);
});
test("database errors map to a step", () => {
  assert.equal(explainSubmitError("invalid: role_2").step, "roles");
  assert.equal(explainSubmitError("invalid: cv_missing").step, "profiles");
  assert.match(explainSubmitError("already_applied").text, /already an application/);
  assert.match(explainSubmitError("locked").text, /being reviewed/);
});

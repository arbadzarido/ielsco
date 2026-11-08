// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_DRAFT, explainSubmitError, hasPortfolio, instagramHandle, linkedinUrl, needsPortfolio, normalizeWhatsapp, sanitizeDraft, validateStep } from "../src/lib/careers/application.ts";
import { popupAllowedOn, shouldShowPopup } from "../src/lib/careers/popup.ts";
import { matchesQuery, overallCampaign } from "../src/lib/os/recruitment.ts";

const ROLES = ["G1", "G2", "G3", "G4", "K1", "K2", "C1", "C2", "L1", "L2", "R1", "R2", "R3", "O1", "O2", "P1", "P2"];
const TASKS = ["follow_ielsco", "follow_elco", "comment_mention", "share_story", "twibbon", "story_24h", "repost"];
const full = {
  ...EMPTY_DRAFT, full_name: "Alya Putri", whatsapp: "0812 3456 7890", university: "Universitas Brawijaya", academic_year: "2", batch_year: "2024",
  domicile_country: "ID", domicile_city: "Malang",
  role_id: "G4", instagram: "@alya.putri", linkedin_url: "id.linkedin.com/in/alya", motivation: "I want to help students reach global opportunities.",
  cv_path: "applicants/u/cv-abc.pdf", portfolio_mode: "link", portfolio_url: "", tasks: Object.fromEntries(TASKS.map((k) => [k, true])),
  privacy: true, declaration: true,
};

test("17 roles, 7 tasks: a complete one-role application passes review without a portfolio", () => {
  assert.equal(ROLES.length, 17);
  assert.deepEqual(validateStep("review", full, ROLES, TASKS), {});
});
test("two roles, no duplicates", () => {
  assert.deepEqual(validateStep("roles", { ...full, role_2_id: "O1" }, ROLES, TASKS), {});
  assert.ok(validateStep("roles", { ...full, role_2_id: "G4" }, ROLES, TASKS).role_2_id);
  assert.ok(validateStep("roles", { ...full, role_id: "" }, ROLES, TASKS).role_id);
});
test("domicile: country and city required, no address", () => {
  assert.ok(validateStep("about", { ...full, domicile_country: "" }, ROLES, TASKS).domicile_country);
  assert.ok(validateStep("about", { ...full, domicile_country: "Indonesia" }, ROLES, TASKS).domicile_country);
  assert.ok(validateStep("about", { ...full, domicile_city: " " }, ROLES, TASKS).domicile_city);
  assert.equal("address" in EMPTY_DRAFT, false);
});
test("portfolio: required only when a Creative role is chosen", () => {
  assert.equal(needsPortfolio("G4", ""), false);
  assert.equal(needsPortfolio("K1", ""), true);
  assert.equal(needsPortfolio("O1", "K2"), true);
  assert.ok(validateStep("profiles", { ...full, role_2_id: "K1" }, ROLES, TASKS).portfolio_url);
  assert.ok(validateStep("profiles", { ...full, role_id: "K2", portfolio_mode: "file" }, ROLES, TASKS).portfolio);
  assert.deepEqual(validateStep("profiles", { ...full, role_id: "K2", portfolio_url: "https://behance.net/a" }, ROLES, TASKS), {});
  assert.ok(validateStep("profiles", { ...full, portfolio_url: "behance.net/a" }, ROLES, TASKS).portfolio_url, "a link that is entered must still be valid");
  assert.equal(hasPortfolio({ portfolio_mode: "file", portfolio_path: "x", portfolio_url: "" }), true);
  assert.ok(validateStep("profiles", { ...full, cv_path: "" }, ROLES, TASKS).cv, "CV is required for everyone");
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
  assert.ok(validateStep("profiles", { ...full, motivation: "short" }, ROLES, TASKS).motivation);
  assert.ok(validateStep("tasks", { ...full, tasks: { follow_ielsco: true } }, ROLES, TASKS).tasks);
  assert.ok(validateStep("review", { ...full, privacy: false }, ROLES, TASKS).privacy);
  assert.ok(validateStep("review", { ...full, declaration: false }, ROLES, TASKS).declaration);
  assert.ok(validateStep("about", { ...full, academic_year: "4" }, ROLES, TASKS).academic_year);
});
test("drafts from the database are sanitised", () => {
  const d = sanitizeDraft({ full_name: "A", domicile_city: "Malang", tasks: { repost: true, "bad key!": true, x: "yes" }, privacy: "true", evil: 1, portfolio_mode: "ftp" });
  assert.equal(d.full_name, "A");
  assert.equal(d.domicile_city, "Malang");
  assert.deepEqual(d.tasks, { repost: true });
  assert.equal(d.privacy, false);
  assert.equal(d.portfolio_mode, "link");
  assert.equal("evil" in d, false);
});
test("database errors map to a step", () => {
  assert.equal(explainSubmitError("invalid: role_2").step, "roles");
  assert.equal(explainSubmitError("invalid: domicile_city").step, "about");
  assert.equal(explainSubmitError("invalid: cv_missing").step, "profiles");
  assert.match(explainSubmitError("already_applied").text, /already an application/);
  assert.match(explainSubmitError("locked").text, /being reviewed/);
});

test("recruitment popup: never on careers, the application, auth, checkout, tests, calls, the OS or admin", () => {
  for (const p of ["/", "/about", "/events", "/dashboard", "/dashboard/people", "/opportunities"]) assert.equal(popupAllowedOn(p), true, p);
  for (const p of ["/careers", "/careers/growth", "/dashboard/careers/apply", "/sign-in", "/sign-up", "/auth/callback", "/dashboard/onboarding",
    "/dashboard/membership", "/test/toefl", "/dashboard/connect/quick-match", "/os", "/os/recruitment", "/dashboard/admin/operations", "/school/dashboard"]) {
    assert.equal(popupAllowedOn(p), false, p);
  }
  assert.equal(popupAllowedOn("/", "os.ielsco.com"), false);
});
test("recruitment popup: inside the window, until closed for the session or dismissed for good", () => {
  const opensAt = Date.parse("2026-11-09T00:00:00+07:00"), closesAt = Date.parse("2026-11-29T23:59:59+07:00");
  const base = { now: opensAt + 1000, opensAt, closesAt, never: false, closedThisSession: false, pathname: "/" };
  assert.equal(shouldShowPopup(base), true);
  assert.equal(shouldShowPopup({ ...base, closedThisSession: true }), false);
  assert.equal(shouldShowPopup({ ...base, never: true }), false);
  assert.equal(shouldShowPopup({ ...base, now: closesAt + 1 }), false);
  assert.equal(shouldShowPopup({ ...base, pathname: "/careers" }), false);
});
test("OS recruitment helpers", () => {
  assert.equal(overallCampaign({}, TASKS), "pending");
  assert.equal(overallCampaign(Object.fromEntries(TASKS.map((k) => [k, "verified"])), TASKS), "verified");
  assert.equal(overallCampaign({ repost: "not_found" }, TASKS), "incomplete");
  assert.equal(matchesQuery({ full_name: "Alya Putri", email: "a@x.test", university: "UB", domicile_city: "Malang" }, "malang"), true);
  assert.equal(matchesQuery({ full_name: "Alya Putri", email: "a@x.test", university: "UB", domicile_city: null }, "budi"), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DEFAULT_SETTINGS, resolveSettings, mentoringPrice, balanceOf, currentPhase, pathwayOpen } from "../../src/lib/settings.ts";
import { currencyFor, plannedObligations, collectionMethod, formatMoney, idrPriceFor } from "../../src/lib/pricing.ts";
import { canTransition, progressSteps, STATUSES, STATUS_LABEL } from "../../src/lib/status.ts";
import { signatureOk, classify, midtransConfig } from "../../src/lib/payments/midtrans.ts";
import { applicationSchema, normalizePhone, sniffMime, sniffMatches, validVideoUrl, ageOn, scoresSchema } from "../../src/lib/validation.ts";
import { esc, layout } from "../../src/lib/email/templates.ts";

const person = (email: string, nat = "ID") => ({ legal_name: "Test Person", email, whatsapp: "+62 812 1111 2222", nationality: nat, residence_country: nat, date_of_birth: "2006-01-01",
  institution: "Example School", education_level: "high_school", academic_background: "Science", country_of_study: nat, emergency_name: "Parent", emergency_relation: "Parent", emergency_phone: "+62 812 0000 0000" });

test("published facts are the defaults", () => {
  const s = DEFAULT_SETTINGS;
  assert.equal(s.prices.elco_pro_idr, 99000);
  assert.deepEqual(s.prices.mentoring_early, { IDR: 1200000, USD: 80 });
  assert.deepEqual(s.prices.mentoring_regular, { IDR: 1500000, USD: 100 });
  assert.deepEqual(s.prices.self_funded_total, { IDR: 15000000, USD: 900 });
  assert.deepEqual(s.prices.self_funded_deposit, { IDR: 5000000, USD: 300 });
  assert.deepEqual(balanceOf(s), { IDR: 10000000, USD: 600 });
  assert.deepEqual(s.cashback, { fully_funded: { IDR: 300000, USD: 20 }, partial_funded: { IDR: 750000, USD: 50 } });
  assert.equal(s.slots.capacity, 100);
  assert.ok(s.universities.every((u) => u.status === "planned"));
});

test("settings merge ignores unknown keys and keeps defaults", () => {
  const s = resolveSettings({ prices: { elco_pro_idr: 120000, bogus: 1 }, nonsense: true });
  assert.equal(s.prices.elco_pro_idr, 120000);
  assert.equal((s.prices as unknown as Record<string, unknown>).bogus, undefined);
  assert.equal(s.prices.self_funded_total.USD, 900);
});

test("phases follow the master timeline (WIB)", () => {
  const s = DEFAULT_SETTINGS;
  assert.equal(currentPhase(s, new Date("2026-11-24T16:59:00Z")), "before_launch");
  assert.equal(currentPhase(s, new Date("2026-11-24T17:00:00Z")), "phase1");
  assert.equal(currentPhase(s, new Date("2027-05-10T16:59:00Z")), "phase1");
  assert.equal(currentPhase(s, new Date("2027-05-11T00:00:00Z")), "phase2");
  assert.equal(currentPhase(s, new Date("2027-05-26T00:00:00Z")), "phase3_submit");
  assert.equal(currentPhase(s, new Date("2027-05-29T00:00:00Z")), "evaluation");
  assert.equal(currentPhase(s, new Date("2027-06-01T00:00:00Z")), "results");
  assert.equal(currentPhase(s, new Date("2027-07-28T00:00:00Z")), "programme");
});

test("pathways open at launch; Fully Funded closes after Phase 1", () => {
  const s = DEFAULT_SETTINGS;
  assert.equal(pathwayOpen(s, "fully_funded", new Date("2026-11-20T00:00:00Z")).open, false);
  assert.equal(pathwayOpen(s, "fully_funded", new Date("2026-12-01T00:00:00Z")).open, true);
  assert.equal(pathwayOpen(s, "fully_funded", new Date("2027-05-11T00:00:00Z")).open, false);
  assert.equal(pathwayOpen(s, "self_funded", new Date("2027-05-11T00:00:00Z")).open, true);
  assert.equal(pathwayOpen({ ...s, applications_open: false }, "mentoring", new Date("2026-12-01T00:00:00Z")).open, false);
});

test("mentoring Early Bird until the configured date, then Regular", () => {
  const s = resolveSettings({ dates: { mentoring_early_bird_until: "2026-12-31T23:59:59+07:00" } });
  assert.equal(mentoringPrice(s, new Date("2026-12-01T00:00:00Z")).tier, "early");
  assert.equal(mentoringPrice(s, new Date("2027-01-02T00:00:00Z")).price.USD, 100);
  assert.equal(mentoringPrice(DEFAULT_SETTINGS).tier, "early"); // no end date set yet
});

test("currency by citizenship, no conversion", () => {
  assert.equal(currencyFor("ID"), "IDR");
  assert.equal(currencyFor("MY"), "USD");
  const sf = plannedObligations(DEFAULT_SETTINGS, "self_funded", "SG");
  assert.deepEqual(sf.map((o) => [o.kind, o.currency, o.amount]), [["deposit", "USD", 300], ["balance", "USD", 600]]);
  const ff = plannedObligations(DEFAULT_SETTINGS, "fully_funded", "VN");
  assert.deepEqual(ff.map((o) => [o.kind, o.currency, o.amount]), [["elco_pro", "IDR", 99000]]);
  const mt = plannedObligations(DEFAULT_SETTINGS, "mentoring", "ID");
  assert.deepEqual(mt.map((o) => [o.currency, o.amount]), [["IDR", 1200000]]);
});

test("USD obligations are collected manually unless the IDR option is enabled", () => {
  assert.equal(collectionMethod(DEFAULT_SETTINGS, "IDR", true), "midtrans");
  assert.equal(collectionMethod(DEFAULT_SETTINGS, "USD", true), "manual");
  assert.equal(collectionMethod(resolveSettings({ payments: { allow_idr_for_international: true } }), "USD", true), "midtrans_idr_option");
  assert.equal(collectionMethod(DEFAULT_SETTINGS, "IDR", false), "manual");
  assert.equal(idrPriceFor(DEFAULT_SETTINGS, "deposit"), 5000000);
  assert.equal(formatMoney(15000000, "IDR"), "IDR 15,000,000");
  assert.equal(formatMoney(900, "USD"), "USD 900");
});

test("status machine and labels", () => {
  assert.equal(STATUSES.length, 15);
  assert.equal(STATUS_LABEL.selected_fully_funded, "Selected — Fully Funded");
  assert.ok(canTransition("awaiting_payment", "phase_1_completed"));
  assert.ok(!canTransition("withdrawn", "submitted"));
  assert.ok(!canTransition("draft", "selected_fully_funded"));
  const steps = progressSteps("mentoring", "phase_1_completed", true);
  assert.deepEqual(steps.map((x) => x.key), ["apply", "pay", "mentoring", "p3", "eval", "result"]);
  assert.equal(steps[1].state, "done");
});

test("Midtrans signature: accepts any configured key, rejects others", () => {
  const n = { order_id: "GIF27-EP-1", status_code: "200", gross_amount: "99000.00" };
  const sign = (k: string) => createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${k}`).digest("hex");
  assert.ok(signatureOk({ ...n, signature_key: sign("new-secret") }, ["new-secret", "old-server-key"]));
  assert.ok(signatureOk({ ...n, signature_key: sign("old-server-key") }, ["new-secret", "old-server-key"]));
  assert.ok(!signatureOk({ ...n, signature_key: sign("attacker") }, ["new-secret"]));
  assert.ok(!signatureOk({ ...n, gross_amount: "1.00", signature_key: sign("new-secret") }, ["new-secret"]));
  assert.ok(!signatureOk({ ...n }, ["new-secret"]));
});

test("Midtrans status classification", () => {
  assert.equal(classify({ transaction_status: "settlement" }), "paid");
  assert.equal(classify({ transaction_status: "capture", fraud_status: "accept" }), "paid");
  assert.equal(classify({ transaction_status: "capture", fraud_status: "challenge" }), "pending");
  assert.equal(classify({ transaction_status: "deny" }), "failed");
  assert.equal(classify({ transaction_status: "expire" }), "expired");
  assert.equal(classify({ transaction_status: "partial_refund" }), "partially_refunded");
});

test("Midtrans config guards", () => {
  assert.equal(midtransConfig({}).config, null);
  const prod = midtransConfig({ GIF_PAYMENTS_ENABLED: "true", GIF_MIDTRANS_ENV: "production", GIF_MIDTRANS_SERVER_KEY: "Mid-server-x", GIF_MIDTRANS_CLIENT_KEY: "Mid-client-x" });
  assert.equal(prod.config, null); // needs GIF_MIDTRANS_PRODUCTION_ENABLED
  const sbInProd = midtransConfig({ GIF_PAYMENTS_ENABLED: "true", GIF_MIDTRANS_ENV: "production", GIF_MIDTRANS_PRODUCTION_ENABLED: "true", GIF_MIDTRANS_SERVER_KEY: "SB-Mid-server-x", GIF_MIDTRANS_CLIENT_KEY: "SB-Mid-client-x" });
  assert.equal(sbInProd.config, null);
  const testBaseIgnoredInProd = midtransConfig({ GIF_PAYMENTS_ENABLED: "true", GIF_MIDTRANS_ENV: "production", GIF_MIDTRANS_PRODUCTION_ENABLED: "true", GIF_MIDTRANS_SERVER_KEY: "Mid-server-x", GIF_MIDTRANS_CLIENT_KEY: "Mid-client-x", GIF_MIDTRANS_TEST_BASE: "http://127.0.0.1:1", GIF_ALLOW_TEST_GATEWAY: "true" });
  assert.equal(testBaseIgnoredInProd.config?.apiBase, "https://api.midtrans.com");
  const sb = midtransConfig({ GIF_PAYMENTS_ENABLED: "true", GIF_MIDTRANS_SERVER_KEY: "SB-Mid-server-x", GIF_MIDTRANS_CLIENT_KEY: "SB-Mid-client-x" });
  assert.deepEqual(sb.config?.signatureKeys, ["SB-Mid-server-x"]);
});

test("application validation: teams of 2–3, unique emails, project for funded pathways", () => {
  const base = { pathway: "fully_funded", mode: "individual", leader: person("a@example.test"), members: [], project_title: "Clean Rivers", project_idea: "x".repeat(120),
    motivation: "m".repeat(60), discovery_source: "Instagram" };
  assert.ok(applicationSchema.safeParse(base).success);
  assert.ok(!applicationSchema.safeParse({ ...base, project_idea: "short" }).success);
  assert.ok(applicationSchema.safeParse({ ...base, pathway: "self_funded", project_title: "", project_idea: "" }).success);
  const team = { ...base, mode: "team", team_name: "River Keepers", members: [person("b@example.test", "MY")] };
  assert.ok(applicationSchema.safeParse(team).success);
  assert.ok(!applicationSchema.safeParse({ ...team, members: [person("b@example.test"), person("c@example.test"), person("d@example.test")] }).success);
  assert.ok(!applicationSchema.safeParse({ ...team, members: [person("a@example.test")] }).success);
  assert.ok(!applicationSchema.safeParse({ ...team, team_name: "" }).success);
  assert.ok(!applicationSchema.safeParse({ ...base, leader: { ...person("a@example.test"), whatsapp: "0812345678" } }).success);
});

test("helpers: phone, age, file sniffing, video hosts, scores", () => {
  assert.equal(normalizePhone("+62 (812) 3456-7890"), "+6281234567890");
  assert.equal(normalizePhone("0060123456789"), "+60123456789");
  assert.equal(ageOn("2009-07-28", new Date("2027-07-27T00:00:00Z")), 17);
  assert.equal(sniffMime(new TextEncoder().encode("%PDF-1.7")), "application/pdf");
  assert.equal(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), "image/png");
  assert.equal(sniffMime(new TextEncoder().encode("hello")), null);
  assert.ok(sniffMatches("application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip"));
  assert.ok(!sniffMatches("application/pdf", "image/png"));
  assert.ok(validVideoUrl("https://youtu.be/abc"));
  assert.ok(!validVideoUrl("http://youtu.be/abc"));
  assert.ok(!validVideoUrl("https://evil.example/x"));
  assert.ok(scoresSchema.safeParse({ problem: 7, innovation: 8, impact: 9, feasibility: 6, sustainability: 7, leadership: 8, presentation: 9 }).success);
  assert.ok(!scoresSchema.safeParse({ problem: 11, innovation: 8, impact: 9, feasibility: 6, sustainability: 7, leadership: 8, presentation: 9 }).success);
});

test("emails escape user input", () => {
  assert.equal(esc(`<script>"x"&'y'</script>`), "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  const { html, text } = layout({ heading: "Hi <b>", paras: ["Name: <img src=x onerror=alert(1)>"] });
  assert.ok(!html.includes("<img src=x"));
  assert.ok(text.includes("<img src=x")); // plain text part is not HTML
});

import { tasksComplete, tasksSummary, normalizeHandle, taskLink, tasksFor } from "../../src/lib/tasks.ts";

test("Phase 1 social tasks: configurable, all must be verified", () => {
  const s = DEFAULT_SETTINGS;
  assert.deepEqual(tasksFor(s).map((t) => t.key), ["follow_ielsco", "follow_elco", "like_post", "comment_tag3", "share_story"]);
  const all = Object.fromEntries(tasksFor(s).map((t) => [t.key, { status: "verified" as const, at: "x" }]));
  assert.ok(tasksComplete(s, all));
  assert.ok(!tasksComplete(s, { ...all, share_story: { status: "submitted", at: "x" } }));
  assert.ok(!tasksComplete(s, {}));
  assert.ok(tasksComplete(resolveSettings({ phase1_tasks: { enabled: false } }), {}));
  assert.deepEqual(tasksSummary(s, { like_post: { status: "not_found", at: "x" } }), { total: 5, verified: 0, submitted: 0, notFound: 1, todo: 4 });
  assert.equal(normalizeHandle("https://instagram.com/Ayu.Lestari/"), "ayu.lestari");
  assert.equal(normalizeHandle("@ayu_l"), "ayu_l");
  assert.equal(normalizeHandle("not a handle!"), null);
  assert.equal(taskLink(s, "post")?.label, "Find the post on @iels.co");
});

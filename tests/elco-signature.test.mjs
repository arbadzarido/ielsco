// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalString, hashToken, isTokenShape, MAX_SKEW_SECONDS, parseSecrets, sign, signedHeaders, verify } from "../src/lib/integrations/signature.ts";

const SECRET = "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz"; // test value only
const OTHER = "another-secret-0123456789-abcdefghijklmnopqrstuvwx";
const headers = (h) => ({ get: (k) => h[Object.keys(h).find((x) => x.toLowerCase() === k.toLowerCase())] ?? null });
const NOW = 1_792_200_000_000;
const PATH = "/api/integrations/elco/exchange";
const BODY = '{"code":"c","state":"s","elco_user_id":"u"}';

// Shared test vector: elco-app/backend/tests/test_integration_ielsco.py asserts the same value in Python.
const VECTOR = { secret: SECRET, timestamp: "1792200000", method: "POST", path: PATH, body: BODY };
const VECTOR_SIGNATURE = "v1=fb47e83fcdc74a4832990a567f82c18b868b3c8eaa2647623cec9fa78b63fcc0";

test("canonical string format is fixed", () => {
  assert.equal(
    canonicalString("1792200000", "post", PATH, BODY),
    `v1\n1792200000\nPOST\n${PATH}\n${hashToken(BODY)}`
  );
});

test("shared test vector (must match the Python implementation)", () => {
  assert.equal(sign(VECTOR.secret, VECTOR.timestamp, VECTOR.method, VECTOR.path, VECTOR.body), VECTOR_SIGNATURE);
});

test("a correctly signed request verifies", () => {
  const h = signedHeaders(SECRET, "POST", PATH, BODY, NOW);
  assert.deepEqual(verify([SECRET], headers(h), "POST", PATH, BODY, NOW), { ok: true });
});

test("tampering with body, path, method or timestamp fails", () => {
  const h = signedHeaders(SECRET, "POST", PATH, BODY, NOW);
  assert.equal(verify([SECRET], headers(h), "POST", PATH, BODY.replace("u", "v"), NOW).reason, "bad_signature");
  assert.equal(verify([SECRET], headers(h), "POST", "/api/integrations/elco/revoke", BODY, NOW).reason, "bad_signature");
  assert.equal(verify([SECRET], headers(h), "PUT", PATH, BODY, NOW).reason, "bad_signature");
  const shifted = { ...h, "X-IELS-Timestamp": String(Number(h["X-IELS-Timestamp"]) + 1) };
  assert.equal(verify([SECRET], headers(shifted), "POST", PATH, BODY, NOW).reason, "bad_signature");
  assert.equal(verify([SECRET], headers(h), "GET", `${PATH}?link_id=x`, BODY, NOW).reason, "bad_signature");
});

test("wrong secret fails; rotation accepts old and new", () => {
  const h = signedHeaders(OTHER, "POST", PATH, BODY, NOW);
  assert.equal(verify([SECRET], headers(h), "POST", PATH, BODY, NOW).reason, "bad_signature");
  assert.deepEqual(verify(parseSecrets(`${SECRET},${OTHER}`), headers(h), "POST", PATH, BODY, NOW), { ok: true });
});

test("old or future timestamps are refused (replay window)", () => {
  const old = signedHeaders(SECRET, "POST", PATH, BODY, NOW - (MAX_SKEW_SECONDS + 5) * 1000);
  const future = signedHeaders(SECRET, "POST", PATH, BODY, NOW + (MAX_SKEW_SECONDS + 5) * 1000);
  assert.equal(verify([SECRET], headers(old), "POST", PATH, BODY, NOW).reason, "stale");
  assert.equal(verify([SECRET], headers(future), "POST", PATH, BODY, NOW).reason, "stale");
  const edge = signedHeaders(SECRET, "POST", PATH, BODY, NOW - (MAX_SKEW_SECONDS - 5) * 1000);
  assert.deepEqual(verify([SECRET], headers(edge), "POST", PATH, BODY, NOW), { ok: true });
});

test("missing or malformed headers are refused", () => {
  assert.equal(verify([SECRET], headers({}), "POST", PATH, BODY, NOW).reason, "missing");
  assert.equal(verify([SECRET], headers({ "X-IELS-Timestamp": "abc", "X-IELS-Signature": "v1=00" }), "POST", PATH, BODY, NOW).reason, "missing");
  assert.equal(verify([SECRET], headers({ "X-IELS-Timestamp": "1792200000", "X-IELS-Signature": "Bearer " + SECRET }), "POST", PATH, BODY, NOW).reason, "missing");
});

test("secrets: unset or too short means not configured", () => {
  assert.deepEqual(parseSecrets(undefined), []);
  assert.deepEqual(parseSecrets("short"), []);
  assert.equal(verify(parseSecrets(""), headers(signedHeaders(SECRET, "POST", PATH, BODY, NOW)), "POST", PATH, BODY, NOW).reason, "not_configured");
});

test("token shape and hashing", () => {
  assert.ok(isTokenShape("A".repeat(43)));
  assert.ok(!isTokenShape("short"));
  assert.ok(!isTokenShape("a".repeat(40) + "/../"));
  assert.match(hashToken("x"), /^[0-9a-f]{64}$/);
});

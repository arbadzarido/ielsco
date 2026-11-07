// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
// Company OS pure helpers. The access rules themselves are tested on PGlite: tests/db/company-os.pglite.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { auditLabel, grantIsLive, nextPersonId } from "../src/lib/os/types.ts";
import { isAllowedHost } from "../src/lib/safe-redirect.ts";

test("nextPersonId continues the Operations Master numbering", () => {
  assert.equal(nextPersonId([]), "PPL-0001");
  assert.equal(nextPersonId(["PPL-0001", "PPL-0006", "PPL-0003"]), "PPL-0007");
  assert.equal(nextPersonId(["PPL-0009", "junk", "PPL-12"]), "PPL-0010");
});

test("grantIsLive: revoked or past end date is not live", () => {
  const now = Date.parse("2026-11-07T00:00:00Z");
  assert.equal(grantIsLive({ revoked_at: null, expires_at: null }, now), true);
  assert.equal(grantIsLive({ revoked_at: null, expires_at: "2026-11-08T00:00:00Z" }, now), true);
  assert.equal(grantIsLive({ revoked_at: null, expires_at: "2026-11-06T00:00:00Z" }, now), false);
  assert.equal(grantIsLive({ revoked_at: "2026-11-01T00:00:00Z", expires_at: null }, now), false);
});

test("auditLabel reads like a sentence", () => {
  assert.equal(auditLabel("os_grants.insert"), "Access grant added");
  assert.equal(auditLabel("os_people.update"), "Person changed");
  assert.equal(auditLabel("doc_number.reserve"), "Document number reserved");
  assert.equal(auditLabel("something_else.insert"), "something_else added");
});

test("os.ielsco.com is a trusted host for sign-in redirects", () => {
  assert.equal(isAllowedHost("os.ielsco.com"), true);
  assert.equal(isAllowedHost("os.ielsco.com.evil.example"), false);
});

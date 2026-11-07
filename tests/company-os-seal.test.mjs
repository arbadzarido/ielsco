// Run: npm test. Company OS: the Drive refresh token is encrypted before storage (src/lib/os/seal.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { seal, unseal } from "../src/lib/os/seal.ts";

test("round-trips and never stores the plain token", () => {
  const s = seal("1//refresh-token", "server-secret");
  assert.ok(!s.includes("refresh-token"));
  assert.equal(unseal(s, "server-secret"), "1//refresh-token");
  assert.notEqual(seal("1//refresh-token", "server-secret"), s, "a fresh IV each time");
});

test("a different secret or a tampered value is rejected", () => {
  const s = seal("1//refresh-token", "server-secret");
  assert.throws(() => unseal(s, "other-secret"));
  const parts = s.split("."); parts[3] = Buffer.from("x").toString("base64url");
  assert.throws(() => unseal(parts.join("."), "server-secret"));
  assert.throws(() => seal("x", ""));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { dbErrorKind } from "../../src/lib/db-errors.ts";

test("dbErrorKind labels common production database failures without leaking details", () => {
  assert.equal(dbErrorKind(new Error("GIF_DATABASE_URL is not set")), "env_missing");
  assert.equal(dbErrorKind(Object.assign(new Error("getaddrinfo ENOTFOUND db.example.supabase.co"), { code: "ENOTFOUND" })), "dns");
  assert.equal(dbErrorKind(Object.assign(new Error("connect ENETUNREACH 2406::1:5432"), { code: "ENETUNREACH" })), "network");
  assert.equal(dbErrorKind(new Error("Connection terminated due to connection timeout")), "timeout");
  assert.equal(dbErrorKind(Object.assign(new Error("password authentication failed for user \"postgres\""), { code: "28P01" })), "auth_failed");
  assert.equal(dbErrorKind(Object.assign(new Error("Tenant or user not found"), { code: "XX000" })), "tenant_or_user");
  assert.equal(dbErrorKind(Object.assign(new Error("relation \"gif.cohorts\" does not exist"), { code: "42P01" })), "schema_missing");
  assert.equal(dbErrorKind(Object.assign(new Error("permission denied for schema gif"), { code: "42501" })), "permission");
  assert.equal(dbErrorKind(new Error("something else")), "other");
});

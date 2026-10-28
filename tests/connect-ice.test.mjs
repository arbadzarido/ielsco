// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { iceConfig, TTL_SECONDS } from "../src/lib/connect/ice.ts";

const USER = "22222222-2222-2222-2222-222222222222";

test("without TURN settings: public STUN only, no relay", () => {
  const c = iceConfig(USER, {});
  assert.deepEqual(c.iceServers, [{ urls: ["stun:stun.l.google.com:19302"] }]);
  assert.equal(c.relay, false);
});

test("TURN URLs without a secret are ignored (no unauthenticated relay)", () => {
  assert.equal(iceConfig(USER, { CONNECT_TURN_URLS: "turn:turn.example.test:3478" }).relay, false);
});

test("TURN REST credentials: expiring username, HMAC-SHA1 password, secret not exposed", () => {
  const now = Date.UTC(2026, 9, 28, 12, 0, 0);
  const c = iceConfig(USER, { CONNECT_TURN_URLS: "turn:turn.example.test:3478, turns:turn.example.test:5349, http://bad", CONNECT_TURN_SECRET: "s3cret", CONNECT_STUN_URLS: "stun:stun.example.test:3478" }, now);
  const turn = c.iceServers[1];
  assert.deepEqual(c.iceServers[0].urls, ["stun:stun.example.test:3478"]);
  assert.deepEqual(turn.urls, ["turn:turn.example.test:3478", "turns:turn.example.test:5349"]);
  assert.equal(turn.username, `${now / 1000 + TTL_SECONDS}:${USER}`);
  assert.equal(turn.credential, createHmac("sha1", "s3cret").update(turn.username).digest("base64"));
  assert.ok(!JSON.stringify(c).includes("s3cret"));
  assert.ok(TTL_SECONDS >= 8 * 60 && TTL_SECONDS <= 15 * 60);
});

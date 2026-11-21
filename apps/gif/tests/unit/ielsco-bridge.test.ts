import { test } from "node:test";
import assert from "node:assert/strict";
import { bridgeSecrets, signSsoToken, verifySsoToken, signWorkspaceRequest, verifyWorkspaceRequest, ielscoSignInUrl } from "../../src/lib/ielsco-bridge.ts";
import { DEFAULT_SETTINGS, pathwayOpen, pathwayOpensAt } from "../../src/lib/settings.ts";

const SECRET = "s".repeat(40), OTHER = "o".repeat(40);
const ID = { sub: "0b8f3c2e-1a2b-4c3d-9e8f-123456789abc", email: "Delegate@Example.com " };

test("SSO token: valid once signed, rejected when tampered, expired, unsigned or misconfigured", () => {
  const now = Date.UTC(2026, 10, 21, 3);
  const t = signSsoToken(SECRET, ID, now);
  const ok = verifySsoToken(t, [SECRET], now + 1000);
  assert.ok(ok.ok && ok.identity.email === "delegate@example.com" && ok.identity.sub === ID.sub);
  assert.ok(verifySsoToken(t, [OTHER, SECRET], now).ok, "rotation: any configured secret verifies");
  assert.deepEqual(verifySsoToken(t, [OTHER], now), { ok: false, error: "bad_signature" });
  assert.deepEqual(verifySsoToken(t, [SECRET], now + 121_000), { ok: false, error: "expired" });
  assert.deepEqual(verifySsoToken(t, [], now), { ok: false, error: "not_configured" });
  const [v, p, s] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), sub: "11111111-1111-4111-8111-111111111111" })).toString("base64url");
  assert.deepEqual(verifySsoToken(`${v}.${forged}.${s}`, [SECRET], now), { ok: false, error: "bad_signature" });
  assert.deepEqual(verifySsoToken("garbage", [SECRET], now), { ok: false, error: "malformed" });
  // A workspace signature must not work as an SSO token (domain separation).
  assert.equal(verifySsoToken(`v1.${p}.${Buffer.from(signWorkspaceRequest(SECRET, p, now)).toString("base64url")}`, [SECRET], now).ok, false);
});

test("workspace request: signed body accepted within 5 minutes only", () => {
  const now = Date.UTC(2026, 10, 21, 3);
  const body = JSON.stringify({ sub: ID.sub, email: ID.email });
  const h = signWorkspaceRequest(SECRET, body, now);
  const ok = verifyWorkspaceRequest(h, body, [SECRET], now + 10_000);
  assert.ok(ok.ok && ok.identity.email === "delegate@example.com");
  assert.equal(verifyWorkspaceRequest(h, body.replace("Delegate", "Attacker"), [SECRET], now).ok, false);
  assert.equal(verifyWorkspaceRequest(h, body, [SECRET], now + 301_000).ok, false);
  assert.equal(verifyWorkspaceRequest(null, body, [SECRET], now).ok, false);
  assert.equal(verifyWorkspaceRequest(h, body, [OTHER], now).ok, false);
});

test("bridge config: short secrets ignored, sign-in URL points at IELSco", () => {
  assert.deepEqual(bridgeSecrets({ IELSCO_GIF_SSO_SECRET: "short, " + SECRET }), [SECRET]);
  assert.equal(ielscoSignInUrl("/apply?pathway=mentoring", {}), "https://www.ielsco.com/api/gif/sso?next=%2Fapply%3Fpathway%3Dmentoring");
});

test("registration timeline (21 Nov 2026): Self-Funded and Mentoring open from 20 Nov, Fully Funded from 25 Nov", () => {
  const s = DEFAULT_SETTINGS;
  const at = (iso: string) => new Date(iso);
  assert.equal(pathwayOpen(s, "self_funded", at("2026-11-19T23:59:00+07:00")).open, false);
  assert.equal(pathwayOpen(s, "self_funded", at("2026-11-20T00:00:00+07:00")).open, true);
  assert.equal(pathwayOpen(s, "mentoring", at("2026-11-21T08:00:00+07:00")).open, true);
  const ff = pathwayOpen(s, "fully_funded", at("2026-11-21T08:00:00+07:00"));
  assert.equal(ff.open, false);
  assert.match(ff.reason ?? "", /25 November 2026/);
  assert.equal(pathwayOpen(s, "fully_funded", at("2026-11-25T00:00:00+07:00")).open, true);
  // Settings saved before this change (no per-pathway dates) fall back to the Phase 1 launch.
  const legacy = { ...s, dates: { ...s.dates, self_funded_opens: "" } };
  assert.equal(pathwayOpensAt(legacy, "self_funded"), s.dates.launch);
});

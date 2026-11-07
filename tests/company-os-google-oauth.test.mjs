import { test } from "node:test";
import assert from "node:assert/strict";
import { CALLBACK_PATHS, backTo, callbackErrorCode, oauthClientInfo, oauthEndpoints, redirectUriFor } from "../src/lib/os/google-oauth.ts";

test("the Drive redirect URI is the exact production callback, whatever forwarded port or case arrives", () => {
  assert.equal(redirectUriFor("os.ielsco.com", "drive"), "https://os.ielsco.com/os/api/admin/drive/callback");
  assert.equal(redirectUriFor("OS.IELSCO.COM:443", "drive"), "https://os.ielsco.com/os/api/admin/drive/callback");
  assert.equal(redirectUriFor("os.localhost:3000", "drive"), "http://os.localhost:3000/os/api/admin/drive/callback");
});

test("no redirect URI on any other host, so Google is never sent elsewhere", () => {
  for (const h of ["www.ielsco.com", "ielsco.com", "ielsco-git-x.vercel.app", "os.ielsco.com.evil.test", "", null]) assert.equal(redirectUriFor(h, "drive"), null, String(h));
});

test("Drive and Calendar use different callbacks", () => {
  assert.notEqual(CALLBACK_PATHS.drive, CALLBACK_PATHS.calendar);
  assert.equal(redirectUriFor("os.ielsco.com", "calendar"), "https://os.ielsco.com/os/api/calendar/callback");
});

test("OS_GOOGLE_CLIENT_ID wins over GOOGLE_CLIENT_ID; the secret is reported only as set or not", () => {
  assert.deepEqual(oauthClientInfo({ GOOGLE_CLIENT_ID: "a.apps", GOOGLE_CLIENT_SECRET: "s" }), { clientId: "a.apps", source: "GOOGLE_CLIENT_ID", hasSecret: true });
  assert.deepEqual(oauthClientInfo({ GOOGLE_CLIENT_ID: "a.apps", OS_GOOGLE_CLIENT_ID: "b.apps" }), { clientId: "b.apps", source: "OS_GOOGLE_CLIENT_ID", hasSecret: false });
  assert.deepEqual(oauthClientInfo({}), { clientId: null, source: null, hasSecret: false });
  assert.ok(!JSON.stringify(oauthClientInfo({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "topsecret" })).includes("topsecret"));
});

test("a local Google stand-in is ignored on Vercel", () => {
  assert.equal(oauthEndpoints({ OS_GOOGLE_OAUTH_BASE: "http://localhost:1/g", VERCEL: "1" }), null);
  assert.equal(oauthEndpoints({}), null);
  assert.equal(oauthEndpoints({ OS_GOOGLE_OAUTH_BASE: "http://localhost:1/g/" }).endpoints.oauth2TokenUrl, "http://localhost:1/g/token");
});

test("Google's callback errors map to plain outcomes", () => {
  assert.equal(callbackErrorCode("access_denied"), "cancelled");
  assert.equal(callbackErrorCode("invalid_scope"), "failed");
  assert.equal(callbackErrorCode(null), null);
});

test("callbacks send the person back to the OS host, not the server's internal URL", () => {
  assert.equal(backTo("https://os.ielsco.com/os/api/admin/drive/callback", "http://localhost:3000/os/api/admin/drive/callback", "/os/admin?tab=health").toString(), "https://os.ielsco.com/os/admin?tab=health");
});

test("the Google API stand-in is served from the origin root, as googleapis builds absolute paths", () => {
  assert.equal(oauthEndpoints({ OS_GOOGLE_OAUTH_BASE: "http://localhost:1/g" }).apiRoot, "http://localhost:1/");
});

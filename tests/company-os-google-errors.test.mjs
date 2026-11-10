// Google failures are classified into a short code, and only allow-listed words leave the classifier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGoogleError, classifyGoogleResponse, failureLog, failureText } from "../src/lib/os/google-errors.ts";

const api = (status, error) => ({ response: { status, data: { error } } });

test("the Drive API switched off in the OAuth client's project is api_disabled, with the project number", () => {
  const e = api(403, { code: 403, message: "Google Drive API has not been used in project 163195263995 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=163195263995 then retry.",
    status: "PERMISSION_DENIED", errors: [{ reason: "accessNotConfigured", domain: "usageLimits" }], details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "SERVICE_DISABLED", metadata: { consumer: "projects/163195263995", service: "drive.googleapis.com" } }] });
  const f = classifyGoogleError(e);
  assert.deepEqual(f, { code: "api_disabled", status: 403, reason: "accessNotConfigured", project: "163195263995" });
  const t = failureText(f, "Drive");
  assert.match(t, /Google Drive API is switched off in Google Cloud project 163195263995/);
  assert.match(t, /Enable/);
});

test("a revoked or expired refresh token is invalid_grant, from the token endpoint's body or from the error text", () => {
  assert.equal(classifyGoogleError({ response: { status: 400, data: { error: "invalid_grant", error_description: "Token has been expired or revoked." } } }).code, "invalid_grant");
  assert.equal(classifyGoogleError({ message: "invalid_grant" }).code, "invalid_grant");
  assert.equal(classifyGoogleResponse(400, { error: "invalid_grant" }).code, "invalid_grant");
});

test("a wrong client ID or secret is invalid_client", () => {
  assert.equal(classifyGoogleError({ response: { status: 401, data: { error: "invalid_client", error_description: "Unauthorized" } } }).code, "invalid_client");
  assert.equal(classifyGoogleError({ message: "invalid_client" }).code, "invalid_client");
});

test("missing scopes are insufficient_scope", () => {
  assert.equal(classifyGoogleError(api(403, { code: 403, message: "Request had insufficient authentication scopes.", errors: [{ reason: "insufficientPermissions" }], status: "PERMISSION_DENIED" })).code, "insufficient_scope");
  assert.equal(classifyGoogleError(api(403, { message: "Insufficient Permission", errors: [{ reason: "insufficientPermissions" }] })).code, "insufficient_scope");
});

test("other 403, 401, 404, 429, network and unknown errors", () => {
  assert.equal(classifyGoogleError(api(403, { message: "The user does not have sufficient permissions for this file.", errors: [{ reason: "forbidden" }] })).code, "permission_denied");
  assert.equal(classifyGoogleError(api(401, { message: "Invalid Credentials" })).code, "unauthenticated");
  assert.equal(classifyGoogleError(api(404, { message: "File not found" })).code, "not_found");
  assert.equal(classifyGoogleError(api(429, { message: "Rate Limit Exceeded" })).code, "rate_limited");
  assert.equal(classifyGoogleError(api(403, { errors: [{ reason: "userRateLimitExceeded" }] })).code, "rate_limited");
  assert.equal(classifyGoogleError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND oauth2.googleapis.com" }).code, "network");
  assert.equal(classifyGoogleError(new Error("boom")).code, "network");
  assert.equal(classifyGoogleError(api(500, { message: "Backend Error" })).code, "unknown");
  assert.equal(classifyGoogleError(null).code, "network");
  assert.equal(classifyGoogleError("string").code, "network");
});

test("nothing from Google's free text, tokens or addresses reaches the sentence or the log line", () => {
  const secret = "ya29.SECRET-ACCESS-TOKEN-1//REFRESH-SECRET";
  const e = { message: `Request failed for user someone@gmail.com token ${secret} file 1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`,
    response: { status: 403, data: { error: { code: 403, message: `Insufficient Permission for someone@gmail.com ${secret} 1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`, errors: [{ reason: "insufficientPermissions <script>" }] } } },
    config: { headers: { Authorization: `Bearer ${secret}` } } };
  const f = classifyGoogleError(e);
  const out = JSON.stringify(f) + failureText(f) + failureText(f, "Calendar") + failureLog("drive writer api", f);
  assert.ok(!/SECRET|someone@|1AbCdEf|Bearer|script/.test(out), out);
  assert.equal(f.reason, null); // an odd reason string is dropped, not echoed
});

test("the project number is shown only for api_disabled, and only digits", () => {
  assert.equal(classifyGoogleResponse(403, { error: { message: "Insufficient scopes for project 123456789", errors: [{ reason: "insufficientPermissions" }] } }).project, null);
  assert.equal(classifyGoogleResponse(403, { error: { message: "Calendar API has not been used in project 123456789 before or it is disabled.", errors: [{ reason: "accessNotConfigured" }] } }).project, "123456789");
  assert.match(failureText(classifyGoogleResponse(403, { error: { message: "Calendar API has not been used in project 123456789 before", errors: [{ reason: "accessNotConfigured" }] } }), "Calendar"), /Calendar API is switched off in Google Cloud project 123456789/);
});

test("every code has a sentence naming the code, and the sentences give a next step", () => {
  for (const code of ["invalid_grant", "invalid_client", "unauthorized_client", "insufficient_scope", "api_disabled", "unauthenticated", "permission_denied", "not_found", "rate_limited", "cannot_decrypt", "network", "unknown"]) {
    const t = failureText({ code, status: code === "network" ? null : 400, reason: null, project: null });
    assert.ok(t.length > 30, code);
    if (!["cannot_decrypt", "network"].includes(code)) assert.ok(t.includes(code), `${code}: ${t}`);
  }
  assert.match(failureText({ code: "cannot_decrypt", status: null, reason: null, project: null }), /sealing key/);
});

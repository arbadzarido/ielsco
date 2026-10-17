// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedHost, safeNextPath, trustedBaseUrl } from "../src/lib/safe-redirect.ts";

const FB = "/dashboard";
const headers = (h) => ({ get: (k) => h[k.toLowerCase()] ?? null });
const withEnv = (vars, fn) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  for (const [k, v] of Object.entries(vars)) if (v === undefined) delete process.env[k];
  try { return fn(); } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
};

test("valid same-site paths keep path, query and hash", () => {
  assert.equal(safeNextPath("/dashboard"), "/dashboard");
  assert.equal(safeNextPath("/dashboard/gif"), "/dashboard/gif");
  assert.equal(safeNextPath("/dashboard/my-goals#destinations"), "/dashboard/my-goals#destinations");
  assert.equal(safeNextPath("/connect/elco?state=abc_DEF-123"), "/connect/elco?state=abc_DEF-123");
  assert.equal(safeNextPath("/sign-in/forgot/new-password"), "/sign-in/forgot/new-password");
  assert.equal(safeNextPath("/explore?q=caf%C3%A9"), "/explore?q=caf%C3%A9");
});

test("missing or empty next falls back", () => {
  for (const v of [null, undefined, "", "   "]) assert.equal(safeNextPath(v), FB);
  assert.equal(safeNextPath(null, "/sign-in"), "/sign-in");
});

test("external and protocol-relative destinations are rejected", () => {
  for (const bad of [
    "https://evil.example", "http://evil.example/dashboard", "HTTPS://EVIL.EXAMPLE", "//evil.example", "///evil.example",
    "/\\evil.example", "\\\\evil.example", "/\\/evil.example", "@evil.example", "evil.example", "javascript:alert(1)",
    "data:text/html,hi", " //evil.example", "\t//evil.example",
  ]) assert.equal(safeNextPath(bad), FB, `should reject ${JSON.stringify(bad)}`);
});

test("encoded and normalisation bypasses are rejected", () => {
  for (const bad of [
    "/%2F%2Fevil.example", "/%2f/evil.example", "/%5Cevil.example", "/%5C%5Cevil.example", "/.//evil.example",
    "/./%2F/evil.example", "/dashboard/../..//evil.example", "/%2e%2e/%2e%2e//evil.example", "/%0d%0aLocation:%20https://evil.example",
    "/%00dashboard", "/%E0%A4%A", // malformed percent-encoding
  ]) assert.equal(safeNextPath(bad), FB, `should reject ${JSON.stringify(bad)}`);
});

test("control characters are rejected", () => {
  for (const bad of ["/\u0000/evil", "/\tdashboard", "/dash\nboard", "/dash\rboard", "/\u007fdashboard"]) assert.equal(safeNextPath(bad), FB);
});

test("the original bug: `${base}${next}` can never change host", () => {
  for (const next of ["@evil.example", ".evil.example", ":443@evil.example", "/.//evil.example", "/%2F%2Fevil.example"]) {
    assert.equal(new URL(`https://ielsco.com${safeNextPath(next)}`).host, "ielsco.com", next);
  }
});

test("host allowlist is explicit and strict", () => {
  withEnv({ NODE_ENV: "production", TRUSTED_HOSTS: undefined }, () => {
    for (const ok of ["ielsco.com", "www.ielsco.com", "school.ielsco.com", "circle.ielsco.com", "IELSCO.COM", "ielsco.com:443"]) assert.ok(isAllowedHost(ok), ok);
    for (const bad of [
      null, "", "evil.example", "ielsco.com.evil.example", "evilielsco.com", "random.ielsco.com", "ielsco.com:443@evil.example",
      "ielsco.com@evil.example", "ielsco.com/evil", "ielsco.com evil.example", "localhost", "localhost:3000", "127.0.0.1", "app.localhost",
    ]) assert.ok(!isAllowedHost(bad), `should reject ${bad}`);
  });
  withEnv({ NODE_ENV: "development" }, () => {
    assert.ok(isAllowedHost("localhost:3000"));
    assert.ok(isAllowedHost("school.localhost:3000"));
    assert.ok(!isAllowedHost("localhost.evil.example"));
  });
  withEnv({ NODE_ENV: "production", TRUSTED_HOSTS: "staging.ielsco.com, app.example.org" }, () => {
    assert.ok(isAllowedHost("staging.ielsco.com"));
    assert.ok(isAllowedHost("app.example.org"));
    assert.ok(!isAllowedHost("other.example.org"));
  });
});

test("trustedBaseUrl ignores untrusted Host / X-Forwarded-Host", () => {
  withEnv({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: undefined, TRUSTED_HOSTS: undefined }, () => {
    assert.equal(trustedBaseUrl(headers({ host: "ielsco.com" })), "https://ielsco.com");
    assert.equal(trustedBaseUrl(headers({ host: "internal-vercel-host", "x-forwarded-host": "school.ielsco.com" })), "https://school.ielsco.com");
    assert.equal(trustedBaseUrl(headers({ "x-forwarded-host": "school.ielsco.com, evil.example" })), "https://school.ielsco.com");
    assert.equal(trustedBaseUrl(headers({ host: "evil.example" })), "https://ielsco.com");
    assert.equal(trustedBaseUrl(headers({ host: "ielsco.com", "x-forwarded-host": "evil.example" })), "https://ielsco.com");
    assert.equal(trustedBaseUrl(headers({ "x-forwarded-host": "ielsco.com:443@evil.example" })), "https://ielsco.com");
    assert.equal(trustedBaseUrl(headers({ host: "localhost:3000" })), "https://ielsco.com");
    assert.equal(trustedBaseUrl(headers({})), "https://ielsco.com");
  });
  withEnv({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://evil.example" }, () => {
    assert.equal(trustedBaseUrl(headers({ host: "evil.example" })), "https://ielsco.com", "a bad canonical URL is not trusted either");
  });
  withEnv({ NODE_ENV: "development", NEXT_PUBLIC_APP_URL: undefined }, () => {
    assert.equal(trustedBaseUrl(headers({ host: "localhost:3000" })), "http://localhost:3000");
  });
});

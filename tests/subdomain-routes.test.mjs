// circle./school.ielsco.com: own routes are rewritten, main-site paths redirect to www instead of answering 404.
import { test } from "node:test";
import assert from "node:assert/strict";
import { subdomainRoute } from "../src/lib/subdomain-routes.ts";

test("Circle keeps its own pages", () => {
  for (const p of ["/", "/agenda", "/stories", "/stories/dalin-building-pawhere-cambodia", "/stories/submit"]) assert.equal(subdomainRoute("circle", p), "rewrite", p);
});

test("main-site paths on Circle redirect (were 404 in Search Console)", () => {
  for (const p of ["/careers", "/events/gif", "/opportunities", "/products/resources", "/about", "/id/artikel", "/privacy-policy", "/storiesx"])
    assert.equal(subdomainRoute("circle", p), "redirect", p);
});

test("School keeps its portal and sign-in", () => {
  for (const p of ["/", "/dashboard", "/dashboard/class/abc", "/sign-in"]) assert.equal(subdomainRoute("school", p), "rewrite", p);
  for (const p of ["/careers", "/membership", "/terms-of-service"]) assert.equal(subdomainRoute("school", p), "redirect", p);
});

test("already-prefixed paths and the API keep the existing behaviour", () => {
  assert.equal(subdomainRoute("circle", "/circle/stories"), "pass");
  assert.equal(subdomainRoute("school", "/school/sign-in"), "pass");
  assert.equal(subdomainRoute("circle", "/api/x"), "pass");
});

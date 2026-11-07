// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
// Company OS host isolation (src/lib/os/host.ts, used by src/proxy.ts) and the approximate device profile.
// The full proxy is exercised in a browser by tests/e2e/company-os.e2e.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isGatedOsPath, isOsHost, isOsPath, osHostRoute } from "../src/lib/os/host.ts";
import { describeDevice, deviceProfileKey, parseUserAgent } from "../src/lib/os/device.ts";
import { suspiciousFailures } from "../src/lib/os/types.ts";

test("only os.ielsco.com (and os.localhost in dev) is the OS host", () => {
  assert.equal(isOsHost("os.ielsco.com"), true);
  assert.equal(isOsHost("OS.IELSCO.COM:443"), true);
  assert.equal(isOsHost("os.localhost:3000"), true);
  for (const h of ["www.ielsco.com", "ielsco.com", "school.ielsco.com", "os.ielsco.com.evil.example", "xos.ielsco.com", "", null]) {
    assert.equal(isOsHost(h), false, String(h));
  }
});

test("short URLs on the OS host land inside /os", () => {
  assert.deepEqual(osHostRoute("/"), { action: "redirect", to: "/os" });
  assert.deepEqual(osHostRoute("/login"), { action: "redirect", to: "/os/login" });
  assert.deepEqual(osHostRoute("/dashboard"), { action: "redirect", to: "/os" });
  assert.deepEqual(osHostRoute("/dashboard/"), { action: "redirect", to: "/os" });
  assert.deepEqual(osHostRoute("/admin"), { action: "redirect", to: "/os/admin" });
  assert.deepEqual(osHostRoute("/sign-in"), { action: "redirect", to: "/os/login" });
});

test("public routes never answer on the OS host", () => {
  // Public member dashboard sub-pages, sign-up and anything unknown go under /os, where they 404 as Company OS pages.
  assert.deepEqual(osHostRoute("/sign-up"), { action: "redirect", to: "/os/sign-up" });
  assert.deepEqual(osHostRoute("/dashboard/admin/stories"), { action: "redirect", to: "/os/dashboard/admin/stories" });
  assert.deepEqual(osHostRoute("/membership"), { action: "redirect", to: "/os/membership" });
  assert.deepEqual(osHostRoute("/auth/callback"), { action: "redirect", to: "/os/auth/callback" });
  assert.deepEqual(osHostRoute("/api/me"), { action: "api-not-found" });
  assert.deepEqual(osHostRoute("/api"), { action: "api-not-found" });
  for (const p of ["/os", "/os/login", "/os/admin", "/os/anything", "/monitoring"]) assert.deepEqual(osHostRoute(p), { action: "next" }, p);
});

test("/os paths are recognised exactly", () => {
  assert.equal(isOsPath("/os"), true);
  assert.equal(isOsPath("/os/admin"), true);
  assert.equal(isOsPath("/osaka"), false);
  assert.equal(isOsPath("/dashboard/os"), false);
});

test("gated OS pages need a session; login, callback and 404 do not", () => {
  for (const p of ["/os", "/os/", "/os/admin", "/os/admin/x", "/os/workspaces", "/os/account", "/os/w/hq", "/os/projects/PRJ-0028",
    "/os/tasks", "/os/documents/DOC-0001", "/os/timeline", "/os/kpis", "/os/okrs", "/os/people/PPL-0001", "/os/reviews", "/os/partnerships",
    "/os/campaigns", "/os/assistant"]) assert.equal(isGatedOsPath(p), true, p);
  // API routes answer 401 themselves (JSON), so the proxy doesn't redirect them to the sign-in page.
  for (const p of ["/os/login", "/os/auth/callback", "/os/auth/signout", "/os/unknown", "/os/administrator", "/os/api/ai/chat", "/os/taskss"]) assert.equal(isGatedOsPath(p), false, p);
});

test("device profile from common browsers", () => {
  const chromeWin = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
  assert.deepEqual(chromeWin, { browser: "Chrome", browserVersion: "130", os: "Windows", deviceType: "desktop" });
  const iphone = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  assert.deepEqual(iphone, { browser: "Safari", browserVersion: "18", os: "iOS", deviceType: "mobile" });
  const ipad = parseUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
  assert.equal(ipad.deviceType, "tablet");
  const edge = parseUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0");
  assert.equal(edge.browser, "Edge"); assert.equal(edge.os, "macOS");
  const android = parseUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
  assert.equal(android.os, "Android"); assert.equal(android.deviceType, "mobile");
  assert.deepEqual(parseUserAgent(null), { browser: "Unknown", browserVersion: null, os: "Unknown", deviceType: "unknown" });
});

test("a browser update is not a new device", () => {
  const a = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36");
  const b = parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  assert.equal(deviceProfileKey(a), deviceProfileKey(b));
  assert.equal(describeDevice(a), "Chrome 129 on Windows · desktop");
});

test("three refused sign-ins in 24 hours flag the account and the IP", () => {
  const now = Date.parse("2026-11-07T12:00:00Z");
  const f = (h, email, ip, success = false) => ({ at: new Date(now - h * 3600e3).toISOString(), success, email, ip });
  const out = suspiciousFailures([f(1, "x@gmail.com", "1.1.1.1"), f(2, "x@gmail.com", "1.1.1.1"), f(3, "x@gmail.com", "2.2.2.2"),
    f(30, "x@gmail.com", "1.1.1.1"), f(1, "ok@ielsco.com", "1.1.1.1", true)], now);
  assert.deepEqual(out, [{ kind: "email", value: "x@gmail.com", count: 3 }]);
});

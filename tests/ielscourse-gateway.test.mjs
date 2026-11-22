// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSite, COURSE_ORDER_ID_RE, courseGateway, newCourseOrderId, serverKeyFor, snapBody } from "../src/lib/payments/gateway.ts";

// Test values only (shaped like Midtrans keys, not real ones).
const PROD = { IELSCOURSE_CHECKOUT_ENABLED: "true", MIDTRANS_ENV: "production", MIDTRANS_PRODUCTION_ENABLED: "true",
  MIDTRANS_PRODUCTION_SERVER_KEY: "Mid-server-TESTVALUEONLY", MIDTRANS_PRODUCTION_CLIENT_KEY: "Mid-client-TESTVALUEONLY" };

test("production gateway opens only with every switch and production-shaped keys", () => {
  const g = courseGateway(PROD).gateway;
  assert.equal(g?.env, "production");
  assert.equal(g?.snapBase, "https://app.midtrans.com");
  assert.equal(g?.apiBase, "https://api.midtrans.com");
  assert.equal(g?.snapJs, "https://app.midtrans.com/snap/snap.js");
  assert.equal(courseGateway({ ...PROD, IELSCOURSE_CHECKOUT_ENABLED: "" }).gateway, null);
  assert.equal(courseGateway({ ...PROD, MIDTRANS_PRODUCTION_ENABLED: "false" }).gateway, null);
  assert.equal(courseGateway({ ...PROD, MIDTRANS_PRODUCTION_SERVER_KEY: "" }).gateway, null);
});

test("Sandbox is refused, never a fallback", () => {
  const s = courseGateway({ ...PROD, MIDTRANS_ENV: "sandbox" });
  assert.equal(s.gateway, null);
  assert.match(s.reason, /production/);
  assert.equal(courseGateway({ ...PROD, MIDTRANS_ENV: "" }).gateway, null);
  assert.equal(courseGateway({ ...PROD, MIDTRANS_PRODUCTION_SERVER_KEY: "SB-Mid-server-X", MIDTRANS_PRODUCTION_CLIENT_KEY: "SB-Mid-client-X" }).gateway, null);
});

test("reasons name variables, never values", () => {
  const r = courseGateway({ ...PROD, MIDTRANS_PRODUCTION_SERVER_KEY: "wrong-shape-secret" }).reason;
  assert.ok(r && !r.includes("wrong-shape-secret"));
});

test("local fake gateway only on loopback and never on Vercel", () => {
  const local = { ...PROD, MIDTRANS_ENV: "", IELSCOURSE_FAKE_MIDTRANS_BASE: "http://127.0.0.1:4010" };
  assert.equal(courseGateway(local).gateway?.env, "local_test");
  assert.equal(courseGateway({ ...local, VERCEL: "1" }).gateway, null);
  assert.equal(courseGateway({ ...local, IELSCOURSE_FAKE_MIDTRANS_BASE: "http://evil.example:4010" }).gateway, null);
  assert.equal(courseGateway({ ...PROD, VERCEL: "1", IELSCOURSE_FAKE_MIDTRANS_BASE: "http://127.0.0.1:4010" }).gateway?.env, "production");
});

test("notification verification key ignores the checkout pause but not the environment", () => {
  assert.equal(serverKeyFor("production", { ...PROD, IELSCOURSE_CHECKOUT_ENABLED: "" }), PROD.MIDTRANS_PRODUCTION_SERVER_KEY);
  assert.equal(serverKeyFor("local_test", PROD), null);
});

test("order ids are IELS-C- and can't collide with Elco or membership", () => {
  const id = newCourseOrderId(new Date("2026-12-10T00:00:00Z"));
  assert.match(id, /^IELS-C-261210-[0-9A-F]{10}$/);
  assert.ok(COURSE_ORDER_ID_RE.test(id));
  assert.ok(!COURSE_ORDER_ID_RE.test("ELCO-261210-0123456789"));
  assert.ok(!COURSE_ORDER_ID_RE.test("IELS-M-261210-0123456789"));
});

test("notifications go to www (Midtrans doesn't follow the apex redirect)", () => {
  assert.equal(canonicalSite({ NEXT_PUBLIC_APP_URL: "https://ielsco.com" }), "https://www.ielsco.com");
  assert.equal(canonicalSite({ NEXT_PUBLIC_APP_URL: "http://www.ielsco.com/" }), "https://www.ielsco.com");
  assert.equal(canonicalSite({}), "https://www.ielsco.com");
});

test("Snap body carries the server amount and product tag", () => {
  const b = snapBody({ orderId: "IELS-C-261210-0123456789", amount: 199000, itemId: "ielscourse-collective", itemName: "IELScourse Collective - 1 month",
    product: "collective", customer: { firstName: "A", email: "a@example.test" }, finishUrl: "https://www.ielsco.com/x", notificationUrl: "https://www.ielsco.com/n" });
  assert.equal(b.transaction_details.gross_amount, 199000);
  assert.equal(b.item_details[0].price, 199000);
  assert.equal(b.custom_field1, "product:ielscourse_collective");
  assert.equal(b.expiry.duration, 60);
});

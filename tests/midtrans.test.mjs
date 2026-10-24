// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkoutState, classify, newOrderId, ORDER_ID_RE, signatureOk } from "../src/lib/payments/midtrans.ts";

const SERVER = "SB-Mid-server-TESTVALUEONLY"; // test value only
const CLIENT = "SB-Mid-client-TESTVALUEONLY";
const sig = (o, s, g, k = SERVER) => createHash("sha512").update(`${o}${s}${g}${k}`).digest("hex");

test("valid Midtrans signature is accepted", () => {
  const n = { order_id: "IELS-M-261026-0123456789", status_code: "200", gross_amount: "129000.00" };
  assert.equal(signatureOk({ ...n, signature_key: sig(n.order_id, n.status_code, n.gross_amount) }, SERVER), true);
});

test("tampered fields, wrong key or missing key are rejected", () => {
  const n = { order_id: "IELS-M-261026-0123456789", status_code: "200", gross_amount: "129000.00" };
  const good = sig(n.order_id, n.status_code, n.gross_amount);
  assert.equal(signatureOk({ ...n, gross_amount: "1000.00", signature_key: good }, SERVER), false);
  assert.equal(signatureOk({ ...n, status_code: "201", signature_key: good }, SERVER), false);
  assert.equal(signatureOk({ ...n, signature_key: sig(n.order_id, n.status_code, n.gross_amount, "other") }, SERVER), false);
  assert.equal(signatureOk({ ...n, signature_key: good }, ""), false);
  assert.equal(signatureOk({ ...n }, SERVER), false);
  assert.equal(signatureOk({ ...n, signature_key: good.slice(0, 10) }, SERVER), false);
});

test("status classification follows Midtrans docs", () => {
  assert.equal(classify({ transaction_status: "settlement" }), "paid");
  assert.equal(classify({ transaction_status: "capture", fraud_status: "accept" }), "paid");
  assert.equal(classify({ transaction_status: "capture" }), "paid");
  assert.equal(classify({ transaction_status: "capture", fraud_status: "challenge" }), "pending");
  assert.equal(classify({ transaction_status: "capture", fraud_status: "deny" }), "failed");
  assert.equal(classify({ transaction_status: "pending" }), "pending");
  assert.equal(classify({ transaction_status: "deny" }), "failed");
  assert.equal(classify({ transaction_status: "failure" }), "failed");
  assert.equal(classify({ transaction_status: "expire" }), "expired");
  assert.equal(classify({ transaction_status: "cancel" }), "cancelled");
  assert.equal(classify({ transaction_status: "refund" }), "refunded");
  assert.equal(classify({ transaction_status: "partial_refund" }), "partially_refunded");
  assert.equal(classify({ transaction_status: "authorize" }), "unknown");
  assert.equal(classify({}), "unknown");
});

test("checkout stays off unless explicitly enabled with matching keys", () => {
  const base = { MEMBERSHIP_CHECKOUT_ENABLED: "true", MIDTRANS_ENV: "sandbox", MIDTRANS_SANDBOX_SERVER_KEY: SERVER, MIDTRANS_SANDBOX_CLIENT_KEY: CLIENT };
  assert.equal(checkoutState(base).env, "sandbox");
  assert.equal(checkoutState({ ...base, MEMBERSHIP_CHECKOUT_ENABLED: "" }).env, null);
  assert.equal(checkoutState({ ...base, MIDTRANS_SANDBOX_CLIENT_KEY: "" }).env, null);
  assert.equal(checkoutState({ ...base, MIDTRANS_SANDBOX_SERVER_KEY: CLIENT, MIDTRANS_SANDBOX_CLIENT_KEY: SERVER }).env, null, "swapped keys");
  assert.equal(checkoutState({ ...base, MIDTRANS_ENV: "staging" }).env, null);
  const prod = { MEMBERSHIP_CHECKOUT_ENABLED: "true", MIDTRANS_ENV: "production", MIDTRANS_PRODUCTION_SERVER_KEY: "Mid-server-X", MIDTRANS_PRODUCTION_CLIENT_KEY: "Mid-client-X" };
  assert.equal(checkoutState(prod).env, null, "production needs MIDTRANS_PRODUCTION_ENABLED");
  assert.equal(checkoutState({ ...prod, MIDTRANS_PRODUCTION_ENABLED: "true" }).env, "production");
  assert.equal(checkoutState({ ...prod, MIDTRANS_PRODUCTION_ENABLED: "true", MIDTRANS_PRODUCTION_SERVER_KEY: "SB-Mid-server-X" }).env, null, "sandbox key in production");
  // The reason never echoes a key value.
  assert.ok(!JSON.stringify(checkoutState({ ...base, MIDTRANS_SANDBOX_SERVER_KEY: "SB-Mid-server-SECRET", MIDTRANS_SANDBOX_CLIENT_KEY: "nope" })).includes("SECRET"));
});

test("order ids are unique and match the database check", () => {
  const ids = new Set(Array.from({ length: 200 }, () => newOrderId(new Date("2026-10-26T00:00:00Z"))));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, ORDER_ID_RE);
  assert.match([...ids][0], /^IELS-M-261026-/);
});

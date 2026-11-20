// Local stand-in for Midtrans (Snap + Core status/refund + HTTP notifications). TESTS ONLY: the app talks to it when
// GIF_MIDTRANS_TEST_BASE points here in Sandbox mode. It mimics the documented behaviour the app relies on:
// - POST /snap/v1/transactions (Basic auth with the server key) → { token, redirect_url }
// - GET  /v2/:order/status → transaction status (status_code "404" for unknown orders)
// - POST /v2/:order/refund → { status_code: "200" } (approved) or "202" when FAIL_REFUND is set for the order
// - Notifications are POSTed to the X-Override-Notification URL, signed SHA512(order_id+status_code+gross_amount+key).
//   node tests/e2e/fake-midtrans.mjs [port] [serverKey] [signatureKey]
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.argv[2] || 3499);
const SERVER_KEY = process.argv[3] || "SB-Mid-server-localfake";
const SIG_KEY = process.argv[4] || SERVER_KEY;
const orders = new Map();
const failRefund = new Set();

const sig = (o, code, amount, key = SIG_KEY) => crypto.createHash("sha512").update(`${o}${code}${amount}${key}`).digest("hex");
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const read = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
const authed = (req) => req.headers.authorization === `Basic ${Buffer.from(`${SERVER_KEY}:`).toString("base64")}`;

function statusBody(o) {
  const code = { settlement: "200", capture: "200", pending: "201", deny: "202", expire: "407", cancel: "200", refund: "200", partial_refund: "200" }[o.transaction_status] ?? "200";
  return { status_code: code, order_id: o.order_id, transaction_id: o.transaction_id, transaction_status: o.transaction_status, fraud_status: o.fraud_status ?? "accept",
    gross_amount: o.gross_amount, currency: "IDR", payment_type: o.payment_type ?? "bank_transfer", transaction_time: o.time };
}

async function notify(o, { badSignature = false } = {}) {
  const b = statusBody(o);
  const body = { ...b, signature_key: badSignature ? "0".repeat(128) : sig(o.order_id, b.status_code, b.gross_amount) };
  const r = await fetch(o.notify, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch((e) => ({ status: 0, text: async () => String(e) }));
  return { status: r.status, body: await r.text() };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;
  try {
    if (req.method === "POST" && p === "/snap/v1/transactions") {
      if (!authed(req)) return json(res, 401, { error_messages: ["Access denied due to unauthorized transaction"] });
      const b = JSON.parse(await read(req));
      const id = b.transaction_details.order_id;
      if (orders.has(id)) return json(res, 400, { error_messages: ["transaction_details.order_id has already been taken"] });
      orders.set(id, { order_id: id, gross_amount: `${b.transaction_details.gross_amount}.00`, transaction_status: null, transaction_id: crypto.randomUUID(),
        notify: req.headers["x-override-notification"], finish: b.callbacks?.finish, time: new Date().toISOString(), item: b.item_details?.[0]?.name });
      return json(res, 201, { token: crypto.randomUUID(), redirect_url: `http://127.0.0.1:${PORT}/pay/${encodeURIComponent(id)}` });
    }
    let m;
    if (req.method === "GET" && (m = p.match(/^\/pay\/([^/]+)$/))) {
      const o = orders.get(decodeURIComponent(m[1]));
      if (!o) { res.writeHead(404); return res.end("unknown order"); }
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(`<!doctype html><title>Fake Midtrans</title><h1>Fake Midtrans (test)</h1><p id="amount">IDR ${o.gross_amount}</p><p>${o.item ?? ""}</p>
        ${["settlement", "pending", "deny", "expire"].map((s) => `<form method="post" action="/pay/${encodeURIComponent(o.order_id)}/${s}"><button id="pay-${s}">${s}</button></form>`).join("")}`);
    }
    if (req.method === "POST" && (m = p.match(/^\/pay\/([^/]+)\/(settlement|pending|deny|expire)$/))) {
      const o = orders.get(decodeURIComponent(m[1]));
      o.transaction_status = m[2];
      o.payment_type = m[2] === "settlement" ? "credit_card" : "bank_transfer";
      if (url.searchParams.get("silent") !== "1") await notify(o);
      res.writeHead(303, { Location: `${o.finish}&transaction_status=${m[2]}` });
      return res.end();
    }
    if (req.method === "GET" && (m = p.match(/^\/v2\/([^/]+)\/status$/))) {
      if (!authed(req)) return json(res, 401, { status_code: "401" });
      const o = orders.get(decodeURIComponent(m[1]));
      if (!o || !o.transaction_status) return json(res, 404, { status_code: "404", status_message: "Transaction doesn't exist." });
      return json(res, 200, statusBody(o));
    }
    if (req.method === "POST" && (m = p.match(/^\/v2\/([^/]+)\/refund$/))) {
      if (!authed(req)) return json(res, 401, { status_code: "401" });
      const o = orders.get(decodeURIComponent(m[1]));
      const b = JSON.parse(await read(req) || "{}");
      if (!o || o.transaction_status !== "settlement" && o.transaction_status !== "partial_refund") return json(res, 200, { status_code: "412", status_message: "Merchant cannot modify the status of the transaction" });
      if (failRefund.has(o.order_id)) return json(res, 200, { status_code: "202", status_message: "Refund denied by the bank" });
      const amount = Number(b.amount ?? o.gross_amount);
      o.refunded = (o.refunded ?? 0) + amount;
      o.transaction_status = o.refunded >= Number(o.gross_amount) ? "refund" : "partial_refund";
      return json(res, 200, { status_code: "200", status_message: "Success, refund request is approved by the bank", refund_key: b.refund_key, refund_amount: amount });
    }
    // ── Test controls ──
    if (req.method === "POST" && p === "/__control/set") {
      const b = JSON.parse(await read(req));
      const o = orders.get(b.order_id);
      if (!o) return json(res, 404, { error: "unknown" });
      if (b.transaction_status) o.transaction_status = b.transaction_status;
      if (b.gross_amount) o.gross_amount = b.gross_amount;
      if (b.fail_refund) failRefund.add(o.order_id);
      const out = b.notify ? await notify(o, { badSignature: !!b.bad_signature }) : null;
      return json(res, 200, { ok: true, notify: out });
    }
    if (req.method === "GET" && p === "/__orders") return json(res, 200, [...orders.values()]);
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: String(e) });
  }
});
server.listen(PORT, "127.0.0.1", () => console.log(`fake midtrans on ${PORT}`));

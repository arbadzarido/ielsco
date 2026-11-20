// Local stand-in for Midtrans (Snap + Core status/refund + HTTP notifications). TESTS ONLY: the app talks to it when
// GIF_MIDTRANS_TEST_BASE points here in Sandbox mode. It mimics the documented behaviour the app relies on:
// - POST /snap/v1/transactions (Basic auth with the server key) → { token, redirect_url }
// - GET  /v2/:order/status → transaction status (status_code "404" for unknown orders)
// - POST /v2/:order/refund → { status_code: "200" } (approved) or "202" when FAIL_REFUND is set for the order
// - Notifications are POSTed to the X-Override-Notification URL, signed SHA512(order_id+status_code+gross_amount+key).
// - GET /snap/snap.js → a Snap JS stand-in: snap.pay(token, callbacks) shows an overlay (#fake-snap, data-order) with the same
//   buttons as the redirect page (#pay-settlement/pending/deny/expire) plus #snap-close (calls onClose).
// - POST /v2/:order/cancel → "200"+cancel for a pending transaction, "412" otherwise (or when refuse_cancel is set);
//   POST /v2/:order/expire → "407"+expire for a pending transaction, "412" otherwise (or when refuse_expire is set);
//   both answer "404" when no method was chosen yet. settle_on_cancel: the payer pays just before the cancel arrives.
//   node tests/e2e/fake-midtrans.mjs [port] [serverKey] [signatureKey]
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.argv[2] || 3499);
const SERVER_KEY = process.argv[3] || "SB-Mid-server-localfake";
const SIG_KEY = process.argv[4] || SERVER_KEY;
const orders = new Map();
const failRefund = new Set();
const refuseCancel = new Set(), refuseExpire = new Set(), settleOnCancel = new Set();
const tokens = new Map(); // snap token → order id
// Fake Elco grant endpoint (POST /api/integrations/ielsco/grants), v1 HMAC like Elco's verifier. mode: "down" (503) | "up".
const ELCO_SECRET = process.env.E2E_ELCO_SECRET || "e2e-ielsco-to-elco-secret-0123456789abcdef";
const elco = { mode: "down", grants: new Map(), calls: [] };
function elcoSigOk(req, raw) {
  const ts = String(req.headers["x-iels-timestamp"] ?? ""), sigHdr = String(req.headers["x-iels-signature"] ?? "");
  if (!ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const canonical = ["v1", ts, "POST", "/api/integrations/ielsco/grants", crypto.createHash("sha256").update(raw).digest("hex")].join(String.fromCharCode(10));
  const want = `v1=${crypto.createHmac("sha256", ELCO_SECRET).update(canonical).digest("hex")}`;
  return want.length === sigHdr.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sigHdr));
}
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

const SNAP_JS = (base) => `(function () {
  var base = ${JSON.stringify(base)};
  function close(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
  window.snap = {
    pay: function (token, cb) {
      cb = cb || {};
      fetch(base + "/snapapi/order/" + encodeURIComponent(token)).then(function (r) { return r.json(); }).then(function (o) {
        var el = document.createElement("div");
        el.id = "fake-snap"; el.setAttribute("data-order", o.order_id); el.setAttribute("role", "dialog");
        el.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:grid;place-items:center";
        var box = document.createElement("div"); box.style.cssText = "background:#fff;padding:24px;border-radius:12px;display:grid;gap:8px";
        box.innerHTML = "<strong>Fake Snap (test)</strong><span>" + o.order_id + "</span>";
        ["settlement", "pending", "deny", "expire"].forEach(function (s) {
          var b = document.createElement("button"); b.id = "pay-" + s; b.textContent = s; b.type = "button";
          b.onclick = function () {
            fetch(base + "/snapapi/" + encodeURIComponent(token) + "/" + s, { method: "POST" }).then(function () {
              close(el);
              if (s === "settlement") cb.onSuccess && cb.onSuccess({ status_code: "200" });
              else if (s === "pending") cb.onPending && cb.onPending({ status_code: "201" });
              else cb.onError && cb.onError({ status_code: "407" });
            });
          };
          box.appendChild(b);
        });
        var c = document.createElement("button"); c.id = "snap-close"; c.textContent = "Close"; c.type = "button";
        c.onclick = function () { close(el); cb.onClose && cb.onClose(); };
        box.appendChild(c); el.appendChild(box); document.body.appendChild(el);
      });
    },
    hide: function () { close(document.getElementById("fake-snap")); }
  };
})();`;

const sig = (o, code, amount, key = SIG_KEY) => crypto.createHash("sha512").update(`${o}${code}${amount}${key}`).digest("hex");
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const read = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
const authed = (req) => req.headers.authorization === `Basic ${Buffer.from(`${SERVER_KEY}:`).toString("base64")}`;

function statusBody(o) {
  const code = { settlement: "200", capture: "200", pending: "201", deny: "202", expire: "407", cancel: "200", refund: "200", partial_refund: "200" }[o.transaction_status] ?? "200";
  // (statusBody is also the cancel/expire response body; the handler overrides status_code there.)
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
      const token = crypto.randomUUID();
      tokens.set(token, id);
      return json(res, 201, { token, redirect_url: `http://127.0.0.1:${PORT}/pay/${encodeURIComponent(id)}` });
    }
    let m;
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (req.method === "GET" && p === "/snap/snap.js") {
      res.writeHead(200, { "Content-Type": "application/javascript", ...cors });
      return res.end(SNAP_JS(`http://127.0.0.1:${PORT}`));
    }
    if (req.method === "GET" && (m = p.match(/^\/snapapi\/order\/([^/]+)$/))) {
      const id = tokens.get(decodeURIComponent(m[1]));
      res.writeHead(id ? 200 : 404, { "Content-Type": "application/json", ...cors });
      return res.end(JSON.stringify({ order_id: id ?? null }));
    }
    if (req.method === "POST" && (m = p.match(/^\/snapapi\/([^/]+)\/(settlement|pending|deny|expire)$/))) {
      const o = orders.get(tokens.get(decodeURIComponent(m[1])));
      if (!o) { res.writeHead(404, cors); return res.end(); }
      o.transaction_status = m[2];
      o.payment_type = m[2] === "settlement" ? "credit_card" : "bank_transfer";
      await notify(o);
      res.writeHead(200, { "Content-Type": "application/json", ...cors });
      return res.end(JSON.stringify({ ok: true }));
    }
    if (req.method === "POST" && (m = p.match(/^\/v2\/([^/]+)\/(cancel|expire)$/))) {
      if (!authed(req)) return json(res, 401, { status_code: "401" });
      const o = orders.get(decodeURIComponent(m[1]));
      const action = m[2];
      o && (o.calls = { ...(o.calls ?? {}), [action]: (o.calls?.[action] ?? 0) + 1 });
      if (!o || !o.transaction_status) return json(res, 404, { status_code: "404", status_message: "Transaction doesn't exist." });
      if (action === "cancel" && settleOnCancel.has(o.order_id) && o.transaction_status === "pending") {
        o.transaction_status = "settlement"; o.payment_type = "bank_transfer"; await notify(o);
      }
      const refused = action === "cancel" ? refuseCancel.has(o.order_id) : refuseExpire.has(o.order_id);
      if (refused || o.transaction_status !== "pending") return json(res, 200, { status_code: "412", status_message: "Merchant cannot modify the status of the transaction" });
      o.transaction_status = action === "cancel" ? "cancel" : "expire";
      await notify(o);
      return json(res, 200, { ...statusBody(o), status_code: action === "cancel" ? "200" : "407",
        status_message: action === "cancel" ? "Success, transaction is canceled" : "Success, transaction has expired" });
    }
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
    // ── Fake IELSco Supabase Auth (password grant), for the combined-account sign-in ──
    if (req.method === "POST" && p === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      if (req.headers.apikey !== "e2e-ielsco-anon") return json(res, 401, { error: "no api key" });
      const b = JSON.parse(await read(req) || "{}");
      const users = { "ayu@example.test": { id: "11111111-1111-4111-8111-111111111111", pw: "ielsco-pass-1", confirmed: true },
        "fresh.ielsco@example.test": { id: "22222222-2222-4222-8222-222222222222", pw: "ielsco-pass-2", confirmed: true },
        "unconfirmed@example.test": { id: "33333333-3333-4333-8333-333333333333", pw: "ielsco-pass-3", confirmed: false } };
      const u = users[b.email];
      if (!u || u.pw !== b.password) return json(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return json(res, 200, { access_token: "x", user: { id: u.id, email: b.email, email_confirmed_at: u.confirmed ? new Date().toISOString() : null } });
    }
    // ── Fake Elco grant endpoint ──
    if (req.method === "POST" && p === "/api/integrations/ielsco/grants") {
      const raw = await read(req);
      const b = JSON.parse(raw || "{}");
      elco.calls.push({ reference: b.reference, mode: elco.mode });
      if (!elcoSigOk(req, raw)) return json(res, 401, { status: "unauthorized" });
      if (elco.mode === "down") return json(res, 503, { status: "unavailable" });
      let g = elco.grants.get(b.reference);
      if (!g) { g = { grant_id: `EG-${crypto.randomUUID().slice(0, 8)}`, status: String(b.email).endsWith("@newcomer.example.test") ? "pending_signup" : "granted", body: b }; elco.grants.set(b.reference, g); }
      return json(res, 200, { grant_id: g.grant_id, status: g.status });
    }
    if (req.method === "POST" && p === "/__control/elco") { const b = JSON.parse(await read(req)); if (b.mode) elco.mode = b.mode; return json(res, 200, { ok: true }); }
    if (req.method === "GET" && p === "/__elco") return json(res, 200, { mode: elco.mode, grants: [...elco.grants.entries()], calls: elco.calls });
    // ── Test controls ──
    if (req.method === "POST" && p === "/__control/set") {
      const b = JSON.parse(await read(req));
      const o = orders.get(b.order_id);
      if (!o) return json(res, 404, { error: "unknown" });
      if (b.transaction_status) o.transaction_status = b.transaction_status;
      if (b.gross_amount) o.gross_amount = b.gross_amount;
      if (b.fail_refund) failRefund.add(o.order_id);
      if (b.refuse_cancel) refuseCancel.add(o.order_id);
      if (b.refuse_expire) refuseExpire.add(o.order_id);
      if (b.settle_on_cancel) settleOnCancel.add(o.order_id);
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

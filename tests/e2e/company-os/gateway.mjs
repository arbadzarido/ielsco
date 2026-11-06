// Local stand-in for Supabase (Auth + PostgREST) used by tests/e2e/company-os.e2e.mjs.
//
// It talks to a REAL Postgres with the real Company OS migrations applied, and runs every REST call the way PostgREST
// does: inside a transaction, as the role from the JWT (anon / authenticated / service_role), with
// request.jwt.claims set. So the e2e test exercises the actual RLS policies and security-definer functions.
// Auth is simulated: "Google" is a test control endpoint that decides which identity the next sign-in returns.
//
//   node tests/e2e/company-os/gateway.mjs            (PORT=54399, PGDATABASE=os_e2e, PGUSER=os_gateway)
import http from "node:http";
import crypto from "node:crypto";
import pg from "pg";

export const JWT_SECRET = "e2e-only-secret-not-used-anywhere-else-0123456789";
const PORT = Number(process.env.PORT || 54399);
const pool = new pg.Pool({ host: process.env.PGHOST || "127.0.0.1", database: process.env.PGDATABASE || "os_e2e", user: process.env.PGUSER || "os_gateway", password: process.env.PGPASSWORD || "gateway", max: 8 });

const b64u = (b) => Buffer.from(b).toString("base64url");
export function sign(payload) {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(payload));
  return `${h}.${p}.${crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url")}`;
}
function verify(token) {
  const [h, p, s] = (token || "").split(".");
  if (!s || crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  return claims.exp && claims.exp < Date.now() / 1000 ? null : claims;
}
export const ANON_KEY = sign({ role: "anon", iss: "e2e", exp: 4102444800 });
export const SERVICE_KEY = sign({ role: "service_role", iss: "e2e", exp: 4102444800 });

// ── Auth (GoTrue subset) ─────────────────────────────────────────────────────────────────────────────────────────────
let nextGoogle = null;            // { email, verified, aal2 } set by the test before clicking "Continue with Google"
const codes = new Map();          // auth code -> { challenge, google }
const refresh = new Map();        // refresh token -> session id

async function issueSession(google, sessionId) {
  const db = await pool.connect();
  try {
    let { rows: [u] } = await db.query("select * from auth.users where email = $1", [google.email]);
    if (!u) {
      // Like Supabase with sign-ups enabled: any Google account gets an auth user. That alone grants nothing in the OS.
      ({ rows: [u] } = await db.query("insert into auth.users (email, email_confirmed_at, raw_app_meta_data) values ($1, case when $2 then now() end, '{\"provider\":\"google\"}') returning *", [google.email, google.verified]));
      await db.query("insert into auth.identities (user_id, provider, identity_data) values ($1, 'google', $2)", [u.id, { email: google.email, email_verified: google.verified }]);
    }
    let sid = sessionId;
    let amrTs = Math.floor(Date.now() / 1000);
    if (!sid) {
      ({ rows: [{ id: sid }] } = await db.query("insert into auth.sessions (user_id) values ($1) returning id", [u.id]));
    } else {
      const { rows } = await db.query("select extract(epoch from created_at)::bigint t from auth.sessions where id = $1", [sid]);
      if (!rows.length) return null;
      amrTs = Number(rows[0].t);
    }
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const amr = google.aal2 ? [{ method: "totp", timestamp: amrTs }, { method: "oauth", timestamp: amrTs }] : [{ method: "oauth", timestamp: amrTs }];
    const user = { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.email_confirmed_at,
      app_metadata: { provider: "google", providers: ["google"] }, user_metadata: {}, identities: [], factors: google.aal2 ? [{ id: "f-1", factor_type: "totp", status: "verified", friendly_name: "e2e" }] : [], created_at: u.created_at };
    const access = sign({ sub: u.id, role: "authenticated", aud: "authenticated", email: u.email, session_id: sid, aal: google.aal2 ? "aal2" : "aal1", amr, exp, iat: exp - 3600 });
    const rt = crypto.randomBytes(16).toString("hex");
    refresh.set(rt, { sid, google });
    return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: rt, user };
  } finally { db.release(); }
}

async function auth(req, res, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1/, "");
  if (path === "/authorize") {
    if (!nextGoogle) return send(res, 400, { error: "no test identity queued" });
    const code = crypto.randomBytes(12).toString("hex");
    codes.set(code, { challenge: url.searchParams.get("code_challenge"), google: nextGoogle });
    nextGoogle = null;
    const to = new URL(url.searchParams.get("redirect_to"));
    to.searchParams.set("code", code);
    res.writeHead(302, { location: to.toString() }); return res.end();
  }
  if (path === "/token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "pkce") {
      const c = codes.get(body.auth_code); codes.delete(body.auth_code);
      if (!c || crypto.createHash("sha256").update(body.code_verifier || "").digest("base64url") !== c.challenge) return send(res, 400, { code: 400, error_code: "bad_code_verifier", msg: "invalid code" });
      return send(res, 200, await issueSession(c.google));
    }
    if (grant === "refresh_token") {
      const r = refresh.get(body.refresh_token);
      const s = r && await issueSession(r.google, r.sid);
      return s ? send(res, 200, s) : send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
    }
  }
  const claims = verify((req.headers.authorization || "").replace(/^Bearer /, ""));
  if (path === "/user") {
    if (!claims?.sub) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    const { rows } = await pool.query("select u.* from auth.users u join auth.sessions s on s.user_id = u.id where u.id = $1 and s.id = $2", [claims.sub, claims.session_id]);
    if (!rows.length) return send(res, 403, { code: 403, error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" });
    const u = rows[0];
    return send(res, 200, { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.email_confirmed_at, app_metadata: { provider: "google" }, user_metadata: {}, identities: [],
      factors: claims.aal === "aal2" ? [{ id: "f-1", factor_type: "totp", status: "verified", friendly_name: "e2e" }] : [] });
  }
  if (path === "/logout") {
    if (claims?.session_id) await pool.query("delete from auth.sessions where id = $1", [claims.session_id]);
    res.writeHead(204); return res.end();
  }
  return send(res, 404, { msg: `auth ${path} not simulated` });
}

// ── REST (PostgREST subset) ──────────────────────────────────────────────────────────────────────────────────────────
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { code: "PGRST100" }); return `"${s}"`; };
function where(params, args) {
  const out = [];
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(k)) continue;
    const [op, ...rest] = v.split("."); const val = rest.join(".");
    const col = ident(k);
    const map = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" };
    if (map[op]) { args.push(val); out.push(`${col} ${map[op]} $${args.length}`); }
    else if (op === "in") { args.push(val.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""))); out.push(`${col}::text = any($${args.length})`); }
    else if (op === "is") out.push(`${col} is ${val === "null" ? "null" : val === "true" ? "true" : "false"}`);
    else throw Object.assign(new Error(`filter ${op} not simulated`), { code: "PGRST100" });
  }
  return out.length ? ` where ${out.join(" and ")}` : "";
}

async function rest(req, res, url, body) {
  const token = req.headers.authorization?.replace(/^Bearer /, "") || req.headers.apikey;
  const claims = verify(token);
  if (!claims) return send(res, 401, { code: "PGRST301", message: "JWT invalid" });
  const role = ["anon", "authenticated", "service_role"].includes(claims.role) ? claims.role : "anon";
  const path = url.pathname.replace(/^\/rest\/v1\//, "");
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await db.query(`set local role ${role}`);
    const prefer = req.headers.prefer || "";
    const args = [];
    let result, status = 200, headers = {};
    if (path.startsWith("rpc/")) {
      const fn = path.slice(4);
      const { rows: procs } = await db.query("select proretset from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace", [fn]);
      if (!procs.length) { await db.query("rollback"); return send(res, 404, { code: "PGRST202", message: `Could not find the function public.${fn}` }); }
      const named = Object.entries(body || {}).map(([k, v]) => { args.push(v); return `${ident(k)} => $${args.length}`; }).join(", ");
      const r = await db.query(procs[0].proretset ? `select * from public.${ident(fn)}(${named})` : `select public.${ident(fn)}(${named}) as v`, args);
      result = procs[0].proretset ? r.rows : r.rows[0]?.v ?? null;
    } else {
      const table = `public.${ident(path)}`;
      if (req.method === "GET" || req.method === "HEAD") {
        const cols = (url.searchParams.get("select") || "*").split(",").map((c) => (c === "*" ? "*" : ident(c.trim()))).join(", ");
        const w = where(url.searchParams, args);
        let q = `select ${cols} from ${table}${w}`;
        const order = url.searchParams.get("order");
        if (order) q += " order by " + order.split(",").map((o) => { const [c, d] = o.split("."); return `${ident(c)} ${d === "desc" ? "desc" : "asc"}`; }).join(", ");
        if (url.searchParams.get("limit")) q += ` limit ${Number(url.searchParams.get("limit"))}`;
        const r = await db.query(q, args);
        result = r.rows;
        if (prefer.includes("count=exact")) { const c = await db.query(`select count(*)::int n from ${table}${w}`, args.slice()); headers["content-range"] = `0-${Math.max(r.rows.length - 1, 0)}/${c.rows[0].n}`; }
        if ((req.headers.accept || "").includes("vnd.pgrst.object")) {
          if (r.rows.length !== 1) { await db.query("rollback"); return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${r.rows.length} rows` }); }
          result = r.rows[0];
        }
      } else if (req.method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        for (const row of rows) {
          const keys = Object.keys(row); const vals = keys.map((k) => { args.push(row[k]); return `$${args.length}`; });
          await db.query(`insert into ${table} (${keys.map(ident).join(", ")}) values (${vals.join(", ")})`, args.splice(0));
        }
        status = 201; result = null;
      } else if (req.method === "PATCH") {
        const sets = Object.keys(body).map((k) => { args.push(body[k]); return `${ident(k)} = $${args.length}`; });
        await db.query(`update ${table} set ${sets.join(", ")}${where(url.searchParams, args)}`, args);
        status = 204;
      } else if (req.method === "DELETE") {
        await db.query(`delete from ${table}${where(url.searchParams, args)}`, args);
        status = 204;
      }
    }
    await db.query("commit");
    if (status === 204 || (status === 201 && !prefer.includes("return=representation"))) { res.writeHead(status, cors(req, headers)); return res.end(); }
    return send(res, status, result, headers, req);
  } catch (e) {
    await db.query("rollback").catch(() => {});
    const st = e.code === "42501" ? (role === "anon" ? 401 : 403) : e.code === "PGRST100" ? 400 : e.code === "23505" ? 409 : 400;
    return send(res, st, { code: e.code, message: e.message, details: null, hint: null }, {}, req);
  } finally { db.release(); }
}

// ── Plumbing ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function cors(req, extra = {}) {
  return { "access-control-allow-origin": req?.headers.origin || "*", "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, HEAD, POST, PATCH, DELETE, OPTIONS", "access-control-expose-headers": "content-range", ...extra };
}
let lastReq;
function send(res, status, body, headers = {}, req = lastReq) {
  res.writeHead(status, cors(req, { "content-type": "application/json", ...headers }));
  res.end(body === undefined ? "" : JSON.stringify(body));
}

if (process.argv.includes("--keys")) {
  console.log(JSON.stringify({ anon: ANON_KEY, service: SERVICE_KEY }));
  process.exit(0);
}

http.createServer(async (req, res) => {
  lastReq = req;
  if (req.method === "OPTIONS") { res.writeHead(204, cors(req)); return res.end(); }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let raw = ""; for await (const c of req) raw += c;
  let body = {};
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = Object.fromEntries(new URLSearchParams(raw)); }
  }
  try {
    if (url.pathname === "/__test/next-google") { nextGoogle = body; return send(res, 200, { ok: true }); }
    if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url, body);
    if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url, body);
    return send(res, 404, { message: "not simulated" });
  } catch (e) { return send(res, 500, { message: e.message }); }
}).listen(PORT, () => console.log(`e2e gateway on :${PORT}`));

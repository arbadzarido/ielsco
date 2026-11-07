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
// PostgREST returns dates as YYYY-MM-DD and numerics as numbers; node-pg would turn dates into JS Dates (UTC-shifted).
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
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
// Enough of PostgREST for the Company OS screens: filters (eq, neq, gt(e), lt(e), in, is, like, ilike and their not.
// forms), or=(...), select with aliases and one level of many-to-one embedding, order with nulls first/last, limit,
// exact counts, return=representation and single-object responses. Embedded rows are read in the same transaction
// and role, so RLS applies to them exactly as it does in PostgREST.
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { code: "PGRST100" }); return `"${s}"`; };
function splitTop(str) {
  const out = []; let depth = 0, quote = false, cur = "";
  for (const ch of str) {
    if (ch === '"') quote = !quote;
    if (!quote && ch === "(") depth++;
    if (!quote && ch === ")") depth--;
    if (!quote && depth === 0 && ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const unq = (x) => x.replace(/^"|"$/g, "");
function cond(col, expr, args) {
  let neg = false;
  if (expr.startsWith("not.")) { neg = true; expr = expr.slice(4); }
  const [op, ...rest] = expr.split("."); const val = rest.join(".");
  const map = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };
  let c;
  if (map[op]) { args.push(op.endsWith("like") ? val.replace(/\*/g, "%") : val); c = `${col} ${map[op]} $${args.length}`; }
  else if (op === "in") { args.push(splitTop(val.replace(/^\(|\)$/g, "")).map(unq)); c = `${col}::text = any($${args.length})`; }
  else if (op === "is") c = `${col} is ${val === "null" ? "null" : val === "true" ? "true" : "false"}`;
  else throw Object.assign(new Error(`filter ${op} not simulated`), { code: "PGRST100" });
  return neg ? `not (${c})` : c;
}
// or=(a.eq.1,and(b.lt.2,c.gt.3)): nested and()/or() groups, as PostgREST allows.
function logic(op, v, args, pre) {
  const parts = splitTop(v.replace(/^\(|\)$/g, "")).map((p) => {
    const g = p.match(/^(and|or)\((.*)\)$/);
    if (g) return logic(g[1], `(${g[2]})`, args, pre);
    const i = p.indexOf("."); return cond(pre + ident(p.slice(0, i)), p.slice(i + 1), args);
  });
  return `(${parts.join(` ${op} `)})`;
}
function where(params, args, alias = "") {
  const out = [];
  const pre = alias ? `${alias}.` : "";
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(k)) continue;
    if (k === "or" || k === "and") out.push(logic(k, v, args, pre));
    else out.push(cond(pre + ident(k), v, args));
  }
  return out.length ? ` where ${out.join(" and ")}` : "";
}
async function selectList(db, table, select) {
  const items = splitTop(select || "*");
  const cols = [];
  for (const raw of items) {
    const it = raw.trim();
    const m = it.match(/^(?:([a-z_][a-z0-9_]*):)?([a-z_][a-z0-9_]*)(?:!([a-z_][a-z0-9_]*))?\((.*)\)$/);
    if (m) {
      const [, alias, rel, hint, inner] = m;
      // many-to-one: a foreign key on this table pointing at rel (a !hint names the constraint)
      const { rows } = await db.query(`select a.attname col, af.attname ref from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
        where c.contype = 'f' and c.conrelid = $1::regclass and c.confrelid = $2::regclass and ($3::text is null or c.conname = $3)`, [`public.${table}`, `public.${rel}`, hint ?? null]);
      if (!rows.length) throw Object.assign(new Error(`no relationship ${table} -> ${rel}`), { code: "PGRST200" });
      const innerCols = splitTop(inner).map((c) => (c.trim() === "*" ? "*" : ident(c.trim()))).join(", ");
      cols.push(`(select row_to_json(e) from (select ${innerCols} from public.${ident(rel)} r where r.${ident(rows[0].ref)} = t.${ident(rows[0].col)}) e) as ${ident(alias || rel)}`);
    } else if (it === "*") cols.push("t.*");
    else { const [a, c] = it.includes(":") ? it.split(":") : [null, it]; cols.push(`t.${ident(c)}${a ? ` as ${ident(a)}` : ""}`); }
  }
  return cols.join(", ");
}
const returning = (select) => (select || "*").split(",").map((c) => (c.trim() === "*" ? "*" : ident(c.trim().split(":").pop()))).join(", ");
const param = (v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v);

async function rest(req, res, url, body) {
  const token = req.headers.authorization?.replace(/^Bearer /, "") || req.headers.apikey;
  const claims = verify(token);
  if (!claims) return send(res, 401, { code: "PGRST301", message: "JWT invalid" });
  const role = ["anon", "authenticated", "service_role"].includes(claims.role) ? claims.role : "anon";
  const path = url.pathname.replace(/^\/rest\/v1\//, "");
  const db = await pool.connect();
  const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
  try {
    await db.query("begin");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await db.query(`set local role ${role}`);
    const prefer = req.headers.prefer || "";
    const args = [];
    let result, status = 200;
    const headers = {};
    let rowsOut = null;
    if (path.startsWith("rpc/")) {
      const fn = path.slice(4);
      const { rows: procs } = await db.query("select proretset from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace", [fn]);
      if (!procs.length) { await db.query("rollback"); return send(res, 404, { code: "PGRST202", message: `Could not find the function public.${fn}` }); }
      // Like PostgREST: JSON arguments arrive as JSON (node-postgres would turn an array of objects into a Postgres array).
      const named = Object.entries(body || {}).map(([k, v]) => { args.push(Array.isArray(v) && v.some((x) => x && typeof x === "object") ? JSON.stringify(v) : v); return `${ident(k)} => $${args.length}`; }).join(", ");
      const r = await db.query(procs[0].proretset ? `select * from public.${ident(fn)}(${named})` : `select public.${ident(fn)}(${named}) as v`, args);
      result = procs[0].proretset ? r.rows : r.rows[0]?.v ?? null;
    } else {
      const tname = path; ident(tname);
      const table = `public.${ident(tname)}`;
      const select = url.searchParams.get("select");
      if (req.method === "GET" || req.method === "HEAD") {
        const cols = await selectList(db, tname, select);
        const w = where(url.searchParams, args, "t");
        let q = `select ${cols} from ${table} t${w}`;
        const order = url.searchParams.get("order");
        if (order) q += " order by " + order.split(",").map((o) => { const [c, d, n] = o.split("."); return `t.${ident(c)} ${d === "desc" ? "desc" : "asc"}${n === "nullsfirst" ? " nulls first" : n === "nullslast" ? " nulls last" : ""}`; }).join(", ");
        if (url.searchParams.get("limit")) q += ` limit ${Number(url.searchParams.get("limit"))}`;
        const r = await db.query(q, args);
        rowsOut = r.rows;
        if (prefer.includes("count=exact")) { const c = await db.query(`select count(*)::int n from ${table} t${w}`, args.slice()); headers["content-range"] = `0-${Math.max(r.rows.length - 1, 0)}/${c.rows[0].n}`; }
      } else if (req.method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        rowsOut = [];
        for (const row of rows) {
          const keys = Object.keys(row); const vals = keys.map((k) => { args.push(param(row[k])); return `$${args.length}`; });
          const r = await db.query(`insert into ${table} (${keys.map(ident).join(", ")}) values (${vals.join(", ")}) returning ${returning(select)}`, args.splice(0));
          rowsOut.push(...r.rows);
        }
        status = 201;
      } else if (req.method === "PATCH") {
        const sets = Object.keys(body).map((k) => { args.push(param(body[k])); return `${ident(k)} = $${args.length}`; });
        const r = await db.query(`update ${table} t set ${sets.join(", ")}${where(url.searchParams, args, "t")} returning ${returning(select).split(", ").map((c) => (c === "*" ? "t.*" : `t.${c}`)).join(", ")}`, args);
        rowsOut = r.rows; status = 204;
      } else if (req.method === "DELETE") {
        const r = await db.query(`delete from ${table} t${where(url.searchParams, args, "t")} returning t.*`, args);
        rowsOut = r.rows; status = 204;
      }
      const rep = req.method === "GET" || req.method === "HEAD" || prefer.includes("return=representation");
      if (rep) {
        status = req.method === "POST" ? 201 : 200;
        if (wantsObject) {
          if (rowsOut.length !== 1) { await db.query("rollback"); return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rowsOut.length} rows` }); }
          result = rowsOut[0];
        } else result = rowsOut;
      }
    }
    await db.query("commit");
    if (status === 204 || (status === 201 && !prefer.includes("return=representation"))) { res.writeHead(status, cors(req, headers)); return res.end(); }
    if (req.method === "HEAD") { res.writeHead(200, cors(req, headers)); return res.end(); }
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

// ── Google OAuth stand-in (the app uses it only when OS_GOOGLE_OAUTH_BASE is set, never on Vercel) ──────────────────
// Behaves like Google for the parts the app relies on: the consent URL refuses a redirect_uri that isn't registered
// for the client ("redirect_uri_mismatch"), the token endpoint exchanges a code once, tokeninfo names the account.
let googleRedirects = [];                 // the "Authorized redirect URIs" of the stub client, set by the test
const googleCodes = new Map();            // code -> { scope }
function google(req, res, url, body) {
  const path = url.pathname.replace(/^\/__google/, "");
  if (path === "/o/oauth2/v2/auth") {
    const redirect = url.searchParams.get("redirect_uri") ?? "";
    if (!googleRedirects.includes(redirect)) {
      res.writeHead(400, { "content-type": "text/html" });
      return res.end(`<h1>Access blocked: this app's request is invalid</h1><p>Error 400: redirect_uri_mismatch</p><p>${redirect.replace(/[<>&"]/g, "")}</p>`);
    }
    const code = `code-${Math.random().toString(36).slice(2)}`;
    googleCodes.set(code, { scope: url.searchParams.get("scope") ?? "" });
    const back = new URL(redirect); back.searchParams.set("code", code); back.searchParams.set("state", url.searchParams.get("state") ?? "");
    res.writeHead(302, { location: back.toString() }); return res.end();
  }
  if (path === "/token") {
    if (body.grant_type === "authorization_code") {
      const c = googleCodes.get(body.code); googleCodes.delete(body.code);
      if (!c || !googleRedirects.includes(body.redirect_uri)) return send(res, 400, { error: "invalid_grant" });
      return send(res, 200, { access_token: "e2e-google-access", refresh_token: "e2e-google-refresh-SECRET", scope: c.scope, expires_in: 3600, token_type: "Bearer" });
    }
    if (body.grant_type === "refresh_token") return send(res, 200, { access_token: "e2e-google-access-2", expires_in: 3600, token_type: "Bearer", scope: "https://www.googleapis.com/auth/drive" });
    return send(res, 400, { error: "unsupported_grant_type" });
  }
  if (path === "/tokeninfo") return send(res, 200, { email: "drive.writer@ielsco.test", email_verified: "true", scope: "https://www.googleapis.com/auth/drive openid email", expires_in: 3599 });
  if (path === "/revoke") return send(res, 200, {});
  if (path === "/drive/v3/about") return send(res, 200, { user: { emailAddress: "drive.writer@ielsco.test" } });
  if (path.startsWith("/calendar/v3/")) return calendar(req, res, url, body, path.slice("/calendar/v3".length));
  return send(res, 404, { error: "not simulated" });
}

// ── Google Calendar stand-in: one "primary" calendar, etags that change on every write, If-Match → 412 ──────────────
const gcal = new Map();                   // id -> event
const rsvp = new Map();                   // attendee email -> answer, for the next write
let gcalSeq = 0;
const etag = () => `"e${++gcalSeq}"`;
function calendar(req, res, url, body, path) {
  if (!/^Bearer e2e-google-access/.test(req.headers.authorization ?? "")) return send(res, 401, { error: { code: 401 } });
  if (path === "/users/me/settings/timezone") return send(res, 200, { value: "Asia/Jakarta" });
  const m = path.match(/^\/calendars\/primary\/events(?:\/([^/]+))?$/);
  if (!m) return send(res, 404, { error: { code: 404 } });
  const id = m[1] && decodeURIComponent(m[1]);
  if (!id && req.method === "GET") {
    const prop = url.searchParams.get("privateExtendedProperty");
    let items = [...gcal.values()].filter((e) => e.status !== "cancelled");
    if (prop) { const [k, v] = prop.split("="); items = items.filter((e) => e.extendedProperties?.private?.[k] === v); }
    const min = url.searchParams.get("timeMin"), max = url.searchParams.get("timeMax");
    const startOf = (e) => e.start?.dateTime ?? `${e.start?.date}T00:00:00+07:00`;
    const endOf = (e) => e.end?.dateTime ?? `${e.end?.date}T00:00:00+07:00`;
    if (min && max) items = items.filter((e) => Date.parse(startOf(e)) < Date.parse(max) && Date.parse(endOf(e)) > Date.parse(min));
    return send(res, 200, { items });
  }
  // Attendees keep the answer they gave (set by the test with /__test/gcal-rsvp); new ones haven't answered yet.
  const withRsvp = (prev, b) => (b.attendees ? { ...b, attendees: b.attendees.map((x) => ({ responseStatus: (prev?.attendees ?? []).find((y) => y.email === x.email)?.responseStatus ?? rsvp.get(x.email) ?? "needsAction", ...x })) } : b);
  if (!id && req.method === "POST") {
    const ev = { ...withRsvp(null, body), id: `g${++gcalSeq}`, etag: etag(), status: body.status ?? "confirmed", htmlLink: "https://calendar.google.com/event?eid=e2e", sendUpdates: url.searchParams.get("sendUpdates") };
    gcal.set(ev.id, ev); return send(res, 200, ev);
  }
  // An instance of a recurring event ("<id>_20261116T030000Z" or "<id>_20261116"): changes are kept per instance.
  const inst = id && id.match(/^(g\d+)_(\d{8}(?:T\d{6}Z)?)$/);
  if (inst && req.method === "PATCH") {
    const master = gcal.get(inst[1]);
    if (!master || !master.recurrence) return send(res, 404, { error: { code: 404 } });
    master.instances = { ...(master.instances ?? {}), [inst[2]]: body };
    return send(res, 200, { ...master, ...body, id, recurringEventId: master.id, etag: etag() });
  }
  const ev = gcal.get(id);
  if (!ev) return send(res, 404, { error: { code: 404 } });
  const match = req.headers["if-match"];
  if (match && match !== ev.etag && req.method !== "GET") return send(res, 412, { error: { code: 412, message: "Precondition Failed" } });
  if (req.method === "GET") return send(res, 200, ev);
  if (req.method === "PATCH") { Object.assign(ev, withRsvp(ev, body), { etag: etag(), sendUpdates: url.searchParams.get("sendUpdates") }); return send(res, 200, ev); }
  if (req.method === "DELETE") { gcal.delete(id); res.writeHead(204, cors(req)); return res.end(); }
  return send(res, 405, {});
}

// ── Gemini stand-in (the app uses it only when OS_GEMINI_BASE is set, never on Vercel) ─────────────────────────────
// The test queues the model's next answer; with nothing queued the "model" is down, so failures stay testable.
const geminiQueue = [];
let geminiLast = null;
function gemini(req, res, body) {
  geminiLast = body;
  const next = geminiQueue.shift();
  if (!next) return send(res, 503, { error: { code: 503, message: "unavailable", status: "UNAVAILABLE" } });
  const parts = [...(next.text ? [{ text: next.text }] : []), ...(next.calls ?? []).map((c) => ({ functionCall: { name: c.name, args: c.args } }))];
  return send(res, 200, { candidates: [{ content: { role: "model", parts }, finishReason: "STOP", index: 0 }], usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 80, totalTokenCount: 1280 } });
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
    if (url.pathname === "/__test/google-redirects") { googleRedirects = body.uris ?? []; return send(res, 200, { ok: true }); }
    if (url.pathname === "/__test/gemini") { geminiQueue.push(body); return send(res, 200, { ok: true }); }
    if (url.pathname === "/__test/gemini-last") return send(res, 200, geminiLast ?? {});
    if (url.pathname === "/__test/gcal" && req.method === "GET") return send(res, 200, { items: [...gcal.values()] });
    if (url.pathname === "/__test/gcal-rsvp") { for (const [k, v] of Object.entries(body)) { rsvp.set(k, v); for (const e of gcal.values()) for (const x of e.attendees ?? []) if (x.email === k) x.responseStatus = v; } return send(res, 200, { ok: true }); }
    if (url.pathname === "/__test/gcal") {
      // Change or remove an event "in Google", as the person would in Google Calendar.
      const ev = gcal.get(body.id);
      if (ev && body.remove) gcal.delete(body.id); else if (ev) Object.assign(ev, body.patch ?? {}, { etag: etag() });
      return send(res, 200, { ok: Boolean(ev) });
    }
    if (url.pathname.startsWith("/__gemini/")) return gemini(req, res, body);
    if (url.pathname.startsWith("/__google/")) return google(req, res, url, body);
    if (url.pathname.startsWith("/drive/v3/") || url.pathname.startsWith("/calendar/v3/")) return google(req, res, url, body);
    if (url.pathname.startsWith("/auth/v1/")) return await auth(req, res, url, body);
    if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url, body);
    return send(res, 404, { message: "not simulated" });
  } catch (e) { return send(res, 500, { message: e.message }); }
}).listen(PORT, () => console.log(`e2e gateway on :${PORT}`));

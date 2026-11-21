import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, q } from "./db";
import { overLimit } from "./ratelimit";
import { clientIp, siteUrl, userAgent } from "./request";
import { sendEmail } from "./email/send";
import { loginCodeEmail } from "./email/templates";

// Passwordless sign-in: a 6-digit code sent by email (10 minutes, 5 tries). Separate from IELSco member accounts on
// purpose: applicants don't need an IELSco account, and Supabase Auth's project-wide email limit is not touched.
// Sessions are random 256-bit tokens; only their SHA-256 is stored. The cookie is HttpOnly, SameSite=Lax and, on HTTPS,
// a __Host- cookie (Secure, host-only, path=/).

const CODE_TTL_MIN = 10;
const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 5;

const secure = () => siteUrl().startsWith("https://");
export const SESSION_COOKIE = () => (secure() ? "__Host-gif_session" : "gif_session");

function secret(): string {
  const s = process.env.GIF_AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("GIF_AUTH_SECRET must be set (32+ characters)");
  return s;
}
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const codeHash = (email: string, code: string) => createHmac("sha256", secret()).update(`${email}:${code}`).digest("hex");

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}$/.test(e) ? e : null;
}

export type RequestCodeResult = { ok: true } | { ok: false; error: string };

export async function requestLoginCode(rawEmail: string): Promise<RequestCodeResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  const ip = (await clientIp()) ?? "unknown";
  if (await overLimit(`code-email:${email}`, 5, 3600)) return { ok: false, error: "Too many codes requested for this email. Try again in an hour." };
  if (await overLimit(`code-ip:${ip}`, 30, 3600)) return { ok: false, error: "Too many sign-in attempts from this network. Try again later." };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await q("update gif.login_codes set consumed_at = now() where email = $1 and consumed_at is null", [email]);
  await q("insert into gif.login_codes (email, code_hash, expires_at, ip) values ($1, $2, now() + make_interval(mins => $3), $4)",
    [email, codeHash(email, code), CODE_TTL_MIN, ip]);
  const mail = loginCodeEmail(code, CODE_TTL_MIN);
  await sendEmail({ to: email, template: "login_code", ...mail });
  return { ok: true };
}

export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (!email || code.length !== 6) return { ok: false, error: "Enter the 6-digit code from your email." };
  const ip = (await clientIp()) ?? "unknown";
  if (await overLimit(`verify-ip:${ip}`, 60, 3600)) return { ok: false, error: "Too many attempts. Try again later." };
  const row = await one<{ id: string; code_hash: string; attempts: number }>(
    `update gif.login_codes set attempts = attempts + 1
     where id = (select id from gif.login_codes where email = $1 and consumed_at is null and expires_at > now() order by created_at desc limit 1)
     returning id, code_hash, attempts`, [email]);
  if (!row) return { ok: false, error: "This code has expired. Request a new one." };
  if (row.attempts > MAX_ATTEMPTS) {
    await q("update gif.login_codes set consumed_at = now() where id = $1", [row.id]);
    return { ok: false, error: "Too many wrong codes. Request a new one." };
  }
  const a = Buffer.from(row.code_hash), b = Buffer.from(codeHash(email, code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "That code is not correct." };
  await q("update gif.login_codes set consumed_at = now() where id = $1", [row.id]);
  const acct = await one<{ id: string }>(
    `insert into gif.accounts (email, last_login_at) values ($1, now())
     on conflict (email) do update set last_login_at = now() returning id`, [email]);
  await startSession(acct!.id, email, ip);
  return { ok: true, accountId: acct!.id };
}

async function startSession(accountId: string, email: string, ip: string) {
  // Team members invited by a leader are linked to their participant row the first time they sign in.
  await q("update gif.participants set account_id = $1 where email = $2 and account_id is null", [accountId, email]);
  const token = randomBytes(32).toString("base64url");
  await q("insert into gif.sessions (token_hash, account_id, expires_at, ip, user_agent) values ($1, $2, now() + make_interval(days => $3), $4, $5)",
    [sha256(token), accountId, SESSION_DAYS, ip, await userAgent()]);
  (await cookies()).set(SESSION_COOKIE(), token, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });
}

// ── Combined IELSco accounts ──────────────────────────────────────────────────────────────────────────────────────────
// Founder decision (20 Nov 2026): GIF and IELSco accounts are combined. Non-destructive design: GIF keeps its own
// account rows (and every application and payment attached to them); an account is *linked* to the IELSco Supabase
// Auth user (gif.accounts.ielsco_user_id). Applicants can sign in with their IELSco email and password, which IELSco's
// Supabase Auth verifies; GIF keeps no Supabase tokens. Lookup order: linked user id, then the same verified email.
// Email-code sign-in keeps working for everyone, so no existing applicant loses access.
function ielscoAuthConfig() {
  const url = (process.env.GIF_IELSCO_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.GIF_IELSCO_SUPABASE_ANON_KEY || "";
  return url && key ? { url, key } : null;
}
export const ielscoSignInAvailable = () => !!ielscoAuthConfig();

export type IelscoUser = { id: string; email: string };
async function verifyIelscoPassword(rawEmail: string, password: string): Promise<{ ok: true; user: IelscoUser } | { ok: false; error: string }> {
  const cfg = ielscoAuthConfig();
  if (!cfg) return { ok: false, error: "IELSco sign-in is not available yet. Use an email code instead." };
  const email = normalizeEmail(rawEmail);
  if (!email || !password || password.length > 200) return { ok: false, error: "Enter your IELSco email and password." };
  const ip = (await clientIp()) ?? "unknown";
  if (await overLimit(`ielsco-email:${email}`, 10, 3600) || await overLimit(`ielsco-ip:${ip}`, 40, 3600)) return { ok: false, error: "Too many attempts. Try again later or use an email code." };
  try {
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: cfg.key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => ({}))) as { user?: { id?: string; email?: string; email_confirmed_at?: string | null } };
    if (!res.ok || !body.user?.id || !body.user.email) return { ok: false, error: "That IELSco email or password is not correct." };
    if (!body.user.email_confirmed_at) return { ok: false, error: "Confirm your IELSco email address first (check your inbox), or use an email code." };
    return { ok: true, user: { id: body.user.id, email: body.user.email.toLowerCase() } };
  } catch {
    return { ok: false, error: "IELSco sign-in is temporarily unavailable. Use an email code instead." };
  }
}

const LINK_CONFLICT = "This email is linked to a different IELSco account. Contact hello@ielsco.com.";

// The GIF account of an IELSco user: the one linked to their IELSco user id, else the unlinked one with the same
// confirmed email. Read-only (used by the IELSco dashboard summary); never returns an account linked to someone else.
export async function findAccountForIelscoUser(user: IelscoUser): Promise<{ id: string; email: string; linked: boolean } | null> {
  const linked = await one<{ id: string; email: string }>("select id, email from gif.accounts where ielsco_user_id = $1", [user.id]);
  if (linked) return { ...linked, linked: true };
  const byEmail = await one<{ id: string; email: string; ielsco_user_id: string | null }>("select id, email, ielsco_user_id from gif.accounts where email = $1", [user.email]);
  return byEmail && !byEmail.ielsco_user_id ? { id: byEmail.id, email: byEmail.email, linked: false } : null;
}

// Find, link or create the GIF account for a verified IELSco user. Non-destructive: an existing GIF account (and every
// application and payment on it) is kept and only gains ielsco_user_id.
async function linkOrCreateForIelscoUser(user: IelscoUser): Promise<{ ok: true; acct: { id: string; email: string } } | { ok: false; error: string }> {
  const linked = await one<{ id: string; email: string }>("select id, email from gif.accounts where ielsco_user_id = $1", [user.id]);
  if (linked) return { ok: true, acct: linked };
  const byEmail = await one<{ id: string; email: string; ielsco_user_id: string | null }>("select id, email, ielsco_user_id from gif.accounts where email = $1", [user.email]);
  if (byEmail?.ielsco_user_id && byEmail.ielsco_user_id !== user.id) return { ok: false, error: LINK_CONFLICT };
  const acct = byEmail
    ? await one<{ id: string; email: string }>("update gif.accounts set ielsco_user_id = $2, ielsco_linked_at = now() where id = $1 and ielsco_user_id is null returning id, email", [byEmail.id, user.id])
    : await one<{ id: string; email: string }>(
      `insert into gif.accounts (email, ielsco_user_id, ielsco_linked_at) values ($1, $2, now())
       on conflict (email) do update set ielsco_user_id = excluded.ielsco_user_id, ielsco_linked_at = now() where gif.accounts.ielsco_user_id is null
       returning id, email`, [user.email, user.id]);
  if (!acct) return { ok: false, error: LINK_CONFLICT }; // lost a race with a link to another IELSco user
  return { ok: true, acct };
}

export async function signInWithIelsco(rawEmail: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await verifyIelscoPassword(rawEmail, password);
  if (!v.ok) return v;
  return signInAsIelscoUser(v.user);
}

// Single sign-on from the IELSco dashboard (lib/ielsco-bridge.ts): IELSco already verified the person, so no password
// or code is asked again. The caller has verified the signed token and consumed its nonce.
export async function signInAsIelscoUser(user: IelscoUser): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = (await clientIp()) ?? "unknown";
  const r = await linkOrCreateForIelscoUser(user);
  if (!r.ok) return r;
  await q("update gif.accounts set last_login_at = now() where id = $1", [r.acct.id]);
  await startSession(r.acct.id, r.acct.email, ip);
  return { ok: true };
}

// Link the signed-in GIF account to an IELSco account (also when the two use different email addresses).
export async function linkIelscoAccount(accountId: string, rawEmail: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await verifyIelscoPassword(rawEmail, password);
  if (!v.ok) return v;
  const other = await one<{ id: string }>("select id from gif.accounts where ielsco_user_id = $1 and id <> $2", [v.user.id, accountId]);
  if (other) return { ok: false, error: "That IELSco account is already linked to another GIF account. Contact hello@ielsco.com to merge them." };
  await q("update gif.accounts set ielsco_user_id = $2, ielsco_linked_at = now() where id = $1", [accountId, v.user.id]);
  return { ok: true };
}

export type Account = { id: string; email: string; staffRole: StaffRole | null; staffName: string | null; ielscoLinked: boolean };
export type StaffRole = "owner" | "admin" | "finance" | "evaluator" | "viewer";

export const getAccount = cache(async (): Promise<Account | null> => {
  const token = (await cookies()).get(SESSION_COOKIE())?.value;
  if (!token || token.length > 100) return null;
  const row = await one<{ id: string; email: string; role: StaffRole | null; name: string | null; ielsco_user_id: string | null }>(
    `select a.id, a.email, st.role, st.name, a.ielsco_user_id from gif.sessions s join gif.accounts a on a.id = s.account_id
     left join gif.staff st on st.email = a.email and st.active
     where s.token_hash = $1 and s.expires_at > now()`, [sha256(token)]);
  return row ? { id: row.id, email: row.email, staffRole: row.role, staffName: row.name, ielscoLinked: !!row.ielsco_user_id } : null;
});

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE())?.value;
  if (token) await q("delete from gif.sessions where token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE());
}

export async function requireAccount(next = "/portal"): Promise<Account> {
  const a = await getAccount();
  if (!a) redirect(`/login?next=${encodeURIComponent(next)}`);
  return a;
}

// Role → what it may do. Owners and admins do everything; finance handles money; evaluators score; viewers read.
const CAN: Record<string, StaffRole[]> = {
  read: ["owner", "admin", "finance", "evaluator", "viewer"],
  review: ["owner", "admin"],
  status: ["owner", "admin"],
  finance: ["owner", "admin", "finance"],
  evaluate: ["owner", "admin", "evaluator"],
  select: ["owner", "admin"],
  content: ["owner", "admin"],
  staff: ["owner"],
  export: ["owner", "admin", "finance"],
};
export type Permission = keyof typeof CAN;

export function can(role: StaffRole | null | undefined, p: Permission): boolean {
  return !!role && CAN[p].includes(role);
}

export async function requireStaff(p: Permission = "read"): Promise<Account & { staffRole: StaffRole }> {
  const a = await getAccount();
  if (!a) redirect("/login?next=/admin");
  if (!can(a.staffRole, p)) redirect(a.staffRole ? "/admin?denied=1" : "/portal");
  return a as Account & { staffRole: StaffRole };
}

export function actorOf(a: Account): string {
  return a.email;
}

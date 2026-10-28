// IELSco Connect migrations + RLS + RPC rules on PGlite (real Postgres in WASM) with Supabase-like roles.
// Not part of `npm test` (needs @electric-sql/pglite, which the repo does not install). Copy it next to a PGlite install
// (e.g. workspace/local-stack/tests/) and run:  node --liftoff-only connect.pglite.mjs <repo>/supabase/migrations
// PGlite has a single connection, so concurrency is covered by the locks/constraints in SQL, not exercised here.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const ADMIN = "11111111-1111-1111-1111-111111111111", A = "22222222-2222-2222-2222-222222222222", B = "33333333-3333-3333-3333-333333333333";
const C = "44444444-4444-4444-4444-444444444444", D = "55555555-5555-5555-5555-555555555555", NEW = "66666666-6666-6666-6666-666666666666";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create table public.users (id uuid primary key, full_name text);
  create table public.staff_roles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role in ('admin')), granted_at timestamptz not null default now(), note text);
  insert into auth.users (id, email, email_confirmed_at) values
    ('${ADMIN}', 'admin@example.test', now()), ('${A}', 'a@example.test', now()), ('${B}', 'b@example.test', now()),
    ('${C}', 'c@example.test', now()), ('${D}', 'd@example.test', now()), ('${NEW}', 'new@example.test', now());
  insert into public.staff_roles (user_id, role) values ('${ADMIN}', 'admin');`);

const all = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const base = all.filter((f) => /^(20261013|20261016000000|20261017000000|20261026000000)/.test(f));
const connect = all.filter((f) => f >= "20261028");
for (const f of [...base, ...connect]) await db.exec(readFileSync(join(dir, f), "utf8"));
for (const f of connect) await db.exec(readFileSync(join(dir, f), "utf8"));
ok(`migrations apply and re-run cleanly (${connect.join(", ")})`);

async function as(uid, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || ""]);
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    const r = await db.query(sql, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const one = async (uid, sql, params) => Object.values((await as(uid, sql, params)).rows[0] ?? {})[0];
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 60)})`) : bad(n, e.message); } };
const sql = (q) => db.exec(q);

const passport = (extra = {}) => JSON.stringify({ display_name: "Member", languages_spoken: ["id", "en"], languages_learning: ["ja"],
  topics: ["culture", "travel"], goals: ["practise_english", "friends"], availability_days: ["sat"], timezone: "Asia/Jakarta",
  english_level: "Intermediate", accept_guidelines: true, confirm_adult: true, discoverable: true, city: "Bandung", ...extra });

// ── Passport ────────────────────────────────────────────────────────────────────────────────────────────────────────
await te("anon cannot call save_passport", () => as(null, `select public.save_passport('{}'::jsonb)`), /permission denied/);
await te("display name is required", () => as(NEW, `select public.save_passport('{"bio":"hi"}'::jsonb)`), /display_name_required/);
await te("unknown language is rejected", () => as(NEW, `select public.save_passport($1::jsonb)`, [passport({ languages_spoken: ["klingon"] })]), /invalid_language/);
await te("unknown time zone is rejected", () => as(NEW, `select public.save_passport($1::jsonb)`, [passport({ timezone: "Mars/Olympus" })]), /invalid_timezone/);
await te("discoverable needs guidelines + 18+ confirmation", () => as(NEW, `select public.save_passport($1::jsonb)`,
  [passport({ accept_guidelines: false, confirm_adult: false })]), /guidelines_and_age_required/);
await t("save_passport strips control characters and saves", () => one(NEW, `select public.save_passport($1::jsonb)`, [passport({ display_name: "  New\u0007 Person " })]),
  (p) => (p.display_name === "New Person" && p.discoverable && p.adult_confirmed && p.languages_spoken.length === 2 ? null : JSON.stringify(p)));
await t("missing keys keep their value", () => one(NEW, `select public.save_passport('{"bio":"Updated bio"}'::jsonb)`),
  (p) => (p.bio === "Updated bio" && p.city === "Bandung" && p.discoverable ? null : JSON.stringify(p)));
await sql(`select 1`);
for (const [u, extra] of [
  [A, { display_name: "Ayu", languages_spoken: ["id", "en"], languages_learning: ["ja"], topics: ["culture"], goals: ["practise_english"] }],
  [B, { display_name: "Ben", languages_spoken: ["ja", "en"], languages_learning: ["id"], topics: ["culture", "food"], goals: ["practise_english"] }],
  [C, { display_name: "Chai", languages_spoken: ["th"], languages_learning: ["en"], topics: ["sports"], goals: ["friends"], availability_days: ["mon"] }],
  [D, { display_name: "Dee (hidden)", discoverable: false }],
]) await as(u, `select public.save_passport($1::jsonb)`, [passport(extra)]);
await t("existing profile save (owner upsert of the whole row) still works", () => as(A, `insert into public.member_profiles (user_id, display_name, bio) values ('${A}', 'Ayu', 'Hello') on conflict (user_id) do update set bio = excluded.bio returning bio, languages_spoken`),
  (r) => (r.rows[0].bio === "Hello" && r.rows[0].languages_spoken.includes("ja") === false && r.rows[0].languages_spoken.length === 2 ? null : JSON.stringify(r.rows)));
await te("direct table write cannot bypass the allowed values", () => as(A, `update public.member_profiles set languages_spoken = '{klingon}' where user_id = '${A}'`), /member_profiles_passport_values/);
await te("members cannot update another member's profile", async () => {
  const r = await as(A, `update public.member_profiles set display_name = 'x' where user_id = '${B}' returning 1`);
  if (!r.rows.length) throw new Error("blocked by RLS (0 rows)");
}, /blocked by RLS/);

// ── Discover ────────────────────────────────────────────────────────────────────────────────────────────────────────
const people = async (uid, args = "") => (await as(uid, `select * from public.list_connect_people(${args})`)).rows;
await t("discover excludes self and hidden profiles; best language match first", () => people(A), (r) => {
  const ids = r.map((x) => x.person.id);
  if (ids.includes(A) || ids.includes(D)) return "self or hidden included";
  if (ids[0] !== B) return `B should rank first, got ${ids}`;
  if (!r[0].they_teach.includes("ja") || !r[0].they_learn.includes("id")) return JSON.stringify(r[0]);
  if (r[0].person.city !== null) return "city leaked to a non-connection";
  return null;
});
await t("filter: speaks Thai", () => people(A, `p_speaks => 'th'`), (r) => (r.length === 1 && r[0].person.id === C ? null : JSON.stringify(r.map((x) => x.person.id))));
await t("filter: availability day", () => people(A, `p_day => 'mon'`), (r) => (r.length === 1 && r[0].person.id === C ? null : r.length + ""));
await t("pagination: limit 1 offset 1", () => people(A, `p_limit => 1, p_offset => 1`), (r) => (r.length === 1 && r[0].person.id !== B ? null : JSON.stringify(r)));
await te("anon cannot discover", () => as(null, `select * from public.list_connect_people()`), /permission denied/);
await te("members cannot read Connect tables directly", () => as(A, `select * from public.connect_requests`), /permission denied/);
await t("hidden profile is not reachable by id", () => one(A, `select public.connect_person('${D}')`), (p) => (p === null ? null : "visible"));

// ── Letter Intros ───────────────────────────────────────────────────────────────────────────────────────────────────
const MSG = "Hi Ben, I am learning Japanese and would love to practise together!";
const send = (from, to, m = MSG) => one(from, `select public.send_connect_request($1, $2, 'Practise', 'Culture', 'Food')`, [to, m]);
await te("intro needs a ready Passport", () => send(ADMIN, A), /passport_required/);
await te("intro message has a minimum length", () => send(A, B, "hi"), /message_too_short/);
await te("intro to a hidden member is refused", () => send(A, D), /not_available/);
await t("A sends an intro to B", () => send(A, B), (r) => (r === "sent" ? null : r));
await te("duplicate pending intro is refused", () => send(A, B), /already_pending/);
await te("reverse intro while one is pending", () => send(B, A), /they_asked_you/);
await t("no connection exists before acceptance", () => one(A, `select count(*)::int from public.list_connect_connections()`), (n) => (n === 0 ? null : n));
const reqId = await one(B, `select id from public.list_connect_requests('incoming')`);
await t("recipient sees the intro with sender card", () => as(B, `select * from public.list_connect_requests('incoming')`),
  (r) => (r.rows.length === 1 && r.rows[0].person.id === A && r.rows[0].message === MSG ? null : JSON.stringify(r.rows)));
await t("a third member sees nothing", () => as(C, `select * from public.list_connect_requests('incoming')`), (r) => (r.rows.length === 0 ? null : "leak"));
await te("sender cannot accept their own intro", () => as(A, `select public.respond_connect_request($1, true)`, [reqId]), /request_not_pending/);
await te("third member cannot accept it", () => as(C, `select public.respond_connect_request($1, true)`, [reqId]), /request_not_pending/);
await t("B accepts", () => one(B, `select public.respond_connect_request($1, true)`, [reqId]), (r) => (r === "accepted" ? null : r));
await te("accepting twice fails", () => as(B, `select public.respond_connect_request($1, true)`, [reqId]), /request_not_pending/);
await t("connection exists for both, city now visible", () => as(A, `select * from public.list_connect_connections()`),
  (r) => (r.rows.length === 1 && r.rows[0].person.id === B && r.rows[0].person.city === "Bandung" ? null : JSON.stringify(r.rows)));
await te("intro to an existing connection", () => send(A, B), /already_connected/);
await sql(`select public.connect_link('${A}', '${B}', 'intro'); select public.connect_link('${B}', '${A}', 'intro');`);
await t("connection is never duplicated", () => db.query(`select count(*)::int n from public.connect_connections`), (r) => (r.rows[0].n === 1 ? null : r.rows[0].n));

await t("C sends to A, A declines", async () => { await send(C, A); const id = await one(A, `select id from public.list_connect_requests('incoming')`); return one(A, `select public.respond_connect_request($1, false)`, [id]); },
  (r) => (r === "declined" ? null : r));
await te("resend after decline is on cooldown", () => send(C, A), /cooldown/);
await sql(`update public.connect_requests set responded_at = now() - interval '40 days' where sender_id = '${C}'`);
await t("resend allowed after 30 days", () => send(C, A), (r) => (r === "sent" ? null : r));
await t("cancel own pending intro", async () => one(C, `select public.cancel_connect_request($1)`, [await one(C, `select id from public.list_connect_requests('outgoing') where status = 'pending'`)]),
  (r) => (r === "cancelled" ? null : r));
await sql(`update public.connect_requests set status = 'declined', responded_at = now() - interval '60 days' where sender_id = '${C}'`);
await te("after two declines the pair is closed", () => send(C, A), /not_available/);
await sql(`insert into public.connect_requests (sender_id, recipient_id, message, created_at, status)
  select '${NEW}', '${ADMIN}', 'rate limit filler message text', now(), 'cancelled' from generate_series(1, 10)`);
await te("10 intros per 24 h", () => send(NEW, C), /rate_limited/);
await sql(`delete from public.connect_requests where sender_id = '${NEW}'`);

// ── Messages ────────────────────────────────────────────────────────────────────────────────────────────────────────
await t("connected member sends a message", () => as(A, `select * from public.send_connect_message($1, 'Hello Ben!')`, [B]), (r) => (r.rows.length === 1 ? null : "no row"));
for (let i = 0; i < 5; i++) await as(B, `select * from public.send_connect_message($1, $2)`, [A, `Reply ${i}`]);
await te("non-connected member cannot message", () => as(C, `select * from public.send_connect_message($1, 'hey')`, [A]), /not_connected/);
await te("non-connected member cannot read the thread", () => as(C, `select * from public.list_connect_messages($1)`, [A]), /not_connected/);
await te("empty message refused", () => as(A, `select * from public.send_connect_message($1, '   ')`, [B]), /empty_message/);
await t("unread count for A is 5", () => one(A, `select unread from public.list_connect_connections()`), (n) => (n === 5 ? null : n));
await t("pagination: newest 2, then older", async () => {
  const p1 = (await as(A, `select * from public.list_connect_messages($1, null, 2)`, [B])).rows;
  const p2 = (await as(A, `select * from public.list_connect_messages($1, $2, 10)`, [B, p1[1].id])).rows;
  return { p1, p2 };
}, ({ p1, p2 }) => (p1[0].body === "Reply 4" && p2.length === 4 && p2.at(-1).body === "Hello Ben!" && p2.at(-1).mine ? null : JSON.stringify({ p1, p2 })));
await t("mark read clears unread", async () => { await as(A, `select public.mark_connect_read($1)`, [B]); return one(A, `select unread from public.list_connect_connections()`); }, (n) => (n === 0 ? null : n));
await t("summary uses real counts", () => one(B, `select public.connect_summary()`), (s) => (s.connections === 1 && s.unread === 1 && s.ready ? null : JSON.stringify(s)));

// ── Blocks and reports ──────────────────────────────────────────────────────────────────────────────────────────────
await t("A blocks C", () => one(A, `select public.block_member($1)`, [C]), (r) => (r === "blocked" ? null : r));
await t("blocked member disappears from discovery (both ways)", async () => [await people(A), await people(C)],
  ([a, c]) => (a.some((x) => x.person.id === C) || c.some((x) => x.person.id === A) ? "still visible" : null));
await t("blocked profile not reachable by id", () => one(C, `select public.connect_person('${A}')`), (p) => (p === null ? null : "visible"));
await te("blocked member cannot send an intro", () => send(C, A, MSG), /not_available/);
await t("B blocks A: messages stop, history stays readable", async () => {
  await as(B, `select public.block_member($1)`, [A]);
  try { await as(A, `select * from public.send_connect_message($1, 'still there?')`, [B]); return "sent"; } catch (e) { if (!/not_available/.test(e.message)) return e.message; }
  return (await as(A, `select * from public.list_connect_messages($1)`, [B])).rows.length;
}, (r) => (r === 6 ? null : String(r)));
await t("unblock restores sending", async () => { await as(B, `select public.unblock_member($1)`, [A]); return as(A, `select * from public.send_connect_message($1, 'thanks')`, [B]); }, (r) => (r.rows.length ? null : "no"));
await t("report is stored", () => one(C, `select public.report_member($1, 'profile', null, 'harassment', 'details', false)`, [A]), (r) => (r === "reported" ? null : r));
await t("reported member cannot see reports", () => as(A, `select count(*)::int n from public.connect_reports`), (r) => (r.rows[0].n === 0 ? null : "leak"));
await t("staff can read reports", () => as(ADMIN, `select count(*)::int n from public.connect_reports`), (r) => (r.rows[0].n === 1 ? null : r.rows[0].n));
await t("my blocks list", () => as(A, `select * from public.list_my_blocks()`), (r) => (r.rows.length === 1 && r.rows[0].id === C ? null : JSON.stringify(r.rows)));

// ── Rooms ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const room = (extra = {}) => JSON.stringify({ title: "English Saturday", description: "Practise speaking", category: "english_practice",
  starts_at: new Date(Date.now() + 3 * 86400e3).toISOString(), timezone: "Asia/Jakarta", duration_min: 60, capacity: 2, language: "en",
  delivery: "discord", meeting_url: "https://discord.gg/abc123", meeting_notes: "Join #voice-1", publish: true, ...extra });
await te("room needs a ready Passport", () => as(ADMIN, `select public.save_connect_room(null, $1::jsonb)`, [room()]), /passport_required/);
await te("room in the past refused", () => as(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ starts_at: new Date(Date.now() - 3600e3).toISOString() })]), /start_in_past/);
await te("non-Discord link for Discord delivery refused", () => as(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ meeting_url: "https://evil.example/x" })]), /invalid_discord_url/);
await te("deadline after start refused", () => as(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ registration_deadline: new Date(Date.now() + 9 * 86400e3).toISOString() })]), /deadline/);
await te("IELSco-hosted delivery not available yet", () => as(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ delivery: "ielsco_hosted" })]), /invalid_delivery/);
const roomId = await one(A, `select public.save_connect_room(null, $1::jsonb)`, [room()]);
await t("room listed in discover without the meeting link", () => as(B, `select r from public.list_connect_rooms('discover') r`),
  (r) => (r.rows.length === 1 && r.rows[0].r.state === "open" && !JSON.stringify(r.rows[0].r).includes("discord.gg") ? null : JSON.stringify(r.rows)));
await t("meeting link hidden before registering", () => one(B, `select public.connect_room_meeting($1)`, [roomId]), (m) => (m === null ? null : "leak"));
await te("host cannot register", () => as(A, `select public.register_connect_room($1)`, [roomId]), /host_cannot_register/);
await t("B registers", () => one(B, `select public.register_connect_room($1)`, [roomId]), (r) => (r === "registered" ? null : r));
await t("duplicate registration is a no-op", () => one(B, `select public.register_connect_room($1)`, [roomId]), (r) => (r === "already_registered" ? null : r));
await t("registered member gets the meeting link", () => one(B, `select public.connect_room_meeting($1)`, [roomId]), (m) => (m?.meeting_url === "https://discord.gg/abc123" ? null : JSON.stringify(m)));
await t("NEW registers (capacity 2 reached)", () => one(NEW, `select public.register_connect_room($1)`, [roomId]), (r) => (r === "registered" ? null : r));
await sql(`select 1`);
await as(D, `select public.save_passport('{"discoverable":true}'::jsonb)`);
await te("full room refuses registration", () => as(D, `select public.register_connect_room($1)`, [roomId]), /full/);
await t("state reads full", () => one(D, `select public.get_connect_room($1)`, [roomId]), (r) => (r.state === "full" ? null : r.state));
await t("capacity cannot drop below registrations", async () => {
  const big = await one(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ title: "Capacity room", capacity: 5 })]);
  for (const u of [B, NEW, D]) await as(u, `select public.register_connect_room($1)`, [big]);
  try { await as(A, `select public.save_connect_room($1, $2::jsonb)`, [big, room({ title: "Capacity room", capacity: 2 })]); return "lowered"; } catch (e) { return e.message; }
}, (m) => (/capacity_below_registrations/.test(m) ? null : m));
await t("participants list for host (names only)", () => as(A, `select * from public.connect_room_participants($1)`, [roomId]),
  (r) => (r.rows.length === 2 && !("email" in r.rows[0]) ? null : JSON.stringify(r.rows)));
await t("participants hidden from non-hosts", () => as(B, `select * from public.connect_room_participants($1)`, [roomId]), (r) => (r.rows.length === 0 ? null : "leak"));
await t("cancel registration frees a seat", async () => { await as(NEW, `select public.cancel_connect_room_registration($1)`, [roomId]); return one(D, `select public.register_connect_room($1)`, [roomId]); },
  (r) => (r === "registered" ? null : r));
const late = await one(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ title: "Deadline room", capacity: 10, registration_deadline: new Date(Date.now() + 86400e3).toISOString() })]);
await sql(`update public.connect_rooms set registration_deadline = now() - interval '1 minute' where id = '${late}'`);
await te("registration after the deadline refused", () => as(B, `select public.register_connect_room($1)`, [late]), /registration_closed/);
await t("unpublish hides it from discover", async () => { await as(A, `select public.set_connect_room_status($1, 'draft')`, [roomId]); return as(C, `select r from public.list_connect_rooms('discover') r`); },
  (r) => (r.rows.some((x) => x.r.id === roomId) ? "still listed" : null));
await t("unpublished room: registered member keeps it in Joined, without the link", async () => [
  (await as(B, `select r from public.list_connect_rooms('joined') r`)).rows.filter((x) => x.r.id === roomId).length, await one(B, `select public.connect_room_meeting($1)`, [roomId])],
  ([n, m]) => (n === 1 && m === null ? null : JSON.stringify([n, m])));
await te("non-host cannot change status", () => as(B, `select public.set_connect_room_status($1, 'published')`, [roomId]), /room_not_found/);
await t("cancel is final", async () => { await as(A, `select public.set_connect_room_status($1, 'cancelled')`, [roomId]);
  try { await as(A, `select public.set_connect_room_status($1, 'published')`, [roomId]); return "republished"; } catch (e) { return e.message; } },
  (m) => (/room_cancelled/.test(m) ? null : m));
const unlisted = await one(A, `select public.save_connect_room(null, $1::jsonb)`, [room({ title: "Unlisted", visibility: "unlisted", capacity: 5 })]);
await t("unlisted room: not in discover, reachable by link", async () => [
  (await as(B, `select r from public.list_connect_rooms('discover') r`)).rows.some((x) => x.r.id === unlisted), (await one(B, `select public.get_connect_room($1)`, [unlisted])).id],
  ([listed, id]) => (!listed && id === unlisted ? null : JSON.stringify([listed, id])));
await te("blocked member cannot see the host's room", () => as(C, `select public.get_connect_room($1)`, [unlisted]), /room_not_found/);
await t("completed state is derived from time", async () => { await sql(`update public.connect_rooms set starts_at = now() - interval '3 hours', registration_deadline = null where id = '${late}'`); return one(A, `select public.get_connect_room($1)`, [late]); },
  (r) => (r.state === "completed" ? null : r.state));

// ── Quick Match ─────────────────────────────────────────────────────────────────────────────────────────────────────
await te("Quick Match is off by default", () => as(A, `select public.quick_match_join('voice', 'ai_topic')`), /quick_match_disabled/);
await te("members cannot switch it on", () => as(A, `update public.connect_settings set value = 'true' where key = 'quick_match_enabled' returning 1`).then((r) => { if (!r.rows.length) throw new Error("denied by RLS"); }), /denied|permission/);
await as(ADMIN, `update public.connect_settings set value = 'true'::jsonb where key = 'quick_match_enabled'`);
await t("staff switched it on", () => one(A, `select public.quick_match_poll()`), (p) => (p.enabled ? null : JSON.stringify(p)));
await t("A waits", () => one(A, `select public.quick_match_join('video', 'ai_topic')`), (r) => (r.status === "waiting" ? null : JSON.stringify(r)));
await t("C (blocked by A) is not matched with A", () => one(C, `select public.quick_match_join('video', 'free_talk')`), (r) => (r.status === "waiting" ? null : JSON.stringify(r)));
await as(C, `select public.quick_match_leave()`);
await t("voice joiner is not matched with a video waiter", async () => { const r = await one(NEW, `select public.quick_match_join('voice', 'free_talk')`); await as(NEW, `select public.quick_match_leave()`); return r; },
  (r) => (r.status === "waiting" ? null : JSON.stringify(r)));
const m = await one(B, `select public.quick_match_join('video', 'free_talk')`);
m.status === "matched" ? ok("B is matched with A") : bad("B matched", JSON.stringify(m));
await t("both see the same call; AI Topic prompt chosen because A asked for it", async () => [await one(A, `select public.quick_match_poll()`), await one(B, `select public.quick_match_call($1)`, [m.call_id])],
  ([pa, call]) => (pa.call_id === m.call_id && call.role === "caller" && call.prompt && call.other.id === A ? null : JSON.stringify([pa, call])));
await t("expires 8 minutes after the match (server time)", () => db.query(`select extract(epoch from expires_at - created_at)::int s from public.connect_calls where id = $1`, [m.call_id]),
  (r) => (r.rows[0].s === 480 ? null : r.rows[0].s));
await te("outsider cannot read the call", () => as(C, `select public.quick_match_call($1)`, [m.call_id]), /call_not_found/);
await te("outsider cannot signal", () => as(C, `select public.quick_match_signal($1, 'offer', '{}'::jsonb)`, [m.call_id]), /call_not_active/);
await te("outsider cannot read signals", () => as(C, `select * from public.quick_match_signals($1)`, [m.call_id]), /call_not_found/);
await t("signals relay to the other participant only", async () => {
  await as(B, `select public.quick_match_signal($1, 'offer', '{"sdp":"x"}'::jsonb)`, [m.call_id]);
  return [(await as(A, `select * from public.quick_match_signals($1)`, [m.call_id])).rows, (await as(B, `select * from public.quick_match_signals($1)`, [m.call_id])).rows];
}, ([a, b]) => (a.length === 1 && a[0].kind === "offer" && b.length === 0 ? null : JSON.stringify([a, b])));
await te("feedback before the call ends", () => as(A, `select public.quick_match_feedback($1, true, true)`, [m.call_id]), /call_not_ended/);
await sql(`update public.connect_calls set expires_at = now() - interval '1 second' where id = '${m.call_id}'`);
await te("signalling refused after 8 minutes", () => as(B, `select public.quick_match_signal($1, 'ice', '{}'::jsonb)`, [m.call_id]), /call_not_active/);
await t("call reads as ended by timeout", () => one(A, `select public.quick_match_call($1)`, [m.call_id]), (c) => (c.ended && c.end_reason === "timeout" ? null : JSON.stringify(c)));
await t("one-sided yes does not connect", () => one(A, `select public.quick_match_feedback($1, true, true)`, [m.call_id]), (r) => (r === "saved" ? null : r));
await t("A and B are still connected only via their earlier intro", () => db.query(`select source from public.connect_connections`), (r) => (r.rows.length === 1 && r.rows[0].source === "intro" ? null : JSON.stringify(r.rows)));
await t("same pair is not re-matched within 24 h", async () => { await as(A, `select public.quick_match_join('voice', 'free_talk')`); const r = await one(B, `select public.quick_match_join('voice', 'free_talk')`); await as(A, `select public.quick_match_leave()`); await as(B, `select public.quick_match_leave()`); return r; },
  (r) => (r.status === "waiting" ? null : JSON.stringify(r)));
await t("B and NEW match, both say yes → connected via quick_match", async () => {
  await as(B, `select public.quick_match_join('voice', 'free_talk')`);
  const r = await one(NEW, `select public.quick_match_join('voice', 'free_talk')`);
  await as(NEW, `select public.quick_match_end($1, 'left')`, [r.call_id]);
  await as(B, `select public.quick_match_feedback($1, true, true)`, [r.call_id]);
  return one(NEW, `select public.quick_match_feedback($1, true, false)`, [r.call_id]);
}, (r) => (r === "connected" ? null : r));
await t("blocking ends a live call", async () => {
  await as(D, `select public.quick_match_join('voice', 'free_talk')`);
  const r = await one(C, `select public.quick_match_join('voice', 'free_talk')`);
  await as(D, `select public.block_member($1)`, [C]);
  return one(C, `select public.quick_match_call($1)`, [r.call_id]);
}, (c) => (c.ended && c.end_reason === "blocked" ? null : JSON.stringify(c)));

// ── Circles ─────────────────────────────────────────────────────────────────────────────────────────────────────────
await t("three starting Circles, visible to signed-in members", () => as(B, `select * from public.list_circles()`), (r) => (r.rows.map((x) => x.id).join() === "global-growth,opportunities,cross-cultural" ? null : JSON.stringify(r.rows)));
await sql(`update public.circles set tagline = 'Edited by staff' where id = 'global-growth'`);
for (const f of all.filter((f) => f >= "20261029")) await db.exec(readFileSync(join(dir, f), "utf8"));
await t("re-running the migration keeps staff edits", () => db.query(`select tagline from public.circles where id = 'global-growth'`), (r) => (r.rows[0].tagline === "Edited by staff" ? null : r.rows[0].tagline));
await te("anon cannot list Circles", () => as(null, `select * from public.list_circles()`), /permission denied/);
await te("members cannot create Circles", () => as(B, `insert into public.circles (id, name) values ('spam-circle', 'Spam') returning id`).then((r) => { if (!r.rows.length) throw new Error("denied"); }), /denied|row-level security/);
await te("joining needs a ready Passport", () => as(ADMIN, `select public.join_circle('cross-cultural')`), /passport_required/);
await te("non-members cannot read posts", () => as(B, `select * from public.list_circle_posts('cross-cultural')`), /not_a_member/);
for (const u of [A, B, C]) await as(u, `select public.join_circle('cross-cultural')`);
await t("join is idempotent and counted", async () => { await as(B, `select public.join_circle('cross-cultural')`); return one(B, `select members from public.list_circles() where id = 'cross-cultural'`); }, (n) => (n === 3 ? null : n));
const post = await one(B, `select public.post_circle('cross-cultural', 'In Japan we take our shoes off indoors. What about you?')`);
await t("member posts; others see it with the author's name", () => as(A, `select * from public.list_circle_posts('cross-cultural')`), (r) => (r.rows[0]?.body.startsWith("In Japan") && r.rows[0].author.display_name === "Ben" ? null : JSON.stringify(r.rows)));
await t("replies are nested under the post", async () => { await as(A, `select public.post_circle('cross-cultural', 'Same in Indonesia!', $1)`, [post]); return as(B, `select replies from public.list_circle_posts('cross-cultural')`); },
  (r) => (r.rows[0].replies.length === 1 && r.rows[0].replies[0].body === "Same in Indonesia!" ? null : JSON.stringify(r.rows[0].replies)));
await te("no replies to replies", async () => { const reply = (await as(B, `select replies from public.list_circle_posts('cross-cultural')`)).rows[0].replies[0].id; await as(B, `select public.post_circle('cross-cultural', 'nested', $1)`, [reply]); }, /post_not_found/);
await t("blocked pairs don't see each other's posts", async () => { await as(C, `select public.post_circle('cross-cultural', 'Hello from Thailand')`); return [(await as(A, `select body from public.list_circle_posts('cross-cultural')`)).rows, (await as(B, `select body from public.list_circle_posts('cross-cultural')`)).rows]; },
  ([a, b]) => (!a.some((x) => x.body === "Hello from Thailand") && b.some((x) => x.body === "Hello from Thailand") ? null : JSON.stringify([a, b])));
await te("blocked member cannot reply to the blocker's post", async () => { const mine = await one(A, `select public.post_circle('cross-cultural', 'A post by Ayu')`); await as(C, `select public.post_circle('cross-cultural', 'reply', $1)`, [mine]); }, /not_available/);
await t("prompt flag is ignored for members", async () => { await as(B, `select public.post_circle('cross-cultural', 'I am not staff', null, true)`); return db.query(`select is_prompt from public.circle_posts where body = 'I am not staff'`); }, (r) => (r.rows[0].is_prompt === false ? null : "member made a prompt"));
await t("staff can post a prompt without joining; it is listed first", async () => {
  await db.query(`insert into public.member_profiles (user_id, display_name, connect_guidelines_at, adult_confirmed_at) values ('${ADMIN}', 'Staff', now(), now()) on conflict (user_id) do update set connect_guidelines_at = now(), adult_confirmed_at = now(), display_name = 'Staff'`);
  await as(ADMIN, `select public.post_circle('cross-cultural', 'What is one tradition from your country?', null, true)`);
  return as(B, `select body, is_prompt from public.list_circle_posts('cross-cultural')`); }, (r) => (r.rows[0].is_prompt && r.rows[0].body.startsWith("What is one tradition") ? null : JSON.stringify(r.rows[0])));
await te("others cannot remove my post", () => as(A, `select public.remove_circle_post($1)`, [post]), /post_not_found/);
await t("author removes a post; it disappears", async () => { await as(B, `select public.remove_circle_post($1)`, [post]); return as(A, `select id from public.list_circle_posts('cross-cultural')`); }, (r) => (r.rows.some((x) => x.id === post) ? "still listed" : null));
await t("leaving removes access", async () => { await as(D, `select public.join_circle('opportunities')`); await as(D, `select public.leave_circle('opportunities')`);
  try { await as(D, `select * from public.list_circle_posts('opportunities')`); return "still readable"; } catch (e) { return /not_a_member/.test(e.message) ? null : e.message; } });
await t("a Circle post can be reported", () => one(A, `select public.report_member($1, 'circle', 'cross-cultural', 'spam', null, false)`, [B]), (r) => (r === "reported" ? null : r));
await sql(`insert into public.circle_posts (circle_id, author_id, body, created_at) select 'opportunities', '${D}', 'filler', now() from generate_series(1, 10)`);
await as(D, `select public.join_circle('opportunities')`);
await te("10 posts per hour", () => as(D, `select public.post_circle('opportunities', 'one more')`), /rate_limited/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

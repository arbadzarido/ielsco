// Legal numbering under real concurrency (20261115000000): many sessions issue numbers from one rule at the same
// moment and every committed number is unique and consecutive; a rolled-back issuance leaves no gap and no register
// row; separate rules and companies keep separate sequences. Needs a real PostgreSQL with the Company OS migrations
// applied (PGlite is single-connection) and the `pg` package. Not part of `npm test`. Run:
//   DATABASE_URL=postgres://... node tests/db/company-os-numbering-concurrency.pg.mjs
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL"); process.exit(2); }
const N = Number(process.env.N ?? 50);
let pass = 0, fail = 0;
const check = (n, cond, got) => { if (cond) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, "->", got); } };

const admin = new pg.Client({ connectionString: url });
await admin.connect();
const tag = `T${Date.now() % 100000}`;
const rule = async (company, type) => (await admin.query(
  `insert into public.os_number_rules (company_code, kind, type_code, name, format, reset) values ($1, 'other', $2, 'Concurrency test', '{company}/{type}/{division}/{month_roman}/{year}/{seq:3}', 'yearly') returning id`,
  [company, type])).rows[0].id;
const rA = await rule("IEL", `${tag}A`), rB = await rule("IEL", `${tag}B`), rE = await rule("ELC", `${tag}A`);

// N sessions, each its own connection and transaction, all started at once. Each one waits on the counter row lock
// until the one before it commits, so a session holds a number only once the previous holder is done.
async function burst(ruleId, n, entity) {
  const clients = await Promise.all(Array.from({ length: n }, async () => { const c = new pg.Client({ connectionString: url }); await c.connect(); return c; }));
  const nums = await Promise.all(clients.map(async (c, i) => {
    await c.query("begin");
    const r = await c.query("select public.os_issue_number($1, 'DIV-09', 'letter', $2, current_date) as n", [ruleId, `${entity}-${i}`]);
    await c.query("commit");
    return r.rows[0].n;
  }));
  await Promise.all(clients.map((c) => c.end()));
  return nums;
}

// (Kept under the default 100-connection limit: one burst of N, then two of N/2 side by side.)
const a = await burst(rA, N, "LTR-A");
const [b, e] = await Promise.all([burst(rB, Math.ceil(N / 2), "LTR-B"), burst(rE, Math.ceil(N / 2), "LTR-E")]);
const seqs = (xs) => xs.map((x) => Number(x.split("/").pop())).sort((p, q) => p - q);
const consecutive = (xs, n) => xs.length === n && xs.every((v, i) => v === i + 1);
check(`${N} parallel issuances give ${N} different numbers`, new Set(a).size === N, a.length);
check("…numbered 001 to N with no gaps", consecutive(seqs(a), N), seqs(a).join(","));
check("…in the documented format", a.every((x) => /^IEL\/[A-Z0-9]+\/LEG\/[IVX]+\/\d{4}\/\d{3,}$/.test(x)), a[0]);
check("another rule of the same company counts on its own", consecutive(seqs(b), Math.ceil(N / 2)), seqs(b).join(","));
check("another company counts on its own", consecutive(seqs(e), Math.ceil(N / 2)) && e.every((x) => x.startsWith("ELC/")), e[0]);
const reg = (await admin.query("select count(*)::int c, count(distinct number)::int d from public.os_number_register where rule_id = $1", [rA])).rows[0];
check("every number is in the register exactly once", reg.c === N && reg.d === N, JSON.stringify(reg));

// A transaction that issues a number and then fails takes its number back with it: no register row, no gap.
const c = new pg.Client({ connectionString: url }); await c.connect();
await c.query("begin"); await c.query("select public.os_issue_number($1, 'DIV-09', 'letter', 'LTR-RB', current_date)", [rA]); await c.query("rollback");
await c.query("begin"); const next = (await c.query("select public.os_issue_number($1, 'DIV-09', 'letter', 'LTR-NEXT', current_date) as n", [rA])).rows[0].n; await c.query("commit");
await c.end();
check("a rolled-back issuance leaves no register row", (await admin.query("select count(*)::int c from public.os_number_register where entity_id = 'LTR-RB'")).rows[0].c === 0, "row found");
check("…and the next committed number follows on", Number(next.split("/").pop()) === N + 1, next);

// A voided number stays and is never handed out again.
await admin.query("update public.os_number_register set status = 'void', void_reason = 'test' where number = $1", [next]);
const after = (await burst(rA, 1, "LTR-AFTER"))[0];
check("after a void the sequence moves on", Number(after.split("/").pop()) === N + 2, after);
let dup = null;
try { await admin.query("insert into public.os_number_register (rule_id, company_code, kind, period_key, seq, number, entity_type, entity_id) select rule_id, company_code, kind, period_key, seq + 1000, number, entity_type, 'X' from public.os_number_register where number = $1", [next]); } catch (err) { dup = err.message; }
check("the register refuses a second row with a used number", /duplicate key/.test(dup ?? ""), dup);

// Clean up the test rules (owner connection; the app has no delete right on any of these).
for (const r of [rA, rB, rE]) {
  await admin.query("delete from public.os_number_register where rule_id = $1", [r]);
  await admin.query("delete from public.os_number_counters where rule_id = $1", [r]);
  await admin.query("delete from public.os_number_rules where id = $1", [r]);
}
await admin.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

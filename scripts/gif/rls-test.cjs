// GIF portal database tests: runs both GIF migrations + supabase/tests/gif_portal_rls.sql inside ONE transaction and
// rolls it back, so nothing is left behind. Works against any Postgres that has the production gif_delegates table
// (production or a branch). Usage: DATABASE_URL=postgres://… node scripts/gif/rls-test.cjs
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const root = path.join(__dirname, "..", "..");
const files = [
  "supabase/migrations/20261122000000_gif_assessment_portal.sql",
  "supabase/migrations/20261122000100_gif_story_retention_cron.sql",
  "supabase/migrations/20261124000000_gif_fully_funded_eligibility.sql",
  "supabase/migrations/20261124000100_gif_eligibility_activate.sql",
  "supabase/migrations/20261125000000_gif_arba_inbox.sql",
  "supabase/tests/gif_portal_rls.sql",
  "supabase/tests/gif_eligibility_rls.sql",
];
(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL"); process.exit(2); }
  const c = new Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false } });
  await c.connect();
  let pass = 0;
  c.on("notice", (n) => { if (n.message.startsWith("PASS")) { pass++; console.log(n.message); } });
  try {
    await c.query("begin");
    // migrations are idempotent: on a database where they are already applied they simply re-run
    for (const f of files) await c.query(fs.readFileSync(path.join(root, f), "utf8"));
    console.log(`\n${pass} checks passed; rolling back.`);
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    await c.query("rollback").catch(() => {});
    await c.end();
  }
})();

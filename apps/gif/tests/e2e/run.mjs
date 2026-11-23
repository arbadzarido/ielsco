// End-to-end test runner for the GIF platform. Local only, test data only.
// 1. Creates a fresh database on a local PostgreSQL (PGHOST/PGPORT/PGUSER; default 127.0.0.1:55433 postgres) and applies
//    the real migration. 2. Starts the fake Midtrans. 3. Builds and starts the app in production mode against both.
// 4. Runs tests/e2e/scenarios.mjs with Playwright.
//   node tests/e2e/run.mjs            (SKIP_BUILD=1 to reuse the last build)
import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..", "..");
const repo = join(app, "..", "..");
const PGHOST = process.env.PGHOST || "127.0.0.1", PGPORT = Number(process.env.PGPORT || 55433), PGUSER = process.env.PGUSER || "postgres";
const DB = "gif_e2e";
const APP_PORT = 3410, MT_PORT = 3499;

export const ENV = {
  GIF_DATABASE_URL: `postgres://${PGUSER}@${PGHOST}:${PGPORT}/${DB}`,
  GIF_AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
  GIF_SITE_URL: `http://localhost:${APP_PORT}`,
  GIF_STORAGE_DRIVER: "local",
  GIF_PAYMENTS_ENABLED: "true",
  GIF_MIDTRANS_ENV: "sandbox",
  GIF_MIDTRANS_SERVER_KEY: "SB-Mid-server-e2efake",
  GIF_MIDTRANS_CLIENT_KEY: "SB-Mid-client-e2efake",
  GIF_MIDTRANS_SIGNATURE_KEYS: "e2e-signature-secret,SB-Mid-server-e2efake",
  GIF_MIDTRANS_TEST_BASE: `http://127.0.0.1:${MT_PORT}`,
  GIF_ALLOW_TEST_GATEWAY: "true",
  GIF_RATE_LIMIT_FACTOR: "50",
  GIF_NOINDEX: "true",
  CRON_SECRET: "e2e-cron-secret-0123456789",
  GIF_IELSCO_SUPABASE_URL: `http://127.0.0.1:${MT_PORT}`,
  GIF_IELSCO_SUPABASE_ANON_KEY: "e2e-ielsco-anon",
  ELCO_GRANT_URL: `http://127.0.0.1:${MT_PORT}/api/integrations/ielsco/grants`,
  IELSCO_TO_ELCO_SECRET: "e2e-ielsco-to-elco-secret-0123456789abcdef",
  // IELSco single sign-on (lib/ielsco-bridge.ts); scenarios sign tokens with this test secret.
  IELSCO_GIF_SSO_SECRET: "e2e-ielsco-gif-sso-secret-0123456789abcdef",
  IELSCO_APP_URL: "http://ielsco.example.test",
  NEXT_TELEMETRY_DISABLED: "1",
};

async function setupDb() {
  const admin = new pg.Client({ host: PGHOST, port: PGPORT, user: PGUSER, database: "postgres" });
  await admin.connect();
  await admin.query(`drop database if exists ${DB} with (force)`);
  await admin.query(`create database ${DB}`);
  await admin.end();
  const c = new pg.Client({ host: PGHOST, port: PGPORT, user: PGUSER, database: DB });
  await c.connect();
  for (const m of ["20261123000000_gif_programme_platform.sql", "20261126000000_gif_accounts_guardians_tasks.sql", "20261127000000_gif_payment_attempts_elco_grants.sql", "20261128000000_gif_international_card_invoice_requests.sql", "20261129000000_gif_flexible_installments.sql"].filter((m) => !(process.env.E2E_SKIP_MIGRATION ?? "").split(",").includes(m))) {
    await c.query(readFileSync(join(repo, "supabase", "migrations", m), "utf8"));
  }
  // Applications open on 25 Nov 2026; tests run before that, so open them early in this throwaway database only.
  await c.query(`update gif.cohorts set settings = '{"dates": {"launch": "2026-11-01T00:00:00+07:00", "fully_funded_opens": "2026-11-01T00:00:00+07:00"}}' where is_current`);
  // Test staff (fictional, example.test).
  await c.query(`insert into gif.staff (email, role, name) values ('owner@example.test', 'owner', 'Test Owner'), ('finance@example.test', 'finance', 'Test Finance'),
    ('eval@example.test', 'evaluator', 'Test Evaluator'), ('eval2@example.test', 'evaluator', 'Second Evaluator') on conflict do nothing`);
  await c.end();
}

function start(cmd, args, env, name) {
  const p = spawn(cmd, args, { cwd: app, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", (d) => process.env.E2E_VERBOSE && process.stdout.write(`[${name}] ${d}`));
  p.stderr.on("data", (d) => process.stderr.write(`[${name}] ${d}`));
  return p;
}

async function waitFor(url, ms = 120_000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    try { const r = await fetch(url); if (r.status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timeout waiting for ${url}`);
}

const procs = [];
try {
  await setupDb();
  console.log("db ready");
  procs.push(start(process.execPath, [join(here, "fake-midtrans.mjs"), String(MT_PORT), ENV.GIF_MIDTRANS_SERVER_KEY, "e2e-signature-secret"], {}, "midtrans"));
  const next = join(app, "node_modules", "next", "dist", "bin", "next");
  if (!process.env.SKIP_BUILD) {
    console.log("building…");
    execFileSync(process.execPath, [next, "build"], { cwd: app, env: { ...process.env, ...ENV }, stdio: "inherit" });
  }
  procs.push(start(process.execPath, [next, "start", "-p", String(APP_PORT)], ENV, "app"));
  await waitFor(`http://localhost:${APP_PORT}/api/health`);
  await waitFor(`http://127.0.0.1:${MT_PORT}/__orders`);
  console.log("servers ready");
  const { run } = await import("./scenarios.mjs");
  const failed = await run({ base: `http://localhost:${APP_PORT}`, mt: `http://127.0.0.1:${MT_PORT}`, env: ENV, db: { host: PGHOST, port: PGPORT, user: PGUSER, database: DB } });
  process.exitCode = failed ? 1 : 0;
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  for (const p of procs) p.kill();
}

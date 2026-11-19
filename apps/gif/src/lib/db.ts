import "server-only";
import pg from "pg";

// One pool per server instance. Production: GIF_DATABASE_URL is the Supabase *transaction pooler* URL (port 6543), which
// suits serverless (many short-lived connections). Queries use plain parameters, never named prepared statements, so
// they work through the pooler.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric → number (amounts are ≤ 14 digits)
pg.types.setTypeParser(1082, (v) => v);                                 // date → "YYYY-MM-DD" (no time-zone shift)
pg.types.setTypeParser(20, (v) => Number(v));                           // bigint counts → number

const g = globalThis as unknown as { __gifPool?: pg.Pool };

function pool(): pg.Pool {
  if (g.__gifPool) return g.__gifPool;
  const url = process.env.GIF_DATABASE_URL;
  if (!url) throw new Error("GIF_DATABASE_URL is not set");
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const ca = process.env.GIF_DATABASE_CA_CERT?.replace(/\n/g, "\n");
  g.__gifPool = new pg.Pool({
    connectionString: url.replace(/[?&]sslmode=[^&]*/g, ""),
    max: Number(process.env.GIF_DATABASE_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Supabase requires TLS. With GIF_DATABASE_CA_CERT the server certificate is verified; without it the connection is
    // still encrypted (documented in docs/gif/DEPLOYMENT.md).
    ssl: local ? undefined : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  });
  return g.__gifPool;
}

export type Db = Pick<pg.PoolClient, "query">;

export async function q<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool().query<T>(text, params);
  return r.rows;
}

export async function one<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

// Run fn in a transaction. Callers lock the rows they change (select ... for update) so concurrent webhooks and clicks
// serialise instead of double-applying.
export async function tx<T>(fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

import "server-only";
import { one } from "./db";

// Fixed-window counter in Postgres, so limits hold across serverless instances. Returns true when over the limit.
export async function overLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const factor = Number(process.env.GIF_RATE_LIMIT_FACTOR || 1); // tests raise limits; never set in production
  const row = await one<{ count: number }>(
    `insert into gif.rate_limits (key, window_start, count)
     values ($1, to_timestamp(floor(extract(epoch from now()) / $2) * $2), 1)
     on conflict (key, window_start) do update set count = gif.rate_limits.count + 1
     returning count`, [key, windowSeconds]);
  return (row?.count ?? 0) > max * factor;
}

// True only the first time `key` is seen in the window (single-use tokens). Never scaled by GIF_RATE_LIMIT_FACTOR.
export async function firstUse(key: string, windowSeconds: number): Promise<boolean> {
  const row = await one<{ count: number }>(
    `insert into gif.rate_limits (key, window_start, count)
     values ($1, to_timestamp(floor(extract(epoch from now()) / $2) * $2), 1)
     on conflict (key, window_start) do update set count = gif.rate_limits.count + 1
     returning count`, [key, windowSeconds]);
  return row?.count === 1;
}

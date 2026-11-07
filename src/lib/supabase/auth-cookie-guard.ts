// Finds Supabase session cookies the browser holds in a state auth-js cannot read.
//
// A session larger than one cookie is split into chunks (sb-<ref>-auth-token.0, .1, ...). If only some chunks were
// updated (the proxy used to send back just the last chunk of a refresh), the joined value is not valid JSON. auth-js
// then treats the raw text as the session, fails, and console.errors it: the access and refresh tokens end up in the
// server logs. Clearing such cookies before a client reads them signs the person out instead, which is what happens
// anyway, without leaking the tokens. Pure: no Next.js imports, so it can be unit tested.

export type CookieLike = { name: string; value: string };

const AUTH_COOKIE = /^(sb-[a-z0-9]+-auth-token)(?:\.(\d+))?$/;
const BASE64_PREFIX = "base64-";

function decode(value: string): string | null {
  if (!value.startsWith(BASE64_PREFIX)) return value;
  try {
    return Buffer.from(value.slice(BASE64_PREFIX.length), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** Names of auth cookies (whole value or chunks) whose joined session is not a JSON object. */
export function unreadableAuthCookies(cookies: CookieLike[]): string[] {
  type Group = { whole?: CookieLike; chunks: Map<number, CookieLike> };
  const groups = new Map<string, Group>();
  for (const c of cookies) {
    const m = AUTH_COOKIE.exec(c.name);
    if (!m) continue;
    const g: Group = groups.get(m[1]) ?? { chunks: new Map() };
    if (m[2] === undefined) g.whole = c;
    else g.chunks.set(Number(m[2]), c);
    groups.set(m[1], g);
  }
  const bad: string[] = [];
  for (const g of groups.values()) {
    // Same precedence as @supabase/ssr combineChunks: the unchunked cookie wins; otherwise .0, .1, ... until a gap.
    let joined: string;
    if (g.whole) joined = g.whole.value;
    else {
      const parts: string[] = [];
      for (let i = 0; g.chunks.has(i); i++) parts.push(g.chunks.get(i)!.value);
      joined = parts.join("");
    }
    if (!joined) continue;
    const text = decode(joined);
    let ok = false;
    if (text !== null) {
      try {
        const parsed: unknown = JSON.parse(text);
        ok = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        ok = false;
      }
    }
    if (!ok) bad.push(...(g.whole ? [g.whole.name] : []), ...Array.from(g.chunks.values(), (c) => c.name));
  }
  return bad;
}

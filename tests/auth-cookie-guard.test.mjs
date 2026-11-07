// Run: npm test. Supabase session cookies: the proxy drops unreadable ones (src/lib/supabase/auth-cookie-guard.ts) and
// sends every chunk of a refreshed session back to the browser (getAll/setAll adapter in src/proxy.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server.js";
import { unreadableAuthCookies } from "../src/lib/supabase/auth-cookie-guard.ts";

const NAME = "sb-example-auth-token";
const b64 = (s) => Buffer.from(s).toString("base64url");
const enc = (obj) => "base64-" + b64(JSON.stringify(obj));
const chunk = (v) => v.match(/.{1,3180}/g).map((value, i) => ({ name: `${NAME}.${i}`, value }));
const jwt = (exp) => `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify({ sub: "u1", exp, session_id: "s1", aud: "authenticated", role: "authenticated" }))}.sig`;
const user = { id: "u1", aud: "authenticated", email: "a@example.com", user_metadata: { pad: "y".repeat(3000) } };
const session = (exp, rt) => ({ access_token: jwt(exp), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: rt, user });

test("a whole or correctly chunked session is readable", () => {
  const s = session(2e9, "rt");
  assert.deepEqual(unreadableAuthCookies([{ name: NAME, value: enc(s) }]), []);
  assert.deepEqual(unreadableAuthCookies(chunk(enc(s))), []);
  assert.deepEqual(unreadableAuthCookies([{ name: NAME, value: JSON.stringify(s) }]), []);
  assert.deepEqual(unreadableAuthCookies([{ name: "other", value: "x" }, { name: "sb-example-auth-token-code-verifier", value: "x" }]), []);
});

test("chunks that don't join into one session, truncated values and non-objects are unreadable", () => {
  const a = chunk(enc(session(2e9, "rt-a")));
  assert.ok(a.length >= 2);
  // The second chunk of a different, shorter session: the joined text breaks off mid-structure.
  const other = { name: `${NAME}.1`, value: b64('"}}],"x":') };
  assert.deepEqual(unreadableAuthCookies([a[0], other]).sort(), [`${NAME}.0`, `${NAME}.1`]);
  assert.deepEqual(unreadableAuthCookies([a[0]]), [`${NAME}.0`]);
  assert.deepEqual(unreadableAuthCookies([{ name: NAME, value: enc("a string") }]), [NAME]);
  assert.deepEqual(unreadableAuthCookies([{ name: NAME, value: "base64-!!!" }]), [NAME]);
});

test("a refresh sends every chunk of the new session to the browser", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("grant_type=refresh_token")) return Response.json(session(Math.floor(Date.now() / 1000) + 3600, "new-rt"));
    if (u.includes("/auth/v1/user")) return Response.json(user);
    return new Response("{}", { status: 404 });
  };
  try {
    const old = chunk(enc(session(Math.floor(Date.now() / 1000) - 60, "old-rt")));
    assert.equal(old.length, 2);
    const request = new NextRequest("https://os.example.com/os", { headers: { cookie: old.map((c) => `${c.name}=${c.value}`).join("; ") } });
    let response = NextResponse.next({ request });
    // Same adapter as src/proxy.ts.
    const supabase = createServerClient("https://example.supabase.co", "anon", { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => { for (const { name, value } of list) request.cookies.set(name, value); response = NextResponse.next({ request }); for (const { name, value, options } of list) response.cookies.set(name, value, options); },
    } });
    const { data } = await supabase.auth.getUser();
    assert.ok(data.user);
    const jar = Object.fromEntries(old.map((c) => [c.name, c.value]));
    for (const c of response.cookies.getAll()) if (c.name.startsWith(NAME)) { if (c.value) jar[c.name] = c.value; else delete jar[c.name]; }
    const held = Object.keys(jar).sort().map((k) => ({ name: k, value: jar[k] }));
    assert.deepEqual(unreadableAuthCookies(held), []);
    assert.equal(JSON.parse(Buffer.from(held.map((c) => c.value).join("").slice(7), "base64url").toString()).refresh_token, "new-rt");
  } finally {
    globalThis.fetch = realFetch;
  }
});

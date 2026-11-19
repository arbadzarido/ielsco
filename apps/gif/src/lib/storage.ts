import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile, open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { siteUrl } from "./request";

// Private document storage. Production: the Supabase Storage bucket "gif-applications" (private; created by the
// migration). Browsers upload straight to Storage with a short-lived signed upload URL (Vercel functions cap request
// bodies at 4.5 MB, too small for decks and videos), then the server checks the stored bytes before accepting the file.
// Local/test: GIF_STORAGE_DRIVER=local writes under .data/uploads through /api/dev-storage (refused on Vercel production).

const BUCKET = "gif-applications";
const driver = () => (process.env.GIF_STORAGE_DRIVER || "supabase") as "supabase" | "local";
const sbUrl = () => (process.env.GIF_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const sbKey = () => process.env.GIF_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");

function localAllowed() {
  if (process.env.VERCEL_ENV === "production") throw new Error("Local storage driver is not allowed in production");
}
const LOCAL_ROOT = () => join(process.cwd(), ".data", "uploads");
function localToken(key: string, op: "put" | "get", exp: number) {
  const sig = createHmac("sha256", process.env.GIF_AUTH_SECRET || "").update(`${op}:${key}:${exp}`).digest("base64url");
  return Buffer.from(JSON.stringify({ key, op, exp, sig })).toString("base64url");
}
export function verifyLocalToken(token: string, op: "put" | "get"): string | null {
  localAllowed();
  try {
    const t = JSON.parse(Buffer.from(token, "base64url").toString()) as { key: string; op: string; exp: number; sig: string };
    if (t.op !== op || t.exp < Date.now() || t.key.includes("..")) return null;
    const want = Buffer.from(createHmac("sha256", process.env.GIF_AUTH_SECRET || "").update(`${op}:${t.key}:${t.exp}`).digest("base64url"));
    const got = Buffer.from(t.sig);
    return want.length === got.length && timingSafeEqual(want, got) ? t.key : null;
  } catch { return null; }
}
export async function localWrite(key: string, bytes: Buffer) {
  const p = join(LOCAL_ROOT(), key);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, bytes);
}
export async function localRead(key: string) { return readFile(join(LOCAL_ROOT(), key)); }

export async function createUploadUrl(key: string): Promise<{ url: string; method: "PUT" }> {
  if (driver() === "local") {
    localAllowed();
    return { url: `${siteUrl()}/api/dev-storage/${localToken(key, "put", Date.now() + 15 * 60_000)}`, method: "PUT" };
  }
  const res = await fetch(`${sbUrl()}/storage/v1/object/upload/sign/${BUCKET}/${enc(key)}`, {
    method: "POST", headers: { Authorization: `Bearer ${sbKey()}`, apikey: sbKey(), "Content-Type": "application/json" }, body: "{}",
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string };
  if (!res.ok || !body.url) throw new Error(`Storage upload URL failed (${res.status})`);
  return { url: `${sbUrl()}/storage/v1${body.url}`, method: "PUT" };
}

// Size and first bytes of a stored object (for type sniffing), or null if it isn't there.
export async function inspect(key: string): Promise<{ size: number; head: Uint8Array } | null> {
  if (driver() === "local") {
    localAllowed();
    const p = join(LOCAL_ROOT(), key);
    try {
      const st = await stat(p);
      const fh = await open(p, "r");
      const buf = Buffer.alloc(16);
      await fh.read(buf, 0, 16, 0);
      await fh.close();
      return { size: st.size, head: new Uint8Array(buf) };
    } catch { return null; }
  }
  const res = await fetch(`${sbUrl()}/storage/v1/object/authenticated/${BUCKET}/${enc(key)}`, {
    headers: { Authorization: `Bearer ${sbKey()}`, apikey: sbKey(), Range: "bytes=0-15" },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Storage read failed (${res.status})`);
  const head = new Uint8Array(await res.arrayBuffer()).slice(0, 16);
  const range = res.headers.get("content-range");
  const size = range ? Number(range.split("/")[1]) : Number(res.headers.get("content-length") || head.length);
  return { size, head };
}

export async function signedDownloadUrl(key: string, seconds = 300): Promise<string> {
  if (driver() === "local") {
    localAllowed();
    return `${siteUrl()}/api/dev-storage/${localToken(key, "get", Date.now() + seconds * 1000)}`;
  }
  const res = await fetch(`${sbUrl()}/storage/v1/object/sign/${BUCKET}/${enc(key)}`, {
    method: "POST", headers: { Authorization: `Bearer ${sbKey()}`, apikey: sbKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: seconds }),
  });
  const body = (await res.json().catch(() => ({}))) as { signedURL?: string };
  if (!res.ok || !body.signedURL) throw new Error(`Storage sign failed (${res.status})`);
  return `${sbUrl()}/storage/v1${body.signedURL}`;
}

export async function removeObject(key: string) {
  if (driver() === "local") { localAllowed(); await rm(join(LOCAL_ROOT(), key), { force: true }); return; }
  await fetch(`${sbUrl()}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${sbKey()}`, apikey: sbKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
}

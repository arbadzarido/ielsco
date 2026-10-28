// ICE servers for Quick Match (WebRTC). Server-only: the TURN secret never reaches the browser.
//   CONNECT_STUN_URLS   comma-separated stun: URLs (default: Google's public STUN server)
//   CONNECT_TURN_URLS   comma-separated turn:/turns: URLs of a TURN server (e.g. coturn); unset = no relay
//   CONNECT_TURN_SECRET the TURN server's shared secret (coturn "use-auth-secret" / static-auth-secret)
// TURN credentials follow the TURN REST convention: username "<expiry>:<user id>", password base64(HMAC-SHA1(secret,
// username)). They expire after TTL_SECONDS, a little longer than the 8-minute call limit.
import { createHmac } from "node:crypto";

export const TTL_SECONDS = 600;

export interface IceConfig {
  iceServers: { urls: string[]; username?: string; credential?: string }[];
  relay: boolean;
  ttl: number;
}

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function iceConfig(userId: string, env: Record<string, string | undefined> = process.env, nowMs = Date.now()): IceConfig {
  const stun = list(env.CONNECT_STUN_URLS).filter((u) => /^stuns?:/.test(u));
  const turn = list(env.CONNECT_TURN_URLS).filter((u) => /^turns?:/.test(u));
  const servers: IceConfig["iceServers"] = [{ urls: stun.length ? stun : ["stun:stun.l.google.com:19302"] }];
  const secret = env.CONNECT_TURN_SECRET;
  if (turn.length && secret) {
    const username = `${Math.floor(nowMs / 1000) + TTL_SECONDS}:${userId}`;
    servers.push({ urls: turn, username, credential: createHmac("sha1", secret).update(username).digest("base64") });
  }
  return { iceServers: servers, relay: servers.length > 1, ttl: TTL_SECONDS };
}

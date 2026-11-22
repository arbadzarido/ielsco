// Tells "the connection failed", "our side failed", "you are signed out" and "this does not exist" apart, so a temporary
// problem is never shown as a 404 and a network blip never reads as a bug. Mirrors the kinds in Elco AI's ErrorState.
export type ErrorKind = "not_found" | "unavailable" | "network" | "server" | "session" | "empty" | "search";

type Errorish = { kind?: string; status?: number; code?: string | number; message?: string; name?: string } | string | null | undefined;

const NETWORK = /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|offline|timed? ?out|econnrefused|enotfound|etimedout|socket hang up|couldn'?t reach|could not reach/i;
const SESSION = /\bjwt\b|invalid refresh token|refresh token (not found|is invalid)|not authenticated|not signed in|session (has )?(expired|ended|missing)|auth session missing|\b401\b/i;

/** The kind of an error from fetch, Supabase (PostgREST / auth) or a thrown Error. Offline always wins. */
export function classifyError(error: Errorish, online = typeof navigator === "undefined" ? true : navigator.onLine): ErrorKind {
  if (!online) return "network";
  if (!error) return "server";
  if (typeof error === "string") error = { message: error };
  if (error.kind && ["not_found", "unavailable", "network", "server", "session", "empty", "search"].includes(error.kind)) return error.kind as ErrorKind;
  const status = Number(error.status);
  const code = String(error.code ?? "");
  const msg = `${error.name ?? ""} ${error.message ?? ""}`;
  if (status === 401 || code === "PGRST301" || SESSION.test(msg)) return "session";
  if (status === 404 || code === "PGRST116") return "not_found";
  if (status === 403 || status === 410 || code === "42501") return "unavailable";
  if (status === 0 || status === 408 || NETWORK.test(msg) || (error.name === "TypeError" && /fetch/i.test(msg))) return "network";
  return "server";
}

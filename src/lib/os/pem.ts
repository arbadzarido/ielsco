/**
 * The private key as pasted into Vercel can carry the JSON file's quotes and escaped newlines
 * ("-----BEGIN PRIVATE KEY-----\\n…\\n-----END PRIVATE KEY-----\\n"). Normalise it to real PEM.
 */
export function normalizePrivateKey(raw: string | undefined): string {
  let k = (raw ?? "").trim();
  if (k.endsWith(",")) k = k.slice(0, -1).trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n").trim() + "\n";
}

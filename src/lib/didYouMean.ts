// "Did you mean …?" for searches with a typo. Mirrors Elco AI's lib/didYouMean.js (same algorithm, TypeScript).
// Compares the query (and each of its words) with the terms the page can find, using Damerau–Levenshtein distance (a
// swapped pair of letters counts as one edit), scaled to word length so short words need a closer match. Pure and small:
// the term list comes from the page's own data, so a suggestion always exists on that page.
export function distance(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const words = (s: string) => (s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[\p{L}\p{N}']+/gu) || [];
const allowed = (len: number) => (len <= 4 ? 1 : len <= 8 ? 2 : 3);

/** Up to `max` suggestions from `terms` for `query`, best first; [] when the query already matches something. */
export function suggest(query: string, terms: Iterable<string | null | undefined>, max = 3): string[] {
  const q = (query || "").trim().toLowerCase();
  if (q.length < 3) return [];
  const vocab = new Map<string, string>(); // word → a display form
  for (const t of terms || []) {
    const s = String(t || "");
    if (s.toLowerCase().includes(q)) return []; // not a typo: something already contains the query
    for (const w of words(s)) if (w.length >= 3 && !vocab.has(w)) vocab.set(w, w);
    if (s.length <= 40) vocab.set(s.toLowerCase(), s);
  }
  const qs = words(q);
  const scored: [number, number, string][] = [];
  for (const [key, shown] of vocab) {
    const target = qs.length > 1 && key.includes(" ") ? q : qs[qs.length - 1] || q;
    const dd = distance(target, key);
    if (dd > 0 && dd <= allowed(Math.max(target.length, 3)) && Math.abs(key.length - target.length) <= 3) scored.push([dd, key.length, shown]);
  }
  scored.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out: string[] = [];
  for (const [, , s] of scored) {
    if (!out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  // a multi-word query keeps its other words: "japan scholrship" → "japan scholarship"
  if (qs.length > 1) return out.map((s) => (s.includes(" ") ? s : [...qs.slice(0, -1), s].join(" ")));
  return out;
}

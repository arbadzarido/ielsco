// Fact guardrails for AI story drafts (no imports, so they are unit-tested directly: tests/member-stories.test.mjs).
// A quote survives only if it appears word for word in the member's answers; a highlight only if every number in it
// appears in the answers. Everything removed is reported to the editor.

export const normalizeText = (s: string) =>
  s.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, "-").replace(/\s+/g, " ").trim();

export function verifyQuotes<T extends { text: string }>(quotes: T[], answersText: string, removed: string[]): T[] {
  const source = normalizeText(answersText);
  return quotes.filter((q) => {
    const ok = q.text.trim().length > 0 && source.includes(normalizeText(q.text));
    if (!ok && q.text.trim()) removed.push(`Quote removed (not word for word in the answers): "${q.text}"`);
    return ok;
  });
}

export function verifyHighlights<T extends { value: string; label: string }>(highlights: T[], answersText: string, removed: string[]): T[] {
  const source = normalizeText(answersText);
  return highlights.filter((h) => {
    const nums = `${h.value} ${h.label}`.match(/\d+(?:[.,]\d+)?/g) ?? [];
    const ok = h.value.trim().length > 0 && nums.every((n) => source.includes(n));
    if (!ok && h.value.trim()) removed.push(`Highlight removed (number not in the answers): ${h.value} ${h.label}`);
    return ok;
  });
}

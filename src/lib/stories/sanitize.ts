// Allow-list HTML sanitizer for story text (sections, legacy content). Story HTML is written by admins or drafted
// from member answers, so it is never trusted: only basic formatting tags survive, every attribute is dropped except
// a safe href on links, and everything else is escaped as text.
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h3", "h4", "blockquote", "div", "span"]);
const VOID = new Set(["br"]);
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g;

const escapeText = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function safeHref(attrs: string): string | null {
  const m = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const raw = (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
  return /^(https?:\/\/|mailto:)/i.test(raw) ? raw : null;
}

export function sanitizeStoryHtml(html: string | null | undefined): string {
  if (!html) return "";
  // Drop elements whose contents must never render as text either.
  const input = html.replace(/<(script|style|iframe|object|embed|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  let out = "";
  let last = 0;
  for (const m of input.matchAll(TAG)) {
    out += escapeText(input.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    const name = m[1].toLowerCase();
    if (!ALLOWED.has(name)) continue;
    const closing = m[0].startsWith("</");
    if (closing) {
      if (!VOID.has(name)) out += `</${name}>`;
    } else if (name === "a") {
      const href = safeHref(m[2]);
      out += href ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">` : "<a>";
    } else {
      out += `<${name}>`;
    }
  }
  out += escapeText(input.slice(last));
  return out;
}

// Plain text (for excerpts, AI prompts and checks).
export function htmlToText(html: string | null | undefined): string {
  return (html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h3|h4)>/gi, "\n").replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeStoryHtml, htmlToText } from "../src/lib/stories/sanitize.ts";
import { verifyHighlights, verifyQuotes } from "../src/lib/stories/guardrails.ts";

test("sanitizer keeps basic formatting", () => {
  assert.equal(sanitizeStoryHtml("<p>Hello <strong>world</strong><br/>again</p>"), "<p>Hello <strong>world</strong><br>again</p>");
});

test("sanitizer drops scripts, event handlers, styles and unknown tags", () => {
  const out = sanitizeStoryHtml(`<p onclick="x()">a</p><script>alert(1)</script><img src=x onerror=alert(1)><style>p{}</style><iframe src="//evil"></iframe>b`);
  assert.equal(out, "<p>a</p>b");
});

test("sanitizer keeps only http(s)/mailto links, rel noopener", () => {
  assert.equal(sanitizeStoryHtml(`<a href="javascript:alert(1)">x</a>`), "<a>x</a>");
  assert.equal(sanitizeStoryHtml(`<a href="https://ielsco.com" style="color:red" onmouseover="x">x</a>`), `<a href="https://ielsco.com" target="_blank" rel="noopener noreferrer">x</a>`);
});

test("sanitizer escapes broken or nested tag tricks", () => {
  const out = sanitizeStoryHtml(`<scr<script>ipt>alert(1)</script>`);
  assert.ok(!/<script/i.test(out), out);
  assert.ok(!/<img/i.test(sanitizeStoryHtml(`<img src=x onerror=alert(1)`)));
});

test("htmlToText strips tags", () => {
  assert.equal(htmlToText("<p>One</p><p>Two &amp; three</p>"), "One\nTwo & three");
});

const answers = "I’ve been traveling around the world for over 5 years now but I will never get tired of exploring this country. In Phnom Penh, between 15 and 20 pets go missing daily.";

test("quotes must be word for word (typographic quotes and spacing normalised)", () => {
  const removed = [];
  const kept = verifyQuotes([
    { text: "I've been traveling around the world for over 5 years now" },
    { text: "I love Indonesia more than anywhere else" },
  ], answers, removed);
  assert.equal(kept.length, 1);
  assert.equal(removed.length, 1);
  assert.match(removed[0], /not word for word/);
});

test("highlights must only use numbers from the answers", () => {
  const removed = [];
  const kept = verifyHighlights([
    { value: "15–20", label: "pets missing daily" },
    { value: "5+ years", label: "traveling" },
    { value: "300", label: "users" },
  ], answers, removed);
  assert.deepEqual(kept.map((h) => h.value), ["15–20", "5+ years"]);
  assert.equal(removed.length, 1);
});

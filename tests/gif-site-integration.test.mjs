import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GIF_APPLY_URL, GIF_PATHWAYS, GIF_PROGRAMME, GIF_REGISTER_URL, GIF_SITE_URL, gifApplyHref, pathwayOpen, pathwayStatus } from "../src/lib/gif-summer-2027.ts";
import { GIF_POPUP, gifPopupAllowedOn, shouldShowGifPopup, snoozeUntil } from "../src/lib/gif/recruit-popup.ts";

const at = (iso) => Date.parse(iso);

test("GIF destinations: the programme site and its application", () => {
  assert.equal(GIF_SITE_URL, "https://gif.ielsco.com");
  // Participants register, apply and pay in the IELSco Dashboard (no Google Forms).
  assert.equal(GIF_APPLY_URL, "/dashboard/gif");
  assert.equal(GIF_REGISTER_URL, GIF_APPLY_URL);
  assert.equal(gifApplyHref("mentoring"), "/dashboard/gif?pathway=mentoring");
  assert.equal(GIF_PROGRAMME.dates, "27 July – 3 August 2027");
  assert.deepEqual([...GIF_PROGRAMME.route], ["Singapore", "Malaysia", "Thailand"]);
});

test("three pathways (no Partial Funded pathway) with the 21 Nov 2026 timeline", () => {
  assert.deepEqual(GIF_PATHWAYS.map((p) => p.key), ["fully_funded", "self_funded", "mentoring"]);
  const ff = GIF_PATHWAYS[0], sf = GIF_PATHWAYS[1], mt = GIF_PATHWAYS[2];
  const nov21 = at("2026-11-21T12:00:00+07:00");
  assert.equal(pathwayOpen(sf, nov21), true);
  assert.equal(pathwayOpen(mt, nov21), true);
  assert.equal(pathwayOpen(ff, nov21), false);
  assert.equal(pathwayStatus(ff, nov21), "Opens 25 Nov");
  assert.equal(pathwayStatus(ff, at("2026-11-25T00:00:00+07:00")), "Open now");
});

test("popup only on public pages", () => {
  for (const p of ["/", "/events", "/products", "/about", "/articles/x", "/opportunities"]) assert.equal(gifPopupAllowedOn(p, "www.ielsco.com"), true, p);
  for (const p of ["/dashboard", "/dashboard/gif", "/sign-in", "/sign-up", "/membership/checkout", "/checkout", "/careers", "/careers/apply", "/os", "/admin", "/school", "/quiz", "/events/gif", "/events/gif/batch2", "/api/x"]) {
    assert.equal(gifPopupAllowedOn(p, "www.ielsco.com"), false, p);
  }
  assert.equal(gifPopupAllowedOn("/", "gif.ielsco.com"), false, "never on the GIF site itself");
  assert.equal(gifPopupAllowedOn("/", "circle.ielsco.com"), false);
});

test("popup display rules: window, once per session, cooldowns, other campaign", () => {
  const base = { now: at("2026-11-22T10:00:00+07:00"), pathname: "/events", host: "www.ielsco.com", snoozedUntil: 0, seenThisSession: false, otherPopupThisSession: false };
  assert.equal(shouldShowGifPopup(base), true);
  assert.equal(shouldShowGifPopup({ ...base, seenThisSession: true }), false);
  assert.equal(shouldShowGifPopup({ ...base, otherPopupThisSession: true }), false, "never in the same session as Open Recruitment");
  assert.equal(shouldShowGifPopup({ ...base, snoozedUntil: snoozeUntil(base.now, "dismiss") }), false);
  assert.equal(shouldShowGifPopup({ ...base, now: base.now + 8 * 86_400_000, snoozedUntil: snoozeUntil(base.now, "dismiss") }), true, "back after 7 days");
  assert.equal(snoozeUntil(0, "clicked"), 30 * 86_400_000);
  assert.equal(shouldShowGifPopup({ ...base, now: at("2027-07-27T00:00:00+07:00") }), false, "campaign ends when the programme starts");
  assert.equal(shouldShowGifPopup({ ...base, enabled: false }), false, "kill switch");
  assert.ok(GIF_POPUP.delayMs >= 10_000, "not on page load");
});

test("no navigation or CTA still points at /events/gif", () => {
  const files = ["src/components/header.tsx", "src/components/footer.tsx", "src/app/HomeView.tsx", "src/app/events/EventsView.tsx", "src/app/products/page.tsx", "src/data/dashboard/programs.ts", "src/app/sitemap.ts"];
  for (const f of files) assert.ok(!/["'(]\/events\/gif["')]/.test(readFileSync(new URL(`../${f}`, import.meta.url), "utf8")), f);
  const cfg = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(cfg, /source: "\/events\/gif", destination: "https:\/\/gif\.ielsco\.com", permanent: true/);
  assert.ok(!/source: "\/events\/gif\/:/.test(cfg), "GIF 2026 subpages are not redirected");
});

test("no GIF page, data or component links to a Google Form", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const roots = ["src/app/events/gif", "src/app/dashboard/gif", "src/components/gif-public", "src/components/dashboard/gif", "src/lib/gif-summer-2027.ts", "src/data/gif.ts", "apps/gif/src"];
  const files = [];
  const walk = (p) => { const full = new URL(`../${p}`, import.meta.url); if (statSync(full).isDirectory()) for (const f of readdirSync(full)) walk(join(p, f)); else if (/\.(tsx?|mjs)$/.test(p)) files.push(p); };
  roots.forEach(walk);
  for (const f of files) assert.ok(!/forms\.gle|docs\.google\.com\/forms/i.test(readFileSync(new URL(`../${f}`, import.meta.url), "utf8")), f);
  const events = readFileSync(new URL("../src/data/events.ts", import.meta.url), "utf8");
  const gifEvent = events.slice(events.indexOf('title: "GIF: Study at NUS Info Session'));
  assert.ok(!/forms\.gle/.test(gifEvent.slice(0, 4000)), "GIF info session registration link");
});

test("sign-in keeps the GIF pathway preselection (/dashboard/gif?pathway=…)", () => {
  const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /signInUrl\.searchParams\.set\('next', gifNext\)/);
  assert.match(proxy, /\(fully_funded\|mentoring\|self_funded\)/);
});

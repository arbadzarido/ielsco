// Run: npm test. Company OS business streams (src/lib/os/streams.ts, src/lib/os/ai-page.ts, the Elco Assistant
// prompt): HQ plus IELSco, Elco AI and GIF as first-class streams, separate from divisions and legal entities.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STREAMS, STREAM_CODES, defaultStreams, inStream, isStreamCode, normalizeStreams, streamBySlug, streamFromCompany, streamFromParams,
  streamFromPath, streamHref, streamOrFilter, streamsLabel, toggleStream,
} from "../src/lib/os/streams.ts";
import { parsePage } from "../src/lib/os/ai-page.ts";
import { STREAMS_GUIDE, systemPrompt } from "../src/lib/os/ai-core.ts";

test("four streams: HQ as central management, and GIF as its own business stream", () => {
  assert.deepEqual(STREAM_CODES, ["HQ", "IEL", "ELC", "GIF"]);
  assert.deepEqual(STREAMS.map((s) => s.slug), ["hq", "ielsco", "elco", "gif"]);
  assert.equal(STREAMS.find((s) => s.code === "HQ").kind, "management");
  assert.equal(STREAMS.find((s) => s.code === "GIF").kind, "business");
  assert.match(STREAMS.find((s) => s.code === "GIF").description, /Summer, Winter, delegations, partnerships and sponsorships/);
  assert.equal(streamBySlug("GIF").code, "GIF");
  assert.ok(isStreamCode("GIF") && !isStreamCode("gif") && !isStreamCode("XYZ"));
});

test("streams are stored in one canonical order, without duplicates or unknown codes", () => {
  assert.deepEqual(normalizeStreams(["gif", "IEL", "GIF", "nope", null, " elc "]), ["IEL", "ELC", "GIF"]);
  assert.deepEqual(normalizeStreams(undefined), []);
  assert.deepEqual(toggleStream(["GIF"], "IEL"), ["IEL", "GIF"]);
  assert.deepEqual(toggleStream(["IEL", "GIF"], "GIF"), ["IEL"]);
  assert.equal(streamsLabel(["GIF", "IEL"]), "IELSco + GIF");
  assert.equal(streamsLabel([]), "Not assigned");
});

test("a record shows in every stream it belongs to; HQ also lists unassigned records", () => {
  assert.ok(inStream(["IEL", "GIF"], "GIF") && inStream(["IEL", "GIF"], "IEL"));
  assert.ok(!inStream(["IEL", "GIF"], "ELC"));
  assert.ok(inStream([], "HQ") && inStream(null, "HQ"));
  assert.ok(!inStream([], "GIF"));
  assert.ok(inStream(["ELC"], null)); // no filter: everything
  // The PostgREST filters match the same rule.
  assert.equal(streamOrFilter("GIF"), "streams.cs.{GIF}");
  assert.equal(streamOrFilter("HQ"), "streams.cs.{HQ},streams.eq.{}");
});

test("URLs: stream workspaces, ?stream= filters and the older ?company= links", () => {
  assert.equal(streamHref("GIF"), "/os/w/gif");
  assert.equal(streamHref("ELC", "tasks"), "/os/w/elco?tab=tasks");
  assert.equal(streamFromPath("/os/w/gif"), "GIF");
  assert.equal(streamFromPath("/os/gif"), "GIF");
  assert.equal(streamFromPath("/os/tasks"), null);
  const q = (o) => (k) => o[k] ?? null;
  assert.equal(streamFromParams(q({ stream: "gif" })), "GIF");
  assert.equal(streamFromParams(q({ stream: "ELC" })), "ELC");
  assert.equal(streamFromParams(q({ company: "IEL" })), "IEL");
  assert.equal(streamFromParams(q({})), null);
  assert.equal(streamFromCompany("ELC"), "ELC");
  assert.deepEqual(defaultStreams("GIF"), ["GIF"]);
  assert.deepEqual(defaultStreams(null), []);
});

test("the assistant knows which stream page the person is on", () => {
  assert.equal(parsePage({ path: "/os/w/gif" }).stream, "GIF");
  assert.equal(parsePage({ path: "/os/gif" }).stream, "GIF");
  assert.equal(parsePage({ path: "/os/w/hq" }).stream, "HQ");
  assert.equal(parsePage({ path: "/os/tasks", filters: { stream: "GIF" } }).stream, "GIF");
  assert.match(parsePage({ path: "/os/tasks", filters: { stream: "GIF" } }).label, /Tasks · GIF/);
  // A legal-entity filter on documents is not a stream.
  const docs = parsePage({ path: "/os/documents", filters: { legal_entity: "ELC" } });
  assert.equal(docs.company, "ELC");
  assert.equal(docs.stream, null);
});

test("the assistant is told streams are not divisions, employers or access", () => {
  for (const agent of ["assistant", "operations", "partnerships", "growth"]) {
    const p = systemPrompt(agent, "2026-11-23");
    assert.ok(p.includes(STREAMS_GUIDE));
    assert.match(p, /GIF \(Global Impact Fellowship/);
  }
  assert.match(STREAMS_GUIDE, /Everyone active works across every stream/);
  assert.match(STREAMS_GUIDE, /Never assume a person's division, title or employer decides which stream/);
  assert.match(STREAMS_GUIDE, /GIF is its own stream, not part of IELSco/);
  assert.match(STREAMS_GUIDE, /Never derive a stream from who is assigned/);
});

test("operational forms no longer require a company; legal entity stays on books and documents", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const work = read("src/components/os/work-forms.tsx");
  assert.match(work, /Business streams/);
  assert.doesNotMatch(work, /CompanySelect/);
  const ev = read("src/components/os/EventSheet.tsx");
  assert.doesNotMatch(ev, /CompanySelect/);
  assert.match(ev, /Anyone active on the team can be invited/);
  // Finance and documents still choose the legal entity.
  assert.match(read("src/components/os/finance.tsx"), /Legal entity/);
  assert.match(read("src/components/os/doc-forms.tsx"), /Legal entity/);
  // The workspace page has no membership gate.
  const ws = read("src/app/os/(app)/w/[slug]/page.tsx");
  assert.doesNotMatch(ws, /me\.companies/);
  assert.match(ws, /streamBySlug/);
});

test("the migration is additive: no drops of existing tables or columns, and access never depends on streams", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261213000000_company_os_business_streams.sql", import.meta.url), "utf8");
  assert.doesNotMatch(sql, /drop\s+table\s+(if\s+exists\s+)?public\.os_(?!streams_rollback)/i);
  assert.doesNotMatch(sql, /drop\s+column\s+(if\s+exists\s+)?(?!streams)/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.os_(projects|tasks|events|documents|partnerships)/i);
  // No RLS policy reads streams.
  for (const m of sql.matchAll(/create policy[\s\S]*?;/gi)) assert.doesNotMatch(m[0].replace(/os_stream_reviews|os_stream_assignments|os_streams/g, ""), /\bstreams\b/);
});

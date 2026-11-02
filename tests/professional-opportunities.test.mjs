// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeFilterCount, attachPartners, EMPTY_FILTERS, filterJobs, filterOptions, parseTrack, partnerDestination, salaryLabel, whatsappLink,
} from "../src/lib/professional/model.ts";

const partner = { id: "p1", slug: "fbt", name: "PT Ficotama Bina Trampil", short_name: "FBT", website_url: "https://www.ficotama.com/", email: null, whatsapp: "+6282125508988", phone: null, about: null };
const job = (o) => ({
  id: o.slug, slug: o.slug, title: "Job", country_code: "AL", city: "Vlorë", industry: "Agriculture", positions: [], employment_type: "contract",
  summary: "A job abroad.", description: null, responsibilities: [], requirements: [], gender: "any", age_min: 20, age_max: 45, experience: null,
  salary_min: 50000, salary_max: 50000, salary_currency: "ALL", salary_period: "month", salary_status: "stated", salary_note: null, benefits: [],
  working_hours: null, contract_duration: null, openings: null, location_note: null, documents: [], confirm_notes: [], partner_id: "p1",
  application_url: null, application_instructions: null, status: "open", featured: false, published_at: null, updated_at: "2026-11-02T00:00:00Z", partner, ...o,
});

const items = [
  job({ slug: "sewing", title: "Sewing Operator", industry: "Textile & Garment" }),
  job({ slug: "build", title: "Construction Worker", industry: "Construction", positions: ["Tiler", "Mechanic"], salary_min: 70000, salary_max: 80000, salary_status: "to_confirm" }),
  job({ slug: "cook", title: "Cook", industry: "Hospitality & Tourism", city: null, salary_max: null, salary_status: "to_confirm" }),
  job({ slug: "ae-chef", title: "Chef", country_code: "AE", industry: "Hospitality & Tourism", employment_type: "full_time", status: "closed", salary_currency: "AED", salary_min: 3000, salary_max: 3000 }),
];

test("filter options come from the data (new countries and industries appear without code changes)", () => {
  const o = filterOptions(items);
  assert.deepEqual(o.countries.map((c) => c.value), ["AL", "AE"]); // sorted by name: Albania, United Arab Emirates
  assert.deepEqual(o.industries, ["Construction", "Hospitality & Tourism", "Textile & Garment"]);
  assert.ok(o.positions.includes("Tiler") && o.positions.includes("Sewing Operator"));
  assert.deepEqual(o.employment.sort(), ["contract", "full_time"]);
});

test("country + industry + position + search filters combine", () => {
  assert.deepEqual(filterJobs(items, { ...EMPTY_FILTERS, country: "AL", industry: "Hospitality & Tourism" }).map((o) => o.slug), ["cook"]);
  assert.deepEqual(filterJobs(items, { ...EMPTY_FILTERS, position: "Mechanic" }).map((o) => o.slug), ["build"]);
  assert.deepEqual(filterJobs(items, { ...EMPTY_FILTERS, q: "albania" }).length, 3);
  assert.deepEqual(filterJobs(items, { ...EMPTY_FILTERS, q: "ficotama" }).length, 4);
  assert.deepEqual(filterJobs(items, { ...EMPTY_FILTERS, employment: "full_time" }).map((o) => o.slug), ["ae-chef"]);
  assert.equal(filterJobs(items, { ...EMPTY_FILTERS, hideClosed: true }).length, 3);
  assert.equal(filterJobs(items, { ...EMPTY_FILTERS, country: "DE" }).length, 0);
});

test("closed listings sort after open ones", () => {
  assert.equal(filterJobs(items, EMPTY_FILTERS).at(-1).slug, "ae-chef");
});

test("active filter count drives the Reset button", () => {
  assert.equal(activeFilterCount(EMPTY_FILTERS), 0);
  assert.equal(activeFilterCount({ ...EMPTY_FILTERS, q: " ", country: "AL", hideClosed: true }), 2);
});

test("salary labels never hide a conflict", () => {
  assert.deepEqual(salaryLabel(items[0]), { text: "50,000 ALL / month", confirm: false });
  assert.deepEqual(salaryLabel(items[1]), { text: "70,000–80,000 ALL / month", confirm: true });
  assert.deepEqual(salaryLabel(items[2]), { text: "From 50,000 ALL / month", confirm: true });
  assert.deepEqual(salaryLabel(job({ slug: "x", salary_status: "not_stated" })), { text: null, confirm: true });
  assert.deepEqual(salaryLabel(job({ slug: "x", salary_min: null, salary_max: null })), { text: null, confirm: true });
});

test("partner links, track parsing and numeric salaries from PostgREST", () => {
  assert.equal(whatsappLink("+62 821-2550-8988"), "https://wa.me/6282125508988");
  assert.equal(whatsappLink(null), null);
  assert.equal(partnerDestination(items[0]), "https://www.ficotama.com/");
  assert.equal(partnerDestination({ ...items[0], application_url: "https://jobs.example.com/x" }), "https://jobs.example.com/x");
  assert.equal(parseTrack("professional"), "professional");
  assert.equal(parseTrack("anything"), "academic");
  const [row] = attachPartners([{ ...items[0], partner: undefined, salary_min: "50000.00", salary_max: null }], [partner]);
  assert.equal(row.salary_min, 50000);
  assert.equal(row.partner.name, "PT Ficotama Bina Trampil");
});

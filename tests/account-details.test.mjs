// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import { missingForEvents } from "../src/lib/dashboard/account.ts";

const base = {
  full_name: "Ayu Lestari", email: "ayu@example.com", member_code: null, phone: "+62812", birth_date: "",
  gender: "", domicile: "Bandung", occupation: "Student", institution_name: "ITB", institution_role: "",
};

test("complete details are event-ready", () => {
  assert.deepEqual(missingForEvents(base), []);
});

test("students and workers need an institution; job seekers don't", () => {
  assert.deepEqual(missingForEvents({ ...base, institution_name: " " }), ["institution_name"]);
  assert.deepEqual(missingForEvents({ ...base, occupation: "Job Seeker", institution_name: "" }), []);
});

test("blank required fields are reported", () => {
  assert.deepEqual(missingForEvents({ ...base, phone: "", domicile: "", occupation: "" }), ["phone", "domicile", "occupation"]);
});

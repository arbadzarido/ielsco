// IELScourse payments end to end, with the REAL service code (src/lib/ielscourse/payments.ts) against the local Postgres
// stub (workspace/local-stack/ielsco-db.mjs) and the local fake Midtrans (local-stack/tests/fake-providers.mjs, :9911).
// No Sandbox, no real Midtrans: environment "local_test". Run from the repo root:
//   node tests/e2e/ielscourse-payments.e2e.mjs
import { createHash } from "node:crypto";
import { createJiti } from "jiti";

const DB = "http://127.0.0.1:54322", FAKE = "http://127.0.0.1:9911";
const KEY = "Mid-server-LOCALTESTONLY"; // test value only
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: DB, SUPABASE_SERVICE_ROLE_KEY: "local-service-role-key", IELSCOURSE_CHECKOUT_ENABLED: "true",
  IELSCOURSE_FAKE_MIDTRANS_BASE: FAKE, MIDTRANS_PRODUCTION_SERVER_KEY: KEY, MIDTRANS_PRODUCTION_CLIENT_KEY: "Mid-client-LOCALTESTONLY",
  NEXT_PUBLIC_APP_URL: "https://ielsco.com",
});
delete process.env.VERCEL; delete process.env.VERCEL_ENV;
const jiti = createJiti(import.meta.url, { alias: { "@": new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1") } });
const P = await jiti.import("../../src/lib/ielscourse/payments.ts");

let pass = 0, fail = 0;
const check = (n, c, w = "") => { if (c) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, "->", w); } };
const sql = async (q) => (await (await fetch(`${DB}/__sql`, { method: "POST", body: JSON.stringify({ sql: q }) })).json());
const fake = (path, body) => fetch(`${FAKE}${path}`, { method: body ? "POST" : "GET", body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());
const sign = (o, s, g) => createHash("sha512").update(`${o}${s}${g}${KEY}`).digest("hex");
const STUDENT = { id: "bbbbbbbb-0000-4000-8000-000000000002", email: "demo.member@example.test" };
const notify = (order_id, transaction_status, gross, key = null) => {
  const status_code = transaction_status === "pending" ? "201" : "200";
  return P.handleCourseNotification({ order_id, status_code, gross_amount: `${gross}.00`, transaction_status, signature_key: key ?? sign(order_id, status_code, `${gross}.00`) });
};

// Setup: the mentor (production has Arbadza's verified account; the local stack has the demo admin) and
await sql(`insert into public.tutoring_mentors (user_id, display_name) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Local Mentor') on conflict do nothing`);
// an open Collective group (admin path is covered by the DB suite; here we insert directly).
const [cohort] = await sql(`insert into public.course_cohorts (product, name, capacity, status, schedule_text) values ('collective', 'E2E Collective', 3, 'open', 'Wed and Sat 19:30 WIB') returning id`);
check("config: checkout open on local_test gateway, client key only", P.publicCheckoutConfig().enabled && P.publicCheckoutConfig().environment === "local_test" && !JSON.stringify(P.publicCheckoutConfig()).includes("server"));
const open = await P.openCohorts();
check("open cohorts list seats left", open.some((c) => c.id === cohort.id && c.seats_left === 3), JSON.stringify(open));

// 1. Checkout creates the order and the Snap transaction with the server amount and the override notification URL.
const co = await P.startCheckout(STUDENT, { product: "collective", cohort_id: cohort.id });
check("checkout returns a Snap token and the order", !!co.token && /^IELS-C-/.test(co.order.order_id), JSON.stringify(co));
const sent = (await fake("/__orders"))[co.order.order_id];
check("Snap amount = Rp199,000 from the plan", sent?.request?.transaction_details?.gross_amount === 199000, JSON.stringify(sent?.request?.transaction_details));
check("X-Override-Notification = www.ielsco.com webhook", sent?.notify === "https://www.ielsco.com/api/payments/midtrans/notification", sent?.notify);
check("finish URL on www", sent?.request?.callbacks?.finish?.startsWith("https://www.ielsco.com/dashboard/courses/return?order_id="));
const again = await P.startCheckout(STUDENT, { product: "collective", cohort_id: cohort.id });
check("second click continues the same order", again.order.order_id === co.order.order_id);

// 2. Forged and premature notifications change nothing.
check("bad signature refused (403)", (await notify(co.order.order_id, "settlement", 199000, "f".repeat(128))).status === 403);
check("unknown order refused (404)", (await notify("IELS-C-261210-0000000000", "settlement", 199000)).status === 404);
check("Elco order id is not ours (404)", (await notify("ELCO-261210-0123456789", "settlement", 199000)).status === 404);
check("signed but Midtrans has no transaction yet: nothing granted", (await notify(co.order.order_id, "settlement", 199000)).outcome === "no_transaction");
// A notification that CLAIMS settlement while Midtrans still says pending: the re-read status wins.
await fake("/__set", { order_id: co.order.order_id, transaction_status: "pending", gross_amount: "199000.00" });
check("claimed settlement but Midtrans says pending: stays pending", (await notify(co.order.order_id, "settlement", 199000)).outcome === "pending");
check("no membership yet", (await sql(`select count(*)::int n from public.course_memberships where order_id = '${co.order.order_id}'`))[0].n === 0);

// 3. Midtrans settles: notification activates exactly once.
await fake("/__set", { order_id: co.order.order_id, transaction_status: "settlement", gross_amount: "199000.00" });
const n1 = await notify(co.order.order_id, "settlement", 199000);
check("verified settlement activates (200)", n1.status === 200 && n1.outcome === "activated", JSON.stringify(n1));
const n2 = await notify(co.order.order_id, "settlement", 199000);
check("Midtrans retry is idempotent", n2.outcome === "already_paid", n2.outcome);
const [mem] = await sql(`select count(*)::int n from public.course_memberships where order_id = '${co.order.order_id}'`);
check("exactly one membership period", mem.n === 1);
const [ord] = await sql(`select status, receipt_no, payment_type, midtrans_transaction_id from public.course_payment_orders where order_id = '${co.order.order_id}'`);
check("order paid with receipt and Midtrans reference", ord.status === "paid" && /^ICR-/.test(ord.receipt_no) && ord.midtrans_transaction_id === `tx-${co.order.order_id}`, JSON.stringify(ord));
const ev = await sql(`select source, signature_valid, outcome from public.course_payment_events where order_id = '${co.order.order_id}' order by id`);
check("audit trail records every notification incl. the forged one", ev.some((e) => e.signature_valid === false && e.outcome === "bad_signature") && ev.some((e) => e.outcome === "activated"), JSON.stringify(ev));
const mine = await P.getMyOrder(STUDENT, co.order.order_id, true);
check("return page view: paid", mine.status === "paid");

// 4. Amount tampering at Midtrans is never accepted.
const one = await P.startCheckout(STUDENT, { product: "one", package: "growth", option: "full", agreed: true });
check("One Growth checkout = Rp329,000", one.order.amount_idr === 329000, one.order.amount_idr);
await fake("/__set", { order_id: one.order.order_id, transaction_status: "settlement", gross_amount: "1000.00" });
check("status amount mismatch refused", (await notify(one.order.order_id, "settlement", 1000)).outcome === "amount_mismatch");
// 5. Missed notification: reconcile picks the settlement up.
await fake("/__set", { order_id: one.order.order_id, transaction_status: "settlement", gross_amount: "329000.00" });
await sql(`update public.course_payment_orders set updated_at = now() - interval '5 minutes' where order_id = '${one.order.order_id}'`);
const rec = await P.reconcile({ studentId: STUDENT.id });
check("reconcile activates a payment whose notification never came", rec.changed >= 1, JSON.stringify(rec));
const [en] = await sql(`select e.status, p.method from public.tutoring_enrolments e join public.tutoring_payments p on p.enrolment_id = e.id where p.order_id = '${one.order.order_id}'`);
check("One package active, payment recorded as Midtrans", en?.status === "active" && en?.method === "midtrans:credit_card", JSON.stringify(en));

// 6. Refund after payment ends the Collective month and flags it.
await fake("/__set", { order_id: co.order.order_id, transaction_status: "refund", gross_amount: "199000.00" });
check("refund notification revokes", (await notify(co.order.order_id, "refund", 199000)).outcome === "revoked");
const [m2] = await sql(`select status from public.course_memberships where order_id = '${co.order.order_id}'`);
check("membership refunded", m2.status === "refunded");

// 7. Daily job runs.
const job = await P.dailyJob();
check("daily job runs", typeof job.checked === "number", JSON.stringify(job));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

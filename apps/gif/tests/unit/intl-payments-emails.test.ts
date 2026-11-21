import { test } from "node:test";
import assert from "node:assert/strict";
import { cardAmountIdr, collectionMethod, currencyFor, internationalCardEnabled, plannedObligations } from "../../src/lib/pricing.ts";
import { DEFAULT_SETTINGS, USD_IDR_PAYMENT_RATE, resolveSettings } from "../../src/lib/settings.ts";
import { EMAIL_ASSETS, EMAIL_COLORS, layout, invoiceRequestedEmail, invoiceRequestFinanceEmail, invoiceSentEmail, paymentReceivedEmail, loginCodeEmail,
  applicationSubmittedEmail, resultEmail, onboardingEmail } from "../../src/lib/email/templates.ts";

const on = (over: Record<string, unknown> = {}) => resolveSettings({ payments: { international_card_enabled: true, ...over } });

test("fixed rate: USD 1 = IDR 18,500, converted on whole rupiah", () => {
  assert.equal(USD_IDR_PAYMENT_RATE, 18500);
  assert.equal(DEFAULT_SETTINGS.payments.usd_idr_card_rate, 18500);
  assert.equal(cardAmountIdr(899, 18500), 16631500);
  assert.equal(cardAmountIdr(99, 18500), 1831500);
  assert.equal(cardAmountIdr(79, 18500), 1461500);
  assert.equal(cardAmountIdr(300, 18500), 5550000);
  assert.equal(cardAmountIdr(0.1 + 0.2, 18500), 5550, "float drift handled (0.30000000000000004)");
  assert.equal(cardAmountIdr(12.345, 18500), Math.round(1235 * 185), "cents rounding, integer result");
  assert.ok(Number.isInteger(cardAmountIdr(699.99, 18500)!));
});

test("conversion refuses bad input instead of charging a wrong amount", () => {
  for (const usd of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(cardAmountIdr(usd, 18500), null);
  for (const rate of [0, -1, 185.5, 1, 1_000_000, Number.NaN]) assert.equal(cardAmountIdr(899, rate), null);
});

test("Indonesian payers keep the official IDR flow; nothing is converted twice", () => {
  const s = on();
  assert.equal(currencyFor("ID"), "IDR");
  assert.equal(currencyFor("sg"), "USD");
  assert.equal(collectionMethod(s, "IDR", true), "midtrans");
  assert.equal(collectionMethod(s, "IDR", false), "manual");
  // Obligations keep their official currency and amount: IDR stays IDR, USD stays USD (conversion happens only at card checkout).
  const id = plannedObligations(s, "self_funded", "ID", new Date("2026-11-21T00:00:00Z"));
  const intl = plannedObligations(s, "self_funded", "MY", new Date("2026-11-21T00:00:00Z"));
  assert.deepEqual(id.map((o) => [o.currency, o.amount]), [["IDR", s.prices.self_funded_deposit.IDR], ["IDR", s.prices.self_funded_total.IDR - s.prices.self_funded_deposit.IDR]]);
  assert.deepEqual(intl.map((o) => [o.currency, o.amount]), [["USD", s.prices.self_funded_deposit.USD], ["USD", s.prices.self_funded_total.USD - s.prices.self_funded_deposit.USD]]);
  assert.equal(plannedObligations(s, "fully_funded", "MY")[0].currency, "IDR", "Elco Pro is IDR for everyone");
});

test("international card option: invoice always, card only when the gateway is ready and Finance switched it on", () => {
  assert.equal(internationalCardEnabled(DEFAULT_SETTINGS), false, "off by default (no live international charging without a decision)");
  assert.equal(collectionMethod(DEFAULT_SETTINGS, "USD", true), "manual");
  assert.equal(collectionMethod(on(), "USD", true), "midtrans_idr_option");
  assert.equal(collectionMethod(on(), "USD", false), "manual");
  assert.equal(collectionMethod(resolveSettings({ payments: { allow_idr_for_international: true } }), "USD", true), "midtrans_idr_option", "legacy flag still honoured");
  assert.equal(DEFAULT_SETTINGS.payments.invoice_bank_details, null, "no bank details are invented");
});

test("shared email layout: IELSco + GIF logos, palette, CTA, plain text", () => {
  assert.equal(EMAIL_ASSETS.ielscoLogo, "https://hkubzamchahvdpvojepc.supabase.co/storage/v1/object/public/public-asset/iels_horizontal_navy.png");
  assert.equal(EMAIL_ASSETS.gifLogo, "https://hkubzamchahvdpvojepc.supabase.co/storage/v1/object/public/public-asset/gif.png");
  const m = layout({ heading: "Hello", paras: ["First line."], rows: [["Amount", "USD 899"]], cta: { label: "Open", href: "https://gif.ielsco.com/portal" }, panel: { title: "Next", lines: ["Do this"] }, note: "Small print" });
  assert.ok(m.html.includes(`src="${EMAIL_ASSETS.ielscoLogo}"`) && m.html.includes(`src="${EMAIL_ASSETS.gifLogo}"`));
  assert.ok(m.html.includes('alt="IELSco"') && m.html.includes('alt="Global Impact Fellowship"'), "readable when images are blocked or missing");
  assert.ok(m.html.indexOf(EMAIL_ASSETS.ielscoLogo) < m.html.indexOf(EMAIL_ASSETS.gifLogo), "IELSco first, GIF second");
  for (const c of Object.values(EMAIL_COLORS)) assert.ok(m.html.includes(c), `uses ${c}`);
  assert.ok(m.html.includes("Arial,Helvetica,sans-serif") && m.html.includes('role="presentation"'));
  assert.ok(m.html.includes('href="https://gif.ielsco.com/portal"'));
  assert.match(m.text, /Hello[\s\S]*First line\.[\s\S]*Amount: USD 899[\s\S]*Next:[\s\S]*Do this[\s\S]*Open: https:\/\/gif\.ielsco\.com\/portal/);
  assert.match(m.text, /IELSco \(PT English Space Berkah Indonesia\)/);
});

test("emails escape dynamic values and refuse unsafe links", () => {
  const evil = `<script>alert(1)</script> "Ayu" & <b>`;
  const m = invoiceRequestedEmail({ name: evil, code: "GIF27-ABC123", item: evil, amount: "USD 899", reference: "AB12CD34", bankDetails: "Bank <X>\nAccount 123" });
  assert.ok(!m.html.includes("<script>") && !m.html.includes("<b>"));
  assert.ok(m.html.includes("&lt;script&gt;") && m.html.includes("&quot;Ayu&quot; &amp;"));
  const bad = layout({ heading: "x", paras: [], cta: { label: "Go", href: "javascript:alert(1)" } });
  assert.ok(!bad.html.includes("javascript:") && bad.html.includes('href="#"'));
});

test("long names and programme names wrap instead of breaking the layout", () => {
  const long = "Muhammad Haidar Naufal Al Amien Bin Abdullah Rahman Sulaiman Wiriadiredja".repeat(2);
  const m = paymentReceivedEmail(long, "Project Mentoring Program (Early Bird) — Global Impact Fellowship Summer 2027", "IDR 1,461,500 (USD 79 at USD 1 = IDR 18,500)", "GIF27-R-20261121-ABC123", "https://gif.ielsco.com/portal/receipts/x");
  assert.ok(m.html.includes("word-break:break-word") && m.html.includes(long));
  assert.ok(m.html.includes("USD 79 at USD 1 = IDR 18,500"));
});

test("invoice emails: participant acknowledgement, Finance notice without sensitive data, bank details only when configured", () => {
  const ack = invoiceRequestedEmail({ name: "Ayu", code: "GIF27-ABC123", item: "Self-Funded deposit", amount: "USD 300", reference: "AB12CD34", bankDetails: null });
  assert.match(ack.subject, /Invoice request received: Self-Funded deposit/);
  assert.ok(ack.html.includes("What happens next") && !ack.html.includes("Bank transfer details"));
  const withBank = invoiceRequestedEmail({ name: "Ayu", code: "GIF27-ABC123", item: "Self-Funded deposit", amount: "USD 300", bankDetails: "Bank Example\nAcc 000" });
  assert.ok(withBank.html.includes("Bank transfer details") && withBank.text.includes("Acc 000"));
  const fin = invoiceRequestFinanceEmail({ name: "Ayu", email: "ayu@example.test", code: "GIF27-ABC123", item: "Self-Funded deposit", amount: "USD 300", reference: "AB12CD34" });
  assert.match(fin.subject, /^Invoice request GIF27-ABC123: Self-Funded deposit$/);
  assert.ok(!/date of birth|passport/i.test(fin.text));
  const sent = invoiceSentEmail({ name: "Ayu", code: "GIF27-ABC123", item: "Self-Funded deposit", amount: "USD 300", invoiceNo: "INV-2026-001" });
  assert.match(sent.subject, /INV-2026-001/);
});

test("every existing template renders in the shared layout", () => {
  for (const m of [loginCodeEmail("123456", 10), applicationSubmittedEmail("Ayu", "GIF27-ABC123", "Self-Funded", "Pay the deposit."), resultEmail("Ayu", "not_selected"), onboardingEmail("Ayu")]) {
    assert.ok(m.html.includes(EMAIL_ASSETS.gifLogo) && m.html.includes(EMAIL_COLORS.bg) && m.text.length > 20 && m.subject.length > 5);
  }
});

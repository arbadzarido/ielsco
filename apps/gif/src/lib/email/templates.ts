// GIF automated emails share one layout (21 Nov 2026): the IELSco email identity (the same card, palette and structure as
// IELSco's Supabase Auth emails) with IELSco as the primary brand and GIF as the programme. Table layout + inline styles
// for email clients, Arial/Helvetica, a bulletproof button, a hidden preheader and a plain-text part. Every dynamic value
// is escaped. Pure: no app imports (node --test imports it).
const SITE = () => (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");
const SUPPORT = () => process.env.GIF_EMAIL_REPLY_TO || "hello@ielsco.com";
// Participants act in the IELSco Dashboard (registration, applications, submissions, payments): email buttons go there.
// With single sign-on configured, a GIF page opens through IELSco (sign in once, then straight to that page); without it
// (local/test runs before the secret is set) they fall back to the GIF portal.
const IELSCO = () => (process.env.IELSCO_APP_URL || "https://www.ielsco.com").replace(/\/+$/, "");
const ssoOn = () => (process.env.IELSCO_GIF_SSO_SECRET ?? "").split(",").some((s) => s.trim().length >= 32);
export const dashboardUrl = () => (ssoOn() ? `${IELSCO()}/dashboard/gif` : `${SITE()}/portal`);
export const participantUrl = (path: string) => (ssoOn() ? `${IELSCO()}/api/gif/sso?next=${encodeURIComponent(path)}` : `${SITE()}${path}`);
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

// Public logo files in the IELSco Supabase Storage bucket "public-asset" (verified 21 Nov 2026: 1564×409 and 238×87).
export const EMAIL_ASSETS = {
  ielscoLogo: "https://hkubzamchahvdpvojepc.supabase.co/storage/v1/object/public/public-asset/iels_horizontal_navy.png",
  gifLogo: "https://hkubzamchahvdpvojepc.supabase.co/storage/v1/object/public/public-asset/gif.png",
} as const;

// IELSco email palette.
export const EMAIL_COLORS = { bg: "#F4F6F9", card: "#FFFFFF", navy: "#2F4157", heading: "#1A2534", body: "#536174", muted: "#718096", border: "#E5E9EF", footer: "#F8FAFC" } as const;

export type Block = {
  heading: string;
  paras: string[];
  preheader?: string;                         // inbox preview line; defaults to the first paragraph
  rows?: [string, string][];                  // key facts (application ID, amount, …)
  cta?: { label: string; href: string };
  panel?: { title: string; lines: string[] }; // secondary information (bank details, what happens next, security note)
  note?: string;                              // small print under the button
};

const C = EMAIL_COLORS;
const FONT = "Arial,Helvetica,sans-serif";
const safeHref = (h: string) => (/^(https?:|mailto:)/i.test(h) ? esc(h) : "#");
const NL = "\n";

export function layout(b: Block): { html: string; text: string } {
  const pre = (b.preheader ?? b.paras[0] ?? b.heading).slice(0, 140);
  const cell = (i: number) => (i ? `border-top:1px solid ${C.border};` : "");
  const rows = b.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:8px 0 24px;background:${C.footer};border:1px solid ${C.border};border-radius:12px">
${b.rows.map(([k, v], i) => `<tr><td style="padding:12px 16px;${cell(i)}font-family:${FONT};font-size:13px;line-height:1.4;color:${C.muted};width:40%;vertical-align:top">${esc(k)}</td><td style="padding:12px 16px;${cell(i)}font-family:${FONT};font-size:14px;line-height:1.4;color:${C.heading};font-weight:bold;vertical-align:top;word-break:break-word">${esc(v)}</td></tr>`).join(NL)}
</table>` : "";
  const cta = b.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td align="center" bgcolor="${C.navy}" style="border-radius:10px;background:${C.navy}">
<a href="${safeHref(b.cta.href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:bold;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:10px">${esc(b.cta.label)}</a></td></tr></table>`
    : "";
  const panel = b.panel
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-left:3px solid ${C.navy};background:${C.footer};border-radius:0 12px 12px 0"><tr><td style="padding:16px 18px;font-family:${FONT}">
<p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:${C.heading}">${esc(b.panel.title)}</p>
${b.panel.lines.map((l) => `<p style="margin:0 0 6px;font-size:14px;line-height:1.55;color:${C.body};white-space:pre-line;word-break:break-word">${esc(l)}</p>`).join(NL)}
</td></tr></table>` : "";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<title>${esc(b.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 36px 22px;border-bottom:1px solid ${C.border}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle"><a href="https://www.ielsco.com" target="_blank" style="text-decoration:none"><img src="${EMAIL_ASSETS.ielscoLogo}" width="107" height="28" alt="IELSco" style="display:block;border:0;height:28px;width:107px;font-family:${FONT};font-size:16px;font-weight:bold;color:${C.navy}"></a></td>
<td style="vertical-align:middle;padding:0 16px"><div style="width:1px;height:28px;background:${C.border}"></div></td>
<td style="vertical-align:middle"><a href="${SITE()}" target="_blank" style="text-decoration:none"><img src="${EMAIL_ASSETS.gifLogo}" width="109" height="40" alt="Global Impact Fellowship" style="display:block;border:0;height:40px;width:109px;font-family:${FONT};font-size:13px;font-weight:bold;color:${C.navy}"></a></td>
</tr></table></td></tr>
<tr><td style="padding:32px 36px 8px;font-family:${FONT}">
<p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;color:${C.muted}">Global Impact Fellowship &middot; Summer 2027</p>
<h1 style="margin:0 0 18px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:bold;color:${C.heading};word-break:break-word">${esc(b.heading)}</h1>
${b.paras.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.body};word-break:break-word">${esc(p)}</p>`).join(NL)}
${rows}${panel}${cta}
${b.note ? `<p style="margin:0 0 20px;font-size:13px;line-height:1.55;color:${C.muted}">${esc(b.note)}</p>` : ""}
</td></tr>
<tr><td style="padding:22px 36px 26px;background:${C.footer};border-top:1px solid ${C.border};font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted}">
<p style="margin:0 0 6px;font-weight:bold;color:${C.body}">IELSco &middot; PT English Space Berkah Indonesia</p>
<p style="margin:0 0 6px">Global Impact Fellowship is a programme of IELSco. Questions? Reply to this email or write to <a href="mailto:${esc(SUPPORT())}" style="color:${C.navy}">${esc(SUPPORT())}</a> &middot; WhatsApp +62 882-9725-3491</p>
<p style="margin:0"><a href="https://www.ielsco.com" style="color:${C.navy}">ielsco.com</a> &middot; <a href="${SITE()}" style="color:${C.navy}">gif.ielsco.com</a> &middot; Villa Regency 2 Blok AB 4 No. 8, Pasar Kemis, Tangerang 15560, Indonesia</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    "IELSco · Global Impact Fellowship Summer 2027", "", b.heading, "", ...b.paras,
    ...(b.rows?.length ? ["", ...b.rows.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(b.panel ? ["", `${b.panel.title}:`, ...b.panel.lines] : []),
    ...(b.cta ? ["", `${b.cta.label}: ${b.cta.href}`] : []),
    ...(b.note ? ["", b.note] : []),
    "", "—", "IELSco (PT English Space Berkah Indonesia) · Global Impact Fellowship is a programme of IELSco.",
    `Questions: ${SUPPORT()} · WhatsApp +62 882-9725-3491 · ielsco.com · gif.ielsco.com`,
  ].join(NL);
  return { html, text };
}

const mail = (subject: string, b: Block) => ({ subject, ...layout(b) });

export const loginCodeEmail = (code: string, minutes: number) => mail(`${code} is your GIF sign-in code`, {
  heading: "Your sign-in code",
  paras: [`Enter this code to sign in to the GIF portal: ${code}`, `It expires in ${minutes} minutes and works once.`],
  note: "If you didn't request it, ignore this email. Nobody can sign in without the code.",
});

export const applicationSubmittedEmail = (name: string, code: string, pathway: string, next: string) => mail(`Application received: ${code}`, {
  heading: `Thank you, ${name}`,
  paras: [`We have received your GIF Summer 2027 application (${pathway}).`, next],
  rows: [["Application ID", code], ["Pathway", pathway]],
  cta: { label: "Open your GIF dashboard", href: dashboardUrl() },
});

export const teamInviteEmail = (member: string, leader: string, team: string, code: string) => mail(`You were added to team ${team} for GIF Summer 2027`, {
  heading: `Hi ${member}`,
  paras: [`${leader} added you as a member of team "${team}" in a GIF Summer 2027 application (${code}).`,
    "Sign in to IELSco with this email address (or create an IELSco account with it) and open GIF in your dashboard to check your profile, accept the programme terms and see your payments."],
  cta: { label: "Open your GIF dashboard", href: dashboardUrl() },
  note: "If you don't know this team, reply to this email and we will remove you.",
});

export const paymentReceivedEmail = (name: string, label: string, amount: string, receipt: string, receiptUrl: string) => mail(`Payment received: ${label}`, {
  heading: "Payment received",
  paras: [`Hi ${name}, we have verified your payment.`],
  rows: [["Item", label], ["Amount", amount], ["Receipt", receipt]],
  cta: { label: "View receipt", href: receiptUrl },
});

export const paymentFailedEmail = (name: string, label: string) => mail(`Payment not completed: ${label}`, {
  heading: "Your payment was not completed",
  paras: [`Hi ${name}, the payment for ${label} was not completed (it failed, expired or was cancelled).`, "You can try again from your GIF dashboard on ielsco.com."],
  cta: { label: "Go to payments", href: participantUrl("/portal/payments") },
});

export const paymentReminderEmail = (name: string, label: string, amount: string, due: string | null) => mail(`Reminder: ${label}`, {
  heading: "Payment reminder",
  paras: [`Hi ${name}, ${label} (${amount}) is still open${due ? `, due ${due}` : ""}.`],
  cta: { label: "Pay in your dashboard", href: participantUrl("/portal/payments") },
});

export const missingInfoEmail = (name: string, message: string) => mail("Action needed on your GIF application", {
  heading: "We need a little more from you",
  paras: [`Hi ${name},`, message],
  cta: { label: "Open your GIF dashboard", href: dashboardUrl() },
});

export const phaseOpenEmail = (name: string, phase: 2 | 3, window: string) => mail(`Phase ${phase} is open`, {
  heading: `Phase ${phase} is open`,
  paras: [`Hi ${name}, Phase ${phase} of the selection is now open (${window}).`,
    phase === 2 ? "Submit your project essay and pitch deck from your GIF dashboard. The guidelines are on the Phase 2 page."
      : "Record and submit your 3–5 minute video presentation from your GIF dashboard within the 3-day window."],
  cta: { label: `Open Phase ${phase}`, href: participantUrl(`/portal/phase-${phase}`) },
});

export const phaseSubmittedEmail = (name: string, phase: 2 | 3, code: string) => mail(`Phase ${phase} submission received (${code})`, {
  heading: `Phase ${phase} received`,
  paras: [`Hi ${name}, we have received your Phase ${phase} submission. You can review it in your GIF dashboard.`],
  cta: { label: "Open your GIF dashboard", href: dashboardUrl() },
});

export const resultEmail = (name: string, outcome: "fully_funded" | "partial_funded" | "not_selected", award?: { covers: string[]; notIncluded: string[]; contribution?: string; depositDays?: number; balanceDue?: string }) => mail("Your GIF Summer 2027 result", {
  heading: outcome === "not_selected" ? "Your selection result" : "Congratulations",
  paras: outcome === "fully_funded"
    ? [`Hi ${name}, you have been selected as a Fully Funded delegate for GIF Summer 2027.`, award ? `Your award covers: ${award.covers.join(", ").toLowerCase()}. Not included: ${award.notIncluded.join(", ").toLowerCase()}.` : "Open your GIF dashboard to read the award details.", "Open your GIF dashboard to accept your offer."]
    : outcome === "partial_funded"
      ? [`Hi ${name}, you have been selected as a Partial Funded delegate for GIF Summer 2027.`, award?.contribution ? `Your participant contribution is ${award.contribution}. After you accept, pay a deposit within ${award.depositDays ?? 7} days to secure your seat; the balance is due by ${award.balanceDue ?? "the balance deadline"}. ${award.notIncluded.join(", ")} are not included.` : "Open your GIF dashboard to read the award details and any remaining payment.", "Open your GIF dashboard to accept your offer."]
      : [`Hi ${name}, thank you for taking part in the GIF Summer 2027 selection. You were not selected for funding this time.`,
        "Your Elco Pro access and any mentoring you joined are yours to keep. You can still join as a Self-Funded delegate while seats remain."],
  cta: { label: "See your result", href: participantUrl("/portal/results") },
});

export const onboardingEmail = (name: string) => mail("Your GIF Summer 2027 seat is confirmed", {
  heading: "Your seat is confirmed",
  paras: [`Hi ${name}, your seat for GIF Summer 2027 (27 July – 3 August 2027) is confirmed.`,
    "Participant preparation starts on 8 June 2027: payment, visa, travel, insurance and orientation. Your GIF dashboard lists each step."],
  cta: { label: "Open participant preparation", href: participantUrl("/portal/onboarding") },
});

export const elcoActivatedEmail = (name: string, elcoEmail: string, months: number) => mail("Your Elco Pro access is active", {
  heading: "Elco Pro is active",
  paras: [`Hi ${name}, ${months} months of Elco Pro are now active on the Elco account ${elcoEmail}.`, "Sign in at elcoai.com with that email to use it."],
  cta: { label: "Open Elco", href: "https://www.elcoai.com" },
});

export const sponsorshipReceivedEmail = (name: string) => mail("We received your sponsorship support request", {
  heading: `Thank you, ${name}`,
  paras: ["We have received your request for sponsorship documentation support.",
    "IELSco can prepare supporting documents for you to submit to potential sponsors. We do not guarantee that any sponsor will fund you."],
});

export const announcementEmail = (name: string, title: string, body: string) => mail(title, {
  heading: title,
  paras: [`Hi ${name},`, ...body.split(/\n{2,}/)],
  cta: { label: "Open your GIF dashboard", href: dashboardUrl() },
});

export const guardianConsentEmail = (guardian: string, applicant: string, token: string) => mail(`Parent or guardian consent needed for ${applicant} (GIF Summer 2027)`, {
  heading: `Dear ${guardian}`,
  paras: [`${applicant} has applied to the Global Impact Fellowship Summer 2027, an 8-day programme from Singapore through Malaysia to Thailand (27 July – 3 August 2027) organised by IELSco (PT English Space Berkah Indonesia).`,
    `Because ${applicant} will be under 18 on the first programme day, they can take part only with your written consent. Please review the programme terms and give or decline consent using the secure link below. No payment is taken before you consent.`],
  cta: { label: "Review and give consent", href: `${SITE()}/guardian-consent/${token}` },
  note: "This link is personal and works once. If you did not expect this email, reply and we will remove your details.",
});

// ── Invoices (international payments, 21 Nov 2026) ─────────────────────────────────────────────────────────────────
type InvoiceInfo = { name: string; code: string; item: string; amount: string; reference?: string; invoiceNo?: string; bankDetails?: string | null };
const kv = (k: string, v: string): [string, string] => [k, v];

export const invoiceRequestedEmail = (i: InvoiceInfo) => mail(`Invoice request received: ${i.item}`, {
  heading: "We've received your invoice request",
  paras: [`Hi ${i.name}, thank you. IELSco Finance will prepare an invoice for the item below and email it to you, usually within two working days.`,
    "Pay by bank transfer using the details on the invoice. Your payment shows as received once Finance has verified the transfer."],
  rows: [kv("Application ID", i.code), kv("Item", i.item), kv("Amount", i.amount), ...(i.reference ? [kv("Request reference", i.reference)] : [])],
  panel: i.bankDetails ? { title: "Bank transfer details", lines: [i.bankDetails, `Please include ${i.code} in the transfer reference.`] }
    : { title: "What happens next", lines: ["Finance will send you the invoice with the bank account to pay into. Please don't transfer any money before you receive it."] },
  cta: { label: "View your payments", href: participantUrl("/portal/payments") },
  note: "IELSco will never ask you to pay into an account that isn't on your invoice or in your GIF dashboard. If anything looks different, contact us before paying.",
});

export const invoiceSentEmail = (i: InvoiceInfo) => mail(i.invoiceNo ? `Your invoice ${i.invoiceNo}: ${i.item}` : `Your invoice: ${i.item}`, {
  heading: "Your invoice is ready",
  paras: [`Hi ${i.name}, IELSco Finance has issued your invoice${i.invoiceNo ? ` ${i.invoiceNo}` : ""} for the item below and sends the invoice document to this email address.`,
    "Your payment shows as received in your GIF dashboard once Finance has verified the transfer."],
  rows: [kv("Application ID", i.code), kv("Item", i.item), kv("Amount", i.amount), ...(i.invoiceNo ? [kv("Invoice number", i.invoiceNo)] : [])],
  ...(i.bankDetails ? { panel: { title: "Bank transfer details", lines: [i.bankDetails, `Please include ${i.invoiceNo ?? i.code} in the transfer reference.`] } } : {}),
  cta: { label: "View your payments", href: participantUrl("/portal/payments") },
  note: "IELSco will never ask you to pay into an account that isn't on your invoice or in your GIF dashboard.",
});

// Staff notification: only what Finance needs to issue the invoice (no date of birth, passport or address).
export const invoiceRequestFinanceEmail = (i: { name: string; email: string; code: string; item: string; amount: string; reference: string }) => mail(`Invoice request ${i.code}: ${i.item}`, {
  heading: "New invoice request",
  paras: ["A GIF participant has asked for an invoice. Issue it from Finance's usual tools, then mark it as sent in Admin → Payments.",
    "Once the transfer is verified, record the payment in Admin → Payments; that also closes this request."],
  rows: [kv("Participant", i.name), kv("Email", i.email), kv("Application ID", i.code), kv("Item", i.item), kv("Amount", i.amount), kv("Request reference", i.reference)],
  cta: { label: "Open Admin → Payments", href: `${SITE()}/admin/payments` },
});

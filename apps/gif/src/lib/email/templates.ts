// Branded transactional emails (table layout + inline styles for email clients). Pure: no app imports.
const SITE = () => (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

type Block = { heading: string; paras: string[]; cta?: { label: string; href: string }; note?: string; rows?: [string, string][] };

export function layout(b: Block): { html: string; text: string } {
  const td = "padding:8px 0;border-bottom:1px solid #DCDFE3;";
  const rows = b.rows?.length
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:20px 0">${b.rows.map(([k, v]) =>
        `<tr><td style="${td}color:#577E90;font-size:13px;width:42%">${esc(k)}</td><td style="${td}color:#1A2534;font-size:14px">${esc(v)}</td></tr>`).join("")}</table>`
    : "";
  const cta = b.cta
    ? `<p style="margin:28px 0"><a href="${esc(b.cta.href)}" style="background:#5C2D2E;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:3px;font-weight:600;font-size:14px;display:inline-block">${esc(b.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#F4F5F7;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" style="background:#F4F5F7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-top:4px solid #5C2D2E">
<tr><td style="padding:28px 32px 8px;background:#1B2B3C;background-image:linear-gradient(160deg,#1B2B3C 0%,#284055 40%,#5C2D2E 85%,#7A3B3E 100%);color:#ffffff">
<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#DCDFE3">IELSco &middot; Global Impact Fellowship</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;padding:6px 0 18px">GIF Summer 2027</div></td></tr>
<tr><td style="padding:28px 32px 8px;color:#1A2534;font-size:15px;line-height:1.6">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;color:#304156;margin:0 0 16px">${esc(b.heading)}</h1>
${b.paras.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("")}${rows}${cta}
${b.note ? `<p style="margin:0 0 14px;color:#577E90;font-size:13px">${esc(b.note)}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px 28px;color:#577E90;font-size:12px;line-height:1.5;border-top:1px solid #DCDFE3">
PT English Space Berkah Indonesia (IELSco) &middot; Villa Regency 2 Blok AB 4 No. 8, Pasar Kemis, Tangerang 15560, Indonesia<br>
Questions: hello@ielsco.com &middot; WhatsApp +62 882-9725-3491 &middot; <a href="${SITE()}" style="color:#577E90">gif.ielsco.com</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [b.heading, "", ...b.paras, ...(b.rows ?? []).map(([k, v]) => `${k}: ${v}`), b.cta ? `\n${b.cta.label}: ${b.cta.href}` : "", b.note ?? "",
    "", "IELSco (PT English Space Berkah Indonesia) · hello@ielsco.com · gif.ielsco.com"].join("\n");
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
  cta: { label: "Open your portal", href: `${SITE()}/portal` },
});

export const teamInviteEmail = (member: string, leader: string, team: string, code: string) => mail(`You were added to team ${team} for GIF Summer 2027`, {
  heading: `Hi ${member}`,
  paras: [`${leader} added you as a member of team "${team}" in a GIF Summer 2027 application (${code}).`,
    "Sign in with this email address to check your profile, accept the programme terms and see your payments."],
  cta: { label: "Sign in to the portal", href: `${SITE()}/login` },
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
  paras: [`Hi ${name}, the payment for ${label} was not completed (it failed, expired or was cancelled).`, "You can try again from your portal."],
  cta: { label: "Go to payments", href: `${SITE()}/portal/payments` },
});

export const paymentReminderEmail = (name: string, label: string, amount: string, due: string | null) => mail(`Reminder: ${label}`, {
  heading: "Payment reminder",
  paras: [`Hi ${name}, ${label} (${amount}) is still open${due ? `, due ${due}` : ""}.`],
  cta: { label: "Pay in your portal", href: `${SITE()}/portal/payments` },
});

export const missingInfoEmail = (name: string, message: string) => mail("Action needed on your GIF application", {
  heading: "We need a little more from you",
  paras: [`Hi ${name},`, message],
  cta: { label: "Open your portal", href: `${SITE()}/portal` },
});

export const phaseOpenEmail = (name: string, phase: 2 | 3, window: string) => mail(`Phase ${phase} is open`, {
  heading: `Phase ${phase} is open`,
  paras: [`Hi ${name}, Phase ${phase} of the selection is now open (${window}).`,
    phase === 2 ? "Submit your project essay and pitch deck in the portal. The guidelines are on the Phase 2 page."
      : "Record and submit your video pitch in the portal within the 3-day window."],
  cta: { label: `Open Phase ${phase}`, href: `${SITE()}/portal/phase-${phase}` },
});

export const phaseSubmittedEmail = (name: string, phase: 2 | 3, code: string) => mail(`Phase ${phase} submission received (${code})`, {
  heading: `Phase ${phase} received`,
  paras: [`Hi ${name}, we have received your Phase ${phase} submission. You can review it in your portal.`],
  cta: { label: "Open your portal", href: `${SITE()}/portal` },
});

export const resultEmail = (name: string, outcome: "fully_funded" | "partial_funded" | "not_selected") => mail("Your GIF Summer 2027 result", {
  heading: outcome === "not_selected" ? "Your selection result" : "Congratulations",
  paras: outcome === "fully_funded"
    ? [`Hi ${name}, you have been selected as a Fully Funded delegate for GIF Summer 2027.`, "Open your portal to read the award details and accept your offer."]
    : outcome === "partial_funded"
      ? [`Hi ${name}, you have been selected as a Partial Funded delegate for GIF Summer 2027.`, "Open your portal to read the award details, any remaining payment and the next steps."]
      : [`Hi ${name}, thank you for taking part in the GIF Summer 2027 selection. You were not selected for funding this time.`,
        "Your Elco Pro access and any mentoring you joined are yours to keep. You can still join as a Self-Funded delegate while seats remain."],
  cta: { label: "Open your portal", href: `${SITE()}/portal/results` },
});

export const onboardingEmail = (name: string) => mail("Your GIF Summer 2027 seat is confirmed", {
  heading: "Your seat is confirmed",
  paras: [`Hi ${name}, your seat for GIF Summer 2027 (27 July – 3 August 2027) is confirmed.`,
    "Participant preparation starts on 8 June 2027: payment, visa, travel, insurance and orientation. Your portal lists each step."],
  cta: { label: "Open onboarding", href: `${SITE()}/portal/onboarding` },
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
  cta: { label: "Open your portal", href: `${SITE()}/portal` },
});

// Server-only: emails the careers team about a new expression of interest (Resend). Sends only when RESEND_API_KEY and
// EMAIL_FROM are set (EMAIL_FROM must be on a domain verified in Resend, e.g. "IELSco <notifications@ielsco.com>").
// Without them it returns false and the form offers the visitor a prefilled mailto: link instead. Every interest is
// stored in public.opportunity_interests either way (Dashboard → Admin → Operations → Work abroad).
import { Resend } from "resend";

export const INTEREST_INBOX = process.env.OPPORTUNITY_INTEREST_TO || "careers@ielsco.com";

export interface InterestMail {
  id: string; title: string; country: string; partner: string | null; fullName: string; email: string; whatsapp: string;
  countryOfInterest: string; position: string; statement: string; occupation: string; experience: string; linkedin: string;
  hasCv: boolean; preferredContact: string; source: string;
}

export function interestEmailText(m: InterestMail) {
  const line = (k: string, v: string) => (v ? `${k}: ${v}\n` : "");
  return `New expression of interest (not an official application)\n\n`
    + line("Opportunity", m.title) + line("Country", m.country) + line("Recruitment partner", m.partner ?? "")
    + `\n` + line("Name", m.fullName) + line("Email", m.email) + line("WhatsApp", m.whatsapp) + line("Prefers", m.preferredContact)
    + line("Position", m.position) + line("Country of interest", m.countryOfInterest) + line("Current occupation", m.occupation)
    + line("LinkedIn", m.linkedin) + line("CV", m.hasCv ? "uploaded (open it in Admin → Operations → Work abroad)" : "")
    + (m.experience ? `\nExperience:\n${m.experience}\n` : "") + `\nStatement:\n${m.statement}\n\n`
    + `Submitted from the ${m.source === "dashboard" ? "member dashboard" : "public website"}. Reference ${m.id}.\n`;
}

export async function notifyInterest(m: InterestMail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const { error } = await new Resend(key).emails.send({
      from, to: [INTEREST_INBOX], replyTo: m.email,
      subject: `Work abroad interest: ${m.title} (${m.country}) – ${m.fullName}`,
      text: interestEmailText(m),
    });
    if (error) { console.error("[interest] email failed", error.name); return false; }
    return true;
  } catch (e) {
    console.error("[interest] email failed", (e as Error).name);
    return false;
  }
}

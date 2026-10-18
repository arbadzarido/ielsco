import LegalDoc, { COMPANY, CONTACT_EMAIL, WHATSAPP, type LegalSection } from "@/components/legal/LegalDoc";

export const metadata = {
  title: "Privacy Policy | IELSco",
  description: "How IELSco (PT English Space Berkah Indonesia) collects, uses, shares and protects member information.",
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#E56668] hover:underline">{CONTACT_EMAIL}</a>;

const sections: LegalSection[] = [
  { id: "collect", h: "Information we collect", body: <>
    <p><strong>Account information.</strong> Your name and email address, and a password (stored by our authentication provider in hashed form) or, if you sign in with Google, the name, email address and profile picture from your Google account.</p>
    <p><strong>Member profile.</strong> Details you add to your profile and dashboard, such as your profile photo, education or work background, goals and study or career destinations, interests, English level, saved items and, if you create one, your public portfolio.</p>
    <p><strong>Learning and participation.</strong> Registrations for events and programmes, check-ins to IELS Circle sessions, English test attempts and results, essays and other work you submit, and progress in IELSco programmes and resources.</p>
    <p><strong>Communications.</strong> Messages you send us by email or WhatsApp, and any feedback or requests you make.</p>
    <p><strong>Technical information.</strong> Standard information your browser sends (such as IP address, browser and device type) as recorded by our hosting provider, and error reports when something goes wrong on the website.</p>
    <p><strong>Optional Elco connection.</strong> If you connect your IELSco account to Elco AI, we store the link and, if you allow it, a short learning summary shared from Elco. You can disconnect at any time.</p>
  </> },
  { id: "use", h: "How we use your information", body: <ul>
    <li>To create and run your account and member dashboard.</li>
    <li>To run community features, events, IELS Circle sessions, programmes and resources, including registrations and check-ins.</li>
    <li>To deliver English tests and show your results, and to give personalised suggestions in your dashboard.</li>
    <li>To show your public portfolio or published member story when you have chosen to make it public.</li>
    <li>To communicate with you about your account, events and programmes you joined, and your requests.</li>
    <li>To keep the website secure, fix errors and improve our services.</li>
    <li>We do not sell your personal information.</li>
  </ul> },
  { id: "ai", h: "AI-assisted features", body: <>
    <p>Some features use AI providers to process the information needed for that feature: for example Google (Gemini) to help process English test results, and Anthropic (Claude) to generate personalised insights in your dashboard from your profile and activity. The provider processes the content to return a result; we do not send your password. These providers handle content under their own terms, which may allow limited retention, for example for abuse monitoring. AI output can be inaccurate, so treat it as guidance.</p>
  </> },
  { id: "stories", h: "Member stories and public content", body: <>
    <p>You can share your story with us through the questionnaire at circle.ielsco.com/stories/submit. We store your answers, your email address (only to contact you about your story), the photos you send and your choices on three separate consents: letting us review and publish your story on our website; showing your name, role, country and photos; and, separately, being contacted about an Instagram feature. Submitted photos are kept private and are seen only by our editors unless your story is published with your permission.</p>
    <p>Our editors may use an AI provider (Anthropic’s Claude, or Google’s Gemini as a fallback) to turn your answers into a first draft. The draft is based only on your answers; quotes must be your own words, and an editor reviews and edits every story. Your original answers are kept separately from the draft. Nothing is published automatically, and submitting does not guarantee publication.</p>
    <p>We publish member stories on our website only with the member’s permission, and only after our team has reviewed them. A published story may include the member’s name, country, role, photos and the story itself, as agreed with them. Published stories and public portfolios can be viewed by anyone and may be indexed by search engines.</p>
    <p>To ask for a correction to a story, or for a story or portfolio to be removed, contact us at {mail}. Removing content from our website does not remove copies already saved by others or by search engines, but we will remove it from our pages.</p>
  </> },
  { id: "photos", h: "Profile photos and uploaded files", body: <p>Profile photos you upload are stored in our file storage and shown in your profile and the community. They may be viewable by anyone who has the link. You can replace or remove your photo in your account. Other files you submit (for example essays) are used for the programme or feature you submitted them to.</p> },
  { id: "share", h: "Who we share information with", body: <>
    <p>We share information only as needed to run IELSco:</p>
    <ul>
      <li><strong>Service providers</strong>: Supabase (sign-in, database and file storage, including account emails), Vercel (website hosting), Sentry (error monitoring), Google (Google Sign-In and Gemini) and Anthropic (Claude), each only for the purpose described in this policy.</li>
      <li><strong>Mentors and programme staff</strong>, when you join a programme that involves them, limited to what they need to support you.</li>
      <li><strong>Other members</strong>, only for information you choose to make visible (such as a public portfolio).</li>
      <li><strong>Elco AI</strong>, only if you connect your accounts.</li>
      <li><strong>When required by law</strong>, to protect the safety of members or the public, or as part of a merger or transfer of the business, in which case this policy continues to apply.</li>
    </ul>
    <p>Our providers may store and process data in countries other than Indonesia.</p>
  </> },
  { id: "payments", h: "Payments", body: <p>The IELSco website does not currently take card or e-wallet payments. If a programme or event has a fee, payment is made through the method shown for that programme, and we do not store full card details.</p> },
  { id: "cookies", h: "Cookies and browser storage", body: <p>We use cookies and browser storage to keep you signed in and to remember settings. We do not use them for advertising.</p> },
  { id: "retention", h: "How long we keep information", body: <p>We keep your account information while your account is active and as long as needed to provide our services, keep records of events and programmes you joined, and meet legal obligations. When information is no longer needed we delete or anonymise it. Copies may remain for a limited time in backups and logs held by our providers until they are overwritten.</p> },
  { id: "security", h: "Security", body: <p>We use encryption in transit (HTTPS), access controls in our database so members can only access their own private records, and we keep privileged credentials on our servers. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p> },
  { id: "rights", h: "Your rights and choices", body: <>
    <p>You can update most of your information in your dashboard. You may also ask us to access, correct or delete your personal information, or withdraw consent you gave (for example to a published story or a public portfolio), including under Indonesia’s Personal Data Protection Law (Law No. 27 of 2022). Contact us at {mail}; we may need to confirm your identity first.</p>
  </> },
  { id: "children", h: "Children", body: <p>Our services are intended mainly for high school and university students and young professionals. We do not knowingly collect information from children under 13. If you believe a child has given us information without a parent’s or guardian’s consent, contact us and we will delete it.</p> },
  { id: "links", h: "Links to other websites", body: <p>Our website links to other sites, such as scholarship portals, partner organisations and Elco AI. Their privacy practices are their own; please read their policies.</p> },
  { id: "changes", h: "Changes to this policy", body: <p>We will update this page when our practices change and update the “Last updated” date.</p> },
  { id: "contact", h: "Contact", body: <>
    <p>{COMPANY} (IELSco)</p>
    <p>Email: {mail} · WhatsApp: <a href={WHATSAPP.href} className="font-semibold text-[#E56668] hover:underline" target="_blank" rel="noopener noreferrer">{WHATSAPP.label}</a></p>
  </> },
];

export default function PrivacyPolicyPage() {
  return <LegalDoc title="Privacy Policy" sections={sections} other={{ href: "/terms-of-service", label: "Terms of Service" }}
    intro={<p>This policy explains how <strong>{COMPANY}</strong> (“IELSco”, “we”, “us”) handles personal information when you use ielsco.com and its community, dashboard, events and programmes. Elco AI is a separate product with its own privacy policy at ai.ielsco.com/privacy.</p>} />;
}

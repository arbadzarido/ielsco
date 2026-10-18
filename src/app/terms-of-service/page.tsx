import Link from "next/link";
import LegalDoc, { COMPANY, CONTACT_EMAIL, type LegalSection } from "@/components/legal/LegalDoc";

export const metadata = {
  title: "Terms of Service | IELSco",
  description: "The terms for using IELSco: membership, community conduct, events and programmes, content and member stories.",
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#E56668] hover:underline">{CONTACT_EMAIL}</a>;

const sections: LegalSection[] = [
  { id: "about", h: "About IELSco", body: <p>IELSco is a community that connects Southeast Asian learners with people, resources, programmes and study and work opportunities. It includes the ielsco.com website, the member dashboard, IELS Circle, events, programmes and learning resources (the “Services”).</p> },
  { id: "accounts", h: "Your account", body: <ul>
    <li>Give accurate information and keep your sign-in details secure. You are responsible for activity on your account.</li>
    <li>Our Services are intended for people aged 13 and over. If you are under the age of adulthood where you live, use them with a parent’s or guardian’s permission.</li>
    <li>Tell us at {mail} if you think someone else has used your account.</li>
  </ul> },
  { id: "conduct", h: "Community conduct", body: <>
    <p>IELSco is a supportive learning community. You agree not to:</p>
    <ul>
      <li>harass, bully, discriminate against or threaten other members, mentors or staff;</li>
      <li>post or share illegal, hateful, sexually explicit or misleading content, spam, or other people’s personal information without permission;</li>
      <li>impersonate others, misuse events or programmes, or try to access other members’ data or disrupt the Services.</li>
    </ul>
    <p>We may remove content or limit access to protect the community.</p>
  </> },
  { id: "events", h: "Events, programmes and opportunities", body: <p>Event and programme details, schedules and availability can change. Registering does not always guarantee a place where places are limited. Opportunities we share (such as scholarships, jobs or study programmes) come from third parties; we do not guarantee selection or outcomes, and their own terms apply.</p> },
  { id: "content", h: "Your content", body: <p>You keep ownership of the content you submit, such as essays, portfolio content and stories. You give us permission to store and use it as needed to provide the Services to you, for example to show it in your dashboard or, where you have chosen, on your public portfolio. We do not claim ownership of your content.</p> },
  { id: "stories", h: "Member stories", body: <>
    <p>You can submit your story through our questionnaire. You confirm that what you send is true, is your own experience, and that you have the right to share the photos (including permission from people shown in them). Submissions are reviewed by our team before anything is published; an editor may use AI to prepare a first draft from your answers, and every story is checked and edited by a person.</p>
    <p>Consent is given separately for (1) review and publication on our website, (2) showing your name, role, country and photos, and (3) being contacted about an Instagram feature. Agreeing to one does not mean agreeing to the others, and we will not post your story on Instagram without asking you first.</p>
    <p>Member stories are published only with the member’s permission and after review by our team. Sharing your story with us does not guarantee that it will be published, and we may edit a story for clarity and length while keeping its meaning. You can ask us to correct or remove your submission or published story at any time by contacting {mail}.</p>
  </> },
  { id: "ai", h: "AI-assisted features", body: <p>Some features use AI, for example personalised insights in your dashboard and help with test results. AI output may be inaccurate or incomplete and is guidance only, not a guarantee of results or professional advice.</p> },
  { id: "education", h: "Educational guidance", body: <p>Our mentors, resources and community provide educational support and information. They are not legal, immigration, financial or professional advice, and we do not guarantee admission, scholarships, employment or test scores.</p> },
  { id: "payments", h: "Fees", body: <p>Many IELSco Services are free. Where a programme or event has a fee, the price and any conditions are shown for that programme before you register, and apply in addition to these terms.</p> },
  { id: "elco", h: "Elco AI", body: <p>Elco AI is a separate product with its own <a href="https://ai.ielsco.com/terms" className="underline">Terms of Service</a> and <a href="https://ai.ielsco.com/privacy" className="underline">Privacy Policy</a>. Connecting your IELSco and Elco accounts is optional.</p> },
  { id: "ip", h: "Our intellectual property", body: <p>The IELSco name, logos, website, materials and content we create belong to us or our licensors. You may use our learning materials for your own learning, but not copy or redistribute them commercially without permission.</p> },
  { id: "availability", h: "Availability and changes", body: <p>We work to keep the Services available, but they may change or be interrupted. We may update or discontinue features.</p> },
  { id: "end", h: "Suspension and termination", body: <p>You can stop using the Services at any time and ask us to delete your account. We may suspend or end access for members who break these terms or put others at risk; where reasonable, we will tell you why.</p> },
  { id: "liability", h: "Disclaimers and liability", body: <p>The Services are provided “as is”. To the extent the law allows, we are not liable for indirect or consequential losses, or for decisions made based on information or opportunities shared in the community. Nothing in these terms limits liability that cannot be limited by law, or your rights as a consumer.</p> },
  { id: "law", h: "Governing law and disputes", body: <p>These terms are governed by the laws of the Republic of Indonesia. If you have a concern, please contact us first at {mail} so we can try to resolve it informally.</p> },
  { id: "updates", h: "Updates to these terms", body: <p>We may update these terms and will change the “Last updated” date. Continuing to use the Services after an update means you accept the updated terms. See also our <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p> },
  { id: "contact", h: "Contact", body: <p>{COMPANY} (IELSco) · {mail}</p> },
];

export default function TermsOfServicePage() {
  return <LegalDoc title="Terms of Service" sections={sections} other={{ href: "/privacy-policy", label: "Privacy Policy" }}
    intro={<p>These terms apply to your use of IELSco, provided by <strong>{COMPANY}</strong> (“IELSco”, “we”, “us”). By creating an account or using our Services you agree to them.</p>} />;
}

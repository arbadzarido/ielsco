import React from "react";

export const metadata = {
  title: "Privacy Policy | IELS",
  description: "Comprehensive Privacy Policy, data handling, and compliance practices for the IELS Community.",
};

export default function ComprehensivePrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-16 px-4 sm:px-8 lg:px-16 font-sans">
      <div className="max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-sm border border-[#EAEAEA]">
        
{/* Header Section */}
        <div className="border-b border-gray-200 pb-10 mb-10">
          
          {/* Logo IELS */}
          <div className="mb-8">
            <img 
              src="/images/logos/iels_blue1.png" /* Ganti nama file ini dengan logo IELS kamu yang berwarna gelap */
              alt="IELS Community Logo" 
              className="h-12 w-auto object-contain" /* h-12 membuat tingginya pas dan rapi */
            />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-[#294154] tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-500 font-medium text-lg">
            Last Updated & Effective Date: February 21, 2026
          </p>
          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-800 rounded-r-lg">
            <strong>OUR COMMITMENT TO YOUR PRIVACY:</strong> IELS Community is committed to safeguarding your personal data in compliance with applicable data protection regulations, including the Indonesian Personal Data Protection Law (UU PDP). This document comprehensively details how your information is collected, processed, and protected.
          </div>
        </div>
        {/* Content Section */}
        <div className="space-y-12 text-[#4A5568] leading-relaxed text-sm md:text-base">
          
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">1. Introduction</h2>
            <p className="mb-3">
              Welcome to IELS ("we," "our," or "us"). We operate the website www.ielsco.com and provide subscription-based English mentorship, community learning platforms, and offline educational events (collectively, the "Services").
            </p>
            <p>
              This Privacy Policy describes our policies and procedures on the collection, use, and disclosure of your information when you use the Service and tells you about your privacy rights and how the law protects you. By using our Services, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
          </section>

          {/* 2. Comprehensive Data Collection */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">2. The Information We Collect</h2>
            <p className="mb-3">We collect several different types of information to provide and improve our Service to you:</p>
            
            <h3 className="text-lg font-bold text-[#294154] mt-6 mb-2">A. Information You Provide Directly</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Account & Profile Data:</strong> Full name, email address, password, educational background (High School/University), age, and phone number.</li>
              <li><strong>Learning & Mentorship Data:</strong> Career goals, English proficiency levels, scholarship aspirations, and answers provided during personalized mentor-matching surveys.</li>
              <li><strong>Financial Information:</strong> If you purchase a subscription or event ticket, payment details are processed securely by our third-party payment processors. IELS does not directly store sensitive credit card or e-wallet PINs.</li>
              <li><strong>Communications & HR Support:</strong> Records of your communications with us, including interactions with our HR 911 Support, customer service requests, and feedback forms.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#294154] mt-6 mb-2">B. Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Device & Usage Data:</strong> Internet Protocol (IP) address, browser type, operating system, pages visited, time spent on pages, and diagnostic data.</li>
              <li><strong>Cookies & Tracking Technologies:</strong> We use cookies, web beacons, and similar tracking technologies to track activity on our Service and store certain session information to enhance your user experience.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#294154] mt-6 mb-2">C. Audio & Video Data (EdTech Specific)</h3>
            <p>
              During online classes, Speaking Clubs, and workshops, we may record audio and video sessions for quality assurance, educational review, and promotional purposes. You will always be notified prior to the recording of any session.
            </p>
          </section>

          {/* 3. Google Workspace APIs User Data Policy */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">3. Google Workspace APIs & Third-Party Auth</h2>
            <p className="mb-3">
              If you choose to register or log in using third-party authentication services, such as Google Sign-In, we will collect your name, email address, and profile picture associated with that account.
            </p>
            <div className="bg-[#F7F8FA] p-5 rounded-xl border border-gray-200">
              <p className="font-semibold text-[#294154] mb-2">Strict Adherence to Google API Policies:</p>
              <p className="text-sm">
                IELS's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-[#E56668] hover:underline font-medium">Google API Services User Data Policy</a>, including the <strong>Limited Use</strong> requirements. We explicitly guarantee that we do not sell, share, or use your Google user data for serving personalized advertisements or unauthorized tracking.
              </p>
            </div>
          </section>

          {/* 4. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">4. How We Use Your Information</h2>
            <ul className="list-decimal pl-6 space-y-3">
              <li><strong>Service Delivery:</strong> To create your account, process subscriptions, and grant access to the IELS dashboard and mentorship modules.</li>
              <li><strong>Personalization:</strong> To utilize our algorithm for accurate mentor matching and to tailor learning materials to your specific goals (e.g., remote work preparation or scholarship applications).</li>
              <li><strong>Community Management:</strong> To facilitate interactions within the IELS community, manage event registrations (such as the English Global Festival or Singapore Insight Trip), and enforce our Community Guidelines.</li>
              <li><strong>Safety & Support:</strong> To provide emotional and administrative support via our HR team, prevent fraudulent activities, and secure our platform against unauthorized access.</li>
              <li><strong>Analytics & Improvement:</strong> To analyze usage patterns, optimize our website's performance, and develop new educational products.</li>
            </ul>
          </section>

          {/* 5. Sharing and Disclosure of Data */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">5. Sharing & Disclosure of Data</h2>
            <p className="mb-3"><strong>We never sell your personal data.</strong> We only share your data under the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>With Mentors:</strong> We share your learning goals and proficiency level with your assigned mentor. Mentors are strictly prohibited from using your data outside the IELS platform.</li>
              <li><strong>With Service Providers:</strong> We employ third-party companies (e.g., Supabase for database management, Resend for transactional emails, hosting providers) to facilitate our Service. These entities are legally bound to protect your data and only process it according to our instructions.</li>
              <li><strong>For Legal Reasons:</strong> We may disclose your information if required to do so by law, court order, or governmental request, or to protect the rights, property, and safety of IELS, our users, or the public.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, your Personal Data may be transferred. We will provide notice before your data is transferred and becomes subject to a different Privacy Policy.</li>
            </ul>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">6. Data Retention</h2>
            <p>
              IELS will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations (for example, to resolve disputes, enforce our legal agreements, and maintain accurate financial records for tax purposes). Usage Data is generally retained for a shorter period, except when this data is used to strengthen the security or improve the functionality of our Service.
            </p>
          </section>

          {/* 7. Security of Your Data */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">7. Security of Your Data</h2>
            <p>
              The security of your Personal Data is vital to us. We implement robust, industry-standard security protocols, including encryption in transit (HTTPS/SSL) and at rest, to protect your data from unauthorized access. However, please remember that no method of transmission over the Internet, or method of electronic storage, is completely secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security.
            </p>
          </section>

          {/* 8. Children's Privacy (Crucial for EdTech) */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">8. Children's Privacy</h2>
            <p>
              Our Services are primarily intended for high school and university students. We do not knowingly collect personally identifiable information from children under the age of 13. If you are a parent or guardian and you are aware that your child has provided us with Personal Data without your consent, please contact us immediately. If we become aware that we have collected Personal Data from anyone under the age of 13 without verification of parental consent, we will take steps to remove that information from our servers.
            </p>
          </section>

          {/* 9. Your Privacy Rights */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">9. Your Privacy Rights</h2>
            <p className="mb-3">Depending on your jurisdiction and under the Indonesian Personal Data Protection Law, you possess specific rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Right to Access:</strong> You can request copies of your personal data held by us.</li>
              <li><strong>Right to Rectification:</strong> You can request that we correct any information you believe is inaccurate or complete information you believe is incomplete via your dashboard.</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> You have the right to request that we permanently delete your account and personal data, subject to certain legal exceptions.</li>
              <li><strong>Right to Withdraw Consent:</strong> You may withdraw your consent to our processing of your data at any time (e.g., opting out of marketing emails). Note that withdrawing consent does not affect the lawfulness of processing based on consent before its withdrawal.</li>
            </ul>
          </section>

          {/* 10. Links to Other Websites */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">10. Links to Other Websites</h2>
            <p>
              Our Service may contain links to other websites that are not operated by us (e.g., scholarship portals, external learning resources). If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
            </p>
          </section>

          {/* 11. Changes to this Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">11. Changes to this Privacy Policy</h2>
            <p>
              We may update Our Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* 12. Contact Us */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have any questions, requests, or concerns regarding this Privacy Policy or how your data is handled, please contact our Data Protection Officer / Support Team:
            </p>
            <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-gray-200">
              <p className="font-bold text-[#294154] text-lg mb-2">IELS Legal & Data Support</p>
              <p className="mb-1"><span className="font-semibold">Email:</span> <a href="mailto:support@ielsco.com" className="text-[#E56668] hover:underline">support@ielsco.com</a></p>
              <p><span className="font-semibold">Community Support (WhatsApp):</span> +62 882-9725-3491</p>
              <p className="mt-4 text-sm text-gray-500">IELS Headquarters, Jakarta, Indonesia</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
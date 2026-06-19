import React from "react";

export const metadata = {
  title: "Terms of Service | IELS",
  description: "Comprehensive Terms of Service, user agreements, and legal disclaimers for the IELS Community.",
};

export default function ComprehensiveToSPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-16 px-4 sm:px-8 lg:px-16 font-sans">
      <div className="max-w-5xl mx-auto bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-sm border border-[#EAEAEA]">
        
        {/* Header Section */}
        
        <div className="border-b border-gray-200 pb-10 mb-10">
                     <div className="mb-8">
            <img 
              src="/images/logos/iels_blue1.png" /* Ganti nama file ini dengan logo IELS kamu yang berwarna gelap */
              alt="IELS Community Logo" 
              className="h-12 w-auto object-contain" /* h-12 membuat tingginya pas dan rapi */
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#294154] tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-500 font-medium text-lg">
            Last Updated & Effective Date: February 21, 2026
          </p>
          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-800 rounded-r-lg">
            <strong>PLEASE READ CAREFULLY:</strong> These Terms of Service constitute a legally binding agreement between you and IELS. By registering for an account, purchasing a subscription, or participating in our community events, you agree to be bound by these terms.
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-12 text-[#4A5568] leading-relaxed text-sm md:text-base">
          
          {/* 1. Definitions */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>"IELS", "we", "us", or "our"</strong> refers to IELS Community, an Indonesian-based EdTech platform.</li>
              <li><strong>"User", "you", or "your"</strong> refers to any individual who accesses the website, creates an account, or utilizes our services.</li>
              <li><strong>"Platform"</strong> refers to the ielsco.com website, associated subdomains, applications, and any software provided by IELS.</li>
              <li><strong>"Services"</strong> encompasses our subscription-based mentorship classes, mentor matching systems, goal-setting features, speaking clubs, offline events (e.g., global campus visits, expeditions), and HR support programs.</li>
              <li><strong>"Mentor"</strong> refers to individuals engaged by IELS to provide guidance, feedback, and educational support to Users.</li>
            </ul>
          </section>

          {/* 2. Account Registration and Security */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">2. Account Registration & Security</h2>
            <p className="mb-3">To access our core Services, you must register for an account. By registering, you agree to:</p>
            <ul className="list-decimal pl-6 space-y-3">
              <li>Provide accurate, current, and complete information, particularly regarding your educational status (High School or University).</li>
              <li>Maintain the security of your password and authentication credentials. We support third-party authentication (e.g., Google OAuth). You are solely responsible for the security of your third-party accounts.</li>
              <li>Immediately notify IELS of any unauthorized use of your account. We will not be liable for any loss or damage arising from your failure to protect your login information.</li>
            </ul>
          </section>

          {/* 3. Subscription, Billing, and Mentorship Services */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">3. Subscriptions & Mentorship Services</h2>
            <p className="mb-3">IELS operates primarily on a subscription-based model tailored to your personalized goals.</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Billing Cycle:</strong> Subscriptions are billed in advance on a recurring basis. All fees are stated in Indonesian Rupiah (IDR) unless otherwise noted.</li>
              <li><strong>Mentor Matching:</strong> Our matching system pairs you with mentors based on the goals and preferences you provide. While we strive for the highest accuracy, we do not guarantee that a specific mentor will always be available.</li>
              <li><strong>Cancellations & Refunds:</strong> You may cancel your subscription at any time through your dashboard. Cancellations will take effect at the end of the current billing cycle. Payments are strictly <strong>non-refundable</strong> unless required by Indonesian consumer protection laws.</li>
            </ul>
          </section>

          {/* 4. Community Events, Competitions, and Offline Activities */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">4. Events, Competitions & Offline Activities</h2>
            <p className="mb-3">IELS frequently hosts online and offline events, including but not limited to Speaking Clubs, the English Global Festival, and International Insight Trips.</p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Competitions & Prizes:</strong> For events involving prize pools (cash, scholarships, or in-kind value), IELS reserves the right to distribute prizes at our sole discretion based on the criteria established by our judging panels. Tax liabilities associated with cash prizes are the sole responsibility of the winner.</li>
              <li><strong>Offline Events Liability:</strong> Participation in physical events, travel, or campus visits (domestic or international) may require you to sign separate waivers and liability releases. IELS is not responsible for personal injury, loss of property, or travel disruptions during these events.</li>
            </ul>
          </section>

          {/* 5. HR 911 Support Scope */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">5. Scope of Community Support</h2>
            <p>
              IELS provides a feature known as "Community Support" managed by our Community team. You acknowledge and agree that this program is strictly for <strong>emotional and motivational support</strong> related to your learning journey and community integration. 
            </p>
            <p className="mt-2 font-semibold text-red-600">
              Disclaimer: The Community Support program does not provide professional psychological, medical, or psychiatric therapy, nor is it a crisis hotline for life-threatening emergencies. If you are experiencing a medical or psychological emergency, you must contact local emergency services immediately.
            </p>
          </section>

          {/* 6. Community Culture and Conduct */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">6. Community Culture and Conduct</h2>
            <p className="mb-3">Our platform is rooted in a culture of "giving back" and mutual respect. You agree <strong>NOT</strong> to use the Services to:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Upload, post, or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, or invasive of another's privacy.</li>
              <li>Exploit our platform to distribute unsolicited promotional material, spam, or unauthorized advertising.</li>
              <li>Attempt to bypass, disable, or interfere with security-related features of the Platform.</li>
              <li>Disrespect Mentors or peers during classes or community gatherings. IELS holds a zero-tolerance policy for discrimination based on race, religion, gender, or educational background.</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or permanently ban any user who violates these guidelines, without a refund.</p>
          </section>

          {/* 7. Intellectual Property Rights */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">7. Intellectual Property Rights</h2>
            <p className="mb-3">
              <strong>IELS Content:</strong> All content included on the Platform, such as educational modules, blueprints, text, graphics, logos, images, and software, is the property of IELS or its content suppliers and protected by Indonesian and international copyright laws. You may not reproduce, distribute, or create derivative works without our express written consent.
            </p>
            <p>
              <strong>User Content:</strong> By submitting assignments, feedback, or participating in recorded speaking sessions, you grant IELS a non-exclusive, worldwide, royalty-free license to use, reproduce, and display such content for educational and promotional purposes.
            </p>
          </section>

          {/* 8. Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">8. Third-Party Services</h2>
            <p>
              Our Platform utilizes third-party services for infrastructure, authentication, and communication (e.g., Supabase, Google Cloud, and email delivery services). Your interactions with these third-party services are governed by their respective terms of service and privacy policies. IELS is not responsible for any outages, data breaches, or failures originating from these third-party providers.
            </p>
          </section>

          {/* 9. Disclaimers and Limitations of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">9. Disclaimers & Limitation of Liability</h2>
            <p className="mb-3 uppercase font-semibold">The Services are provided "As Is" and "As Available."</p>
            <p className="mb-3">
              IELS makes no warranties, expressed or implied, regarding the effectiveness of our educational programs. While we equip you for global opportunities, we do not guarantee specific outcomes, such as securing remote work, passing English proficiency tests, winning scholarships, or gaining university admissions.
            </p>
            <p>
              To the maximum extent permitted by applicable law, in no event shall IELS, its Founders, Principals, employees, or Mentors be liable for any indirect, punitive, incidental, special, or consequential damages arising out of or in any way connected with the use of our Services.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">10. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the Republic of Indonesia. Any disputes arising from or relating to these Terms or the Services shall be subject to the exclusive jurisdiction of the courts located in Jakarta, Indonesia.
            </p>
          </section>

          {/* 11. Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-[#294154] mb-4">11. Contact Information</h2>
            <p className="mb-4">
              If you have any questions, legal concerns, or require clarification regarding these Terms of Service, please contact us at:
            </p>
            <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-gray-200">
              <p className="font-bold text-[#294154] text-lg mb-2">IELS Legal & Community Support</p>
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
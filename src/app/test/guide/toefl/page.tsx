"use client";

// src/app/test/guide/page.tsx
/* Server component (App Router) */
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";

export default function TestGuidePage() {
  const pdfUrl = "https://forms.gle/yFCdzbeR8uMBzM5X8"; // <-- replace with your Drive link

  return (
    <div className="min-h-screen bg-white text-[#294154] antialiased">

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20 space-y-10">
        {/* Intro / Hero */}
        <section className="bg-gradient-to-b from-white to-[#fffaf6] rounded-2xl p-8 lg:p-12 shadow-sm border border-[#294154]/6">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight">
                IELS Official Test Guide
              </h1>
              <p className="mt-3 text-gray-700 max-w-2xl">
                Before you begin your IELS mock test, please read this official guide.
                It explains test format, timing, rules, technical requirements, how scoring works,
                and how to claim your certificate. Follow the guide closely to avoid issues on test day.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-[#E56668] text-white px-5 py-3 rounded-full font-semibold hover:bg-[#cc4f54] transition"
                >
                  📘 View Test Guide (PDF)
                </a>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 border border-[#294154] text-[#294154] px-5 py-3 rounded-full font-semibold hover:bg-[#294154] hover:text-white transition"
                >
                  🖨 Print Guide
                </button>

                <Link
                  href="/test/access"
                  className="inline-flex items-center gap-2 bg-[#294154] text-white px-5 py-3 rounded-full font-semibold hover:bg-[#1f3344] transition"
                >
                  🔐 Start Test / Enter Access Code
                </Link>
              </div>

              <p className="mt-3 text-sm text-gray-500">
                Note: Registration & payment are handled externally. Use the access code you received to start the test.
              </p>
            </div>

            <div className="w-full lg:w-1/3">
              <div className="relative rounded-xl overflow-hidden border border-[#294154]/10 bg-white p-4">
                <Image
                  src="/images/contents/general/test_guide_cover.png"
                  alt="IELS Test Guide cover"
                  width={600}
                  height={420}
                  className="w-full h-auto object-cover rounded-md"
                  priority
                />
                <div className="mt-3 text-xs text-gray-600">Official IELS Test Guide — concise handbook</div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick summary */}
        <section className="rounded-2xl p-6 lg:p-8 shadow-sm border border-[#294154]/6 bg-white">
          <h2 className="text-2xl font-bold mb-4">Quick Test Summary</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard title="Test Flow" desc="Access → Complete Sections (Listening, Reading, Writing) → Submit → Receive Result" />
            <SummaryCard title="Typical Duration" desc="Listening: 30 min · Reading: 60 min · Writing: 60 min" />
            <SummaryCard title="What You Need" desc="Stable internet, a quiet room, modern browser (Chrome/Edge), and access code." />
          </div>
        </section>

        {/* Detailed sections */}
        <section className="space-y-8">
          {/* Format & Timing */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">Test Format & Timing</h3>

            <p className="text-gray-700 mb-3">
              The IELS mock test simulates the real exam structure focusing on practical English skills. For the MVP release we currently support:
            </p>

            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>
                <strong>Listening</strong> — 30 minutes. Listen and answer multiple-choice or short-response questions.
              </li>
              <li>
                <strong>Reading</strong> — 60 minutes. Comprehension passages with multiple choice and short answers.
              </li>
              <li>
                <strong>Writing</strong> — 60 minutes. Two tasks: Task 1 (short report/summary), Task 2 (essay).
              </li>
            </ul>

            <p className="mt-4 text-sm text-gray-600">
              Important: Complete sections in order. Timers start as soon as you open each section. The system saves answers locally and submits them when you finish the final section.
            </p>
          </article>

          {/* Rules & Conduct */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">Rules & Test Conduct</h3>

            <ol className="list-decimal pl-5 text-gray-700 space-y-2">
              <li><strong>One device only:</strong> Use a single computer/laptop. Mobile is not recommended.</li>
              <li><strong>No external help:</strong> Do not use translators, other people, or external materials during the test.</li>
              <li><strong>No navigation away:</strong> Avoid switching tabs or windows — this may invalidate your test attempt.</li>
              <li><strong>Honesty:</strong> Any evidence of academic misconduct or system manipulation will lead to invalidation.</li>
              <li><strong>Timing:</strong> Each section has a strict timer. Once it reaches zero you will be auto-submitted.</li>
            </ol>
          </article>

          {/* Technical requirements */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">Technical Requirements</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div>
                <h4 className="font-semibold mb-2">Recommended setup</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Desktop or laptop (Windows / macOS)</li>
                  <li>Latest Chrome or Edge browser (ensure updates are installed)</li>
                  <li>Stable internet connection (min 5 Mbps)</li>
                  <li>Disable VPN & ad-blockers during the test</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Before the test</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Charge your device and close unused apps</li>
                  <li>Use headphones for Listening if available</li>
                  <li>Allow popups and localStorage for ielsco.com</li>
                  <li>Run a quick connectivity check (ping/troubleshoot)</li>
                </ul>
              </div>
            </div>
          </article>

          {/* Scoring & Certificate */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">Scoring & Certificate</h3>

            <p className="text-gray-700 mb-3">
              After submission, your answers are recorded and the IELS team will process results. The current MVP will provide a confirmation email and our teachers will give feedback for writing sections.
            </p>

            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li><strong>Result delivery:</strong> You will receive an email confirmation that your test was submitted successfully. Teachers will provide feedback within 24–72 hours.</li>
              <li><strong>Certificate:</strong> A completion confirmation or certificate (if applicable) will be issued per event policy — check the email instructions for claiming it.</li>
              <li><strong>Data retention:</strong> We may store anonymized responses for quality & improvement. Individual data is not shared without consent.</li>
            </ul>
          </article>

          {/* Submission & Troubleshooting */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">Submission & Troubleshooting</h3>

            <p className="text-gray-700 mb-2">
              If you encounter errors during submission (network error, JSON parse error, etc.), please follow these steps:
            </p>

            <ol className="list-decimal pl-5 text-gray-700 space-y-2">
              <li>Check your internet connection and try to re-submit. The client tries to save answers in <code>localStorage</code>.</li>
              <li>If the app shows a server error, take a screenshot of the console/network error and contact support (see below).</li>
              <li>If submission fails permanently, send the saved answers (JSON) and your access details to our support email. We will record and process manually.</li>
            </ol>
          </article>

          {/* FAQ */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">FAQ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <details className="p-4 rounded-lg border border-gray-100">
                <summary className="font-semibold cursor-pointer">Can I pause the test?</summary>
                <p className="mt-2 text-sm">No — timers are strict per section. If you need accommodation, contact us before your test day.</p>
              </details>

              <details className="p-4 rounded-lg border border-gray-100">
                <summary className="font-semibold cursor-pointer">What if my browser crashes?</summary>
                <p className="mt-2 text-sm">If your browser closes unexpectedly, reopen the test page and try to resume — some answers are stored locally. If you can’t resume, contact support and provide details.</p>
              </details>

              <details className="p-4 rounded-lg border border-gray-100">
                <summary className="font-semibold cursor-pointer">Who reviews my Writing tasks?</summary>
                <p className="mt-2 text-sm">Our IELTS specialists (and sometimes AI tools for preliminary checks) review writing. You’ll receive personalized feedback in the result email.</p>
              </details>

              <details className="p-4 rounded-lg border border-gray-100">
                <summary className="font-semibold cursor-pointer">How do I claim my certificate?</summary>
                <p className="mt-2 text-sm">Follow the instructions in your result email. Certificates (if applicable) are provided after verification and usually within 5 working days.</p>
              </details>
            </div>
          </article>

          {/* Contact */}
          <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
            <h3 className="text-xl font-semibold mb-3">Need help?</h3>

            <p className="text-gray-700 mb-4">
              If you experience issues or have questions, contact our support team:
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a className="inline-flex items-center gap-3 p-4 rounded-lg border border-[#294154]/8 hover:shadow-sm transition"
                 href="mailto:support@ielsco.com">
                <span className="font-semibold">📧 Email</span>
                <span className="text-gray-600">support@ielsco.com</span>
              </a>

              <a className="inline-flex items-center gap-3 p-4 rounded-lg border border-[#294154]/8 hover:shadow-sm transition"
                 href="https://wa.me/6288297253491" target="_blank" rel="noreferrer">
                <span className="font-semibold">📱 WhatsApp</span>
                <span className="text-gray-600">+62 882-9725-3491</span>
              </a>

              <div className="p-4 rounded-lg border border-[#294154]/8">
                <div className="font-semibold">🕘 Support hours</div>
                <div className="text-gray-600 text-sm">Mon–Fri, 09:00–17:00 (WIB)</div>
              </div>
            </div>
          </article>
        </section>

        {/* Footer CTA */}
        <section className="bg-[#294154] text-white rounded-2xl p-6 lg:p-8 text-center">
          <h4 className="text-xl font-bold">Ready to take the test?</h4>
          <p className="mt-2 text-white/90 max-w-2xl mx-auto">Make sure your details match the registration and that you are in a comfortable, quiet place. Good luck — you’ve got this!</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/test/access" className="bg-white text-[#294154] px-5 py-2 rounded-full font-semibold hover:bg-[#f1f5f9] transition">
              Enter Access Code & Start
            </Link>

            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-[#E56668] px-5 py-2 rounded-full font-semibold hover:bg-[#cc4f54] transition">
              Download PDF
            </a>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

/* Small helper components (pure presentational) */

function SummaryCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#294154]/8 shadow-sm">
      <div className="font-semibold text-[#294154]">{title}</div>
      <div className="text-sm text-gray-700 mt-2">{desc}</div>
    </div>
  );
}
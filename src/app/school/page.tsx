"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import CountUp from "react-countup";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, BarChart3, BellRing, FileCheck2, Target, Users2, Globe2, Award, ChevronRight, ArrowRight } from "lucide-react";


/**
 * IELS for Schools Landing Page
 * - Place in: src/app/schools/page.tsx
 * - Replace PDF links and contact details in the constants below as needed.
 */

const COLORS = {
  primary: "#294154", 
  accent: "#E56668", 
  accentDark: "#C04C4E",
};

const LINKS = {
  programOverview: "https://bit.ly/IELSforSchoolsOverview", // replace
  curriculumGuide: "https://bit.ly/IELSCurriculumGuide", // replace
  teacherGuide: "https://bit.ly/IELSTeacherTraining", // replace
  loungeGuide: "https://bit.ly/IELSLoungeGuide", // replace
  dashboardPreview: "https://bit.ly/IELSDashboardPreview", // replace
  caseStudies: "https://bit.ly/IELSCaseStudies", // replace
};

/* Contact (Principal) */
const PRINCIPAL = {
  name: "Arbadza Rido Adzariyat",
  email: "arbadza@ielsco.com",
  phone: "+62 882-9725-3491",
};

type InquiryFormState = {
  institution: string;
  contactName: string;
  position: string;
  email: string;
  phone: string;
  students?: string;
  startDate?: string;
  interest: string;
  message?: string;
};

// ── GRS Component data ────────────────────────────────────────────────────────
const GRS_COMPONENTS = [
  { label: "Speaking Fluency",    pct: 25, color: "#E56668" },
  { label: "Writing Accuracy",    pct: 20, color: "#294154" },
  { label: "Reading Comprehension", pct: 20, color: "#4f8ef7" },
  { label: "Listening Precision", pct: 15, color: "#10b981" },
  { label: "Vocabulary Depth",    pct: 10, color: "#f59e0b" },
  { label: "Global Engagement",   pct: 10, color: "#8b5cf6" },
];
// ── Dual-tab content ──────────────────────────────────────────────────────────
const TAB_CONTENT = {
  schools: {
    headline: "Stop Grading. Start Mentoring.",
    sub: "AI handles the heavy lifting — lesson paths, assessments, and progress tracking — so your teachers can focus on what they do best: inspire.",
    features: [
      {
        icon: Brain,
        title: "AI-Powered Learning Orchestration",
        desc: "Our AI automatically adapts each student's path based on their declared goal — Scholarship, University Abroad, or Remote Career — without teachers building materials manually.",
      },
      {
        icon: BarChart3,
        title: "Zero-Manual Assessment Dashboard",
        desc: "Monitor every student's Global Readiness Score in real time. AI grades speaking exercises and writing tasks automatically. One dashboard, full visibility.",
      },
      {
        icon: BellRing,
        title: "Smart Intervention Alerts",
        desc: "The system auto-flags students falling behind and recommends specific improvement activities. Proactive, not reactive.",
      },
      {
        icon: FileCheck2,
        title: "Accreditation-Ready Reporting",
        desc: "Export structured, data-backed student development reports that satisfy national accreditation bodies — generated in minutes, not days.",
      },
    ],
  },
  students: {
    headline: "Don't Just Learn. Get Ready.",
    sub: "Every lesson, every drill, every score is engineered around one goal: making you undeniably ready for the global stage.",
    features: [
      {
        icon: Target,
        title: "Goal-Driven Learning Pathways",
        desc: "Choose your track: Scholarship Readiness, Overseas University, or Remote Career. Every lesson is calibrated to your destination — not a generic syllabus.",
      },
      {
        icon: Users2,
        title: "Daily Peer-Led Ecosystem",
        desc: "Practice speaking every day with a community of equally ambitious peers. Real conversations, real feedback — not just textbook theory.",
      },
      {
        icon: Award,
        title: "Verifiable Skill Ledger",
        desc: "Build a data-backed talent profile that proves your abilities to universities and global employers. Your GRS speaks louder than a grade.",
      },
      {
        icon: Globe2,
        title: "Global Exposure & Opportunities",
        desc: "Access direct connections to international partner universities, scholarship networks, and remote career opportunities through the IELS ecosystem.",
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function SchoolsPage() {
  const [activeTab, setActiveTab] = useState<"schools" | "students">("schools");  

  const [form, setForm] = useState<InquiryFormState>({
    institution: "",
    contactName: "",
    position: "",
    email: "",
    phone: "",
    students: "",
    startDate: "",
    interest: "Pilot Program",
    message: "",
  });

  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    k: keyof InquiryFormState,
    v: string | undefined
  ) => {
    setForm((p) => ({ ...p, [k]: v ?? "" }));
  };

  const validateRequired = () => {
    if (!form.institution.trim()) return "Please enter your institution name.";
    if (!form.contactName.trim()) return "Please enter contact name.";
    if (!form.position.trim()) return "Please enter contact position.";
    if (!form.email.trim()) return "Please enter contact email.";
    if (!form.phone.trim()) return "Please enter contact phone/WhatsApp.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const missing = validateRequired();
    if (missing) { setStatus({ ok: false, msg: missing }); return; }
    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      setStatus({ ok: true, msg: "Thank you! Your inquiry has been received. Our team will contact you within 24 hours." });
    } catch {
      setStatus({ ok: false, msg: "Network error. Please try again or contact Arba directly." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tab = TAB_CONTENT[activeTab];

  return (
    <main className="min-h-screen bg-white text-[#294154] font-geologica">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">

        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Text */}
          <div className="lg:col-span-7 order-2 space-y-6">
            <p className="text-sm font-semibold text-[#E56668]">For Schools & Universities</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              Bring Global English Opportunities to Your School
            </h1>
            <p className="text-gray-700 max-w-2xl text-base">
              IELS for Schools empowers teachers and students with structured English
              programs, measurable outcomes, and mentorship from global educators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E]"><Link
                href="#contact"
                
              >
                Request a Pilot Program
              </Link></Button>

               <Button asChild className="bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f]">
               <Link
                href={LINKS.programOverview}
                target="_blank"
                rel="noreferrer"
             
              >
                View Program Overview
              </Link></Button>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Designed for high schools and universities across Indonesia.
            </p>
          </div>

          {/* Visual: Mascot */}
          <div className="lg:col-span-5 order-1 flex justify-center lg:justify-end">
            <div className="w-[320px] sm:w-[420px] lg:w-[520px]">
              <Image
                src="/images/contents/general/ielsschool.svg"
                alt="IELS mascot in classroom"
                width={900}
                height={900}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
        </section>
{/* ═══════════════════════════════════════════════════════════════
            SECTION 2 — THE PROBLEM: 78% vs 9%
        ═══════════════════════════════════════════════════════════════ */}
        <section className="rounded-[2.5rem] bg-[#294154] px-8 py-16 lg:p-20 overflow-hidden relative shadow-2xl">
         

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div className="space-y-6">
              <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">
                The Outcome Gap
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Passing exams isn't the same as being <span className="text-[#E56668]">global-ready.</span>
              </h2>
              <div className="space-y-4 pt-4">
                <p className="text-white/70 text-lg leading-relaxed">
                  The data is clear. Schools are producing graduates who excel on paper but
                  struggle when it counts — in scholarship interviews, global job applications,
                  and real-world English communication.
                </p>
                <p className="text-white/70 text-base leading-relaxed">
                  The root cause: generic curricula and overwhelming teacher admin loads make
                  personalized learning impossible inside a traditional classroom.
                </p>
              </div>
            </div>

            {/* Right: Stat cards */}
            <div className="grid grid-cols-2 gap-5">
              {[
                {
                  pct: "78%",
                  label: "of students pass school exams",
                  color: "border-emerald-400/30 bg-emerald-400/10",
                  textColor: "text-emerald-400",
                  icon: "✓",
                },
                {
                  pct: "<9%",
                  label: "are ready for a global interview or scholarship",
                  color: "border-[#E56668]/40 bg-[#E56668]/10",
                  textColor: "text-[#E56668]",
                  icon: "✗",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`rounded-3xl border p-8 flex flex-col justify-between gap-6 ${s.color}`}
                >
                  <span className={`text-5xl font-black ${s.textColor}`}>{s.pct}</span>
                  <p className="text-white/80 text-base leading-snug">{s.label}</p>
                  <span className={`text-3xl font-black ${s.textColor}`}>{s.icon}</span>
                </div>
              ))}

              <div className="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <p className="text-white/50 text-sm uppercase tracking-widest font-bold mb-3">
                  What IELS Bridges
                </p>
                <p className="text-white font-semibold text-lg leading-relaxed">
                  The gap between academic achievement and real-world global competence —
                  powered by AI-personalized learning and a measurable Global Readiness Score.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3 — THE DUAL ENGINE: For Schools / For Students
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="text-center mb-12 lg:mb-16 space-y-4">
            <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">
              The Dual-Engine Solution
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold">
              Built for Teachers. Designed for Students.
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              Two parallel systems operating in sync — one that empowers your educators,
              one that launches your students toward global opportunities.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-[#F7F8FA] rounded-full p-1.5 border border-gray-200 shadow-sm">
              {(["schools", "students"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-8 py-3 rounded-full text-base font-bold transition-all capitalize ${
                    activeTab === t
                      ? "bg-[#294154] text-white shadow-md"
                      : "text-gray-500 hover:text-[#294154]"
                  }`}
                >
                  For {t === "schools" ? "Schools" : "Students"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="rounded-[2.5rem] border border-gray-200 bg-[#FAFAFA] p-8 md:p-12 lg:p-16">
            <div className="mb-12 space-y-3">
              <h3 className="text-3xl lg:text-4xl font-extrabold text-[#294154]">
                {tab.headline}
              </h3>
              <p className="text-gray-500 max-w-3xl text-lg leading-relaxed">{tab.sub}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {tab.features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className="group relative bg-white rounded-3xl border border-gray-200 p-8 hover:border-[#E56668]/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="absolute left-0 top-8 bottom-8 w-1.5 rounded-r-full bg-transparent group-hover:bg-[#E56668] transition-all duration-300" />
                    <div className="pl-4 space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#294154]/5 flex items-center justify-center">
                        <Icon size={24} className="text-[#294154] group-hover:text-[#E56668] transition-colors" />
                      </div>
                      <h4 className="text-xl font-bold text-[#294154] group-hover:text-[#E56668] transition-colors">
                        {f.title}
                      </h4>
                      <p className="text-gray-500 text-base leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4 — THE GRS
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Explanation */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">
                  The Secret Sauce
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
                  Introducing the{" "}
                  <span className="text-[#E56668]">Global Readiness Score.</span>
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  GRS is not a report card grade. It's an industry-standard metric that
                  quantifies soft skills, communicative adaptability, and global engagement
                  into a single, verifiable number — recognized by universities and employers
                  who know what real readiness looks like.
                </p>
              </div>

              <div className="space-y-6 pt-4">
                {[
                  { label: "The Invisible Metric",   desc: "We quantify skills that transcripts can't capture — adaptability, speaking confidence, global engagement." },
                  { label: "Industry Standard",      desc: "GRS is not a school grade. It's a global benchmark that proves a student is truly world-ready." },
                  { label: "Tracked Over Time",      desc: "Schools and students can monitor GRS growth weekly, with AI-driven recommendations to accelerate it." },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-[#E56668] flex items-center justify-center flex-shrink-0">
                      <ChevronRight size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#294154] text-lg">{item.label}</p>
                      <p className="text-gray-500 text-base leading-relaxed mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: GRS Component Visual */}
            <div className="bg-[#294154] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
              <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-[#E56668]/20 blur-[80px]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <p className="text-white/50 text-sm uppercase tracking-widest font-bold">Sample Student</p>
                    <p className="text-white text-lg font-bold mt-1">Aisyah Ramadhani · XII IPA 1</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-sm uppercase tracking-widest font-bold">GRS</p>
                    <p className="text-5xl lg:text-6xl font-black text-[#E56668] mt-1">
                      <CountUp end={87} duration={2.4} enableScrollSpy scrollSpyOnce />
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {GRS_COMPONENTS.map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70 font-medium">{c.label}</span>
                        <span className="text-white font-bold">{c.pct}%</span>
                      </div>
                      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${c.pct * 3.5}%`, background: c.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 pt-6 border-t border-white/10">
                  <p className="text-white/50 text-sm leading-relaxed">
                    GRS updates in real time as students complete exercises, speaking sessions, and milestone goals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* ═══════════════════════════════════════════════════════════════
            SECTION 6 — PROVEN IMPACT
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="text-center mb-12 lg:mb-16 space-y-4">
            <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">Proven Impact</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold">Results Schools Can Stand Behind</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: 42, suffix: "%", label: "avg improvement in English confidence", note: "within 8-week pilot" },
              { value: 31, suffix: "%", label: "increase in reading & writing accuracy", note: "vs. diagnostic baseline" },
              { value: 95, suffix: "%", label: "teacher satisfaction rate", note: "from training & workshops" },
              { value: 4.8, suffix: "★", decimals: 1, label: "average student rating", note: "post-program survey" },
            ].map((m, i) => (
              <div
                key={i}
                className="group relative rounded-[2rem] border bg-[#FAFAFA] p-8 text-center border-gray-200 hover:border-[#E56668]/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute left-0 top-8 bottom-8 w-1.5 rounded-r-full bg-transparent group-hover:bg-[#E56668] transition-all duration-300" />
                <div className="flex flex-col items-center gap-4">
                  <div className="text-5xl font-extrabold text-[#294154] group-hover:text-[#E56668] transition-colors">
                    <CountUp end={m.value} duration={2.4} decimals={m.decimals ?? 0} enableScrollSpy scrollSpyOnce />
                    {m.suffix}
                  </div>
                  <p className="text-base font-bold text-[#294154]">{m.label}</p>
                  <p className="text-sm text-gray-500">{m.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 7 — SUCCESS STORIES
        ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="text-center mb-12 lg:mb-16 space-y-4">
            <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">Success Stories</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold">What Our Partners Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {[
              {
                quote: "After joining IELS for Schools, our students became measurably more confident in speaking and academic writing. The AI-driven insights made it easy for our teachers to know exactly where to focus.",
                by: "English Department Head",
                school: "SMA Labschool Jakarta",
                outcome: "3 students accepted to overseas universities in one cohort.",
              },
              {
                quote: "The teacher training was practical and immediately classroom-ready. We saw a 40% jump in student engagement within the first month. The dashboard saved our teachers hours of grading every week.",
                by: "Principal",
                school: "SMAN 2 Bandung",
                outcome: "Pilot expanded to 5 classes in semester two.",
              },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-[2rem] p-8 md:p-10 border border-gray-200 flex flex-col justify-between shadow-sm hover:shadow-lg transition-shadow">
                <div>
                  <div className="text-[#E56668] text-5xl font-serif leading-none mb-4">"</div>
                  <p className="italic text-gray-600 text-lg leading-relaxed mb-8">{t.quote}</p>
                </div>
                <div className="pt-6 border-t border-gray-100">
                  <p className="font-bold text-[#294154] text-base">— {t.by}, {t.school}</p>
                  <p className="text-sm text-emerald-600 font-bold mt-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">✓</span> 
                    {t.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button asChild className="border-2 border-[#294154] text-[#294154] font-bold px-8 py-3 text-base rounded-full hover:bg-[#294154] hover:text-white transition-all">
              <Link href={LINKS.caseStudies} target="_blank" rel="noreferrer">
                View All Pilot Case Studies →
              </Link>
            </Button>
          </div>
        </section>
{/* ═══════════════════════════════════════════════════════════════
            SECTION 8 — CONTACT & PARTNERSHIP FORM
        ═══════════════════════════════════════════════════════════════ */}
        <section id="contact">
          <div className="bg-gradient-to-br from-white via-[#fffaf0] to-[#eaf2ff] rounded-[3rem] p-8 md:p-12 lg:p-16 border border-[#294154]/10 shadow-xl">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
              {/* Left: Contact info */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-[#E56668]">
                    Start a Partnership
                  </p>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
                    Let's Build Global Opportunities Together.
                  </h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Whether you're ready to run a pilot or just exploring options, we'd love
                    to hear about your school's English program. Reach out to our Principal directly,
                    or fill out the form and we'll respond within 24 hours.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 text-base">
                  {[
                    { label: "Principal", value: PRINCIPAL.name },
                    { label: "Email",     value: PRINCIPAL.email, href: `mailto:${PRINCIPAL.email}` },
                    { label: "WhatsApp",  value: PRINCIPAL.phone, href: `tel:${PRINCIPAL.phone}` },
                  ].map((c) => (
                    <div key={c.label} className={c.label === "Principal" ? "col-span-2" : "col-span-2 sm:col-span-1"}>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{c.label}</p>
                      {c.href ? (
                        <a href={c.href} className="font-bold text-[#294154] hover:text-[#E56668] transition-colors">
                          {c.value}
                        </a>
                      ) : (
                        <p className="font-bold text-[#294154]">{c.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pilot timeline */}
                <div className="pt-6 border-t border-[#294154]/10">
                  <p className="text-sm font-bold uppercase tracking-widest text-[#294154] mb-5">Pilot Program Timeline</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { step: "1", title: "Onboard Teachers" },
                      { step: "2", title: "Run 8-Week Module" },
                      { step: "3", title: "Review & Expand" },
                    ].map((t) => (
                      <div key={t.step} className="bg-white rounded-2xl p-4 text-center border border-[#294154]/10 shadow-sm">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#294154] text-white flex items-center justify-center text-sm font-bold shadow-md">
                          {t.step}
                        </div>
                        <p className="text-sm font-bold text-[#294154]">{t.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div>
                <form onSubmit={onSubmit} className="space-y-5 bg-white p-8 lg:p-10 rounded-[2rem] border border-[#294154]/10 shadow-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input
                      placeholder="School / Institution name *"
                      value={form.institution}
                      onChange={(e) => handleChange("institution", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition"
                    />
                    <input
                      placeholder="Contact person name *"
                      value={form.contactName}
                      onChange={(e) => handleChange("contactName", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input
                      placeholder="Position / Role *"
                      value={form.position}
                      onChange={(e) => handleChange("position", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition"
                    />
                    <input
                      placeholder="Email address *"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input
                      placeholder="WhatsApp / Phone *"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition"
                    />
                    <input
                      placeholder="Number of students (opt)"
                      value={form.students}
                      onChange={(e) => handleChange("students", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <select
                      value={form.interest}
                      onChange={(e) => handleChange("interest", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition text-gray-700 bg-white"
                    >
                      <option>Pilot Program</option>
                      <option>Annual Partnership</option>
                      <option>Teacher Training Only</option>
                      <option>IELS Global Festival</option>
                      <option>AI for Educators Webinar</option>
                    </select>
                    <input
                      placeholder="Preferred start date (optional)"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                      className="w-full border-2 border-gray-100 rounded-full px-5 py-3.5 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition text-gray-700"
                    />
                  </div>

                  <textarea
                    placeholder="Tell us about your school's current English program and what you'd like to achieve (optional)"
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-[2rem] px-6 py-3 text-base outline-none focus:ring-4 focus:ring-[#E56668]/20 focus:border-[#E56668] transition resize-none"
                    rows={4}
                  />

                  {status && (
                    <div className={`text-base text-center font-bold py-3 px-5 rounded-2xl ${
                      status.ok
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}>
                      {status.msg}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-3 rounded-full bg-[#E56668] text-white font-bold px-8 py-4 text-base hover:bg-[#C04C4E] transition active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-[#E56668]/20"
                    >
                      {isSubmitting ? "Sending..." : "Send Partnership Inquiry"}
                      {!isSubmitting && <ArrowRight size={18} />}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

      </div>

      <Footer />
    </main>
  );
}
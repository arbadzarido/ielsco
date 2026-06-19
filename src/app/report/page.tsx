"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  Award, 
  Target,
  ArrowRight,
  ChevronRight,
  Download,
  ExternalLink,
  BarChart3,
  Globe,
  Zap,
  CheckCircle
} from "lucide-react";

export default function Reports() {
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);

  const reports = [
    {
      id: 1,
      batch: "Batch 1",
      period: "Jan - Jun 2024",
      status: "Published",
      color: "from-[#1A2534] to-[#2F4157]",
      stats: {
        members: "3,200+",
        stories: "450+",
        revenue: "IDR 12.5M"
      }
    },
    {
      id: 2,
      batch: "Batch 2", 
      period: "Jul - Dec 2024",
      status: "Published",
      color: "from-[#E56668] to-[#c94f51]",
      stats: {
        members: "6,800+",
        stories: "810+",
        revenue: "IDR 34.5M"
      }
    }
  ];

  if (selectedBatch === 2) {
    return <Batch2Report onBack={() => setSelectedBatch(null)} />;
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">
        
        {/* Hero Section */}
        <div className="relative px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-gradient-to-br from-[#1A2534] via-[#2F4157] to-[#1A2534] overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E56668] rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-5 py-2 rounded-full text-sm font-semibold mb-4">
              <BarChart3 size={16} />
              Impact Reports
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              Transparency Through<br />
              <span className="text-[#E56668]">Data & Impact</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Explore our detailed impact reports showcasing how IELS is transforming English learning 
              and creating real global opportunities for Indonesian students.
            </p>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28">
          <div className="max-w-7xl mx-auto">
            
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedBatch(report.id)}
                  className="group bg-white rounded-[40px] border-2 border-gray-100 hover:border-[#E56668] p-8 lg:p-10 text-left transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${report.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <FileText size={32} className="text-white" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-3xl font-extrabold text-[#1A2534] mb-2">{report.batch}</h3>
                      <p className="text-gray-500 font-medium">{report.period}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-semibold text-green-600">{report.status}</span>
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Members</span>
                        <span className="font-bold text-[#1A2534]">{report.stats.members}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Stories</span>
                        <span className="font-bold text-[#E56668]">{report.stats.stories}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Revenue</span>
                        <span className="font-bold text-[#1A2534]">{report.stats.revenue}</span>
                      </div>
                    </div>

                    <div className="pt-6 flex items-center gap-2 text-[#E56668] font-bold group-hover:gap-3 transition-all">
                      View Full Report
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Why We Share Section */}
            <div className="bg-[#F7F8FA] rounded-[40px] p-10 lg:p-14">
              <div className="max-w-4xl mx-auto text-center space-y-6">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A2534]">
                  Why We Share Our Data
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  At IELS, transparency isn't optional — it's foundational. We believe in radical openness 
                  about our impact, challenges, and growth. These reports aren't marketing materials; 
                  they're honest accounts of how we're building a more accessible path to global opportunities.
                </p>

                <div className="grid sm:grid-cols-3 gap-6 pt-8">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#E56668] rounded-2xl flex items-center justify-center mx-auto">
                      <Users size={24} className="text-white" />
                    </div>
                    <h3 className="font-bold text-[#1A2534]">Community Trust</h3>
                    <p className="text-sm text-gray-600">Building trust through transparency with our members</p>
                  </div>

                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#1A2534] rounded-2xl flex items-center justify-center mx-auto">
                      <Target size={24} className="text-white" />
                    </div>
                    <h3 className="font-bold text-[#1A2534]">Accountability</h3>
                    <p className="text-sm text-gray-600">Holding ourselves to measurable standards</p>
                  </div>

                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-[#E56668] rounded-2xl flex items-center justify-center mx-auto">
                      <TrendingUp size={24} className="text-white" />
                    </div>
                    <h3 className="font-bold text-[#1A2534]">Continuous Improvement</h3>
                    <p className="text-sm text-gray-600">Learning from data to serve you better</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
}

// Batch 2 Report Component
function Batch2Report({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">
        
        {/* Header with Back Button */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 sm:px-8 lg:px-[100px] py-4 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#1A2534] font-semibold hover:text-[#E56668] transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
              Back to Reports
            </button>

            <span className="text-sm font-semibold text-gray-500">Batch 2 Impact Report</span>
          </div>
        </div>

        {/* Cover Section */}
        <div className="relative px-4 sm:px-8 lg:px-[100px] py-16 lg:py-24 bg-gradient-to-br from-[#1A2534] via-[#2F4157] to-[#1A2534] overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/contents/general/indonesia_map.png')] bg-no-repeat bg-cover bg-center"></div>
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
            <Image
              src="/images/logos/iels_white1.png"
              width={100}
              height={100}
              alt="IELS Logo"
              className="mx-auto mb-8 drop-shadow-2xl"
            />

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
              Impact Report<br />
              <span className="text-[#E56668]">Batch 2</span>
            </h1>

            <p className="text-xl text-white/90">July - December 2024</p>
          </div>
        </div>

        {/* Problem Section */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6">
                <div className="inline-block bg-[#E56668]/10 text-[#E56668] px-4 py-2 rounded-full font-bold text-sm">
                  THE PROBLEM
                </div>

                <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1A2534] leading-tight">
                  12 Years of Study,<br />
                  <span className="text-[#E56668]">0 Global Outcomes</span>
                </h2>

                <div className="space-y-4 text-lg text-gray-600 leading-relaxed">
                  <p>
                    Meet thousands of students like Rafi — brilliant minds from across Indonesia who've studied English 
                    for 12+ years but freeze during their first international interview or scholarship application.
                  </p>

                  <div className="bg-[#F7F8FA] border-l-4 border-[#E56668] p-6 rounded-r-2xl">
                    <p className="font-semibold text-[#1A2534]">
                      Why? Because knowing grammar ≠ having a "Global Voice"
                    </p>
                  </div>

                  <p>
                    We see this everywhere: <strong className="text-[#E56668]">brilliant talent stagnates</strong> because 
                    traditional education lacks real-world application and measurable outcomes.
                  </p>

                  {/* Validation Stats */}
                  <div className="grid sm:grid-cols-2 gap-4 pt-6">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                      <p className="text-3xl font-black text-[#E56668] mb-2">78%</p>
                      <p className="text-sm text-gray-600">Of Indonesian students lack confidence in professional English communication*</p>
                    </div>
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                      <p className="text-3xl font-black text-[#1A2534] mb-2">2.3M</p>
                      <p className="text-sm text-gray-600">University students struggle with practical English despite years of formal education*</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic">*Based on IELS market research & member surveys, 2024</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-[#E56668]/10 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-100">
                  <div className="aspect-square bg-gray-200 rounded-2xl flex items-center justify-center mb-6">
                    <Image
                      src="/images/contents/general/landing_page_1.png"
                      alt="Student Success Story"
                      width={400}
                      height={400}
                      className="rounded-2xl object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-[#1A2534] text-lg">The Reality Check</p>
                    <p className="text-gray-600">
                      Students aren't lazy or unmotivated. They're navigating without a map — highly driven, 
                      but lacking clarity on where they stand and what to do next.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Insight Section */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-[#F7F8FA]">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-block bg-[#1A2534]/10 text-[#1A2534] px-4 py-2 rounded-full font-bold text-sm">
              KEY INSIGHT
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1A2534]">
              Motivation Exists → <span className="text-[#E56668]">Clarity is the Bottleneck</span>
            </h2>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              After engaging with <strong>8,700+ members</strong>, we realized: 
              <strong className="text-[#E56668]"> if you don't track progress, talent stays invisible.</strong>
            </p>

            <div className="grid md:grid-cols-3 gap-8 pt-8">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-200">
                <h3 className="font-bold text-xl text-[#1A2534] mb-3">The Myth</h3>
                <p className="text-gray-600 leading-relaxed">
                  Students fail because they're lazy or unmotivated
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#E56668] to-[#c94f51] p-8 rounded-[32px] shadow-lg text-white">
                <h3 className="font-bold text-xl mb-3">The Truth</h3>
                <p className="leading-relaxed">
                  Students are highly motivated but don't know where they stand or what to do next
                </p>
              </div>

              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-200">
                <h3 className="font-bold text-xl text-[#1A2534] mb-3">Market Failure</h3>
                <p className="text-gray-600 leading-relaxed">
                  Courses sell "content volume" while students need "outcome tracking"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-block bg-[#E56668]/10 text-[#E56668] px-4 py-2 rounded-full font-bold text-sm">
                OUR SOLUTION
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1A2534]">
                Outcome-as-a-Service (OaaS)<br />
                <span className="text-[#E56668]">Infrastructure for Global Mobility</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              
              <div className="group bg-white border-2 border-gray-200 hover:border-[#E56668] rounded-[32px] p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="w-14 h-14 bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={28} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A2534] mb-4">Community</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Daily peer-led practice and gamified challenges to shatter the "fear of speaking"
                </p>
                <div className="flex items-center gap-2 text-[#E56668] font-semibold text-sm">
                  <CheckCircle size={16} />
                  6,800+ active members
                </div>
              </div>

              <div className="group bg-white border-2 border-gray-200 hover:border-[#1A2534] rounded-[32px] p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="w-14 h-14 bg-[#1A2534] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target size={28} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A2534] mb-4">Specialized Tracks</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Outcome-based workshops focused on scholarship prep and career readiness
                </p>
                <div className="flex items-center gap-2 text-[#E56668] font-semibold text-sm">
                  <CheckCircle size={16} />
                  6 high-impact programs
                </div>
              </div>

              <div className="group bg-white border-2 border-gray-200 hover:border-[#E56668] rounded-[32px] p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="w-14 h-14 bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe size={28} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A2534] mb-4">Real Exposure</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Direct access to international stakeholders, global universities & companies
                </p>
                <div className="flex items-center gap-2 text-[#E56668] font-semibold text-sm">
                  <CheckCircle size={16} />
                  6 global partners
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Numbers */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-gradient-to-br from-[#1A2534] via-[#2F4157] to-[#1A2534]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-block bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-sm">
                PROVEN IMPACT
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold text-white">
                Numbers That Matter
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[32px] p-8 text-center hover:bg-white/20 transition-all duration-300">
                <p className="text-5xl font-black text-[#E56668] mb-2">6,800+</p>
                <p className="text-lg font-bold text-white mb-1">Active Members</p>
                <p className="text-sm text-white/70">Growing daily</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[32px] p-8 text-center hover:bg-white/20 transition-all duration-300">
                <p className="text-5xl font-black text-white mb-2">810+</p>
                <p className="text-lg font-bold text-white mb-1">Success Stories</p>
                <p className="text-sm text-white/70">Scholarships & awards</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[32px] p-8 text-center hover:bg-white/20 transition-all duration-300">
                <p className="text-5xl font-black text-[#E56668] mb-2">135+</p>
                <p className="text-lg font-bold text-white mb-1">Global Careers</p>
                <p className="text-sm text-white/70">Remote jobs & internships</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[32px] p-8 text-center hover:bg-white/20 transition-all duration-300">
                <p className="text-5xl font-black text-white mb-2">35+</p>
                <p className="text-lg font-bold text-white mb-1">Study Abroad</p>
                <p className="text-sm text-white/70">International programs</p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link 
                href="/stories"
                className="inline-flex items-center gap-2 bg-[#E56668] text-white font-bold px-8 py-4 rounded-full hover:bg-[#c94f51] transition-all duration-300 hover:shadow-xl"
              >
                Read Success Stories
                <ExternalLink size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* Financial Overview */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-[#F7F8FA]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-6 mb-16">
              <div className="inline-block bg-[#1A2534]/10 text-[#1A2534] px-4 py-2 rounded-full font-bold text-sm">
                FINANCIAL TRANSPARENCY
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1A2534]">
                Batch 2 Financial Overview
              </h2>

              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Diverse revenue streams demonstrate IELS' sustainability and growth trajectory
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-gradient-to-br from-[#E56668] to-[#c94f51] rounded-[32px] p-8 text-white text-center">
                <p className="text-4xl font-black mb-2">IDR 34.5M</p>
                <p className="text-lg font-semibold">Total Revenue</p>
              </div>

              <div className="bg-gradient-to-br from-[#1A2534] to-[#2F4157] rounded-[32px] p-8 text-white text-center">
                <p className="text-4xl font-black mb-2">IDR 32.5M</p>
                <p className="text-lg font-semibold">Total Investment</p>
              </div>

              <div className="bg-white border-2 border-[#E56668] rounded-[32px] p-8 text-center">
                <p className="text-4xl font-black text-[#E56668] mb-2">IDR 2.0M</p>
                <p className="text-lg font-semibold text-[#1A2534]">Net Surplus</p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 lg:p-10 shadow-sm border border-gray-200">
              <h3 className="text-2xl font-bold text-[#1A2534] mb-8">Revenue Distribution</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-[#1A2534]">IELS Course</span>
                      <span className="font-bold text-[#E56668]">29.79%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E56668] rounded-full" style={{ width: '29.79%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-[#1A2534]">Grants & Funding</span>
                      <span className="font-bold text-[#1A2534]">28.92%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A2534] rounded-full" style={{ width: '28.92%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-[#1A2534]">IELS Lounge</span>
                      <span className="font-bold text-[#E56668]">17.35%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E56668] rounded-full" style={{ width: '17.35%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-[#1A2534]">Other Streams</span>
                      <span className="font-bold text-[#1A2534]">24.04%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-400 rounded-full" style={{ width: '24.04%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Partners */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 lg:py-28 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <div className="space-y-6 mb-12">
              <div className="inline-block bg-[#E56668]/10 text-[#E56668] px-4 py-2 rounded-full font-bold text-sm">
                GLOBAL NETWORK
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1A2534]">
                Connecting Local Talent<br />
                <span className="text-[#E56668]">to Global Opportunities</span>
              </h2>
            </div>

            <div className="bg-[#F7F8FA] rounded-[32px] p-12">
              <p className="text-lg text-gray-600 mb-8">Our Global Pipeline Partners</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center h-24 border border-gray-200">
                  <span className="text-gray-400 font-semibold">NUS</span>
                </div>
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center h-24 border border-gray-200">
                  <span className="text-gray-400 font-semibold">Western Sydney</span>
                </div>
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center h-24 border border-gray-200">
                  <span className="text-gray-400 font-semibold">Skillio</span>
                </div>
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center h-24 border border-gray-200">
                  <span className="text-gray-400 font-semibold">IDP</span>
                </div>
                <div className="bg-white rounded-2xl p-6 flex items-center justify-center h-24 border border-gray-200 md:col-span-2">
                  <span className="text-gray-400 font-semibold">+ More Partners</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 sm:px-8 lg:px-[100px] py-20 bg-white">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1A2534]">
              This is Just<br />
              <span className="text-[#E56668]">The Beginning</span>
            </h2>

            <p className="text-xl text-gray-600 leading-relaxed">
              Batch 2 proved that outcome-driven education works. Now, we're scaling to reach 
              <strong className="text-[#E56668]"> 50,000+ students</strong> and create even more global opportunities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/welcome/start"
                className="inline-flex items-center gap-2 bg-[#E56668] text-white font-bold px-10 py-4 rounded-full hover:bg-[#c94f51] transition-all duration-300 hover:shadow-xl"
              >
                Join Our Community
                <ArrowRight size={20} />
              </Link>

              <Link
                href="/about"
                className="inline-flex items-center gap-2 border-2 border-[#1A2534] text-[#1A2534] font-bold px-10 py-4 rounded-full hover:bg-[#1A2534] hover:text-white transition-all duration-300"
              >
                Learn More About IELS
              </Link>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}
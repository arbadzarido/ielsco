"use client";

import Footer from "@/components/footer";
import Header from "@/components/header";
import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  Instagram, 
  PlayCircle,
  Linkedin, 
  ExternalLink, 
  Target, 
  Globe, 
  Users, 
  Award, 
  BookOpen,
  Compass,
  ArrowRight,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function About() {


const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Ubah state ini jadi nyimpen string (nama) biar gampang pas array-nya dipisah
  const [activeDetail, setActiveDetail] = useState<string | null>(null);

  type LeadershipMember = {
    name: string;
    role: string;
    image: string;
    instagram: string;
    linkedin: string;
    point1: string;
    point2: string;
  };

  const boardOfAdvisors: LeadershipMember[] = [
    {
      name: "Alfiandi Imam Mawardi",
      role: "President Commissioner",
      image: "/images/people/directors/alfiandi.png",
      instagram: "https://www.instagram.com/alfiandiimam/",
      linkedin: "https://www.linkedin.com/in/alfiandi-imam-mawardi-06249893/",
      point1: "Currently serving as the Founder and Commissioner of LANDASI, focusing on startup incubation, bootstrap investment, and fostering digital business ecosystems.",
      point2: "Brings over 8 years of experience at UPN 'Veteran' Jawa Timur's Innovation & Entrepreneur Center, alongside his past executive role as Founder & CEO of Tapfast Indonesia.",
    },
    {
      name: "Khairi Pandya Adhikara",
      role: "Strategic Advisor",
      image: "/images/people/directors/pandya1.png",
      instagram: "https://www.instagram.com/khairi.pandya/",
      linkedin: "https://www.linkedin.com/in/khairi-pandya/",
      point1: "Currently serving as Sr. OD Specialist at STAR Capital, focusing on Organizational Development and Structure.",
      point2: "Former Manager of Organization & Workforce Transformation at Deloitte, managing stakeholder relations and human capital initiatives for over 2 years.",
    },
  ];

  const boardOfDirectors: LeadershipMember[] = [
    {
      name: "Fadhila Qurotul Aini",
      role: "Co-Founder, CEO",
      image: "/images/people/directors/dhila2.png",
      instagram: "https://www.instagram.com/fadhilaqa._/",
      linkedin: "https://linkedin.com/in/fadhilaqa/",
      point1: "Successfully streamlined international outreach and digital operations to connect local talent with high-tier global aesthetic science networks.",
      point2: "Former Marketing and Operations Intern at IFAAS (International Fellowship In Advanced Aesthetic Science), managing remote global projects for 7 months.",
    },
    {
      name: "Arbadza Rido",
      role: "Co-Founder, COO",
      image: "/images/people/directors/arba.png",
      instagram: "https://instagram.com/arbadzarido",
      linkedin: "https://linkedin.com/in/arbadzarido",
      point1: "Professional EFL & ESL Teacher with over 3 years of experience teaching across various countries in Southeast Asia.",
      point2: "Former Project Manager at Pertamina Training & Consulting and Tech in Asia, leading cross-functional teams in high-impact corporate projects.",
    },
  ];

  const teamImages = [
    "/images/contents/careers/iels_team_0.png",
    "/images/contents/careers/iels_team_1.png",
    "/images/contents/careers/iels_team_2.png",
    "/images/contents/careers/iels_team_3.png",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % teamImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [teamImages.length]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#E56668] selection:text-white">
      <Header />
      
      {/* HERO SECTION */}
      <div className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
        {teamImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            <Image
              src={image}
              alt={`IELS Team ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A2534]/80 via-[#2F4157]/60 to-[#1A2534]/90"></div>
          </div>
        ))}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {teamImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex
                  ? "bg-[#E56668] w-10"
                  : "bg-white/40 hover:bg-white/70 w-2"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
        
        <div className="relative z-10 text-center px-6 sm:px-8 space-y-6 max-w-4xl mx-auto mt-16">
          <div className="animate-fadeIn">
            <Image
              src="/images/logos/iels_white.png"
              width={120}
              height={120}
              alt="IELS Logo"
              className="mx-auto mb-6 drop-shadow-2xl"
            />
          </div>
          
          <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight animate-fadeIn tracking-tight" style={{ animationDelay: "200ms" }}>
            Beyond Language.<br />
            We Build <span className="text-[#E56668]">Global Readiness.</span>
          </h1>
          
         <p className="text-base sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed animate-fadeIn font-light" style={{ animationDelay: "400ms" }}>
            IELS, legally incorporated as PT English Space Berkah Indonesia, is an inclusive, goal-driven community designed to help ambitious Indonesian students unlock scholarships, remote work, and international opportunities.
          </p>

          <div className="pt-6 animate-fadeIn flex flex-col sm:flex-row justify-center gap-4" style={{ animationDelay: "600ms" }}>
            <a
              href="https://drive.google.com/file/d/1JgTczzvuf6nwpMMkLmMUGO0TrUkkJLXN/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center items-center gap-2 bg-[#E56668] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#c94f51] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 text-sm sm:text-base"
            >
              Read 1-Year Strategic Plan <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* THE MANIFESTO */}
      <section className="px-6 sm:px-12 lg:px-[100px] py-13 lg:py-18 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          <div className="space-y-8">
            <div className="inline-block bg-[#2F4157]/5 text-[#2F4157] px-5 py-2 rounded-full font-bold text-sm tracking-widest uppercase">
              The Reality Check
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2F4157] leading-tight">
              Indonesia has millions of brilliant minds. <br />
              <span className="text-[#E56668]">But talent alone cannot cross borders.</span>
            </h2>
            <div className="space-y-6 text-lg text-gray-600 leading-relaxed text-justify sm:text-left">
              <p>
                Many students dream of studying abroad, building global careers, or winning international competitions. Yet, they are held back not by a lack of intelligence, but by a lack of access, structure, and the right environment.
              </p>
              
           <div className="border-l-4 border-[#E56668] pl-6 py-2 my-6 bg-[#F7F8FA] p-4 rounded-r-2xl">
                <p className="font-semibold text-[#2F4157] text-lg">
                  For too long, English has been taught just as a school subject to pass exams.
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-[#E56668] mt-3">
                  At IELS (PT English Space Berkah Indonesia), we believe English is not a subject. It is access.
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[400px] sm:h-[450px] rounded-[32px] overflow-hidden shadow-2xl group">
            <div className="absolute inset-0 bg-[#2F4157]/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
            <Image 
              src="/images/contents/general/landing_page_1.png" 
              alt="Indonesian students looking forward" 
              fill 
              className="object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            
            <div className="absolute bottom-6 left-6 right-6 z-20 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <p className="text-[#2F4157] font-bold text-lg leading-snug">
                "We don't just teach you how to pass a test. We prepare you for the world."
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* THE LAUNCHPAD */}
      <section className="px-6 sm:px-12 lg:px-[100px] py-13 lg:py-18 bg-[#F7F8FA]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2F4157]">
              Not Just a Course. <br />
              <span className="text-[#E56668]">A Global Launchpad.</span>
            </h2>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              We don't do generic learning. We provide a clear pathway from setting your goal to actually achieving it on the global stage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-[#2F4157]/5 group-hover:bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                <Target className="text-[#2F4157] group-hover:text-white transition-colors" size={28} />
              </div>
              <h3 className="font-bold text-xl text-[#2F4157] mb-3">Clear Goals</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Whether you want to win a scholarship or work remotely, we tailor your learning to real-world targets.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-[#2F4157]/5 group-hover:bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                <Users className="text-[#2F4157] group-hover:text-white transition-colors" size={28} />
              </div>
              <h3 className="font-bold text-xl text-[#2F4157] mb-3">Active Community</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Learning alone is boring. Join our daily speaking clubs and networking lounges to practice fearlessly.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-[#2F4157]/5 group-hover:bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                <Globe className="text-[#2F4157] group-hover:text-white transition-colors" size={28} />
              </div>
              <h3 className="font-bold text-xl text-[#2F4157] mb-3">Global Access</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                We bring the world to you through international mentors, exclusive events, and direct career pipelines.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="w-14 h-14 bg-[#2F4157]/5 group-hover:bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                <Zap className="text-[#2F4157] group-hover:text-white transition-colors" size={28} />
              </div>
              <h3 className="font-bold text-xl text-[#2F4157] mb-3">Track Progress</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                With our dashboard and periodic tests, you never guess your level. You know exactly what to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OUR VALUES */}
      <section className="px-6 sm:px-12 lg:px-[100px] py-13 lg:py-18 bg-[#1A2534] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E56668]/20 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#2F4157] blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
              Core Principles
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              The DNA of IELS.
            </h2>
            <p className="text-lg text-white/70">
              We are not just building another English course. We are building a movement driven by these three uncompromising principles.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            
            <div className="relative group bg-white/5 border border-white/10 p-10 lg:p-12 rounded-[40px] hover:bg-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
              <div className="absolute -right-6 -top-6 text-[140px] font-black text-white/5 group-hover:text-white/10 transition-colors duration-500 leading-none pointer-events-none">
                01
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#E56668] flex items-center justify-center mb-8 shadow-lg shadow-[#E56668]/30 group-hover:scale-110 transition-transform duration-500">
                  <BookOpen size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Accessibility <br/> with Purpose</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-base">
                  Socio-economic background should never dictate global potential. We build high-quality, structured programs that remain radically affordable.
                </p>
              </div>
            </div>

            <div className="relative group bg-white/5 border border-white/10 p-10 lg:p-12 rounded-[40px] hover:bg-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
              <div className="absolute -right-6 -top-6 text-[140px] font-black text-white/5 group-hover:text-white/10 transition-colors duration-500 leading-none pointer-events-none">
                02
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#E56668] flex items-center justify-center mb-8 shadow-lg shadow-[#E56668]/30 group-hover:scale-110 transition-transform duration-500">
                  <Award size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Relentlessly <br/> Outcome-Driven</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-base">
                  We don't celebrate mere participation; we celebrate tangible progress. Everything we design is engineered to move you closer to a global goal.
                </p>
              </div>
            </div>

            <div className="relative group bg-white/5 border border-white/10 p-10 lg:p-12 rounded-[40px] hover:bg-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
              <div className="absolute -right-6 -top-6 text-[140px] font-black text-white/5 group-hover:text-white/10 transition-colors duration-500 leading-none pointer-events-none">
                03
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#E56668] flex items-center justify-center mb-8 shadow-lg shadow-[#E56668]/30 group-hover:scale-110 transition-transform duration-500">
                  <Compass size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Community as <br/> a System</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-base">
                  Growth accelerates when you are not alone. We cultivate a high-energy environment where learners push each other to evolve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISION & IMPACT */}
      <section className="px-6 sm:px-12 lg:px-[100px] py-13 lg:py-18 bg-white relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div className="max-w-2xl space-y-4">
              <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
                The Proof
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#2F4157] leading-tight tracking-tight">
                Vision measured in <br className="hidden sm:block"/> 
                <span className="text-[#E56668]">real human impact.</span>
              </h2>
            </div>
            <div className="pb-2">
              <Link 
                href="/stories" 
                className="group inline-flex items-center gap-3 bg-[#F7F8FA] border border-gray-200 text-[#2F4157] px-6 py-3 rounded-full font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all duration-300 shadow-sm"
              >
                Read Success Stories 
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            <div className="md:col-span-2 bg-[#F7F8FA] rounded-[40px] p-10 lg:p-14 border border-gray-100 relative overflow-hidden group hover:border-[#E56668]/30 transition-colors duration-500">
              <div className="relative z-10">
                <p className="text-[64px] lg:text-[96px] font-black text-[#2F4157] leading-none mb-4 tracking-tighter">
                  6,800+
                </p>
                <p className="text-2xl font-extrabold text-[#2F4157] mb-2">Active IELScouts</p>
                <p className="text-gray-500 max-w-sm text-lg">
                  A rapidly growing community of ambitious students from across Indonesia, practicing and growing together daily.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                <Users size={300} className="text-[#2F4157]" />
              </div>
            </div>

            <div className="bg-gradient-to-b from-[#E56668] to-[#c94f51] rounded-[40px] p-10 lg:p-12 text-white relative overflow-hidden shadow-2xl shadow-[#E56668]/20 group hover:-translate-y-2 transition-transform duration-500">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-[64px] lg:text-[80px] font-black leading-none mb-4 tracking-tighter">
                    810+
                  </p>
                  <p className="text-xl font-bold mb-3">Winning Stories</p>
                  <p className="text-white/80">
                    Scholarships, competitions, and global programs conquered by our members.
                  </p>
                </div>
                <div className="mt-8 flex justify-end">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                    <Award size={32} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 bg-[#2F4157] rounded-[40px] p-10 lg:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative group">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#E56668]/20 blur-[100px] rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="relative z-10 max-w-2xl text-center md:text-left">
                <p className="text-[64px] lg:text-[80px] font-black text-white leading-none mb-4 tracking-tighter">
                  135+
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold mb-3">Global Careers Launched</p>
                <p className="text-white/70 text-lg">
                  Members who have successfully landed remote jobs, international internships, and professional roles across borders.
                </p>
              </div>
              
              <div className="relative z-10 shrink-0">
                <div className="w-32 h-32 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md group-hover:bg-white/10 group-hover:scale-110 transition-all duration-500">
                  <Globe size={56} className="text-[#E56668]" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

  {/* LEADERSHIP TEAM */}
      <section className="px-6 sm:px-12 lg:px-[100px] py-13 lg:py-18 bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-14">
            <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
              Leadership
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#2F4157] tracking-tight">
              Meet The Builders
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A dedicated team of leaders committed to connecting Indonesian students with the world.
            </p>
          </div>

          <div className="space-y-16">
            {/* BOARD OF ADVISORS */}
            <div>
              <h3 className="text-2xl font-extrabold text-[#1A2534] mb-6 pl-4 border-l-4 border-[#E56668] max-w-4xl mx-auto">
                Board of Advisors
              </h3>
              
              {/* Container: Horizontal Scroll di Mobile, Grid 2 Kolom di Desktop */}
              <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:overflow-x-visible md:pb-0 md:pt-0 max-w-4xl mx-auto">
                {boardOfAdvisors.map((p, index) => {
                  const isShowingDetails = activeDetail === p.name;

                  return (
                    <div 
                      key={index} 
                      className="min-w-[85vw] sm:min-w-[340px] md:min-w-0 snap-center relative w-full h-full bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300"
                    >
                      <div className="p-6 sm:p-8 flex flex-col h-full relative">
                        {!isShowingDetails ? (
                          <div className="flex flex-col items-center justify-center text-center h-full animate-fadeIn">
                            {/* FOTO DIBIKIN KOTAK TUMPUL & MENTOK BINGKAI */}
                            <div className="relative mb-6 w-full">
                              <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-50 shadow-md bg-gray-100 relative z-10 hover:scale-[1.02] transition-transform duration-300">
                                <Image src={p.image} alt={p.name} fill className="object-cover" />
                              </div>
                            </div>
                            <h4 className="font-extrabold text-xl text-[#2F4157] mb-1 leading-tight">{p.name}</h4>
                            <p className="text-sm text-[#E56668] mb-5 font-bold uppercase tracking-wider">{p.role}</p>
                            
                            <div className="flex gap-4 mb-5">
                              <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="p-3 rounded-2xl bg-[#F7F8FA] text-gray-500 hover:text-white hover:bg-[#E56668] transition-all duration-300">
                                <Instagram size={18} />
                              </a>
                              <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 rounded-2xl bg-[#F7F8FA] text-gray-500 hover:text-white hover:bg-[#0A66C2] transition-all duration-300">
                                <Linkedin size={18} />
                              </a>
                            </div>
                            
                            <button 
                              onClick={() => setActiveDetail(p.name)}
                              className="w-full mt-auto py-3 rounded-xl bg-[#2F4157]/5 text-[#2F4157] font-bold text-sm hover:bg-[#2F4157] hover:text-white transition-colors duration-300"
                            >
                              View Profile
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col h-full animate-fadeIn text-left min-h-[400px]">
                            <button 
                              onClick={() => setActiveDetail(null)}
                              className="text-[#E56668] font-bold text-sm mb-6 flex items-center hover:underline w-fit"
                            >
                              ← Back
                            </button>
                            <div className="overflow-y-auto pr-2 pb-4 scrollbar-hide">
                              <h4 className="font-extrabold text-lg text-[#2F4157] mb-1">{p.name}</h4>
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-5 border-b border-gray-100 pb-3">{p.role}</p>
                              
                              <h5 className="font-bold text-sm text-[#2F4157] mb-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E56668]"></div>
                                Background
                              </h5>
                              <p className="text-sm text-gray-600 leading-relaxed mb-5">{p.point1}</p>
                              
                              <h5 className="font-bold text-sm text-[#2F4157] mb-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E56668]"></div>
                                Experience
                              </h5>
                              <p className="text-sm text-gray-600 leading-relaxed mb-5">{p.point2}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOARD OF DIRECTORS */}
            <div>
              <h3 className="text-2xl font-extrabold text-[#1A2534] mb-6 pl-4 border-l-4 border-[#E56668] max-w-4xl mx-auto">
                Board of Directors
              </h3>
              
              <div className="flex overflow-x-auto gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:overflow-x-visible md:pb-0 md:pt-0 max-w-4xl mx-auto">
                {boardOfDirectors.map((p, index) => {
                  const isShowingDetails = activeDetail === p.name;

                  return (
                    <div 
                      key={index} 
                      className="min-w-[85vw] sm:min-w-[340px] md:min-w-0 snap-center relative w-full h-full bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300"
                    >
                      <div className="p-6 sm:p-8 flex flex-col h-full relative">
                        {!isShowingDetails ? (
                          <div className="flex flex-col items-center justify-center text-center h-full animate-fadeIn">
                            {/* FOTO DIBIKIN KOTAK TUMPUL & MENTOK BINGKAI */}
                            <div className="relative mb-6 w-full">
                              <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-50 shadow-md bg-gray-100 relative z-10 hover:scale-[1.02] transition-transform duration-300">
                                <Image src={p.image} alt={p.name} fill className="object-cover" />
                              </div>
                            </div>
                            <h4 className="font-extrabold text-xl text-[#2F4157] mb-1 leading-tight">{p.name}</h4>
                            <p className="text-sm text-[#E56668] mb-5 font-bold uppercase tracking-wider">{p.role}</p>
                            
                            <div className="flex gap-4 mb-5">
                              <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="p-3 rounded-2xl bg-[#F7F8FA] text-gray-500 hover:text-white hover:bg-[#E56668] transition-all duration-300">
                                <Instagram size={18} />
                              </a>
                              <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 rounded-2xl bg-[#F7F8FA] text-gray-500 hover:text-white hover:bg-[#0A66C2] transition-all duration-300">
                                <Linkedin size={18} />
                              </a>
                            </div>
                            
                            <button 
                              onClick={() => setActiveDetail(p.name)}
                              className="w-full mt-auto py-3 rounded-xl bg-[#2F4157]/5 text-[#2F4157] font-bold text-sm hover:bg-[#2F4157] hover:text-white transition-colors duration-300"
                            >
                              View Profile
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col h-full animate-fadeIn text-left min-h-[400px]">
                            <button 
                              onClick={() => setActiveDetail(null)}
                              className="text-[#E56668] font-bold text-sm mb-6 flex items-center hover:underline w-fit"
                            >
                              ← Back
                            </button>
                            <div className="overflow-y-auto pr-2 pb-4 scrollbar-hide">
                              <h4 className="font-extrabold text-lg text-[#2F4157] mb-1">{p.name}</h4>
                              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-5 border-b border-gray-100 pb-3">{p.role}</p>
                              
                              <h5 className="font-bold text-sm text-[#2F4157] mb-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E56668]"></div>
                                Background
                              </h5>
                              <p className="text-sm text-gray-600 leading-relaxed mb-5">{p.point1}</p>
                              
                              <h5 className="font-bold text-sm text-[#2F4157] mb-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#E56668]"></div>
                                Experience
                              </h5>
                              <p className="text-sm text-gray-600 leading-relaxed mb-5">{p.point2}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* YOUTUBE CTA */}
      <section className="px-6 sm:px-12 lg:px-[100px] py-13 lg:py-18 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          
          <div className="mb-10 space-y-4">
            <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
              Discover Our Story
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2F4157] tracking-tight">
              Watch The IELS Profile
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get an exclusive look inside our personalized learning journey. Support our mission by dropping a like, leaving a comment, and subscribing to our channel!
            </p>
          </div>

          <div className="w-full relative rounded-[32px] overflow-hidden shadow-2xl border-4 border-white bg-black aspect-video group">
            <iframe 
              className="w-full h-full absolute top-0 left-0"
              src="https://www.youtube.com/embed/litePG83xtw?rel=0&modestbranding=1" 
              title="IELS Company Profile | Your Personalized English Learning Journey" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a 
              href="https://youtu.be/litePG83xtw?si=bydrWEtId8t7Xw_v" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#E56668] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#CC0000] transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
            >
              <PlayCircle size={20} /> Subscribe on YouTube
            </a>
          </div>

        </div>
      </section>

      <Footer />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
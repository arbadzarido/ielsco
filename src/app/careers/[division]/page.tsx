"use client";

import { useState, use } from "react";
import { notFound } from "next/navigation";
import Footer from "@/components/footer";
import RoleModal from "@/components/careers/RoleModal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { divisions, Role } from "@/data/careers/divisions";
import { Instagram, Linkedin } from "lucide-react";

interface DivisionPageProps {
  params: Promise<{
    division: string;
  }>;
}

export default function DivisionPage({ params }: DivisionPageProps) {
  const { division: divisionSlug } = use(params);
  const division = divisions.find((d) => d.slug === divisionSlug);

  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [pressedRole, setPressedRole] = useState<string | null>(null);

  if (!division) return notFound();

  return (
    <>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[65vh] lg:min-h-[75vh] overflow-hidden flex items-center">
        <img
          src={division.image}
          alt={`${division.title} Division`}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2F4157]/80 via-[#2F4157]/70 to-[#1f2d3d]/90" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-white text-center py-24">
          <p className="uppercase tracking-widest text-sm text-white/70 mb-3">
            IELS Open Recruitment · Batch 3
          </p>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            {division.title} Division
          </h1>

          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {division.description}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            
            <Button
              asChild
              className="bg-[#E56668] text-white px-6 py-3 hover:bg-[#C04C4E]"
            >
              <a
                href="https://forms.gle/DotTzXLZ9vzcF4BJA"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply for this Division
              </a>
            </Button>

            <Button
              asChild
              className="bg-white text-[#2F4157] px-6 py-3 hover:bg-white/80"
            >
              <Link href="https://ielsco.com/about" target="_blank">
                Learn About IELS
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <section className="bg-[#F7F8FA] py-10 px-4">
        <div className="max-w-4xl mx-auto">
          {division.subDivisions.map((sub) => (
            <div
              key={sub.name}
              className="mb-10 bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
            >
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-[#2F4157] mb-2">
                  {sub.name}
                </h2>
                <p className="text-gray-600">{sub.objective}</p>
              </div>

              {/* ===== ROLES ===== */}
              <div className="grid gap-6">
                {sub.roles.map((role) => {
                  const isActive = pressedRole === role.title;

                  return (
                    <button
                      key={role.title}
                      onClick={() => setActiveRole(role)}
                      onPointerDown={() => setPressedRole(role.title)}
                      onPointerUp={() =>
                        setTimeout(() => setPressedRole(null), 120)
                      }
                      onPointerLeave={() => setPressedRole(null)}
                      className={`
                        group relative w-full text-left
                        rounded-3xl border bg-white p-6
                        transition-all duration-300
                        ${
                          isActive
                            ? "border-[#E56668] shadow-xl -translate-y-1"
                            : "border-gray-200 hover:-translate-y-1 hover:shadow-xl hover:border-[#E56668]/60"
                        }
                      `}
                    >
                      {/* ACCENT BAR */}
                      <div
                        className={`
                          absolute left-0 top-6 bottom-6 w-1 rounded-full
                          transition-all duration-300
                          ${
                            isActive
                              ? "bg-[#E56668]"
                              : "bg-transparent group-hover:bg-[#E56668]"
                          }
                        `}
                      />

                      <div className="flex flex-col gap-4 pl-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3
                              className={`
                                text-xl font-bold transition
                                ${
                                  isActive
                                    ? "text-[#E56668]"
                                    : "text-[#2F4157] group-hover:text-[#E56668]"
                                }
                              `}
                            >
                              {role.title}
                            </h3>

                            <p className="text-sm text-gray-500 mt-1">
                              {role.level} · {role.mode}
                            </p>
                          </div>

                          <span
                            className={`
                              text-sm font-semibold text-[#E56668]
                              transition-all duration-300
                              ${
                                isActive
                                  ? "opacity-100 translate-x-0"
                                  : "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                              }
                            `}
                          >
                            View →
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                          {role.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </section>
{/* ===== READY TO GROW (Full Blue Version) ===== */}
<section className="relative bg-[#2f4157] py-20 overflow-hidden text-white">
  
  {/* SUBTLE BACKGROUND GLOW */}
  <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-[#E56668]/20 rounded-full blur-[120px] pointer-events-none" />
  <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />

  <div className="relative max-w-6xl mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      
      {/* ======================================= */}
      {/* 1. LEFT COLUMN: PRINCIPAL CARD (DESKTOP ONLY) */}
      {/* ======================================= */}
      <div className="hidden lg:flex flex-col items-center justify-center text-center group">
        <div className="relative mb-6">
          {/* Border Glow Effect */}
          <div className="absolute -inset-1 bg-white/10 rounded-[28px] blur-sm group-hover:bg-[#E56668]/20 transition duration-500" />
          <img
            src={division.principal.image}
            alt={division.principal.name}
            className="relative w-64 h-64 rounded-3xl object-cover shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div className="space-y-1 mb-5">
          <p className="font-bold text-2xl tracking-tight">
            {division.principal.name}
          </p>
          <p className="text-white/60 font-medium">
            {division.principal.role}
          </p>
        </div>

        {/* SOCIAL ICONS (Desktop) */}
        <div className="flex gap-4 items-center justify-center">
          <a
            href={division.principal.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-white/10 hover:bg-[#E56668] transition-all duration-300 hover:scale-110"
            aria-label="Instagram"
          >
            <Instagram size={20} />
          </a>
          <a
            href={division.principal.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-white/10 hover:bg-[#0077b5] transition-all duration-300 hover:scale-110"
            aria-label="LinkedIn"
          >
            <Linkedin size={20} />
          </a>
        </div>
      </div>

      {/* ======================================= */}
      {/* 2. RIGHT COLUMN: CONTENT + MOBILE CARD  */}
      {/* ======================================= */}
      <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
        
        {/* TITLE */}
        <h3 className="text-3xl sm:text-4xl font-extrabold mb-8 leading-tight">
          Ready to Grow in <br className="hidden sm:block" />
          <span className="text-[#E56668]">{division.title}</span>?
        </h3>

        {/* --- MOBILE PRINCIPAL CARD (MOBILE ONLY) --- */}
        {/* Ditaruh di sini agar muncul DI BAWAH JUDUL tapi DI ATAS QUOTE */}
        <div className="block lg:hidden flex flex-col items-center text-center mb-8 group">
          <div className="relative mb-4">
             <div className="absolute -inset-1 bg-white/10 rounded-[20px] blur-sm group-hover:bg-[#E56668]/20 transition duration-500" />
            <img
              src={division.principal.image}
              alt={division.principal.name}
              className="relative w-40 h-40 object-cover rounded-2xl shadow-xl"
            />
          </div>

          <div className="space-y-1 mb-4">
            <p className="font-semibold text-xl leading-tight">
              {division.principal.name}
            </p>
            <p className="text-sm text-white/70">
              {division.principal.role}
            </p>
          </div>

          {/* SOCIAL ICONS (Mobile) */}
          <div className="flex gap-3 items-center justify-center">
            <a
              href={division.principal.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-[#E56668] transition"
            >
              <Instagram size={18} />
            </a>
            <a
              href={division.principal.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-[#0077b5] transition"
            >
              <Linkedin size={18} />
            </a>
          </div>
        </div>
        {/* --- END MOBILE CARD --- */}

        {/* QUOTE */}
        <div className="w-full border-l-4 border-[#E56668] pl-5 py-4 pr-4 rounded-r-xl mb-6 text-left">
          <p className="text-sm sm:text-base italic text-white/90 leading-relaxed">
            &quot;{division.principal.message}&quot;
          </p>
        </div>

        {/* SUPPORTING TEXT */}
        <p className="text-white/70 text-base mb-10 leading-relaxed max-w-xl">
          Work on real projects, collaborate across teams, and grow under
          structured mentorship. This is not about titles — 
          <b className="text-white"> it&apos;s about building real capability and credibility</b>.
        </p>

        {/* CTA BUTTON */}
        <Button
          asChild
          className="
            bg-[#E56668] text-white px-6 py-2.5 rounded-full text-base font-semibold
            hover:bg-[#C04C4E] hover:shadow
            transition-all duration-300 active:scale-95
          "
        >
          <a
            href="https://forms.gle/DotTzXLZ9vzcF4BJA"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply for this Division
          </a>
        </Button>

      </div>
    </div>
  </div>
</section>

      {/* ===== ROLE MODAL ===== */}
      {activeRole && (
        <RoleModal role={activeRole} onClose={() => setActiveRole(null)} />
      )}

      <Footer />
    </>
  );
}
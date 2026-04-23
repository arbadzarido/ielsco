"use client";

// =============================================================================
// components/school/AICopilotCard.tsx
//
// AI Teaching Copilot — full client component.
// Calls the Anthropic API with real skill data from Supabase and renders:
//   • Per-skill insights (pattern, gap, cohort split, opportunity)
//   • Step-by-step action plan with timing + tags
//   • Curated material suggestions per skill
//   • Offline session plan (minute-by-minute)
//
// Props come from getDashboardData() → skillBreakdown field.
// =============================================================================

import { useState, useCallback } from "react";
import {
  Brain, ChevronDown, ChevronUp, Loader2,
  BookOpen, Mic, Eye, Headphones, BookMarked, Pen,
  Lightbulb, ListChecks, Package, CalendarDays,
} from "lucide-react";
import type { SkillBreakdown } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AICopilotCardProps {
  avgGRS: number;
  totalStudents: number;
  /** Aggregated per-skill averages + at-risk/top counts from Supabase */
  skillBreakdown: SkillBreakdown;
}

type SkillKey = "writing" | "speaking" | "reading" | "listening" | "vocabulary" | "grammar";

interface ActionStep {
  number: number;
  title: string;
  description: string;
  duration: string;
  grouping: string;
  mode: string;
  completed: boolean;
}

interface Material {
  icon: string;
  title: string;
  description: string;
  badge: string;
}

interface SessionActivity {
  timeRange: string;
  activity: string;
  notes: string;
}

interface SessionPlan {
  title: string;
  totalDuration: string;
  activities: SessionActivity[];
}

interface CopilotInsights {
  pattern: string;
  gapBreakdown: string;
  cohortSplit: string;
  growthOpportunity: string;
  priority: "high" | "medium" | "optimize";
  actionSteps: ActionStep[];
  materials: Material[];
  sessionPlans: SessionPlan[];
}

type TabKey = "insights" | "action" | "materials" | "session";

// ── Skill config ──────────────────────────────────────────────────────────────

const SKILL_CONFIG: Record<SkillKey, { label: string; Icon: React.ElementType }> = {
  writing:    { label: "Writing",    Icon: Pen        },
  speaking:   { label: "Speaking",   Icon: Mic        },
  reading:    { label: "Reading",    Icon: BookOpen   },
  listening:  { label: "Listening",  Icon: Headphones },
  vocabulary: { label: "Vocabulary", Icon: BookMarked },
  grammar:    { label: "Grammar",    Icon: Eye        },
};

const TABS: { key: TabKey; label: string; Icon: React.ElementType }[] = [
  { key: "insights",  label: "Insights",     Icon: Lightbulb    },
  { key: "action",    label: "Action Plan",  Icon: ListChecks   },
  { key: "materials", label: "Materials",    Icon: Package      },
  { key: "session",   label: "Session Plan", Icon: CalendarDays },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function priorityStyle(priority: CopilotInsights["priority"]) {
  if (priority === "high")     return "bg-[#E56668]/20 text-[#E56668]";
  if (priority === "medium")   return "bg-amber-400/20 text-amber-300";
  return "bg-emerald-400/20 text-emerald-300";
}

function priorityLabel(priority: CopilotInsights["priority"]) {
  if (priority === "high")   return "HIGH PRIORITY";
  if (priority === "medium") return "MEDIUM";
  return "OPTIMIZE";
}

function insightBorderColor(type: "pattern" | "gap" | "cohort" | "opportunity") {
  const map = {
    pattern:     "border-l-[#E56668]",
    gap:         "border-l-amber-400",
    cohort:      "border-l-blue-400",
    opportunity: "border-l-emerald-400",
  };
  return map[type];
}

// ── Anthropic API call ────────────────────────────────────────────────────────

async function fetchCopilotInsights(
  skill: SkillKey,
  skillBreakdown: SkillBreakdown,
  totalStudents: number,
): Promise<CopilotInsights> {
  const skillData = skillBreakdown[skill];

  const systemPrompt = `You are an expert IELTS teacher trainer and curriculum designer.
You analyze student performance data and produce detailed, actionable teaching recommendations.
Always respond with valid JSON only — no markdown fences, no preamble, no extra text.`;

  const userPrompt = `Analyze this ${skill.toUpperCase()} skill data for a cohort of ${totalStudents} students:

Skill: ${skill}
Average score: ${skillData.avgScore}%
At-risk students (below 50%): ${skillData.atRiskCount} (${Math.round((skillData.atRiskCount / totalStudents) * 100)}%)
Top performers (above 75%): ${skillData.topCount} (${Math.round((skillData.topCount / totalStudents) * 100)}%)
Score distribution: ${JSON.stringify(skillData.scoreDistribution ?? {})}
Common error patterns: ${JSON.stringify(skillData.commonErrors ?? [])}
Recent trend (last 4 weeks): ${skillData.trend ?? "no data"}

Return a JSON object with this exact shape:
{
  "pattern": "2-3 sentences describing the key performance pattern observed",
  "gapBreakdown": "2-3 sentences on specific sub-skill gaps with approximate percentages",
  "cohortSplit": "2-3 sentences on how the class is segmented and what each group needs",
  "growthOpportunity": "2-3 sentences on the highest-leverage next intervention",
  "priority": "high" | "medium" | "optimize",
  "actionSteps": [
    {
      "number": 1,
      "title": "Concise step title with timing (e.g. Week 1, Day 1)",
      "description": "2-3 sentence concrete description of what teacher should do",
      "duration": "e.g. 20 min",
      "grouping": "e.g. Whole class / Pairs / Individual / Small groups",
      "mode": "e.g. In-class / Homework / In-class + follow-up",
      "completed": false
    }
    // 4-5 steps total, ordered sequentially over 2 weeks
  ],
  "materials": [
    {
      "icon": "one of: 📄 📝 🎯 🔗 📊 🎬 🎤 🕐 📻 📋 🗺️ 🔍 ✍️ ⏱️ 🌍 🎓 📈 🗣️ 📚 🔄 📓 🎮 📘 ✏️ 🏆",
      "title": "Material name",
      "description": "One sentence describing the material and what it contains",
      "badge": "Format · Level (e.g. Printable · Beginner–Intermediate)"
    }
    // 4-6 materials total
  ],
  "sessionPlans": [
    {
      "title": "Session N — Topic",
      "totalDuration": "90 min",
      "activities": [
        {
          "timeRange": "0:00–0:20",
          "activity": "Activity name",
          "notes": "Specific instructions for the teacher, including what to watch for"
        }
        // 4-6 activities that fill the session duration
      ]
    }
    // 2-3 sessions covering the 2-week action plan
  ]
}`;

  const response = await fetch("/api/copilot-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userPrompt }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const json = await response.json();
  return json as CopilotInsights;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InsightsPanel({ data }: { data: CopilotInsights }) {
  return (
    <div className="space-y-3">
      {(
        [
          { key: "pattern",          label: "Detected Pattern",    text: data.pattern,           type: "pattern"     },
          { key: "gapBreakdown",     label: "Skill Gap Breakdown", text: data.gapBreakdown,      type: "gap"         },
          { key: "cohortSplit",      label: "Cohort Split",        text: data.cohortSplit,        type: "cohort"      },
          { key: "growthOpportunity",label: "Growth Opportunity",  text: data.growthOpportunity, type: "opportunity" },
        ] as const
      ).map(({ key, label, text, type }) => (
        <div
          key={key}
          className={`bg-[#F7F8FA] rounded-xl p-4 border-l-[3px] ${insightBorderColor(type)}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1.5">
            {label}
          </p>
          <p className="text-[13px] text-[#1A2534] leading-relaxed">{text}</p>
        </div>
      ))}
    </div>
  );
}

function ActionPanel({ steps }: { steps: ActionStep[] }) {
  return (
    <div className="divide-y divide-gray-100">
      {steps.map((step) => (
        <div key={step.number} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          {/* Step number / done indicator */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-black ${
              step.completed
                ? "bg-emerald-400 text-white"
                : "bg-[#1A2534] text-white"
            }`}
          >
            {step.completed ? "✓" : step.number}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1A2534] leading-snug mb-1">
              {step.title}
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed mb-2.5">
              {step.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E56668]/10 text-[#E56668] font-medium">
                {step.duration}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {step.mode}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                {step.grouping}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MaterialsPanel({ materials }: { materials: Material[] }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {materials.map((mat, i) => (
        <div
          key={i}
          className="flex gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-[#E56668]/30 transition-colors bg-white"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F7F8FA] flex items-center justify-center text-[18px] flex-shrink-0">
            {mat.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#1A2534] mb-0.5">{mat.title}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">{mat.description}</p>
            <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[#F7F8FA] text-slate-400 font-medium">
              {mat.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionPanel({ sessions }: { sessions: SessionPlan[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {sessions.map((session, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#F7F8FA] hover:bg-gray-100 transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-full bg-[#E56668] flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
              {i + 1}
            </div>
            <span className="text-[12px] font-bold text-[#1A2534] flex-1 truncate">
              {session.title}
            </span>
            <span className="text-[11px] text-slate-400 mr-1">{session.totalDuration}</span>
            {openIdx === i
              ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
              : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
            }
          </button>

          {openIdx === i && (
            <div className="divide-y divide-gray-50 px-4">
              {session.activities.map((act, j) => (
                <div key={j} className="flex gap-3 py-3">
                  <span className="text-[10px] text-slate-400 font-mono min-w-[72px] flex-shrink-0 pt-0.5">
                    {act.timeRange}
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-[#1A2534] mb-0.5">{act.activity}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{act.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AICopilotCard({ avgGRS, totalStudents, skillBreakdown }: AICopilotCardProps) {
  const [activeSkill, setActiveSkill] = useState<SkillKey>("writing");
  const [activeTab, setActiveTab]     = useState<TabKey>("insights");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Cache insights per skill so we don't re-fetch on tab switch
  const [cache, setCache] = useState<Partial<Record<SkillKey, CopilotInsights>>>({});

  const currentInsights = cache[activeSkill] ?? null;

  const loadInsights = useCallback(async (skill: SkillKey) => {
    if (cache[skill]) return; // already fetched
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCopilotInsights(skill, skillBreakdown, totalStudents);
      setCache((prev) => ({ ...prev, [skill]: data }));
    } catch (e) {
      setError("Could not load AI insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [cache, skillBreakdown, totalStudents]);

  const handleSkillClick = (skill: SkillKey) => {
    setActiveSkill(skill);
    loadInsights(skill);
  };

  // Auto-load the default skill on first render
  const [autoLoaded, setAutoLoaded] = useState(false);
  if (!autoLoaded) {
    setAutoLoaded(true);
    loadInsights("writing");
  }

  const skillScores = Object.entries(skillBreakdown) as [SkillKey, SkillBreakdown[SkillKey]][];

  return (
    <div className="relative bg-white rounded-[24px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">

      {/* ── Dark header ── */}
      <div className="relative bg-[#1A2534] px-5 pt-5 pb-4 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: "#E56668", filter: "blur(60px)" }}
        />

        {/* Title row */}
        <div className="relative flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#E56668]/20 flex items-center justify-center flex-shrink-0">
            <Brain size={16} className="text-[#E56668]" />
          </div>
          <div className="flex-1">
            <p className="text-white text-[13px] font-black leading-none">AI Teaching Copilot</p>
            <p className="text-white/35 text-[10px] mt-0.5">
              Analyzing {totalStudents} student profiles · Avg GRS {avgGRS}%
            </p>
          </div>
          {currentInsights && (
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${priorityStyle(currentInsights.priority)}`}>
              {priorityLabel(currentInsights.priority)}
            </span>
          )}
        </div>

        {/* Skill pills */}
        <div className="relative flex flex-wrap gap-1.5">
          {skillScores.map(([skill, sd]) => {
            const { label } = SKILL_CONFIG[skill];
            const isActive = skill === activeSkill;
            return (
              <button
                key={skill}
                onClick={() => handleSkillClick(skill)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-[#E56668] text-white"
                    : "bg-white/[0.08] text-white/55 hover:bg-white/[0.14] hover:text-white/85"
                }`}
              >
                {label}
                <span className={`ml-1.5 text-[10px] ${isActive ? "text-white/75" : "text-white/35"}`}>
                  {sd.avgScore}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Metric strip ── */}
      {currentInsights && !loading && (
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            {
              val: `${skillBreakdown[activeSkill]?.avgScore ?? "—"}%`,
              lbl: "Avg Score",
              sub: `Target: ${
                currentInsights.priority === "optimize" ? "80" :
                currentInsights.priority === "medium"   ? "70" : "60"
              }%`,
              danger: (skillBreakdown[activeSkill]?.avgScore ?? 0) < 60,
            },
            {
              val: skillBreakdown[activeSkill]?.atRiskCount ?? "—",
              lbl: "At-Risk",
              sub: `${Math.round(((skillBreakdown[activeSkill]?.atRiskCount ?? 0) / totalStudents) * 100)}% of class`,
              danger: true,
            },
            {
              val: skillBreakdown[activeSkill]?.topCount ?? "—",
              lbl: "Top Performers",
              sub: `${Math.round(((skillBreakdown[activeSkill]?.topCount ?? 0) / totalStudents) * 100)}% of class`,
              danger: false,
            },
          ].map(({ val, lbl, sub, danger }) => (
            <div key={lbl} className="px-4 py-3 text-center">
              <p className={`text-[22px] font-black leading-none ${danger && typeof val === "number" && val > 0 ? "text-[#E56668]" : "text-[#1A2534]"}`}>
                {val}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{lbl}</p>
              <p className="text-[9px] text-slate-300 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-100">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              activeTab === key
                ? "text-[#E56668] border-b-2 border-[#E56668]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Panel content ── */}
      <div className="p-5">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 size={20} className="text-[#E56668] animate-spin" />
            <p className="text-[12px] text-slate-400">
              Generating {SKILL_CONFIG[activeSkill].label} insights…
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="py-6 text-center">
            <p className="text-[13px] text-slate-400 mb-3">{error}</p>
            <button
              onClick={() => {
                setCache((prev) => { const c = { ...prev }; delete c[activeSkill]; return c; });
                loadInsights(activeSkill);
              }}
              className="text-[12px] font-bold text-[#E56668] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && currentInsights && (
          <>
            {activeTab === "insights"  && <InsightsPanel  data={currentInsights} />}
            {activeTab === "action"    && <ActionPanel    steps={currentInsights.actionSteps} />}
            {activeTab === "materials" && <MaterialsPanel materials={currentInsights.materials} />}
            {activeTab === "session"   && <SessionPanel   sessions={currentInsights.sessionPlans} />}
          </>
        )}
      </div>
    </div>
  );
}
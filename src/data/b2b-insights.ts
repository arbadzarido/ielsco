// =============================================================================
// File: lib/b2b-insights.ts
// Description: Pitch-ready mock data for IELS Smart Teaching Insights.
// =============================================================================

export const AI_COPILOT_INSIGHT = {
  title: "Weekly AI Recommendation",
  context: "Based on recent GRS data, 65% of Class XII IPA 1 is struggling with Academic Writing.",
  recommendation: "We recommend dedicating your next offline session to essay structuring and thesis generation.",
  suggested_action: "Peer-Review Session",
  link: "/school/modules/academic-writing"
};

export const CLASS_SKILL_HEATMAP = [
  { skill: "Public Speaking", score: 82, status: "Strongest Pillar", color: "bg-[#10b981]" },
  { skill: "Reading Comprehension", score: 75, status: "On Track", color: "bg-[#3b82f6]" },
  { skill: "Vocabulary", score: 68, status: "Developing", color: "bg-[#f59e0b]" },
  { skill: "Listening Comprehension", score: 54, status: "Area for Improvement", color: "bg-[#E56668]" }
];

export const PATHWAY_CLUSTERING = [
  { name: "Scholarship Readiness", percentage: 40, color: "bg-[#2F4157]" },
  { name: "Remote Work English", percentage: 35, color: "bg-[#E56668]" },
  { name: "Academic Fluency", percentage: 25, color: "bg-gray-300" }
];

export const INTERVENTION_RADAR = {
  needsAttention: [
    { id: "1", name: "Budi Santoso", issue: "Stagnant GRS for 3 weeks", avatar: "BS" },
    { id: "2", name: "Siti Aminah", issue: "Missed 2 Milestones", avatar: "SA" }
  ],
  topImprovers: [
    { id: "3", name: "Kevin Pratama", metric: "+12% GRS this month", avatar: "KP" },
    { id: "4", name: "Alya Nisa", metric: "Completed 5 Goals", avatar: "AN" }
  ]
};
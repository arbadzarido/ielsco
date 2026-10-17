// Human-curated learning collections. Not curricula: nothing to complete, no progress tracking.
// Only resources whose link passed the automated check (or IELSco templates, clearly labeled) are included.
// Cover photos: Unsplash License (free to use), saved in /public/images/dashboard. They illustrate the
// topic, not any specific resource. To add a collection: append an object and list resource IDs from resources.ts.

import type { Collection } from "@/lib/dashboard/types";

export const COLLECTIONS: Collection[] = [
  {
    id: "english-for-job-interviews",
    title: "English for Job Interviews",
    outcome: "Answer common interview questions clearly and introduce yourself with confidence.",
    description: "Interview phrases, workplace listening and a self-introduction template, for internships and first jobs.",
    level: "Intermediate (B1–B2)",
    cover: "/images/dashboard/collection-interviews.jpg",
    coverAlt: "Two people shaking hands across a desk with a laptop",
    coverCredit: "Photo via Unsplash",
    resourceIds: ["iels-self-intro-script", "bbc-english-at-work", "cambridge-dictionary", "grammarly-blog"],
    courseTrack: "work-abroad",
  },
  {
    id: "english-speaking-confidence",
    title: "English Speaking Confidence",
    outcome: "Build a weekly listening and speaking habit so everyday conversation feels natural.",
    description: "Short podcasts, everyday lessons and talks you can shadow, plus a simple weekly practice planner.",
    level: "All levels",
    cover: "/images/dashboard/collection-speaking.jpg",
    coverAlt: "Two young women having a conversation at a café table",
    coverCredit: "Photo via Unsplash",
    resourceIds: ["bbc-6-minute-english", "bbc-learning-english", "voa-learning-english", "ted-talks", "iels-weekly-practice-planner"],
    courseTrack: "speaking",
  },
  {
    id: "english-for-academic-study",
    title: "English for Academic Study",
    outcome: "Read and write academic English and prepare stronger university applications.",
    description: "Academic writing guides, a phrase bank and official study-abroad advice.",
    level: "Upper-intermediate (B2+)",
    cover: "/images/dashboard/collection-academic.jpg",
    coverAlt: "A person reading in a large old university library",
    coverCredit: "Photo via Unsplash",
    resourceIds: ["purdue-owl", "academic-phrasebank", "educationusa", "erasmus-plus", "iels-motivation-letter-outline"],
    courseTrack: "scholarship-essay",
  },
  {
    id: "english-for-workplace-communication",
    title: "English for Workplace Communication",
    outcome: "Write polite emails and take part in meetings and calls with less hesitation.",
    description: "Office English lessons, a professional email phrase sheet and clear-writing tips.",
    level: "Intermediate (B1–B2)",
    cover: "/images/dashboard/collection-workplace.jpg",
    coverAlt: "Two colleagues discussing ideas at a whiteboard",
    coverCredit: "Photo via Unsplash",
    resourceIds: ["bbc-english-at-work", "iels-email-phrases", "grammarly-blog", "oxford-learners-dictionaries"],
    courseTrack: "work-abroad",
  },
];

export const getCollection = (id: string) => COLLECTIONS.find((c) => c.id === id);

// Pick the collection that best matches the member's direction/interests.
export function featuredCollectionFor(direction: string | null, interests: string[]) {
  if (interests.some((i) => ["Interview English", "Job applications", "Internships"].includes(i))) return COLLECTIONS[0];
  if (interests.includes("Workplace communication")) return COLLECTIONS[3];
  if (direction === "study") return COLLECTIONS[2];
  if (direction === "work") return COLLECTIONS[0];
  return COLLECTIONS[1];
}

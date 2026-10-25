// Free Resources page (/products/resources): the public taxonomy over the curated, link-checked library in
// src/data/dashboard/resources.ts (single source for titles, descriptions and URLs). IELSco is about opportunities, so
// topics are about applying and going abroad; general English practice is one small topic that points to Elco AI.
// Unpublished IELSco templates (url: null) never appear: there are no download buttons for files that don't exist.
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import type { Resource } from "@/lib/dashboard/types";

export type Topic = "scholarships" | "applications" | "interviews" | "study-abroad" | "career" | "english";

export const TOPICS: { id: Topic; label: string; blurb: string }[] = [
  { id: "scholarships", label: "Scholarships & funding", blurb: "Official pages of major scholarship programs." },
  { id: "applications", label: "CVs, essays & letters", blurb: "Writing guides for motivation letters, essays and academic applications." },
  { id: "interviews", label: "Interviews", blurb: "Preparing for scholarship and job interviews." },
  { id: "study-abroad", label: "Study abroad", blurb: "Official advising and test preparation for studying abroad." },
  { id: "career", label: "Career & workplace", blurb: "Communicating well in international workplaces." },
  { id: "english", label: "English practice", blurb: "Free places to practise. For daily guided practice, use Elco AI." },
];

const TOPIC_OF: Record<string, Topic> = {
  chevening: "scholarships", "australia-awards": "scholarships", daad: "scholarships", "erasmus-plus": "scholarships",
  "purdue-owl": "applications", "academic-phrasebank": "applications", "grammarly-blog": "applications",
  "indeed-interviewing": "interviews",
  educationusa: "study-abroad", "takeielts-prepare": "study-abroad", "learning-how-to-learn": "study-abroad",
  "bbc-english-at-work": "career",
  "bbc-learning-english": "english", "bbc-6-minute-english": "english", "british-council-learnenglish": "english", "voa-learning-english": "english",
  "ted-talks": "english", "cambridge-dictionary": "english", "oxford-learners-dictionaries": "english", "khan-academy-grammar": "english",
};

export interface PublicResource extends Resource { topic: Topic }

export const PUBLIC_RESOURCES: PublicResource[] = DEMO_RESOURCES
  .filter((r) => r.url && TOPIC_OF[r.id])
  .map((r) => ({ ...r, topic: TOPIC_OF[r.id] }));

// IELSco's own published material (pages that exist on this site).
export const IELS_GUIDES = [
  { title: "Member stories", text: "Members who studied, interned or volunteered abroad, in their own words.", href: "/circle/stories" },
  { title: "Opportunity board", text: "Scholarships and programs with official links and honest verification labels.", href: "/opportunities" },
  { title: "IELTS guide", text: "Test format and how to prepare.", href: "/test/guide/ielts" },
  { title: "TOEFL guide", text: "Test format and how to prepare.", href: "/test/guide/toefl" },
];

// The guided "Share your story" questionnaire (circle.ielsco.com/stories/submit). The same definitions label the
// original answers in the admin editor and feed the AI drafting prompt, so a key never changes meaning.

export const SUPPORT_EMAIL = "support@ielsco.com";

// Shown after a successful submission (verbatim from the Member Stories brief).
export const SUBMISSION_CONFIRMATION = {
  title: "Thank you!",
  body:
    "Thank you for sharing your journey with IELSco. Our team will review your submission and may edit the story for clarity while preserving your experience. " +
    "Your story will not appear publicly until it has been reviewed and approved.",
};

export interface Question {
  key: string;
  label: string;
  help?: string;
  long?: boolean;
  required?: boolean;
  max?: number;
}

export interface QuestionStep {
  id: "about" | "journey" | "support";
  title: string;
  intro: string;
  questions: Question[];
}

export const STEPS: QuestionStep[] = [
  {
    id: "about",
    title: "About you",
    intro: "Tell us who you are. We only show what you allow at the end of this form.",
    questions: [
      { key: "name", label: "Full name", required: true, max: 120 },
      { key: "preferred_name", label: "What should we call you in the story?", help: "A first name or nickname.", max: 60 },
      { key: "email", label: "Email", help: "Only used to contact you about your story. Never published.", required: true, max: 254 },
      { key: "city", label: "City or region", max: 120 },
      { key: "role", label: "What do you do now?", help: "For example: Accounting student at …, Marketing intern at …", max: 200 },
      { key: "iels_connection", label: "How are you connected to IELS?", help: "IELS Circle sessions, a program, an event, the team…", max: 300 },
      { key: "instagram", label: "Instagram (optional)", help: "Handle or link, if you'd like readers to find you.", max: 200 },
      { key: "linkedin", label: "LinkedIn (optional)", max: 300 },
    ],
  },
  {
    id: "journey",
    title: "Your journey",
    intro: "Answer in your own words. Short answers are fine; specific moments and real details make the best stories.",
    questions: [
      { key: "before", label: "Where were you before this journey started?", long: true, required: true, max: 2000 },
      { key: "goal", label: "What did you want to achieve?", long: true, required: true, max: 2000 },
      { key: "challenges", label: "What challenges did you face?", long: true, max: 2000 },
      { key: "motivation", label: "What kept you going?", long: true, max: 2000 },
      { key: "steps", label: "What steps did you take?", help: "Programs, applications, practice, people who helped…", long: true, max: 2000 },
      { key: "turning_point", label: "Was there a turning point? Describe the moment.", long: true, max: 2000 },
      { key: "change", label: "What changed for you?", long: true, max: 2000 },
      { key: "now", label: "Where are you now?", long: true, required: true, max: 2000 },
      { key: "advice", label: "What would you tell someone starting the same path?", long: true, max: 2000 },
    ],
  },
  {
    id: "support",
    title: "Supporting information",
    intro: "Optional details that help us tell your story accurately.",
    questions: [
      { key: "english_role", label: "Where did English come in?", help: "A specific conversation, interview, class or trip.", long: true, max: 2000 },
      { key: "dates_places", label: "Key dates, places and organisations", help: "Names exactly as they should appear.", long: true, max: 2000 },
      { key: "links", label: "Links (articles, certificates, posts)", long: true, max: 1000 },
      { key: "image_notes", label: "About your photos", help: "What is in each photo, where and when it was taken, and who is in it.", long: true, max: 2000 },
      { key: "anything_else", label: "Anything else we should know?", long: true, max: 2000 },
    ],
  },
];

export const ALL_QUESTIONS: Question[] = STEPS.flatMap((s) => s.questions);
const LABELS = new Map(ALL_QUESTIONS.map((q) => [q.key, q.label]));

// Normalised list of {question, answer} for display and for the AI prompt. Supports form answers ({key: value}) and
// editorial imports ({format: "interview", items: [{question, answer}]}).
export function answerList(answers: Record<string, unknown> | null | undefined): { key: string; question: string; answer: string }[] {
  if (!answers) return [];
  if (answers.format === "interview" && Array.isArray(answers.items)) {
    return (answers.items as { question?: string; answer?: string }[]).map((it, i) => ({
      key: `q${i + 1}`,
      question: String(it.question ?? `Question ${i + 1}`),
      answer: String(it.answer ?? ""),
    }));
  }
  return Object.entries(answers)
    .filter(([k, v]) => k !== "email" && typeof v === "string" && v.trim())
    .map(([k, v]) => ({ key: k, question: LABELS.get(k) ?? k, answer: String(v) }));
}

export const SUBMISSION_IMAGE = { maxCount: 6, maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] };
export const STORY_IMAGE = { maxBytes: 8 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] };

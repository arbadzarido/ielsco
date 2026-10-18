// AI first draft of a member story from the member's original answers, using the AI providers the IELSco repo
// already has: Anthropic (ANTHROPIC_API_KEY, as in /api/copilot-insights) or Google Gemini (GEMINI_API_KEY, as in
// /api/test/process-result). The draft is stored next to the answers (member_story_submissions.ai_draft), never
// over them, and an editor decides what goes into the story.
//
// Guardrails on top of the prompt: quotes survive only if they appear word for word in the answers, highlights only
// if every number in them appears in the answers, image suggestions only for images the member actually sent.
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyHighlights, verifyQuotes } from "./guardrails";
import { answerList } from "./questionnaire";
import { sanitizeStoryHtml } from "./sanitize";
import { CATEGORIES, STORY_TYPES } from "./types";

export interface AiDraft {
  title: string;
  summary: string;
  category: string;
  story_type: string;
  author: { role?: string; location?: string };
  sections: { title: string; content: string; image?: string }[];
  quotes: { text: string; attribution?: string }[];
  highlights: { value: string; label: string }[];
  seo: { meta_title: string; meta_description: string; meta_keywords: string };
  image_suggestions: { image: string; placement: string; reason: string }[];
  missing_details: string[];
  removed_by_checks: string[];
}

export interface DraftInput {
  name: string;
  preferredName?: string;
  country?: string | null;
  answers: Record<string, unknown>;
  images: { path: string; note?: string }[];
}

const SYSTEM = `You are an editor for IELS Circle, a free English-practice community for young people across Southeast Asia.
You turn a member's own answers into a first draft of a "member story" for circle.ielsco.com/stories. A human editor reviews everything.

Hard rules:
- Use ONLY facts stated in the answers. Never invent or embellish facts, numbers, dates, places, institutions, awards, achievements, feelings or outcomes.
- Quotes must be copied word for word from the member's answers (you may shorten by cutting at sentence boundaries, never rephrase). If nothing is quotable, return an empty quotes array.
- If a detail a reader would expect is missing or unclear (dates, the institution's exact name, what happened next, photo contents), do not guess: add it to missing_details.
- Highlights are short facts already in the answers (e.g. a number of weeks, a country). Return fewer or none rather than inventing.
- Write in clear, warm, simple English, third person, past or present tense as fits. Keep it human, not an advertisement or a testimonial for IELS.
- Sections: 3 to 5, each with a short title and 1 to 2 paragraphs of HTML using only <p>, <strong>, <em>.
- image_suggestions may only reference the image ids listed in the input, and only suggest placements you can justify from the member's notes; otherwise say the editor must check the photo.
- Output a single JSON object, no markdown.`;

function schemaHint() {
  return `JSON shape:
{"title": string (max 90 chars), "summary": string (1-2 sentences), "category": one of ${JSON.stringify(CATEGORIES)},
 "story_type": one of ${JSON.stringify(Object.keys(STORY_TYPES))}, "author": {"role": string?, "location": string?},
 "sections": [{"title": string, "content": html string, "image": image id?}], "quotes": [{"text": string, "attribution": string}],
 "highlights": [{"value": string, "label": string}], "seo": {"meta_title": string, "meta_description": string (max 160 chars), "meta_keywords": string},
 "image_suggestions": [{"image": image id, "placement": "banner" | "avatar" | "section:N" | "gallery", "reason": string}],
 "missing_details": [string]}`;
}

function buildPrompt(input: DraftInput) {
  const qa = answerList(input.answers);
  const imgs = input.images.map((im, i) => ({ id: `img${i + 1}`, file: im.path.split("/").pop(), note: im.note ?? "" }));
  return `Member: ${input.name}${input.preferredName ? ` (call them ${input.preferredName})` : ""}${input.country ? `, country code ${input.country}` : ""}

Answers (the only source of facts):
${qa.map((x) => `### ${x.question}\n${x.answer}`).join("\n\n")}

Images sent by the member (contents unknown unless described in the answers):
${imgs.length ? JSON.stringify(imgs) : "none"}

${schemaHint()}`;
}

export function checkDraft(raw: unknown, input: DraftInput): AiDraft {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const source = answerList(input.answers).map((x) => x.answer).join("\n");
  const removed: string[] = [];
  const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];
  const imageIds = new Map(input.images.map((im, i) => [`img${i + 1}`, im.path]));
  const mapImage = (v: unknown) => (typeof v === "string" && imageIds.has(v) ? imageIds.get(v) : undefined);

  const quotes = verifyQuotes(
    arr(d.quotes).map((q) => ({ text: str(q.text, 400).replace(/^["“]|["”]$/g, ""), attribution: str(q.attribution, 80) || input.preferredName || input.name.split(" ")[0] })),
    source, removed);
  const highlights = verifyHighlights(arr(d.highlights).map((h) => ({ value: str(h.value, 40), label: str(h.label, 80) })), source, removed);
  const sections = arr(d.sections)
    .map((s) => ({ title: str(s.title, 120), content: sanitizeStoryHtml(str(s.content, 6000)), image: mapImage(s.image) }))
    .filter((s) => s.title && s.content)
    .map((s) => (s.image ? s : { title: s.title, content: s.content }));
  const image_suggestions = arr(d.image_suggestions)
    .map((s) => ({ image: mapImage(s.image) ?? "", placement: str(s.placement, 40), reason: str(s.reason, 300) }))
    .filter((s) => s.image);
  const seo = (d.seo && typeof d.seo === "object" ? d.seo : {}) as Record<string, unknown>;
  const author = (d.author && typeof d.author === "object" ? d.author : {}) as Record<string, unknown>;
  const category = CATEGORIES.includes(d.category as never) ? String(d.category) : "circle";
  const storyType = String(d.story_type) in STORY_TYPES ? String(d.story_type) : "other";

  return {
    title: str(d.title, 200),
    summary: str(d.summary, 400),
    category,
    story_type: storyType,
    author: { role: str(author.role, 200) || undefined, location: str(author.location, 120) || undefined },
    sections,
    quotes,
    highlights,
    seo: { meta_title: str(seo.meta_title, 120), meta_description: str(seo.meta_description, 200), meta_keywords: str(seo.meta_keywords, 300) },
    image_suggestions,
    missing_details: arr(d.missing_details).map((m) => String(m).slice(0, 300)).filter(Boolean),
    removed_by_checks: removed,
  };
}

function parseJson(text: string): unknown {
  const clean = text.replace(/```json\s*|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI response was not JSON.");
  return JSON.parse(clean.slice(start, end + 1));
}

export function aiProviderConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

export async function generateStoryDraft(input: DraftInput): Promise<{ draft: AiDraft; model: string }> {
  const prompt = buildPrompt(input);
  const errors: string[] = [];
  // Anthropic first, Gemini as a fallback; whichever is configured.
  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.STORIES_AI_MODEL || "claude-sonnet-5-5";
    try {
      const client = new Anthropic();
      const msg = await client.messages.create({ model, max_tokens: 4000, system: SYSTEM, messages: [{ role: "user", content: prompt }] });
      const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
      return { draft: checkDraft(parseJson(text), input), model };
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.STORIES_GEMINI_MODEL || "gemini-2.5-flash";
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const m = genAI.getGenerativeModel({ model, systemInstruction: SYSTEM, generationConfig: { responseMimeType: "application/json", temperature: 0.4 } });
      const res = await m.generateContent(prompt);
      return { draft: checkDraft(parseJson(res.response.text()), input), model };
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (errors.length) throw new Error(`AI drafting failed. ${errors.join(" | ")}`.slice(0, 900));
  throw new Error("No AI provider is configured on the server (ANTHROPIC_API_KEY or GEMINI_API_KEY). Write the story manually or add a key and retry.");
}

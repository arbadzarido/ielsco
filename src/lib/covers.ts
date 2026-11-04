// Category cover photos (public/images/dashboard/stock, Unsplash License, see CREDITS.md there). They illustrate a
// kind of opportunity, material or event, never a specific listing; a listing's own image always wins over these.

const STOCK = "/images/dashboard/stock";

export const OPPORTUNITY_COVER: Record<string, string> = {
  scholarship: `${STOCK}/opp-scholarship.jpg`,
  internship: `${STOCK}/opp-internship.jpg`,
  fellowship: `${STOCK}/opp-fellowship.jpg`,
  exchange: `${STOCK}/opp-exchange.jpg`,
  competition: `${STOCK}/opp-competition.jpg`,
  volunteering: `${STOCK}/opp-volunteering.jpg`,
  conference: `${STOCK}/opp-conference.jpg`,
  program: `${STOCK}/opp-program.jpg`,
  job: `${STOCK}/opp-jobs-abroad.jpg`,
};
// Categories with more than one fitting cover rotate by listing (stable per slug), so a page of scholarships doesn't
// repeat one photo.
const OPPORTUNITY_VARIANTS: Record<string, string[]> = {
  scholarship: [`${STOCK}/opp-scholarship.jpg`, `${STOCK}/program-global-pathways.jpg`, "/images/dashboard/collection-academic.jpg"],
};
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function opportunityCover(category: string, slug = "") {
  const variants = OPPORTUNITY_VARIANTS[category];
  if (variants && slug) return variants[hash(slug) % variants.length];
  return OPPORTUNITY_COVER[category] ?? OPPORTUNITY_COVER.program;
}

// Learning Materials: videos and podcasts by type; everything else by topic (the dashboard collection photos already
// cover four of the topics).
const MATERIAL_BY_TYPE: Record<string, string> = {
  Video: `${STOCK}/material-video.jpg`,
  Course: `${STOCK}/material-video.jpg`,
  Podcast: `${STOCK}/material-podcast.jpg`,
};
const MATERIAL_BY_TOPIC: Record<string, string> = {
  "English Speaking": "/images/dashboard/collection-speaking.jpg",
  "English for Interviews": "/images/dashboard/collection-interviews.jpg",
  "Workplace Communication": "/images/dashboard/collection-workplace.jpg",
  "Academic English": "/images/dashboard/collection-academic.jpg",
  "Writing & Applications": `${STOCK}/material-tool.jpg`,
  "Vocabulary & Grammar": `${STOCK}/material-article.jpg`,
  "Learning Strategies": `${STOCK}/opp-program.jpg`,
};
export const materialCover = (type: string, topic: string) => MATERIAL_BY_TYPE[type] ?? MATERIAL_BY_TOPIC[topic];

export const STORY_FALLBACK_COVER = `${STOCK}/material-article.jpg`;
export const COMMUNITY_EVENT_COVER = `${STOCK}/opp-program.jpg`;

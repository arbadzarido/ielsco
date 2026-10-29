import type { Article, Lang } from "./types";
import { ARTICLES_PATH } from "./types";
import { englishSpeakingCommunity } from "./english-speaking-community";
import { scholarshipEnglish } from "./scholarship-english";
import { commonMistakes } from "./common-mistakes";
import { gifBatch2 } from "./gif-batch-2";

// Published articles, newest first. To add one: write src/content/articles/<key>.ts (both languages), add it here.
export const ARTICLES: Article[] = [englishSpeakingCommunity, scholarshipEnglish, commonMistakes, gifBatch2]
  .sort((a, b) => b.published.localeCompare(a.published));

export const articlePath = (a: Article, lang: Lang) => `${ARTICLES_PATH[lang]}/${a[lang].slug}`;
export const findArticle = (lang: Lang, slug: string) => ARTICLES.find((a) => a[lang].slug === slug);

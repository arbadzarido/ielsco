// IELSco articles: plain, typed content (no Markdown dependency, no raw HTML). Each article has an English and an
// Indonesian version with their own slug; both are published together and point at each other (hreflang).
// Inline text supports only [label](url) links, **bold** and *italic*. Editorial rules: content/editorial-guidelines.md in the
// ielsco-merged workspace (facts from first-hand IELSco records or cited primary sources, no invented numbers or quotes).

export type Lang = "en" | "id";
export type Pillar = "community" | "opportunities" | "english" | "connection";

export type Block =
  | { h2: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { note: string };

export interface ArticleVersion {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  body: Block[];
}

export interface Source {
  label: string;
  url: string;
  accessed: string; // YYYY-MM-DD
}

export interface Article {
  key: string;
  pillar: Pillar;
  published: string; // YYYY-MM-DD
  updated: string;
  sources: Source[];
  en: ArticleVersion;
  id: ArticleVersion;
}

export const PILLARS: Record<Pillar, Record<Lang, string>> = {
  community: { en: "Community & events", id: "Komunitas & acara" },
  opportunities: { en: "Global opportunities", id: "Peluang global" },
  english: { en: "Practical English", id: "Bahasa Inggris praktis" },
  connection: { en: "Community & connection", id: "Komunitas & koneksi" },
};

export const ARTICLES_PATH: Record<Lang, string> = { en: "/articles", id: "/id/artikel" };

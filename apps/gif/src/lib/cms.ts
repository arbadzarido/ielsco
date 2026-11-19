import "server-only";
import { q } from "./db";
import { CONTENT_DEFAULTS, type ContentKeys } from "./content";

// CMS content for the current cohort, falling back to the published defaults when nothing is stored (or the database is
// unreachable, e.g. a preview without GIF_DATABASE_URL).
export async function getContent<K extends keyof ContentKeys>(key: K): Promise<ContentKeys[K]> {
  try {
    const rows = await q<{ value: ContentKeys[K] }>("select c.value from gif.content c join gif.cohorts h on h.id = c.cohort_id where h.is_current and c.key = $1", [key]);
    return rows[0]?.value ?? CONTENT_DEFAULTS[key];
  } catch {
    return CONTENT_DEFAULTS[key];
  }
}

export async function publishedAnnouncements(audience: string[]) {
  return q<{ id: string; title: string; body: string; published_at: string; audience: string }>(
    `select a.id, a.title, a.body, a.published_at, a.audience from gif.announcements a join gif.cohorts c on c.id = a.cohort_id
     where c.is_current and a.published_at is not null and a.published_at <= now() and a.audience = any($1) order by a.published_at desc limit 20`, [audience]);
}

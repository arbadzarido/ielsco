"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle, Check, Minus, Plus, RefreshCw } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../PageStates";
import { btnPrimary, btnSecondary, cardGloss, focusRing, tag } from "../ui";
import { countryName, flagEmoji } from "@/lib/dashboard/countries";
import { CATEGORY_LABELS, STORY_TYPES, type StoryCategory, type StoryType } from "@/lib/stories/types";
import { IELSCO_CATEGORIES, IELSCO_CATEGORY_LABELS, ielscoStoryPath, type IelscoCategory } from "@/lib/stories/ielsco";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STORY_LIST_COLUMNS, SUBMISSION_LIST_COLUMNS, type StoryListRow, type StorySection, type SubmissionListRow } from "./data";

type Row = StoryListRow & { banner_image: string | null; author_avatar: string | null };
type TabId = "pending" | "published" | "drafts" | "archived" | "placeholders" | "coverage";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending Review" },
  { id: "published", label: "Published" },
  { id: "drafts", label: "Drafts" },
  { id: "archived", label: "Rejected / Archived" },
  { id: "placeholders", label: "Editorial placeholders" },
  { id: "coverage", label: "Coverage" },
];

const inTab = (r: Row, t: TabId) =>
  t === "placeholders" ? r.kind === "placeholder"
    : r.kind !== "story" ? false
    : t === "pending" ? r.status === "pending_review" || r.status === "needs_info"
    : t === "published" ? r.status === "published"
    : t === "drafts" ? r.status === "draft"
    : t === "archived" ? r.status === "rejected" || r.status === "archived"
    : false;

// Things an editor should look at before publishing, from the row and its submission.
function issuesFor(r: Row, s: SubmissionListRow | undefined): string[] {
  const out = [...(Array.isArray(r.issues) ? r.issues : [])];
  if (r.kind === "story" && r.status !== "published") {
    if (!r.publication_authorized) out.push("Authorization for public use not confirmed");
    if (s && !s.consent_review) out.push("No recorded consent to publish on the website");
    if (s?.ai_status === "failed") out.push("AI draft failed (retry or write manually)");
    if (!r.author_avatar) out.push("No avatar");
    if (!r.banner_image) out.push("No banner image");
  }
  return [...new Set(out)];
}

const SEA = ["ID", "MY", "SG", "TH", "PH", "VN", "KH", "MM", "LA", "BN", "TL"];

function Consent({ v, known }: { v?: boolean; known: boolean }) {
  if (!known) return <span className="text-[13px] text-[#2F4157]/45">n/a</span>;
  return v ? <Check size={18} className="text-[#2E7D5B]" aria-label="Yes" /> : <Minus size={18} className="text-[#E56668]" aria-label="No" />;
}

// Member Stories / IELSco Stories switch (same CMS, two sections).
function SectionSwitch({ section }: { section: StorySection }) {
  const cls = (on: boolean) => cn("rounded-full px-[16px] py-[8px] text-[15px] font-semibold", focusRing, on ? "bg-[#2F4157] text-white" : "text-[#2F4157]/75 hover:bg-[#F1F4F8]");
  return (
    <div className="mb-[18px] inline-flex rounded-full border border-[#E3E7ED] bg-white p-[4px]" role="tablist" aria-label="Story section" data-testid="section-switch">
      <Link role="tab" aria-selected={section === "member"} href="/dashboard/admin/stories" className={cls(section === "member")}>Member Stories</Link>
      <Link role="tab" aria-selected={section === "ielsco"} href="/dashboard/admin/stories?section=ielsco" className={cls(section === "ielsco")} data-testid="section-ielsco">IELSco Stories</Link>
    </div>
  );
}

export function StoriesAdmin({ supabase, section = "member" }: { supabase: SupabaseClient; section?: StorySection }) {
  const [tab, setTab] = useState<TabId>("pending");
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: Row[]; subs: SubmissionListRow[] }>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const [stories, subs] = await Promise.all([
      supabase.from("member_stories").select(`${STORY_LIST_COLUMNS}, banner_image, author_avatar`).order("updated_at", { ascending: false }),
      supabase.from("member_story_submissions").select(SUBMISSION_LIST_COLUMNS).order("created_at", { ascending: false }),
    ]);
    if (stories.error || subs.error) return setState({ status: "error", message: (stories.error ?? subs.error)!.message });
    setState({ status: "ready", rows: stories.data as unknown as Row[], subs: subs.data as SubmissionListRow[] });
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const subById = useMemo(() => new Map(state.status === "ready" ? state.subs.map((s) => [s.id, s]) : []), [state]);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={load} />;

  if (section === "ielsco") return <><SectionSwitch section={section} /><IelscoAdmin rows={state.rows.filter((r) => r.section === "ielsco")} onRefresh={load} /></>;
  const memberRows = state.rows.filter((r) => r.section !== "ielsco");
  const counts = Object.fromEntries(TABS.map((t) => [t.id, memberRows.filter((r) => inTab(r, t.id)).length]));
  const rows = memberRows.filter((r) => inTab(r, tab));

  return (
    <div data-testid="stories-admin">
      <SectionSwitch section={section} />
      <PageHeader title="Member Stories" description="Review submissions, edit drafts and publish stories to circle.ielsco.com/stories.">
        <div className="flex flex-wrap gap-[8px]">
          <button type="button" onClick={load} className={cn(btnSecondary, "px-4 py-2")}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
          <Link href="/dashboard/admin/stories/new" className={cn(btnPrimary, "px-4 py-2")} data-testid="create-story"><Plus size={16} aria-hidden="true" /> Create story</Link>
        </div>
      </PageHeader>

      <div role="tablist" aria-label="Story queues" className="mb-[20px] flex gap-[8px] overflow-x-auto pb-[4px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("shrink-0 rounded-full px-[16px] py-[8px] text-[15px] font-semibold transition-colors", focusRing,
              tab === t.id ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white text-[#2F4157]/80 hover:bg-[#F7F8FA]")}
          >
            {t.label}{t.id !== "coverage" && <span className="ml-[6px] opacity-70">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {tab === "coverage" ? (
        <Coverage rows={memberRows} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" body={tab === "pending" ? "No submissions are waiting for review." : "No stories in this list."} />
      ) : (
        <div className={cn(cardGloss, "overflow-x-auto")}>
          <table className="w-full min-w-[980px] text-left text-[15px]">
            <thead className="border-b border-[#E3E7ED] text-[13px] uppercase tracking-[0.06em] text-[#2F4157]/55">
              <tr>
                <th className="px-[16px] py-[12px]">Name</th>
                <th className="px-[12px] py-[12px]">Country</th>
                <th className="px-[12px] py-[12px]">Date</th>
                <th className="px-[12px] py-[12px]">Title</th>
                <th className="px-[12px] py-[12px]">Status</th>
                <th className="px-[12px] py-[12px]" title="Consent to review and publish on the website">Website</th>
                <th className="px-[12px] py-[12px]" title="Happy to be contacted about an Instagram feature">Instagram</th>
                <th className="px-[12px] py-[12px]">Draft</th>
                <th className="px-[12px] py-[12px]">Needs attention</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = r.submission_id ? subById.get(r.submission_id) : undefined;
                const issues = issuesFor(r, s);
                const country = r.author_country || r.target_country;
                const date = s?.created_at ?? r.published_at ?? r.sort_date ?? r.created_at;
                const draft = s?.ai_status === "ready" ? "AI draft" : s?.ai_status === "generating" ? "Generating…" : r.kind === "placeholder" ? "Brief" : s && r.status !== "published" ? (s.ai_status === "failed" ? "Failed" : "None yet") : "Written";
                return (
                  <tr key={r.id} className="border-b border-[#E3E7ED]/70 last:border-0 hover:bg-[#F7F8FA]" data-testid="queue-row">
                    <td className="px-[16px] py-[12px] font-semibold">
                      <Link href={`/dashboard/admin/stories/${r.id}`} className={cn("hover:underline", focusRing)}>{r.author_name || s?.name || "(no name yet)"}</Link>
                    </td>
                    <td className="px-[12px] py-[12px] whitespace-nowrap">{country ? `${flagEmoji(country)} ${countryName(country)}` : "—"}</td>
                    <td className="px-[12px] py-[12px] whitespace-nowrap text-[#2F4157]/70">{date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-[12px] py-[12px] max-w-[280px]">
                      <Link href={`/dashboard/admin/stories/${r.id}`} className="line-clamp-2 hover:underline">{r.title}</Link>
                      <span className="text-[13px] text-[#2F4157]/50">{CATEGORY_LABELS[r.category as StoryCategory]} · {STORY_TYPES[r.story_type]}</span>
                    </td>
                    <td className="px-[12px] py-[12px]"><span className={tag}>{STATUS_LABELS[r.status]}</span></td>
                    <td className="px-[12px] py-[12px]"><Consent v={s?.consent_review} known={!!s} /></td>
                    <td className="px-[12px] py-[12px]"><Consent v={s?.consent_instagram} known={!!s} /></td>
                    <td className="px-[12px] py-[12px] whitespace-nowrap text-[14px]">{draft}</td>
                    <td className="px-[12px] py-[12px] text-[14px]">
                      {issues.length ? (
                        <ul className="space-y-[2px]">
                          {issues.slice(0, 3).map((i) => <li key={i} className="flex gap-[6px] text-[#9A4A2E]"><AlertTriangle size={14} className="mt-[3px] shrink-0" aria-hidden="true" />{i}</li>)}
                          {issues.length > 3 && <li className="text-[#2F4157]/50">+{issues.length - 3} more</li>}
                        </ul>
                      ) : <span className="text-[#2F4157]/45">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Coverage({ rows }: { rows: Row[] }) {
  const stories = rows.filter((r) => r.kind === "story");
  const countries = [...new Set([...SEA, ...stories.map((r) => r.author_country).filter(Boolean) as string[]])];
  const types = Object.keys(STORY_TYPES) as StoryType[];
  const pub = stories.filter((r) => r.status === "published");
  const pipeline = stories.filter((r) => ["draft", "pending_review", "needs_info"].includes(r.status));
  const placeholders = rows.filter((r) => r.kind === "placeholder" && r.status !== "archived");
  const count = (list: Row[], f: (r: Row) => boolean) => list.filter(f).length;

  return (
    <div className="space-y-[24px]" data-testid="coverage">
      <div className={cn(cardGloss, "overflow-x-auto")}>
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <caption className="px-[16px] pt-[14px] text-left text-[17px] font-bold">By country</caption>
          <thead className="border-b border-[#E3E7ED] text-[13px] uppercase tracking-[0.06em] text-[#2F4157]/55">
            <tr><th className="px-[16px] py-[10px]">Country</th><th className="px-[12px]">Published</th><th className="px-[12px]">In pipeline</th><th className="px-[12px]">Placeholders</th><th className="px-[12px]">Story types published</th></tr>
          </thead>
          <tbody>
            {countries.map((c) => {
              const p = count(pub, (r) => r.author_country === c);
              return (
                <tr key={c} className={cn("border-b border-[#E3E7ED]/70 last:border-0", p === 0 && "bg-[#E56668]/[0.04]")}>
                  <td className="px-[16px] py-[10px] font-semibold whitespace-nowrap">{flagEmoji(c)} {countryName(c)}</td>
                  <td className="px-[12px]">{p}</td>
                  <td className="px-[12px]">{count(pipeline, (r) => r.author_country === c)}</td>
                  <td className="px-[12px]">{count(placeholders, (r) => r.target_country === c)}</td>
                  <td className="px-[12px] text-[14px] text-[#2F4157]/70">{[...new Set(pub.filter((r) => r.author_country === c).map((r) => STORY_TYPES[r.story_type]))].join(", ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={cn(cardGloss, "overflow-x-auto")}>
        <table className="w-full min-w-[520px] text-left text-[15px]">
          <caption className="px-[16px] pt-[14px] text-left text-[17px] font-bold">By story type</caption>
          <thead className="border-b border-[#E3E7ED] text-[13px] uppercase tracking-[0.06em] text-[#2F4157]/55">
            <tr><th className="px-[16px] py-[10px]">Type</th><th className="px-[12px]">Published</th><th className="px-[12px]">In pipeline</th><th className="px-[12px]">Placeholders</th></tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t} className="border-b border-[#E3E7ED]/70 last:border-0">
                <td className="px-[16px] py-[10px] font-semibold">{STORY_TYPES[t]}</td>
                <td className="px-[12px]">{count(pub, (r) => r.story_type === t)}</td>
                <td className="px-[12px]">{count(pipeline, (r) => r.story_type === t)}</td>
                <td className="px-[12px]">{count(placeholders, (r) => r.story_type === t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── IELSco Stories list ─────────────────────────────────────────────────────────────────────────────────────────
type IelscoTab = "all" | "published" | "scheduled" | "drafts" | "archived";
const IELSCO_TABS: { id: IelscoTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "scheduled", label: "Scheduled" },
  { id: "drafts", label: "Drafts" },
  { id: "archived", label: "Archived" },
];
const isScheduled = (r: Row) => r.status === "published" && !!r.published_at && Date.parse(r.published_at) > Date.now();
const inIelscoTab = (r: Row, t: IelscoTab) =>
  t === "all" ? true
    : t === "published" ? r.status === "published" && !isScheduled(r)
    : t === "scheduled" ? isScheduled(r)
    : t === "drafts" ? ["draft", "pending_review", "needs_info"].includes(r.status)
    : r.status === "archived" || r.status === "rejected";

function ielscoIssues(r: Row, rows: Row[]): string[] {
  const out = [...(Array.isArray(r.issues) ? r.issues : [])];
  if (!r.banner_image) out.push("No featured image");
  if (r.lang === "id" && !r.translation_of) out.push("Not linked to its English original");
  if (r.lang === "en" && !rows.some((x) => x.translation_of === r.id)) out.push("No Indonesian version yet");
  if (r.status !== "published" && !r.publication_authorized) out.push("Editorial review not confirmed");
  return [...new Set(out)];
}

function IelscoAdmin({ rows, onRefresh }: { rows: Row[]; onRefresh: () => void }) {
  const [tab, setTab] = useState<IelscoTab>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<IelscoCategory | "">("");
  const [lang, setLang] = useState<"" | "en" | "id">("");
  const query = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => inIelscoTab(r, tab))
    .filter((r) => !cat || r.category === cat)
    .filter((r) => !lang || r.lang === lang)
    .filter((r) => !query || r.title.toLowerCase().includes(query) || r.slug.includes(query) || (r.tags ?? []).some((t) => t.toLowerCase().includes(query)));
  const titleOf = (id: string | null) => rows.find((r) => r.id === id)?.title;
  const input = "rounded-full border border-[#E3E7ED] bg-white px-[14px] py-[8px] text-[15px]";
  return (
    <div data-testid="ielsco-admin">
      <PageHeader title="IELSco Stories" description="Official IELSco articles for www.ielsco.com/stories (English) and /id/stories (Bahasa Indonesia). Drafts stay private until you publish.">
        <div className="flex flex-wrap gap-[8px]">
          <button type="button" onClick={onRefresh} className={cn(btnSecondary, "px-4 py-2")}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
          <Link href="/dashboard/admin/stories/new?section=ielsco" className={cn(btnPrimary, "px-4 py-2")} data-testid="create-ielsco-story"><Plus size={16} aria-hidden="true" /> New article</Link>
        </div>
      </PageHeader>
      <div role="tablist" aria-label="Article status" className="mb-[14px] flex gap-[8px] overflow-x-auto pb-[4px]">
        {IELSCO_TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("shrink-0 rounded-full px-[16px] py-[8px] text-[15px] font-semibold", focusRing, tab === t.id ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white text-[#2F4157]/80 hover:bg-[#F7F8FA]")}>
            {t.label}<span className="ml-[6px] opacity-70">{rows.filter((r) => inIelscoTab(r, t.id)).length}</span>
          </button>
        ))}
      </div>
      <div className="mb-[18px] flex flex-wrap gap-[8px]">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, slug or tag" aria-label="Search articles" className={cn(input, "min-w-[240px] flex-1")} data-testid="ielsco-search" />
        <select value={cat} onChange={(e) => setCat(e.target.value as IelscoCategory | "")} aria-label="Category" className={input}>
          <option value="">All categories</option>{IELSCO_CATEGORIES.map((c) => <option key={c} value={c}>{IELSCO_CATEGORY_LABELS[c].en}</option>)}
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value as "" | "en" | "id")} aria-label="Language" className={input}>
          <option value="">Both languages</option><option value="en">English</option><option value="id">Bahasa Indonesia</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <EmptyState title="No articles here" body={rows.length ? "Nothing matches these filters." : "Create the first IELSco story, or import the prepared drafts."} />
      ) : (
        <div className={cn(cardGloss, "overflow-x-auto")}>
          <table className="w-full min-w-[900px] text-left text-[15px]">
            <thead className="border-b border-[#E3E7ED] text-[13px] uppercase tracking-[0.06em] text-[#2F4157]/55">
              <tr><th className="px-[16px] py-[12px]">Title</th><th className="px-[12px]">Category</th><th className="px-[12px]">Language</th><th className="px-[12px]">Status</th><th className="px-[12px]">Date</th><th className="px-[12px]">Needs attention</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const issues = ielscoIssues(r, rows);
                const date = r.published_at ?? r.updated_at;
                return (
                  <tr key={r.id} className="border-b border-[#E3E7ED]/70 last:border-0 hover:bg-[#F7F8FA]" data-testid="ielsco-row">
                    <td className="max-w-[360px] px-[16px] py-[12px]">
                      <Link href={`/dashboard/admin/stories/${r.id}`} className={cn("line-clamp-2 font-semibold hover:underline", focusRing)}>{r.title}</Link>
                      <span className="text-[13px] text-[#2F4157]/50">/{r.lang === "id" ? "id/" : ""}stories/{r.slug}</span>
                    </td>
                    <td className="px-[12px] py-[12px] text-[14px]">{IELSCO_CATEGORY_LABELS[r.category as IelscoCategory]?.en ?? r.category}</td>
                    <td className="px-[12px] py-[12px] text-[14px]">{r.lang === "id" ? "ID" : "EN"}{r.translation_of && <span className="block text-[12px] text-[#2F4157]/55">of “{titleOf(r.translation_of) ?? "…"}”</span>}</td>
                    <td className="px-[12px] py-[12px]"><span className={tag}>{isScheduled(r) ? "Scheduled" : STATUS_LABELS[r.status]}</span>
                      {r.status === "published" && !isScheduled(r) && <a href={`https://www.ielsco.com${ielscoStoryPath(r.lang, r.slug)}`} target="_blank" rel="noreferrer" className="ml-[6px] text-[13px] font-semibold text-[#577E90] underline">View</a>}</td>
                    <td className="whitespace-nowrap px-[12px] py-[12px] text-[#2F4157]/70">{date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-[12px] py-[12px] text-[14px]">
                      {issues.length ? <ul className="space-y-[2px]">{issues.slice(0, 3).map((i) => <li key={i} className="flex gap-[6px] text-[#9A4A2E]"><AlertTriangle size={14} className="mt-[3px] shrink-0" aria-hidden="true" />{i}</li>)}</ul>
                        : <span className="text-[#2F4157]/45">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

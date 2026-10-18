"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, Eye, Loader2, Plus, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { ErrorState, LoadingState, Notice } from "../PageStates";
import { btnPrimary, btnSecondary, cardGloss, focusRing, inputClass, labelClass, tag } from "../ui";
import StoryArticle from "@/components/stories/StoryArticle";
import { COUNTRY_CODES, countryName } from "@/lib/dashboard/countries";
import { SUPPORT_EMAIL, answerList } from "@/lib/stories/questionnaire";
import { CATEGORIES, CATEGORY_LABELS, STORY_TYPES, type GalleryItemData, type StoryStatus, type StoryType } from "@/lib/stories/types";
import { cn } from "@/lib/utils";
import { MediaField } from "./MediaField";
import {
  EDITABLE_FIELDS, PRIVATE_PREFIX, STATUS_LABELS, approveSubmissionImage, emptyStory, privateRefs, revalidatePublicPages,
  signedUrls, slugAvailable, slugify, toPreview, type AdminStory, type AdminSubmission,
} from "./data";

const input = cn(inputClass, "py-2 text-[16px]");
const area = cn(inputClass, "py-2 text-[15px] leading-relaxed");
const small = "text-[13px] text-[#2F4157]/55";
const GALLERY_TYPES: NonNullable<GalleryItemData["type"]>[] = ["activity", "travel", "event", "people", "campus", "other"];

// Plain paragraphs (blank-line separated) become <p> blocks; text that already has tags is kept as written.
function toHtml(text: string) {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={cn(labelClass, "mb-1 text-[14px]")}>{label}</span>
      {children}
      {help && <span className={cn(small, "mt-1 block")}>{help}</span>}
    </label>
  );
}

function Panel({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className={cn(cardGloss, "p-[18px] sm:p-[22px]")} data-testid={testId}>
      <h2 className="mb-[14px] text-[18px] font-bold">{title}</h2>
      <div className="space-y-[14px]">{children}</div>
    </section>
  );
}

function RowTools({ onUp, onDown, onRemove, label }: { onUp: () => void; onDown: () => void; onRemove: () => void; label: string }) {
  const b = cn("rounded-full p-[6px] text-[#2F4157]/70 hover:bg-[#F1F4F8]", focusRing);
  return (
    <span className="flex gap-[2px]">
      <button type="button" className={b} onClick={onUp} aria-label={`Move ${label} up`}><ArrowUp size={16} /></button>
      <button type="button" className={b} onClick={onDown} aria-label={`Move ${label} down`}><ArrowDown size={16} /></button>
      <button type="button" className={cn(b, "text-[#B23F41]")} onClick={onRemove} aria-label={`Remove ${label}`}><Trash2 size={16} /></button>
    </span>
  );
}

export function StoryEditor({ supabase, id }: { supabase: SupabaseClient; id: string }) {
  const router = useRouter();
  const isNew = id === "new";
  const draftKey = useMemo(() => (isNew ? `new-${crypto.randomUUID().slice(0, 8)}` : id), [id, isNew]);
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready" }>({ status: "loading" });
  const [story, setStory] = useState<AdminStory>(emptyStory);
  const [saved, setSaved] = useState<AdminStory | null>(null);
  const [sub, setSub] = useState<AdminSubmission | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [slugState, setSlugState] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (isNew) return setLoad({ status: "ready" });
    setLoad({ status: "loading" });
    const { data, error } = await supabase.from("member_stories").select("*").eq("id", id).maybeSingle();
    if (error || !data) return setLoad({ status: "error", message: error?.message ?? "Story not found." });
    const s = { ...emptyStory(), ...data } as AdminStory;
    setStory(s);
    setSaved(s);
    let subRow: AdminSubmission | null = null;
    if (s.submission_id) {
      const r = await supabase.from("member_story_submissions").select("*").eq("id", s.submission_id).maybeSingle();
      subRow = (r.data as AdminSubmission) ?? null;
    }
    setSub(subRow);
    setSigned(await signedUrls(supabase, [...(subRow?.images ?? []).map((im) => im.path), ...privateRefs(s).map((r) => r.slice(PRIVATE_PREFIX.length))]));
    setLoad({ status: "ready" });
  }, [id, isNew, supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  const set = <K extends keyof AdminStory>(k: K, v: AdminStory[K]) => setStory((s) => ({ ...s, [k]: v }));
  const dirty = useMemo(() => JSON.stringify(story) !== JSON.stringify(saved), [story, saved]);
  const isPlaceholder = story.kind === "placeholder";
  const priv = privateRefs(story);

  // Slug availability (debounced).
  useEffect(() => {
    if (!story.slug || (saved && story.slug === saved.slug)) return setSlugState(null);
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => setSlugState(await slugAvailable(supabase, story.slug, isNew ? null : id)), 400);
  }, [story.slug, saved, supabase, id, isNew]);

  async function save(nextStatus?: StoryStatus, opts: { confirm?: string; submissionStatus?: string } = {}) {
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    setMsg(null);
    const status = nextStatus ?? story.status;
    if (!story.title.trim()) return setMsg({ ok: false, text: "Add a title first." });
    const slug = story.slug.trim() || slugify(story.title);
    if (!slug) return setMsg({ ok: false, text: "Add a slug." });
    if (!saved || slug !== saved.slug) {
      const avail = await slugAvailable(supabase, slug, isNew ? null : id);
      if (!avail.ok) return setMsg({ ok: false, text: `Slug: ${avail.reason}` });
    }
    if (status === "published") {
      if (isPlaceholder) return setMsg({ ok: false, text: "Editorial placeholders can't be published." });
      if (!story.publication_authorized) return setMsg({ ok: false, text: "Tick “Authorization for public use confirmed” before publishing." });
      if (priv.length) return setMsg({ ok: false, text: `Approve the ${priv.length} submitted image(s) first (they are still private).` });
      if (!story.author_name.trim()) return setMsg({ ok: false, text: "Add the author's name." });
    }
    const payload: Record<string, unknown> = {};
    for (const k of EDITABLE_FIELDS) payload[k] = story[k as keyof AdminStory];
    payload.slug = slug;
    payload.status = status;
    payload.sections = story.sections.map((s) => ({ ...s, content: toHtml(s.content) }));
    payload.gallery = story.gallery.filter((g) => g.image);
    payload.quotes = story.quotes.filter((q) => q.text.trim());
    payload.highlights = story.highlights.filter((h) => h.value.trim());
    payload.issues = story.issues.map((i) => i.trim()).filter(Boolean);
    payload.author_country = story.author_country || null;
    payload.sort_date = story.sort_date || null;

    setBusy("save");
    const res = isNew
      ? await supabase.from("member_stories").insert({ ...payload, kind: "story" }).select("*").single()
      : await supabase.from("member_stories").update(payload).eq("id", id).select("*").single();
    setBusy(null);
    if (res.error) return setMsg({ ok: false, text: res.error.message });
    const s = { ...emptyStory(), ...res.data } as AdminStory;
    setStory(s);
    setSaved(s);
    if (sub) {
      const subStatus = opts.submissionStatus ?? (status === "published" ? "converted" : status === "rejected" ? "rejected" : status === "archived" ? "archived" : status === "needs_info" ? "needs_info" : "in_review");
      await supabase.from("member_story_submissions").update({ status: subStatus }).eq("id", sub.id);
    }
    await revalidatePublicPages();
    setMsg({ ok: true, text: status === "published" ? "Published. The public page refreshes now." : `Saved (${STATUS_LABELS[status]}).` });
    if (isNew) router.replace(`/dashboard/admin/stories/${s.id}`);
  }

  async function generateDraft() {
    if (!sub) return;
    setBusy("ai");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/member-stories/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: sub.id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: `AI draft failed: ${body.error ?? res.status}. The submission is kept; retry or write the story manually.` });
      else setMsg({ ok: true, text: "AI draft ready. Review it and apply what you want to keep." });
    } finally {
      const r = await supabase.from("member_story_submissions").select("*").eq("id", sub.id).maybeSingle();
      if (r.data) setSub(r.data as AdminSubmission);
      setBusy(null);
    }
  }

  function applyDraft() {
    const d = sub?.ai_draft;
    if (!d) return;
    const hasContent = story.sections.length > 0 || story.quotes.length > 0;
    if (hasContent && !window.confirm("Replace the current title, sections, quotes, highlights and SEO with the AI draft?")) return;
    const ref = (p: string) => `${PRIVATE_PREFIX}${p}`;
    const banner = d.image_suggestions.find((s) => s.placement === "banner")?.image;
    const avatar = d.image_suggestions.find((s) => s.placement === "avatar")?.image;
    const gallery = d.image_suggestions.filter((s) => s.placement === "gallery").map((s) => ({ image: ref(s.image), caption: "" }));
    setStory((s) => ({
      ...s,
      title: d.title || s.title,
      summary: d.summary || s.summary,
      category: (CATEGORIES as string[]).includes(d.category) ? (d.category as AdminStory["category"]) : s.category,
      story_type: (d.story_type in STORY_TYPES ? d.story_type : s.story_type) as StoryType,
      author_role: s.author_role || d.author.role || null,
      author_location: s.author_location || d.author.location || null,
      sections: d.sections.map((x) => ({ title: x.title, content: x.content, ...(x.image ? { image: ref(x.image) } : {}) })),
      quotes: d.quotes,
      highlights: d.highlights,
      seo: d.seo,
      banner_image: s.banner_image || (banner ? ref(banner) : null),
      author_avatar: s.author_avatar || (avatar ? ref(avatar) : null),
      gallery: s.gallery.length ? s.gallery : gallery,
      issues: [...new Set([...s.issues, ...d.missing_details.map((m) => `Missing: ${m}`)])],
    }));
    setMsg({ ok: true, text: "Draft applied to the editor. Nothing is saved until you save." });
  }

  async function approveAll() {
    if (!priv.length || !window.confirm(`Make ${priv.length} submitted image(s) public? Only do this if the member agreed to their photos being shown.`)) return;
    setBusy("approve");
    try {
      const map: Record<string, string> = {};
      for (const r of [...new Set(priv)]) map[r] = await approveSubmissionImage(supabase, story.id || draftKey, r);
      const m = (v: string | null | undefined) => (v && map[v] ? map[v] : v ?? null);
      setStory((s) => ({
        ...s,
        banner_image: m(s.banner_image),
        author_avatar: m(s.author_avatar),
        sections: s.sections.map((x) => ({ ...x, image: m(x.image) ?? undefined })),
        gallery: s.gallery.map((g) => ({ ...g, image: m(g.image) ?? "" })),
      }));
      setMsg({ ok: true, text: "Images approved. Save to keep the change." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Approving images failed." });
    } finally {
      setBusy(null);
    }
  }

  async function openPreview() {
    const missing = privateRefs(story).map((r) => r.slice(PRIVATE_PREFIX.length)).filter((p) => !signed[p]);
    if (missing.length) setSigned({ ...signed, ...(await signedUrls(supabase, missing)) });
    setPreview(true);
  }

  if (load.status === "loading") return <LoadingState />;
  if (load.status === "error") return <ErrorState message={load.message} onRetry={reload} />;

  const subImages = sub?.images ?? [];
  const media = { supabase, storyKey: story.id || draftKey, signed, submissionImages: subImages };
  const answers = answerList(sub?.answers);
  const mailto = sub?.email
    ? `mailto:${sub.email}?subject=${encodeURIComponent("Your IELS Circle story")}&body=${encodeURIComponent(`Hi ${sub.name.split(" ")[0]},\n\nThank you for sharing your story with IELS Circle. Before we can continue, could you tell us more about:\n\n- \n\nBest,\nIELSco team (${SUPPORT_EMAIL})`)}`
    : null;

  return (
    <div data-testid="story-editor">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-[12px]">
        <div className="min-w-0">
          <Link href="/dashboard/admin/stories" className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#577E90] hover:underline"><ArrowLeft size={16} /> All stories</Link>
          <h1 className="mt-[6px] text-[26px] font-bold leading-tight md:text-[30px]">{isNew ? "Create story" : story.title || "Untitled story"}</h1>
          <div className="mt-[6px] flex flex-wrap items-center gap-[8px] text-[14px]">
            <span className={tag}>{isPlaceholder ? "Editorial placeholder" : STATUS_LABELS[story.status]}</span>
            {story.legacy_id && <span className={tag}>Migrated story #{story.legacy_id}</span>}
            {sub && <span className={tag}>{sub.source === "form" ? "Submitted via questionnaire" : "Editorial import"}</span>}
            {dirty && <span className="font-semibold text-[#9A4A2E]">Unsaved changes</span>}
            {story.status === "published" && story.slug && <a href={`https://circle.ielsco.com/stories/${story.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-[#577E90] underline">View live</a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-[8px]">
          <button type="button" className={cn(btnSecondary, "px-4 py-2")} onClick={openPreview} data-testid="preview-story"><Eye size={16} /> Preview</button>
          <button type="button" className={cn(btnSecondary, "px-4 py-2")} disabled={!!busy} onClick={() => save()} data-testid="save-story">{busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save</button>
          {!isPlaceholder && story.status !== "draft" && (
            <button type="button" className={cn(btnSecondary, "px-4 py-2")} disabled={!!busy} onClick={() => save("draft", story.status === "published" ? { confirm: "Unpublish this story and move it to Drafts? It disappears from the public site." } : {})}>Save as draft</button>
          )}
          {!isPlaceholder && story.status !== "published" && (
            <button type="button" className={cn(btnPrimary, "px-4 py-2")} disabled={!!busy} data-testid="publish-story" onClick={() => save("published", { confirm: `Publish “${story.title}” on circle.ielsco.com/stories now?` })}>Publish</button>
          )}
        </div>
      </div>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={cn("mb-[16px] rounded-[12px] px-[14px] py-[10px] text-[15px]", msg.ok ? "bg-[#577E90]/12 text-[#2F4157]" : "bg-[#E56668]/12 text-[#B23F41]")}>{msg.text}</p>
      )}

      <div className={cn("grid gap-[20px]", (sub || isPlaceholder) && "xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]")}>
        {/* ── Left: source material ── */}
        {(sub || isPlaceholder) && (
          <div className="space-y-[20px] xl:sticky xl:top-[16px] xl:max-h-[calc(100vh-32px)] xl:overflow-y-auto">
            {isPlaceholder && (
              <Panel title="Editorial brief" testId="placeholder-brief">
                <Notice>Internal placeholder for {story.target_country ? countryName(story.target_country) : "a target country"}. It can never be published. To feature a real member, create a new story from their own answers and archive this placeholder.</Notice>
                <p className="text-[15px]"><strong>Topic direction:</strong> {story.editorial_brief.topic_direction}</p>
                {(["interview_questions", "media_requirements", "consent_requirements"] as const).map((k) => (
                  <div key={k}>
                    <p className="text-[14px] font-semibold capitalize">{k.replace(/_/g, " ")}</p>
                    <ul className="ml-[18px] list-disc text-[15px] text-[#2F4157]/80">{(story.editorial_brief[k] ?? []).map((q) => <li key={q}>{q}</li>)}</ul>
                  </div>
                ))}
              </Panel>
            )}
            {sub && (
              <>
                <Panel title="Member & consent" testId="submission-panel">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-[12px] gap-y-[4px] text-[15px]">
                    <dt className="text-[#2F4157]/60">Name</dt><dd>{sub.name}</dd>
                    <dt className="text-[#2F4157]/60">Email</dt><dd className="break-all">{sub.email ?? "—"}</dd>
                    <dt className="text-[#2F4157]/60">Country</dt><dd>{sub.country ? countryName(sub.country) : "—"}</dd>
                    <dt className="text-[#2F4157]/60">Received</dt><dd>{new Date(sub.created_at).toLocaleString("en-GB")}</dd>
                  </dl>
                  <ul className="space-y-[4px] text-[15px]">
                    {[["Review & publish on website", sub.consent_review], ["Show name, role, country & photos", sub.consent_identity], ["Contact about Instagram feature", sub.consent_instagram]].map(([l, v]) => (
                      <li key={l as string} className="flex items-center gap-[8px]">{v ? <Check size={16} className="text-[#2E7D5B]" /> : <X size={16} className="text-[#B23F41]" />}{l as string}{!v && sub.source !== "form" && <span className={small}>(not recorded)</span>}</li>
                    ))}
                  </ul>
                  {mailto && <a href={mailto} className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")}>Email the member</a>}
                </Panel>

                <Panel title="Original answers" testId="original-answers">
                  {answers.map((a) => (
                    <div key={a.key}>
                      <p className="text-[14px] font-semibold text-[#2F4157]/70">{a.question}</p>
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{a.answer}</p>
                    </div>
                  ))}
                  {subImages.length > 0 && (
                    <div>
                      <p className="mb-[6px] text-[14px] font-semibold text-[#2F4157]/70">Submitted photos (private)</p>
                      <div className="grid grid-cols-3 gap-[6px]">
                        {subImages.map((im, i) => (
                          <figure key={im.path}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {signed[im.path] ? <img src={signed[im.path]} alt={`Submitted photo ${i + 1}`} className="aspect-square w-full rounded-[8px] object-cover" /> : <span className="block aspect-square rounded-[8px] bg-[#F1F4F8]" />}
                            <figcaption className="mt-[2px] text-[12px] text-[#2F4157]/60">Photo {i + 1}{im.note ? `: ${im.note}` : ""}</figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  )}
                </Panel>

                <Panel title="AI draft" testId="ai-draft">
                  <p className={small}>
                    Generated from the answers only. Quotes are checked word for word against the answers; anything that couldn&apos;t be verified was removed and is listed below.
                    {sub.ai_model && ` Model: ${sub.ai_model}.`}
                  </p>
                  {sub.ai_status === "failed" && <p className="rounded-[10px] bg-[#E56668]/10 px-[12px] py-[8px] text-[14px] text-[#B23F41]">Last attempt failed: {sub.ai_error}</p>}
                  <div className="flex flex-wrap gap-[8px]">
                    <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} disabled={!!busy} onClick={generateDraft} data-testid="generate-draft">
                      {busy === "ai" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {sub.ai_draft ? "Regenerate" : sub.ai_status === "failed" ? "Retry" : "Generate draft"}
                    </button>
                    {sub.ai_draft && <button type="button" className={cn(btnPrimary, "px-3 py-1.5 text-[14px]")} onClick={applyDraft} data-testid="apply-draft">Apply to editor</button>}
                  </div>
                  {sub.ai_draft && (
                    <div className="space-y-[10px] text-[15px]">
                      <p className="font-bold">{sub.ai_draft.title}</p>
                      <p className="text-[#2F4157]/75">{sub.ai_draft.summary}</p>
                      {sub.ai_draft.sections.map((s, i) => (
                        <div key={i}>
                          <p className="font-semibold">{i + 1}. {s.title}</p>
                          <div className="text-[14px] text-[#2F4157]/80 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: s.content }} />
                        </div>
                      ))}
                      {sub.ai_draft.quotes.length > 0 && <div><p className="font-semibold">Quotes (verified)</p><ul className="ml-[18px] list-disc">{sub.ai_draft.quotes.map((q) => <li key={q.text}>“{q.text}”</li>)}</ul></div>}
                      {sub.ai_draft.image_suggestions.length > 0 && <div><p className="font-semibold">Image placement suggestions</p><ul className="ml-[18px] list-disc text-[14px]">{sub.ai_draft.image_suggestions.map((s) => <li key={s.image + s.placement}>Photo {subImages.findIndex((im) => im.path === s.image) + 1} → {s.placement}: {s.reason}</li>)}</ul></div>}
                      {[...sub.ai_draft.missing_details, ...sub.ai_draft.removed_by_checks].length > 0 && (
                        <div className="rounded-[10px] bg-[#F5E9D8] px-[12px] py-[8px]">
                          <p className="flex items-center gap-[6px] font-semibold text-[#9A4A2E]"><AlertTriangle size={15} /> For the editor</p>
                          <ul className="ml-[18px] list-disc text-[14px]">{[...sub.ai_draft.missing_details, ...sub.ai_draft.removed_by_checks].map((m) => <li key={m}>{m}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              </>
            )}
          </div>
        )}

        {/* ── Right: the story ── */}
        <div className="space-y-[20px]">
          {story.issues.length > 0 && (
            <div className="rounded-[14px] border border-[#E9C9A8] bg-[#FBF3EA] px-[16px] py-[12px]">
              <p className="flex items-center gap-[6px] font-semibold text-[#9A4A2E]"><AlertTriangle size={16} /> Needs attention</p>
              <ul className="ml-[18px] mt-[4px] list-disc text-[15px]">{story.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}

          <Panel title="Basics">
            <Field label="Title"><input className={input} value={story.title} onChange={(e) => set("title", e.target.value)} maxLength={200} data-testid="field-title" /></Field>
            <Field label="Slug" help={story.legacy_id || story.status === "published" ? "Changing it keeps the old address working (it redirects)." : "Lowercase letters, numbers and hyphens."}>
              <div className="flex gap-[8px]">
                <input className={input} value={story.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} maxLength={160} data-testid="field-slug" />
                <button type="button" className={cn(btnSecondary, "shrink-0 px-3 py-1.5 text-[13px]")} onClick={() => set("slug", slugify(story.title))}>From title</button>
              </div>
              {slugState && <span className={cn("mt-1 block text-[13px]", slugState.ok ? "text-[#2E7D5B]" : "text-[#B23F41]")}>{slugState.ok ? "Available" : slugState.reason}</span>}
            </Field>
            <Field label="Summary" help="1–2 sentences shown on the story card."><textarea className={area} rows={2} value={story.summary ?? ""} onChange={(e) => set("summary", e.target.value)} maxLength={400} /></Field>
            <div className="grid gap-[12px] sm:grid-cols-2">
              <Field label="Category">
                <select className={input} value={story.category} onChange={(e) => set("category", e.target.value as AdminStory["category"])}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select>
              </Field>
              <Field label="Story type">
                <select className={input} value={story.story_type} onChange={(e) => set("story_type", e.target.value as StoryType)}>{Object.entries(STORY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </Field>
              <Field label="Date shown" help="e.g. October 3, 2025"><input className={input} value={story.story_date ?? ""} onChange={(e) => set("story_date", e.target.value)} /></Field>
              <Field label="Sort date"><input type="date" className={input} value={story.sort_date ?? ""} onChange={(e) => set("sort_date", e.target.value)} /></Field>
              <Field label="Location shown"><input className={input} value={story.location ?? ""} onChange={(e) => set("location", e.target.value)} /></Field>
            </div>
          </Panel>

          <Panel title="Author">
            <div className="grid gap-[12px] sm:grid-cols-2">
              <Field label="Name"><input className={input} value={story.author_name} onChange={(e) => set("author_name", e.target.value)} data-testid="field-author" /></Field>
              <Field label="Country">
                <select className={input} value={story.author_country ?? ""} onChange={(e) => set("author_country", e.target.value || null)}>
                  <option value="">—</option>{COUNTRY_CODES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
                </select>
              </Field>
              <Field label="Location (city/region)"><input className={input} value={story.author_location ?? ""} onChange={(e) => set("author_location", e.target.value || null)} /></Field>
              <Field label="Role line" help="e.g. Marketing Manager, PAWhere"><input className={input} value={story.author_role ?? ""} onChange={(e) => set("author_role", e.target.value || null)} /></Field>
            </div>
            <Field label="Short bio"><textarea className={area} rows={2} value={story.author_bio ?? ""} onChange={(e) => set("author_bio", e.target.value || null)} /></Field>
            <div className="grid gap-[12px] sm:grid-cols-3">
              {(["instagram", "linkedin", "website"] as const).map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><input className={input} value={story.social[k] ?? ""} placeholder="https://" onChange={(e) => set("social", { ...story.social, [k]: e.target.value || undefined })} /></Field>
              ))}
            </div>
            <div className="grid gap-[16px] sm:grid-cols-2">
              <MediaField {...media} label="Avatar" aspect="aspect-square" compact value={story.author_avatar} onChange={(v) => set("author_avatar", v)} />
              <MediaField {...media} label="Banner" value={story.banner_image} onChange={(v) => set("banner_image", v)} />
            </div>
          </Panel>

          <Panel title="Story sections">
            <p className={small}>Separate paragraphs with a blank line, or use &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;. Other HTML is removed when the story is shown.</p>
            {story.sections.map((s, i) => (
              <div key={i} className="rounded-[14px] border border-[#E3E7ED] p-[14px]">
                <div className="mb-[8px] flex items-center justify-between"><span className="text-[14px] font-bold">Section {i + 1}</span>
                  <RowTools label={`section ${i + 1}`} onUp={() => set("sections", move(story.sections, i, -1))} onDown={() => set("sections", move(story.sections, i, 1))} onRemove={() => window.confirm("Remove this section?") && set("sections", story.sections.filter((_, j) => j !== i))} />
                </div>
                <div className="space-y-[10px]">
                  <Field label="Heading"><input className={input} value={s.title} onChange={(e) => set("sections", story.sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
                  <Field label="Text"><textarea className={area} rows={5} value={s.content} onChange={(e) => set("sections", story.sections.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))} /></Field>
                  <Field label="Pull quote under this section (optional, member's own words)"><input className={input} value={s.quote ?? ""} onChange={(e) => set("sections", story.sections.map((x, j) => (j === i ? { ...x, quote: e.target.value || undefined } : x)))} /></Field>
                  <MediaField {...media} label="Section image" value={s.image} onChange={(v) => set("sections", story.sections.map((x, j) => (j === i ? { ...x, image: v ?? undefined } : x)))} />
                </div>
              </div>
            ))}
            <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} onClick={() => set("sections", [...story.sections, { title: "", content: "" }])}><Plus size={14} /> Add section</button>
          </Panel>

          <Panel title="Quotes & highlights">
            <p className={small}>Quotes must be the member&apos;s actual words. Highlights are short facts already in the story.</p>
            {story.quotes.map((q, i) => (
              <div key={i} className="flex flex-col gap-[8px] sm:flex-row sm:items-start">
                <textarea className={cn(area, "flex-1")} rows={2} value={q.text} placeholder="Quote" onChange={(e) => set("quotes", story.quotes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <input className={cn(input, "sm:w-[180px]")} value={q.attribution ?? ""} placeholder="Attribution" onChange={(e) => set("quotes", story.quotes.map((x, j) => (j === i ? { ...x, attribution: e.target.value } : x)))} />
                <RowTools label={`quote ${i + 1}`} onUp={() => set("quotes", move(story.quotes, i, -1))} onDown={() => set("quotes", move(story.quotes, i, 1))} onRemove={() => set("quotes", story.quotes.filter((_, j) => j !== i))} />
              </div>
            ))}
            <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} onClick={() => set("quotes", [...story.quotes, { text: "", attribution: story.author_name.split(" ")[0] }])}><Plus size={14} /> Add quote</button>
            <hr className="border-[#E3E7ED]" />
            {story.highlights.map((h, i) => (
              <div key={i} className="flex flex-col gap-[8px] sm:flex-row sm:items-center">
                <input className={cn(input, "sm:w-[160px]")} value={h.value} placeholder="Value (e.g. 5)" onChange={(e) => set("highlights", story.highlights.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <input className={cn(input, "flex-1")} value={h.label} placeholder="Label (e.g. campuses visited)" onChange={(e) => set("highlights", story.highlights.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <RowTools label={`highlight ${i + 1}`} onUp={() => set("highlights", move(story.highlights, i, -1))} onDown={() => set("highlights", move(story.highlights, i, 1))} onRemove={() => set("highlights", story.highlights.filter((_, j) => j !== i))} />
              </div>
            ))}
            <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} onClick={() => set("highlights", [...story.highlights, { value: "", label: "" }])}><Plus size={14} /> Add highlight</button>
          </Panel>

          <Panel title="Gallery">
            <div className="grid gap-[16px] sm:grid-cols-2">
              {story.gallery.map((g, i) => (
                <div key={i} className="rounded-[14px] border border-[#E3E7ED] p-[12px]">
                  <div className="mb-[6px] flex items-center justify-between"><span className="text-[14px] font-bold">Photo {i + 1}</span>
                    <RowTools label={`photo ${i + 1}`} onUp={() => set("gallery", move(story.gallery, i, -1))} onDown={() => set("gallery", move(story.gallery, i, 1))} onRemove={() => window.confirm("Remove this photo from the gallery?") && set("gallery", story.gallery.filter((_, j) => j !== i))} />
                  </div>
                  <MediaField {...media} label="Image" aspect="aspect-[4/3]" value={g.image} onChange={(v) => v ? set("gallery", story.gallery.map((x, j) => (j === i ? { ...x, image: v } : x))) : set("gallery", story.gallery.filter((_, j) => j !== i))} />
                  <div className="mt-[8px] grid grid-cols-[1fr_auto] gap-[8px]">
                    <input className={input} value={g.caption ?? ""} placeholder="Caption" onChange={(e) => set("gallery", story.gallery.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                    <select className={input} value={g.type ?? "other"} onChange={(e) => set("gallery", story.gallery.map((x, j) => (j === i ? { ...x, type: e.target.value as GalleryItemData["type"] } : x)))}>{GALLERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} onClick={() => set("gallery", [...story.gallery, { image: "", caption: "", type: "other" }])}><Plus size={14} /> Add photo</button>
          </Panel>

          <Panel title="SEO & credits">
            <Field label="Meta title" help={`${(story.seo.meta_title ?? "").length}/70`}><input className={input} value={story.seo.meta_title ?? ""} onChange={(e) => set("seo", { ...story.seo, meta_title: e.target.value })} /></Field>
            <Field label="Meta description" help={`${(story.seo.meta_description ?? "").length}/160`}><textarea className={area} rows={2} value={story.seo.meta_description ?? ""} onChange={(e) => set("seo", { ...story.seo, meta_description: e.target.value })} /></Field>
            <Field label="Keywords"><input className={input} value={story.seo.meta_keywords ?? ""} onChange={(e) => set("seo", { ...story.seo, meta_keywords: e.target.value })} /></Field>
            <div className="grid gap-[12px] sm:grid-cols-2">
              <Field label="Written by"><input className={input} value={story.credits.writer ?? ""} onChange={(e) => set("credits", { ...story.credits, writer: e.target.value || undefined })} /></Field>
              <Field label="Design by"><input className={input} value={story.credits.designer ?? ""} onChange={(e) => set("credits", { ...story.credits, designer: e.target.value || undefined })} /></Field>
            </div>
          </Panel>

          <Panel title="Review & publishing">
            {priv.length > 0 && (
              <div className="flex flex-wrap items-center gap-[10px] rounded-[12px] bg-[#FBF3EA] px-[14px] py-[10px] text-[15px]">
                <span>{priv.length} image(s) are still private submissions.</span>
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} disabled={!!busy} onClick={approveAll}><ShieldCheck size={14} /> Approve all (make public)</button>
              </div>
            )}
            <label className="flex items-start gap-[10px] text-[15px]">
              <input type="checkbox" className="mt-[4px] h-[18px] w-[18px] accent-[#2F4157]" disabled={isPlaceholder} checked={story.publication_authorized} onChange={(e) => set("publication_authorized", e.target.checked)} data-testid="field-authorized" />
              <span><strong>Authorization for public use confirmed.</strong> The member agreed to this story, their name, role, country and these photos being published. Required to publish.</span>
            </label>
            <Field label="Open issues (one per line)"><textarea className={area} rows={3} value={story.issues.join("\n")} onChange={(e) => set("issues", e.target.value.split("\n").map((l) => l.trimStart()).filter((l, i, a) => l || i < a.length - 1))} /></Field>
            <Field label="Editor notes (internal)"><textarea className={area} rows={3} value={story.editor_notes ?? ""} onChange={(e) => set("editor_notes", e.target.value || null)} /></Field>
            <div className="flex flex-wrap gap-[8px] border-t border-[#E3E7ED] pt-[14px]">
              {!isPlaceholder && sub && story.status !== "needs_info" && (
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} disabled={!!busy} onClick={() => save("needs_info", { confirm: "Mark as “needs more info”? Then email the member with your questions." })}>Request more info</button>
              )}
              {!isPlaceholder && story.status !== "rejected" && (
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px] text-[#B23F41]")} disabled={!!busy} onClick={() => save("rejected", { confirm: "Reject this story? It will not be published (you can reopen it later)." })}>Reject</button>
              )}
              {story.status !== "archived" && (
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px] text-[#B23F41]")} disabled={!!busy} onClick={() => save("archived", { confirm: story.status === "published" ? "Archive this published story? It disappears from the public site." : "Archive this story?" })}>Archive</button>
              )}
              {(story.status === "archived" || story.status === "rejected") && !isPlaceholder && (
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} disabled={!!busy} onClick={() => save("pending_review")}>Reopen for review</button>
              )}
              {story.status === "published" && (
                <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} disabled={!!busy} onClick={() => save("draft", { confirm: "Unpublish this story? It disappears from the public site." })}>Unpublish</button>
              )}
            </div>
            {mailto && story.status === "needs_info" && <Notice>Waiting for the member. <a className="font-semibold underline" href={mailto}>Email them</a> with what you need.</Notice>}
          </Panel>
        </div>
      </div>

      {preview && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Story preview">
          <div className="flex items-center justify-between border-b border-[#E3E7ED] px-[16px] py-[10px]">
            <span className="text-[15px] font-semibold">Preview — not public {priv.length > 0 && "(private images shown only to you)"}</span>
            <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[14px]")} onClick={() => setPreview(false)} autoFocus><X size={14} /> Close preview</button>
          </div>
          <div className="flex-1 overflow-y-auto" data-testid="story-preview">
            <StoryArticle story={toPreview({ ...story, sections: story.sections.map((s) => ({ ...s, content: toHtml(s.content) })) }, signed)} preview />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


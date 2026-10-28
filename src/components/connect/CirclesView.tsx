"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Users } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { EmptyState, Notice } from "@/components/dashboard/PageStates";
import { ACCENTS, btnPrimary, btnSecondary, cardGloss, focusRing, inputClass } from "@/components/dashboard/ui";
import { ElcoMascot } from "@/components/elco/ElcoMascot";
import { circlesApi, connectApi } from "@/lib/connect/api";
import type { Circle, CirclePost } from "@/lib/connect/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { RoomCard } from "./RoomsView";
import { useStoryAdmin } from "@/components/dashboard/stories-admin/useStoryAdmin";
import { ConnectFrame, LoadGate, SafetyMenu, useLoad, when } from "./shared";

const activity = (c: Circle) => (c.posts_7d ? `${c.posts_7d} post${c.posts_7d === 1 ? "" : "s"} this week` : c.last_post_at ? `Last post ${when(c.last_post_at)}` : "No posts yet");

export function CircleCard({ circle, footer }: { circle: Circle; footer?: React.ReactNode }) {
  const a = ACCENTS[circle.color];
  return (
    <article data-testid={`circle-card-${circle.id}`} className={cn(cardGloss, "flex h-full flex-col overflow-hidden")}>
      <div className={cn("h-2", a.strong)} aria-hidden="true" />
      <div className={cn("flex flex-1 flex-col gap-3 bg-gradient-to-b p-5", a.gradient)}>
        <div className="flex items-start gap-3">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", a.soft, a.text)}><Users size={22} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-snug"><Link href={`/dashboard/circles/${circle.id}`} className={cn("hover:underline", focusRing)}>{circle.name}</Link></h3>
            {circle.tagline && <p className="text-base text-[#2F4157]/70">{circle.tagline}</p>}
          </div>
        </div>
        <p className="text-sm text-[#2F4157]/60">{circle.members} member{circle.members === 1 ? "" : "s"} · {activity(circle)}{circle.is_member && <span className={cn("ml-2 font-semibold", a.text)}>· You&apos;re in</span>}</p>
        {footer && <div className="mt-auto flex flex-wrap gap-2 pt-1">{footer}</div>}
      </div>
    </article>
  );
}

export function CirclesView({ supabase }: DashboardCtx) {
  const data = useLoad(() => circlesApi.list(supabase), [supabase]);
  return (
    <ConnectFrame title="Circles" description="Small groups around shared goals, managed by the IELS team. Join one to read and post in its discussion.">
      <LoadGate state={data.state} onRetry={data.reload} label="Loading Circles…" />
      {data.state.s === "ready" && (data.state.data.length === 0 ? (
        <EmptyState title="No Circles yet" body="The IELS team will open the first Circles soon." />
      ) : (
        <div data-testid="circles-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.state.data.map((c) => (
            <CircleCard key={c.id} circle={c} footer={<Link href={`/dashboard/circles/${c.id}`} className={btnPrimary}>{c.is_member ? "Open discussion" : "View & join"} <ArrowRight size={16} /></Link>} />
          ))}
        </div>
      ))}
      <section className={cn(cardGloss, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center")}>
        <ElcoMascot mood="relaxed" size={88} />
        <div className="flex-1">
          <h2 className="text-xl font-bold">Looking for the IELS Circle sessions?</h2>
          <p className="text-base text-[#2F4157]/70">The weekly IELS Circle sessions, check-ins and Discord live on their own page.</p>
        </div>
        <Link href="/dashboard/circle" className={btnSecondary}>IELS Circle sessions</Link>
      </section>
    </ConnectFrame>
  );
}

function Composer({ onSubmit, placeholder, initial = "", small, canPin }: { onSubmit: (body: string, pin: boolean) => Promise<void>; placeholder: string; initial?: string; small?: boolean; canPin?: boolean }) {
  const [body, setBody] = useState(initial);
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setError(null);
    try { await onSubmit(body, pin); setBody(""); setPin(false); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="sr-only" htmlFor={`composer-${placeholder}`}>{placeholder}</label>
      <textarea id={`composer-${placeholder}`} rows={small ? 2 : 3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} className={inputClass} />
      {canPin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> Pin as the Circle&apos;s discussion prompt (staff)</label>}
      {error && <p role="alert" className="text-sm text-[#B4383A]">{error}</p>}
      <button type="submit" disabled={busy || !body.trim()} className={cn(small ? btnSecondary : btnPrimary, small && "px-4 py-2 text-sm")}>{busy ? "Posting…" : small ? "Reply" : "Post"}</button>
    </form>
  );
}

function PostCard({ ctx, circle, post, onChange }: { ctx: DashboardCtx; circle: Circle; post: CirclePost; onChange: () => void }) {
  const [replying, setReplying] = useState(false);
  const a = ACCENTS[circle.color];
  const remove = async (id: string) => {
    if (!window.confirm("Remove this post?")) return;
    try { await circlesApi.remove(ctx.supabase, id); onChange(); } catch (e) { window.alert((e as Error).message); }
  };
  return (
    <li data-testid="circle-post" className={cn(cardGloss, "space-y-3 p-5", post.is_prompt && cn("border-2", a.ring))}>
      {post.is_prompt && <p className={cn("text-xs font-semibold uppercase tracking-wide", a.text)}>Discussion prompt from the IELS team</p>}
      <div className="flex items-start gap-3">
        <Avatar name={post.author.display_name} url={post.author.avatar_url} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-sm"><Link href={`/dashboard/connect/people/${post.author.id}`} className="font-semibold hover:underline">{post.author.display_name}</Link> <span className="text-[#2F4157]/55">· {when(post.created_at)}</span></p>
          <p className="whitespace-pre-line break-words text-base">{post.body}</p>
        </div>
        {post.mine ? (
          <button type="button" onClick={() => remove(post.id)} className={cn("text-sm text-[#2F4157]/60 hover:text-[#B4383A]", focusRing)}>Remove</button>
        ) : (
          <SafetyMenu supabase={ctx.supabase} person={post.author} context="circle" contextId={post.id} onBlocked={onChange} />
        )}
      </div>
      {post.replies.length > 0 && (
        <ul className="space-y-2 border-l-2 border-[#E3E7ED] pl-4">
          {post.replies.map((r) => (
            <li key={r.id} className="flex items-start gap-2">
              <Avatar name={r.author.display_name} url={r.author.avatar_url} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-semibold">{r.author.display_name}</span> <span className="text-[#2F4157]/55">· {when(r.created_at)}</span></p>
                <p className="whitespace-pre-line break-words text-base">{r.body}</p>
              </div>
              {r.mine && <button type="button" onClick={() => remove(r.id)} className={cn("text-xs text-[#2F4157]/60 hover:text-[#B4383A]", focusRing)}>Remove</button>}
            </li>
          ))}
        </ul>
      )}
      {replying ? (
        <Composer small placeholder={`Reply to ${post.author.display_name}`} onSubmit={async (b) => { await circlesApi.post(ctx.supabase, circle.id, b, post.id); track("circle_posted", { reply: true }); setReplying(false); onChange(); }} />
      ) : (
        <button type="button" onClick={() => setReplying(true)} className={cn("text-sm font-semibold text-[#577E90] hover:underline", focusRing)}>Reply</button>
      )}
    </li>
  );
}

export function CircleDetail(ctx: DashboardCtx & { id: string; draft?: string }) {
  const { supabase, id } = ctx;
  const data = useLoad(async () => {
    const circle = (await circlesApi.list(supabase)).find((c) => c.id === id) ?? null;
    if (!circle) return { circle: null, posts: [] as CirclePost[], rooms: [] };
    const [posts, rooms] = await Promise.all([
      circle.is_member ? circlesApi.posts(supabase, id) : circlesApi.posts(supabase, id).catch(() => [] as CirclePost[]),
      connectApi.rooms(supabase, "discover", { limit: 50 }).then((r) => r.filter((x) => circle.room_categories.includes(x.category)).slice(0, 3)).catch(() => []),
    ]);
    return { circle, posts, rooms };
  }, [supabase, id]);
  const { isAdmin } = useStoryAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const membership = async (join: boolean) => {
    setBusy(true); setError(null);
    try {
      if (join) { await circlesApi.join(supabase, id); track("circle_joined", { circle: id }); } else await circlesApi.leave(supabase, id);
      await data.reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const title = data.state.s === "ready" && data.state.data.circle ? data.state.data.circle.name : "Circle";
  return (
    <ConnectFrame title={title}>
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && !data.state.data.circle && <EmptyState title="This Circle isn't available" body="It may have been archived." action={<Link href="/dashboard/circles" className={btnPrimary}>All Circles</Link>} />}
      {data.state.s === "ready" && data.state.data.circle && (() => {
        const { circle, posts, rooms } = data.state.data;
        const a = ACCENTS[circle.color];
        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              {circle.is_member || isAdmin ? (
                <>
                  <section className={cn(cardGloss, "p-5")}>
                    <h2 className="mb-3 text-lg font-bold">Start a conversation</h2>
                    <Composer initial={ctx.draft} canPin={isAdmin} placeholder="Share a question, tip or experience with the Circle" onSubmit={async (b, pin) => { await circlesApi.post(supabase, id, b, null, pin); track("circle_posted", { reply: false, prompt: pin }); await data.reload(); }} />
                  </section>
                  {posts.length === 0 ? (
                    <div className={cn(cardGloss, "flex items-center gap-4 p-6")} data-testid="circle-empty">
                      <ElcoMascot mood="neutral" size={72} />
                      <p className="text-base text-[#2F4157]/70">No posts yet. Say hello and tell the Circle what you&apos;re working on.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3" data-testid="circle-posts">{posts.map((p) => <PostCard key={p.id} ctx={ctx} circle={circle} post={p} onChange={data.reload} />)}</ul>
                  )}
                </>
              ) : (
                <section className={cn(cardGloss, "flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center")} data-testid="circle-join-panel">
                  <ElcoMascot mood="wave" size={88} />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Join to read and post</h2>
                    <p className="text-base text-[#2F4157]/70">Discussions are visible to members of this Circle only. You can leave anytime.</p>
                  </div>
                  <button type="button" disabled={busy} onClick={() => membership(true)} className={btnPrimary} data-testid="circle-join">Join Circle</button>
                </section>
              )}
              {error && <Notice testId="circle-error">{error} {/Passport/.test(error) && <Link href="/dashboard/connect/passport" className="font-semibold underline">Open Passport</Link>}</Notice>}
            </div>
            <aside className="space-y-4">
              <section className={cn(cardGloss, "space-y-3 overflow-hidden p-0")}>
                <div className={cn("h-2", a.strong)} aria-hidden="true" />
                <div className="space-y-3 px-5 pb-5">
                  <h2 className="text-lg font-bold">About</h2>
                  {circle.description && <p className="text-base text-[#2F4157]/75">{circle.description}</p>}
                  <p className="text-sm text-[#2F4157]/60">{circle.members} member{circle.members === 1 ? "" : "s"} · {activity(circle)}</p>
                  {circle.is_member && <button type="button" disabled={busy} onClick={() => membership(false)} className={cn(btnSecondary, "px-4 py-2 text-sm")}>Leave Circle</button>}
                </div>
              </section>
              <section className="space-y-3">
                <h2 className="text-lg font-bold">Related upcoming rooms</h2>
                {rooms.length === 0 ? (
                  <p className="text-base text-[#2F4157]/60">No related rooms scheduled. <Link href="/dashboard/connect/rooms/new" className="font-semibold underline">Host one</Link></p>
                ) : rooms.map((r) => <RoomCard key={r.id} room={r} />)}
              </section>
            </aside>
          </div>
        );
      })()}
    </ConnectFrame>
  );
}

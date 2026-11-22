"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { composePose, fitWear, loadPose, RIG } from "@/lib/mascot/compose";
import { useReducedMotion } from "@/lib/motion";
import "./elco-actor.css";

// Elco as a character: one pose from the designer's library (public/images/elco/poses), rigged at runtime
// (lib/mascot/compose.ts) so the eyes blink and glance, the arms gesture and the body reacts. Mirrors Elco AI's
// ElcoActor (same acts, same rig). Until the pose file has loaded, the plain pose <img> shows, so nothing flashes empty.
//
//   <ElcoActor pose="thinking" act="confused" style={{ height: 116 }} />
//   act     one-shot: wave nod shake think laugh celebrate excited sad sarcastic confused talk; "wait" loops while set
//   idle    slow breathing (the main mascot of a view only)   alive  blinks and glances (default on)
//   react   lift on hover, a hop on tap
export const ACTS = ["wave", "nod", "shake", "think", "laugh", "celebrate", "excited", "sad", "sarcastic", "confused", "talk", "wait"] as const;
export type Act = (typeof ACTS)[number];
const TAP_ACTS: Act[] = ["laugh", "nod", "excited", "wave"];
const ACT_MS: Record<string, number> = { wave: 1500, nod: 900, shake: 800, think: 1800, laugh: 1150, celebrate: 1250, excited: 950, sad: 1600, sarcastic: 1600, confused: 1400, talk: 1250 };

type Registered = { el: HTMLElement; visible: boolean; alive: boolean };
const actors = new Set<Registered>();
let timer: ReturnType<typeof setInterval> | null = null;

function blink(el: HTMLElement, twice = false) {
  el.setAttribute("data-blink", "");
  setTimeout(() => {
    el.removeAttribute("data-blink");
    if (twice) setTimeout(() => blink(el), 160);
  }, 140);
}
function glance(el: HTMLElement, dir: string, ms = 1300) {
  el.setAttribute("data-look", dir);
  setTimeout(() => { if (el.getAttribute("data-look") === dir) el.removeAttribute("data-look"); }, ms);
}
function tick() {
  actors.forEach((a) => {
    if (!a.visible || !a.alive || a.el.hasAttribute("data-act-running")) return;
    if (Math.random() < 0.2) blink(a.el, Math.random() < 0.2);
    else if (Math.random() < 0.06) glance(a.el, ["l", "r", "u", "d"][Math.floor(Math.random() * 4)]);
  });
}
function register(a: Registered) {
  actors.add(a);
  if (!timer) timer = setInterval(tick, 900);
  return () => { actors.delete(a); if (!actors.size && timer) { clearInterval(timer); timer = null; } };
}

let uidN = 0;

export default function ElcoActor({ pose = "neutral", wear, act = null, actKey, idle = false, alive = true, react = false, alt, className = "", style, onTap, testid = "elco-actor" }: {
  pose?: string; wear?: string[]; act?: Act | null; actKey?: number | string; idle?: boolean; alive?: boolean; react?: boolean;
  alt?: string; className?: string; style?: CSSProperties; onTap?: () => void; testid?: string;
}) {
  const name = RIG[pose] ? pose : "neutral";
  const fitted = fitWear(name, wear).join(",");
  const [markup, setMarkup] = useState<string | null>(null);
  const [uid] = useState(() => `ea${++uidN}`);
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let off = false;
    setMarkup(null);
    loadPose(name).then((t) => { if (!off) setMarkup(composePose(t, name, { wear: fitted ? fitted.split(",") : [], uid: `${uid}-${name}` })); }).catch(() => {});
    return () => { off = true; };
  }, [name, fitted, uid]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const a: Registered = { el, visible: true, alive: alive && !reduced };
    const unregister = register(a);
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([e]) => { a.visible = e.isIntersecting; if (e.isIntersecting) el.removeAttribute("data-paused"); else el.setAttribute("data-paused", ""); }, { threshold: 0 });
      io.observe(el);
    }
    return () => { unregister(); io?.disconnect(); };
  }, [alive, reduced]);

  const play = (n: string) => {
    const el = ref.current as (HTMLSpanElement & { _actT?: ReturnType<typeof setTimeout> }) | null;
    if (!el || !n || reduced) return;
    el.removeAttribute("data-act");
    void el.getBoundingClientRect();
    el.setAttribute("data-act", n);
    if (n !== "wait") {
      el.setAttribute("data-act-running", "");
      clearTimeout(el._actT);
      el._actT = setTimeout(() => { el.removeAttribute("data-act-running"); if (el.getAttribute("data-act") === n) el.removeAttribute("data-act"); }, ACT_MS[n] || 1200);
    }
  };
  useEffect(() => {
    if (!markup) return;
    if (act) play(act); else ref.current?.removeAttribute("data-act");
  }, [act, actKey, markup]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => {
    const el = ref.current;
    if (!el || reduced) { onTap?.(); return; }
    el.setAttribute("data-tap", "");
    setTimeout(() => el.removeAttribute("data-tap"), 450);
    play(TAP_ACTS[Math.floor(Math.random() * TAP_ACTS.length)]);
    onTap?.();
  };
  const label = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true as const };
  return (
    <span ref={ref} className={`elco-actor ${className}`} style={style} data-pose={name} data-wave={RIG[name].wave || undefined}
      data-idle={idle && !reduced ? "" : undefined} data-react={react ? "" : undefined} data-testid={testid} {...label}
      onPointerDown={react ? tap : undefined}>
      {markup ? <span className="contents" dangerouslySetInnerHTML={{ __html: markup }} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img className="ep-img" src={`/images/elco/poses/${name}.svg`} alt="" draggable={false} decoding="async" />}
    </span>
  );
}

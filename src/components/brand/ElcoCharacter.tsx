"use client";

import { useEffect, useRef, useState } from "react";
import faces from "@/lib/mascot/faces.json";
import layers from "@/lib/mascot/layers.json";
import rig from "@/lib/mascot/rig.json";

// Elco, the shared IELSco/Elco robot mascot, as a living character. A trimmed TypeScript port of Elco AI's
// ElcoCharacter (elco-app frontend/src/components/ElcoCharacter.jsx), built only from the supplied rig artwork in
// public/images/contents/mascot/rig: the neutral and wave poses have cut-out arms that rotate about the shoulder, the
// eyes are the original eye pixels on their own layer (blink = vertical squash). Nothing is redrawn.
// Idle: slow breathing sway plus irregular blinks. Every `waveEvery` seconds (and once on entry) Elco waves.
// Styles are written per frame (no React re-render); the loop pauses off-screen. Reduced motion: a still waving pose.

type Pose = "neutral" | "wave";
const POSES: Pose[] = ["neutral", "wave"];
type Face = { cx: number; cy: number; size: number; w: number; h: number };
type Layer = { x: number; y: number; w: number; h: number; open?: boolean };
type RigPart = { slide: boolean; pivot?: [number, number] };
const FACES = faces as unknown as Record<Pose, Face>;
const LAYERS = layers as unknown as Record<Pose, Layer>;
const RIG = rig as unknown as Record<Pose, { parts: Partial<Record<"armL" | "armR" | "legL" | "legR", RigPart>> }>;
const SRC = "/images/contents/mascot/rig";
const GREET = 70;

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t, sy = (t: number) => ((ay * t + by) * t + cy) * t, dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const io = bezier(0.45, 0, 0.25, 1), out = bezier(0.2, 0.7, 0.2, 1), lin = (x: number) => x;
function k(t: number, times: number[], values: number[], easing = io) {
  if (t <= times[0]) return values[0];
  for (let i = 1; i < times.length; i++) if (t <= times[i]) { const p = (t - times[i - 1]) / (times[i] - times[i - 1]); return values[i - 1] + (values[i] - values[i - 1]) * easing(p); }
  return values[values.length - 1];
}
const blinkAt = (t: number, b: number) => k(t, [b, b + 2, b + 3, b + 6], [0, 1, 1, 0], lin);

type State = { pose: Pose; y: number; rot: number; scale: number; armL: number; armR: number; legL: number; legR: number; lookX: number; lookY: number; blink: number };

function greet(t: number): Partial<State> {
  const waving = t >= 8 && t < 54;
  const wave = t >= 18 && t < 46 ? Math.sin(((t - 18) / 10) * Math.PI * 2) : 0;
  const sway = t >= 20 && t < 48 ? Math.sin(((t - 20) / 10) * Math.PI * 2) : 0;
  return {
    pose: waving ? "wave" : "neutral",
    rot: t < 8 ? k(t, [0, 8], [0, 3]) : t < 54 ? k(t, [8, 16, 46, 54], [3, -1.5, -1.5, 2]) + sway * 0.9 : k(t, [54, 60, 66, 70], [2, -1.2, 0.4, 0]),
    y: t < 8 ? k(t, [0, 8], [0, 0.015]) : t < 54 ? k(t, [8, 14, 46, 54], [0.015, -0.01, 0, 0.012]) : k(t, [54, 62, 70], [0.012, -0.004, 0]),
    legR: k(t, [0, 6, 14, 20], [0, -14, -14, 0]) + k(t, [50, 54, 60], [0, -10, 0]),
    armL: waving ? k(t, [8, 14, 18], [-32, 8, 0], out) + wave * 10 + k(t, [46, 54], [0, -30]) : 0,
    armR: waving ? k(t, [8, 14, 20], [6, -3, 0]) : 0,
    lookX: k(t, [10, 16], [0, 0.08]), lookY: k(t, [10, 16, 50, 56], [0, -0.05, -0.05, 0]), blink: Math.max(blinkAt(t, 32), blinkAt(t, 51)),
  };
}

function idle(f: number): Partial<State> {
  const s = (p: number, off = 0) => Math.sin((f / 30 / p) * Math.PI * 2 + off);
  const gaps = [74, 101, 63, 118, 86];
  let b = 34, i = 0, blink = 0;
  while (b <= f + 6) { blink = Math.max(blink, blinkAt(f, b)); b += gaps[i++ % gaps.length]; }
  return { scale: 1 + 0.008 * s(3.2), y: 0.003 * s(3.2, 1.2), armL: 1.4 * s(3.2, 0.6), armR: -1.4 * s(3.2, 1.0), rot: 0.4 * s(5.5), blink };
}

const REF = FACES.neutral;
function poseBox(pose: Pose, W: number, H: number) {
  const face = FACES[pose];
  const kpx = (REF.size * H) / (face.size * face.h);
  const cw = face.w * kpx, ch = face.h * kpx;
  return { left: REF.cx * W - face.cx * cw, top: REF.cy * H - face.cy * ch, width: cw, height: ch };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

export default function ElcoCharacter({ height = 220, waveEvery = 9, className = "", label = "Elco, the IELSco and Elco AI mascot, waving hello" }: {
  height?: number; waveEvery?: number; className?: string; label?: string;
}) {
  const reduced = useReducedMotion();
  const W = height * (REF.w / REF.h);
  const root = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null);
  const groups = useRef<Partial<Record<Pose, HTMLDivElement | null>>>({});
  const parts = useRef<Partial<Record<Pose, Partial<Record<string, HTMLImageElement | null>>>>>({});
  const eyes = useRef<Partial<Record<Pose, HTMLImageElement | null>>>({});

  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0, start: number | null = null, visible = true;
    const obs = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
    if (obs && root.current) obs.observe(root.current);
    const period = Math.max(4, waveEvery) * 30;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (start === null) start = now;
      const f = ((now - start) / 1000) * 30;
      const base: State = { pose: "neutral", y: 0, rot: 0, scale: 1, armL: 0, armR: 0, legL: 0, legR: 0, lookX: 0, lookY: 0, blink: 0, ...idle(f) };
      let st = base;
      const t = (f - 12) % period; // first wave shortly after load, then every `waveEvery` seconds
      if (f >= 12 && t < GREET) {
        const a = greet(t);
        st = { ...base, ...a, y: (a.y ?? 0) + base.y * 0.5, blink: a.blink || base.blink };
      }
      const b = body.current;
      if (b) b.style.transform = `translateY(${st.y * height}px) rotate(${st.rot}deg) scale(${st.scale})`;
      for (const p of POSES) { const g = groups.current[p]; if (g) g.style.visibility = p === st.pose ? "visible" : "hidden"; }
      const pp = parts.current[st.pose];
      const box = poseBox(st.pose, W, height), kpx = box.height / FACES[st.pose].h;
      if (pp) {
        if (pp.armL) pp.armL.style.transform = `rotate(${st.armL}deg)`;
        if (pp.armR) pp.armR.style.transform = `rotate(${st.armR}deg)`;
        if (pp.legL) pp.legL.style.transform = `translateY(${st.legL * kpx}px)`;
        if (pp.legR) pp.legR.style.transform = `translateY(${st.legR * kpx}px)`;
      }
      const ey = eyes.current[st.pose], L = LAYERS[st.pose];
      if (ey && L) ey.style.transform = `translate(${st.lookX * L.w * box.width}px, ${st.lookY * L.h * box.height}px) scaleY(${L.open ? 1 - 0.88 * st.blink : 1})`;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); obs?.disconnect(); };
  }, [reduced, height, W, waveEvery]);

  const shown: Pose = reduced ? "wave" : "neutral";
  const imgCls = "pointer-events-none absolute inset-0 h-full w-full select-none";
  return (
    <div ref={root} role="img" aria-label={label} className={`relative shrink-0 ${className}`} style={{ width: W, height }} data-testid="elco-character">
      <div ref={body} className="absolute inset-0" style={{ transformOrigin: "50% 100%" }}>
        {POSES.map((p) => {
          const box = poseBox(p, W, height), R = RIG[p], L = LAYERS[p];
          return (
            <div key={p} ref={(el) => { groups.current[p] = el; }} className="absolute" style={{ ...box, visibility: p === shown ? "visible" : "hidden" }}>
              {(["legL", "legR", "armL", "armR"] as const).filter((n) => R.parts[n]).map((n) => {
                const pivot = R.parts[n]?.pivot;
                return (
                  // eslint-disable-next-line @next/next/no-img-element -- layered rig frames, transformed every animation frame
                  <img key={n} src={`${SRC}/${p}-${n}.png`} alt="" aria-hidden="true" draggable={false} decoding="async" className={imgCls}
                    ref={(el) => { (parts.current[p] ||= {})[n] = el; }}
                    style={{ transformOrigin: pivot ? `${pivot[0] * 100}% ${pivot[1] * 100}%` : "50% 50%" }} />
                );
              })}
              {/* eslint-disable-next-line @next/next/no-img-element -- rig layer */}
              <img src={`${SRC}/${p}-torso.png`} alt="" aria-hidden="true" draggable={false} decoding="async" className={imgCls} />
              {/* eslint-disable-next-line @next/next/no-img-element -- rig layer */}
              <img src={`${SRC}/layer-${p}-eyes.png`} alt="" aria-hidden="true" draggable={false} decoding="async" ref={(el) => { eyes.current[p] = el; }}
                className="pointer-events-none absolute select-none" style={{ left: `${L.x * 100}%`, top: `${L.y * 100}%`, width: `${L.w * 100}%`, height: `${L.h * 100}%`, transformOrigin: "50% 55%" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

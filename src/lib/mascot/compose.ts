// Mirrors Elco AI's src/lib/mascot/compose.js (same rig and part indices; only the asset paths and TypeScript types differ).
// Elco's animation rig for the 2026 pose library (public/mascot/poses). The artwork is never redrawn: each pose file is loaded
// as it is, and every original element is wrapped in <g> layers that name the part it belongs to, so CSS can move the parts:
//   ep-up    everything above the feet (the head and torso are ONE shape in the artwork, so a "nod" or "head shake" is the
//            whole upper body bowing or turning around the hips; there is no separate neck to animate)
//   ep-look  the eyes (look around)      ep-blink  the eyes (blink, squint)
//   ep-armL / ep-armR  each arm (+ what it holds), rotating about its shoulder
//   ep-bubble the speech bubble          feet and the floor shadow stay planted
// Wrapping one element per <g> keeps the original paint order exactly. Part lists are leaf indices in document order
// (path, rect, ellipse, circle, polygon, image), checked by rendering each pose with its indices.
//
// Accessories ("wear") are the designer's own pieces: headphones (from the listening pose) and the bow (from the companion
// pose) in public/mascot/wear, and the kit's cap, peci and sunglasses. They are placed from each pose's head box, so they
// are only offered on poses whose head is upright and free (see `wearable`).

// eyes: leaf indices; armL/armR: [indices, [shoulder x, y]]; feet: indices that stay planted; bubble: indices;
// up: hip pivot [x, y]; head: [x0, x1, top] (upright, free heads only); eye: eyes centre [x, y]; wave: the gesturing arm,
// wb/wa: its wave base angle and swing in degrees (negative raises the right arm, positive the left), wbl: the left arm's base.
type Rig = { eyes?: number[]; armL?: [number[], [number, number]]; armR?: [number[], [number, number]]; feet?: number[]; bubble?: number[]; up?: [number, number]; head?: [number, number, number]; eye?: [number, number]; wave?: "R" | "L" | "both"; wb?: number; wa?: number; wbl?: number; wears?: string[] };
export const RIG: Record<string, Rig> = {
  neutral: { eyes: [11, 12], armL: [[0, 3], [728, 992]], armR: [[6, 13], [824, 990]], feet: [1, 2, 7, 8], up: [778, 1040], head: [723, 832, 899], eye: [776.5, 945.5], wave: "R", wb: -60, wa: 14 },
  companion: { eyes: [11, 12, 18, 19], armL: [[0, 3], [918, 992]], armR: [[6, 13], [1014, 990]], feet: [1, 2, 7, 8], up: [968, 1040], eye: [967, 945.5], wave: "R", wb: -60, wa: 14, wears: ["bow"] },
  talking: { eyes: [16, 17], armL: [[9, 10, 15], [1098, 180]], armR: [[1, 4], [1182, 186]], feet: [0, 5, 6, 11, 12], bubble: [2, 3], up: [1138, 214], wave: "R", wb: -4, wa: 16 },
  explaining: { eyes: [10, 11], armL: [[15, 16], [876, 626]], armR: [[9, 12], [955, 640]], feet: [0, 1, 2, 5, 6], bubble: [13, 14], up: [908, 664], head: [852, 961, 527], eye: [917.5, 573], wave: "R", wb: 0, wa: 14 },
  thinking: { eyes: [9, 10], armL: [[14, 15], [722, 646]], armR: [[11, 16], [812, 660]], feet: [0, 1, 2, 3, 4], bubble: [12, 13], up: [758, 686], head: [695, 816, 551], eye: [772, 587.5], wave: "L", wb: 50, wa: 14 },
  presenting: { eyes: [13, 14], armL: [[7, 12], [1020, 655]], armR: [[8, 11], [1108, 655]], feet: [0, 1, 2, 3, 4], up: [1072, 692], head: [1011, 1132, 556], eye: [1054.5, 591.5], wave: "R", wb: -20, wa: 14 },
  listening: { eyes: [17, 18], armL: [[11, 16], [1300, 180]], armR: [[12, 15], [1392, 175]], feet: [0, 1, 2, 3, 4], up: [1352, 210], eye: [1335, 116.5], wave: "R", wb: -25, wa: 14, wears: ["headphones"] },
  reading: { eyes: [18, 19], feet: [0, 1, 2, 3, 4], up: [960, 216] },
  writing: { eyes: [25, 28], feet: [0, 17, 18, 21, 22], up: [1268, 672] },
  watching: { eyes: [68, 69], feet: [0], up: [772, 448] },
  trophy: { eyes: [13, 14], armL: [[1, 2], [936, 392]], armR: [[3, 12, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], [1022, 420]], feet: [0, 4, 5, 8, 9], up: [984, 444], wave: "R", wb: -10, wa: 10 },
  strong: { eyes: [12, 13], armL: [[11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27], [733, 195]], armR: [[10, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41], [823, 195]], feet: [0, 4, 5, 6, 7], up: [779, 218], head: [724, 833, 81], eye: [777.5, 126], wave: "both", wb: -15, wa: 12, wbl: 15 },
  relaxed: { eyes: [17, 18], feet: [0, 7, 8, 9, 10], up: [1240, 442] },
};

// Accessories: file, aspect (w/h), slot, and placement from the head box h = { x0, w, top } (and eyes centre e).
type Head = { x0: number; w: number; top: number };
type Wear = { src: string; ar: number; slot: "head" | "eyes"; at: (h: Head, e: [number, number]) => { x: number; y: number; w: number } };
export const WEAR: Record<string, Wear> = {
  headphones: { src: "/images/elco/wear/headphones.svg", ar: 156 / 98.9, slot: "head", at: (h: Head) => ({ x: h.x0 - 0.149 * h.w, y: h.top - 0.24 * h.w, w: 1.29 * h.w }) },
  bow: { src: "/images/elco/wear/bow.svg", ar: 60.1 / 51.2, slot: "head", at: (h: Head) => ({ x: h.x0 + 0.532 * h.w, y: h.top - 0.211 * h.w, w: 0.55 * h.w }) },
  cap: { src: "/images/elco/kit/cap.png", ar: 900 / 568, slot: "head", at: (h: Head) => ({ x: h.x0 - 0.07 * h.w, y: h.top - 0.36 * h.w, w: 1.14 * h.w }) },
  peci: { src: "/images/elco/kit/peci.png", ar: 900 / 377, slot: "head", at: (h: Head) => ({ x: h.x0 + 0.12 * h.w, y: h.top - 0.13 * h.w, w: 0.76 * h.w }) },
  sunglasses: { src: "/images/elco/kit/sunglasses.svg", ar: 3, slot: "eyes", at: (h: Head, e: [number, number]) => ({ x: e[0] - 0.36 * h.w, y: e[1] - 0.12 * h.w, w: 0.72 * h.w }) },
};

/** The accessories a pose can wear (only upright, free heads; a pose's own headwear takes the head slot). */
export function wearable(pose: string): string[] {
  const r = RIG[pose];
  if (!r || !r.head) return [];
  return Object.keys(WEAR).filter((k) => !(r.wears || []).some((w) => WEAR[w].slot === WEAR[k].slot));
}

/** Keep only compatible accessories, one per slot, in list order. */
export function fitWear(pose: string, wear: string | string[] | null | undefined = []): string[] {
  const ok = wearable(pose), slots = new Set<string>();
  return ([] as string[]).concat(wear || []).filter((k) => {
    if (!ok.includes(k) || slots.has(WEAR[k].slot)) return false;
    slots.add(WEAR[k].slot); return true;
  });
}

const LEAF = "path,rect,ellipse,circle,polygon,polyline,line,image";
const NS = "http://www.w3.org/2000/svg";
const px = (p: number[]) => `${p[0]}px ${p[1]}px`;

function wrap(doc: Document, el: Element, cls: string, origin?: string): Element {
  const g = doc.createElementNS(NS, "g");
  g.setAttribute("class", cls);
  if (origin) g.setAttribute("style", `transform-origin:${origin}`);
  el.parentNode!.insertBefore(g, el);
  g.appendChild(el);
  return g;
}

/**
 * Rigged SVG markup for a pose. `uid` prefixes the ids so several poses (and copies) can live on one page.
 * Returns null when the text isn't an SVG (the caller keeps showing the plain <img>).
 */
export function composePose(text: string, pose: string, { wear = [], uid = pose }: { wear?: string[]; uid?: string } = {}): string | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName !== "svg" || doc.getElementsByTagName("parsererror").length) return null;
  const r = RIG[pose] || {};
  // ids → per-instance ids (gradients are referenced as url(#id) and href="#id")
  const ids = [...svg.querySelectorAll("[id]")].map((n) => n.id);
  let markup = new XMLSerializer().serializeToString(svg);
  ids.forEach((id) => {
    const nid = `${uid}-${id}`;
    markup = markup.split(`id="${id}"`).join(`id="${nid}"`).split(`url(#${id})`).join(`url(#${nid})`).split(`href="#${id}"`).join(`href="#${nid}"`);
  });
  const d2 = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = d2.documentElement;
  const leaves = [...root.querySelectorAll(LEAF)].filter((n) => !n.closest("defs"));
  const role = new Map<number, string>();
  (r.eyes || []).forEach((i) => role.set(i, "eye"));
  (r.feet || []).forEach((i) => role.set(i, "feet"));
  (r.bubble || []).forEach((i) => role.set(i, "bubble"));
  if (r.armL) r.armL[0].forEach((i) => role.set(i, "armL"));
  if (r.armR) r.armR[0].forEach((i) => role.set(i, "armR"));
  const up = r.up ? px(r.up) : "50% 100%";
  leaves.forEach((el, i) => {
    const k = role.get(i);
    if (k === "feet") { wrap(d2, el, "ep-feet"); return; }
    let inner = el;
    if (k === "eye") { inner = wrap(d2, el, "ep-blink"); inner = wrap(d2, inner, "ep-look"); }
    else if (k === "armL") inner = wrap(d2, el, "ep-armL", px(r.armL![1]));
    else if (k === "armR") inner = wrap(d2, el, "ep-armR", px(r.armR![1]));
    else if (k === "bubble") inner = wrap(d2, el, "ep-bubble");
    wrap(d2, inner, "ep-up", up);
  });
  // accessories, drawn on top, moving with the body
  const fitted = fitWear(pose, wear);
  const vb = (root.getAttribute("viewBox") || "0 0 100 100").split(/[\s,]+/).map(Number);
  let [bx0, by0, bx1, by1] = [vb[0], vb[1], vb[0] + vb[2], vb[1] + vb[3]];
  if (fitted.length && r.head) {
    const h = { x0: r.head[0], w: r.head[1] - r.head[0], top: r.head[2] };
    fitted.forEach((k) => {
      const a = WEAR[k], p = a.at(h, r.eye || [h.x0 + h.w / 2, h.top + h.w * 0.45]);
      const img = d2.createElementNS(NS, "image");
      img.setAttribute("href", a.src);
      (([["x", p.x], ["y", p.y], ["width", p.w], ["height", p.w / a.ar]]) as [string, number][]).forEach(([n, v]) => img.setAttribute(n, v.toFixed(1)));
      img.setAttribute("preserveAspectRatio", "xMidYMid meet");
      img.setAttribute("data-wear", k);
      root.appendChild(img);
      bx0 = Math.min(bx0, p.x); by0 = Math.min(by0, p.y); bx1 = Math.max(bx1, p.x + p.w); by1 = Math.max(by1, p.y + p.w / a.ar);
      wrap(d2, img, `ep-up ep-wear-${a.slot}`, up);
    });
  }
  // merge neighbouring body wrappers (same pivot) so the browser animates a few groups, not one per element
  [...root.querySelectorAll("g.ep-up")].forEach((g) => {
    const prev = g.previousElementSibling;
    if (prev && prev.getAttribute("class") === "ep-up" && g.getAttribute("class") === "ep-up" && prev.getAttribute("style") === g.getAttribute("style")) {
      while (g.firstChild) prev.appendChild(g.firstChild);
      g.remove();
    }
  });
  if (r.wave) root.setAttribute("style", `--wb:${r.wb || 0}deg;--wa:${r.wa || 12}deg;--wbl:${r.wbl || 0}deg`);
  root.setAttribute("viewBox", [bx0, by0, bx1 - bx0, by1 - by0].map((v) => +v.toFixed(1)).join(" "));
  root.setAttribute("class", "ep-svg");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("focusable", "false");
  root.removeAttribute("width"); root.removeAttribute("height");
  return new XMLSerializer().serializeToString(root);
}

// One fetch per pose file for the whole app.
const cache = new Map<string, Promise<string>>();
export function loadPose(pose: string): Promise<string> {
  if (!cache.has(pose)) cache.set(pose, fetch(`/images/elco/poses/${pose}.svg`).then((r) => (r.ok ? r.text() as Promise<string> : Promise.reject(new Error(String(r.status))))).catch((e: unknown) => { cache.delete(pose); throw e; }));
  return cache.get(pose)!;
}

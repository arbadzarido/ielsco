// "Words We Leave Behind" story cards: one canvas renderer used for BOTH the live preview and the PNG export, so the
// download is pixel-identical to what the recipient sees. 1080 × 1920 (Instagram Story, 9:16).
// Only the message text, an optional first name of the RECIPIENT and GIF branding are drawn. Never sender data or ids.
import { Caveat, Fraunces, Plus_Jakarta_Sans } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });

export const W = 1080, H = 1920;

export interface Theme { key: string; name: string; group: string; bg: [string, string]; ink: string; soft: string; accent: string; panel: string; dark: boolean }
export const THEMES: Theme[] = [
  { key: "paper", name: "Paper", group: "Minimal", bg: ["#F6F1E8", "#EFE6D6"], ink: "#2B2723", soft: "#7A6F63", accent: "#C4643F", panel: "#FFFCF6", dark: false },
  { key: "blush", name: "Blush", group: "Pastel", bg: ["#FBE3E6", "#FCEFE4"], ink: "#4A2A34", soft: "#93636F", accent: "#D45D7E", panel: "#FFF8F7", dark: false },
  { key: "sage", name: "Sage", group: "Pastel", bg: ["#E4EDDF", "#F2F1E6"], ink: "#22372A", soft: "#5F7766", accent: "#4F8A5E", panel: "#FBFCF7", dark: false },
  { key: "lilac", name: "Lilac", group: "Pastel", bg: ["#ECE6FA", "#F7EEF6"], ink: "#2F2650", soft: "#6E6491", accent: "#7A5AD6", panel: "#FDFBFF", dark: false },
  { key: "lagoon", name: "Lagoon", group: "Vibrant", bg: ["#0F7C86", "#27458F"], ink: "#FFFFFF", soft: "#CFE6F0", accent: "#FFD36E", panel: "#FFFFFF1A", dark: true },
  { key: "sunset", name: "Sunset", group: "Warm", bg: ["#FF9A62", "#D9466F"], ink: "#FFFFFF", soft: "#FFE3D6", accent: "#FFF1BF", panel: "#FFFFFF22", dark: true },
  { key: "harbour", name: "Harbour", group: "IELSco", bg: ["#2F4157", "#577E90"], ink: "#FFFFFF", soft: "#D5E2EA", accent: "#F28B8D", panel: "#FFFFFF18", dark: true },
  { key: "midnight", name: "Midnight", group: "Monochrome", bg: ["#15171C", "#23262E"], ink: "#F3EFE7", soft: "#A9A39A", accent: "#D2B477", panel: "#FFFFFF0F", dark: true },
  { key: "mono", name: "Ink", group: "Monochrome", bg: ["#FFFFFF", "#F2F2F0"], ink: "#151515", soft: "#6B6B6B", accent: "#151515", panel: "#FFFFFF", dark: false },
];
export const BACKGROUNDS = [
  { key: "gradient", name: "Soft gradient" }, { key: "solid", name: "Solid" }, { key: "grain", name: "Paper grain" },
  { key: "dots", name: "Dots" }, { key: "waves", name: "Lines" },
] as const;
export const LAYOUTS = [
  { key: "letter", name: "Letter" }, { key: "note", name: "Note card" }, { key: "bold", name: "Bold" },
] as const;
export const TYPE = [
  { key: "serif", name: "Serif" }, { key: "sans", name: "Modern" }, { key: "hand", name: "Handwritten" },
] as const;
export const DECOR = [
  { key: "sparkles", name: "Sparkles" }, { key: "hearts", name: "Hearts" }, { key: "stars", name: "Stars" }, { key: "shapes", name: "Shapes" }, { key: "none", name: "None" },
] as const;

export interface Design { theme: string; background: string; layout: string; type: string; decor: string; showName: boolean }
export const DEFAULT_DESIGN: Design = { theme: "paper", background: "grain", layout: "letter", type: "serif", decor: "sparkles", showName: true };

const families = () => ({
  serif: fraunces.style.fontFamily, sans: jakarta.style.fontFamily, hand: caveat.style.fontFamily, label: jakarta.style.fontFamily,
});

export async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = families();
  await Promise.all([
    document.fonts.load(`400 60px ${f.serif}`), document.fonts.load(`italic 400 60px ${f.serif}`), document.fonts.load(`600 60px ${f.serif}`),
    document.fonts.load(`500 60px ${f.hand}`), document.fonts.load(`700 60px ${f.label}`), document.fonts.load(`500 60px ${f.sans}`),
  ]).catch(() => {});
}

// Deterministic PRNG so the same message always gets the same grain / confetti (preview == export).
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) out.push(line);
      // a single very long word: hard-break it
      if (ctx.measureText(word).width > maxW) {
        let chunk = "";
        for (const ch of word) { if (ctx.measureText(chunk + ch).width > maxW) { out.push(chunk); chunk = ch; } else chunk += ch; }
        line = chunk;
      } else line = word;
    }
    out.push(line);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

// Largest font size (between max and min) at which the text fits the box.
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, box: { w: number; h: number }, max: number, min: number, lh: number) {
  let lo = min, hi = max, best = { size: min, lines: [] as string[] };
  ctx.font = font(min); best.lines = wrap(ctx, text, box.w);
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = font(mid);
    const lines = wrap(ctx, text, box.w);
    if (lines.length * mid * lh <= box.h) { lo = mid; best = { size: mid, lines }; } else hi = mid;
  }
  ctx.font = font(max);
  const atMax = wrap(ctx, text, box.w);
  if (atMax.length * max * lh <= box.h) best = { size: max, lines: atMax };
  return best;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
}
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3); ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3); ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); ctx.fill();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

export interface CardInput { message: string; seed: string; recipientFirstName?: string | null; heading?: string }

export function drawCard(ctx: CanvasRenderingContext2D, input: CardInput, d: Design) {
  const t = THEMES.find((x) => x.key === d.theme) ?? THEMES[0];
  const f = families();
  const rand = rng(input.seed + d.theme + d.decor);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // background
  if (d.background === "solid") { ctx.fillStyle = t.bg[0]; ctx.fillRect(0, 0, W, H); }
  else {
    const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (d.background === "grain") {
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = t.dark ? `rgba(255,255,255,${0.025 + rand() * 0.04})` : `rgba(60,40,20,${0.02 + rand() * 0.035})`;
      ctx.fillRect(rand() * W, rand() * H, 2, 2);
    }
  } else if (d.background === "dots") {
    ctx.fillStyle = t.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.055)";
    for (let y = 40; y < H; y += 54) for (let x = (y / 54) % 2 ? 40 : 67; x < W; x += 54) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill(); }
  } else if (d.background === "waves") {
    ctx.strokeStyle = t.dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)"; ctx.lineWidth = 2.5;
    for (let y = -40; y < H + 80; y += 46) { ctx.beginPath(); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y + Math.sin(x / 140) * 16); ctx.stroke(); }
  }

  // decorations (kept to the margins so they never cover the message)
  ctx.fillStyle = t.accent;
  const spots: [number, number][] = [[110, 190], [960, 260], [150, 1560], [930, 1500], [860, 120], [46, 900], [1034, 980], [985, 1640]];
  if (d.decor === "sparkles") spots.forEach(([x, y], i) => { ctx.globalAlpha = 0.55 + rand() * 0.4; sparkle(ctx, x, y, 14 + (i % 3) * 9); });
  if (d.decor === "hearts") spots.slice(0, 6).forEach(([x, y], i) => { ctx.globalAlpha = 0.45 + rand() * 0.4; heart(ctx, x, y - 20, 34 + (i % 3) * 10); });
  if (d.decor === "stars") spots.forEach(([x, y], i) => { ctx.globalAlpha = 0.5 + rand() * 0.4; star(ctx, x, y, 12 + (i % 3) * 8); });
  if (d.decor === "shapes") {
    ctx.globalAlpha = t.dark ? 0.16 : 0.13;
    ctx.beginPath(); ctx.arc(980, 170, 230, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, 1760, 260, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = t.dark ? 0.22 : 0.18; ctx.lineWidth = 6; ctx.strokeStyle = t.accent;
    ctx.beginPath(); ctx.arc(150, 330, 70, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const bodyFont = (px: number) => d.type === "serif" ? `400 ${px}px ${f.serif}` : d.type === "hand" ? `500 ${px}px ${f.hand}` : `500 ${px}px ${f.sans}`;
  const lh = d.type === "hand" ? 1.2 : 1.38;
  const label = (px: number, weight = 700) => `${weight} ${px}px ${f.label}`;
  const heading = input.heading ?? (d.showName && input.recipientFirstName ? `For ${input.recipientFirstName}` : "A message for you");

  // message panel geometry per layout
  let box = { x: 140, y: 560, w: 800, h: 960 };
  let align: CanvasTextAlign = "center";
  if (d.layout === "note") {
    const px = 90, py = 380, pw = W - 180, ph = 1220;
    ctx.save();
    ctx.shadowColor = t.dark ? "rgba(0,0,0,0.35)" : "rgba(60,40,20,0.14)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.fillStyle = t.dark ? "rgba(255,255,255,0.08)" : t.panel;
    roundRect(ctx, px, py, pw, ph, 44); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = t.dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.06)"; ctx.lineWidth = 2; roundRect(ctx, px, py, pw, ph, 44); ctx.stroke();
    box = { x: px + 90, y: py + 300, w: pw - 180, h: ph - 440 }; align = "left";
  } else if (d.layout === "bold") {
    box = { x: 110, y: 470, w: 860, h: 1050 }; align = "left";
  }

  // heading
  ctx.fillStyle = t.soft; ctx.textAlign = align === "center" ? "center" : "left";
  const hx = align === "center" ? W / 2 : box.x;
  ctx.font = label(30);
  const kicker = "WORDS WE LEAVE BEHIND";
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText(kicker, hx, d.layout === "note" ? 520 : d.layout === "bold" ? 300 : 360);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  ctx.fillStyle = t.ink;
  ctx.font = d.type === "hand" ? `700 76px ${f.hand}` : d.type === "serif" ? `italic 400 64px ${f.serif}` : label(58);
  ctx.fillText(heading, hx, d.layout === "note" ? 600 : d.layout === "bold" ? 390 : 450);

  // quote mark
  ctx.fillStyle = t.accent; ctx.globalAlpha = 0.9;
  ctx.font = `600 ${d.layout === "bold" ? 200 : 150}px ${f.serif}`;
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.fillText("“", align === "center" ? W / 2 : box.x - 8, box.y + (d.layout === "bold" ? 110 : 60));
  ctx.globalAlpha = 1;

  // message (auto-fitted)
  const textBox = { w: box.w, h: box.h - (d.layout === "bold" ? 130 : 110) };
  const maxSize = d.layout === "bold" ? (d.type === "hand" ? 92 : 76) : (d.type === "hand" ? 80 : 64);
  const { size, lines } = fit(ctx, input.message.trim(), bodyFont, textBox, maxSize, 24, lh);
  ctx.font = bodyFont(size); ctx.fillStyle = t.ink; ctx.textAlign = align;
  const blockH = lines.length * size * lh;
  const top = box.y + (d.layout === "bold" ? 130 : 110) + Math.max(0, (textBox.h - blockH) / (d.layout === "letter" ? 2 : 3));
  lines.forEach((ln, i) => ctx.fillText(ln, align === "center" ? W / 2 : box.x, top + size + i * size * lh - size * 0.15));

  // signature + branding
  const sigY = Math.min(top + blockH + 120, d.layout === "note" ? 1530 : 1640);
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.fillStyle = t.soft;
  ctx.font = d.type === "hand" ? `500 52px ${f.hand}` : d.type === "serif" ? `italic 400 40px ${f.serif}` : label(34, 500);
  ctx.fillText("— someone you met at GIF 2026", align === "center" ? W / 2 : box.x, sigY);

  ctx.textAlign = "center"; ctx.fillStyle = t.soft; ctx.font = label(28);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "4px";
  ctx.fillText("GLOBAL IMPACT FELLOWSHIP 2026", W / 2, H - 150);
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  ctx.font = label(26, 500); ctx.globalAlpha = 0.8;
  ctx.fillText("Singapore · @iels.co · @elco.ai", W / 2, H - 104);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export async function renderToBlob(input: CardInput, d: Design): Promise<Blob> {
  await ensureFonts();
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  drawCard(ctx, input, d);
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't create the image."))), "image/png"));
}

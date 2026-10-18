import { ImageResponse } from "next/og";
import { getStoryBySlug } from "@/lib/stories/public";
import { CATEGORY_LABELS } from "@/lib/stories/types";

// Open Graph / Twitter card generated from the story record: banner photo, title, author and category.
export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "IELS Circle member story";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://www.ielsco.com";

// Inline the banner as a data URL so a slow or failing image host never breaks the card. Only PNG/JPEG are embedded
// (what the renderer supports); anything else falls back to the plain brand background.
async function embed(src: string | undefined): Promise<string | null> {
  if (!src) return null;
  try {
    const url = /^https?:\/\//.test(src) ? src : new URL(src, SITE).toString();
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 6_000_000) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Emoji and flag glyphs aren't in the card font; drop them rather than render empty boxes.
const plain = (s: string) => s.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}]|‍|️/gu, "").replace(/\s+/g, " ").trim();

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getStoryBySlug(slug);
  const story = found.kind === "found" ? { ...found.story, title: plain(found.story.title) } : null;
  const banner = story ? await embed(story.bannerImage) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#2F4157" }}>
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(to top, rgba(26,37,52,0.95) 0%, rgba(26,37,52,0.55) 55%, rgba(26,37,52,0.15) 100%)" }} />
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 56, display: "flex", flexDirection: "column", color: "white" }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#F3A5A6" }}>
            {story ? `${CATEGORY_LABELS[story.category]} · Member story` : "IELS Circle"}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: story && story.title.length > 70 ? 48 : 58, fontWeight: 800, lineHeight: 1.1 }}>
            {story ? story.title : "Member stories from across Southeast Asia"}
          </div>
          {story && (
            <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: "rgba(255,255,255,0.85)" }}>
              {[story.author.name, story.location].filter(Boolean).join(" · ")}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 28, fontSize: 22, color: "rgba(255,255,255,0.7)" }}>circle.ielsco.com/stories</div>
        </div>
      </div>
    ),
    size
  );
}

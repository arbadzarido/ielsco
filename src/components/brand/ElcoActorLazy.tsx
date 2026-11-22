"use client";

import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import type { Act } from "./ElcoActor";

// ElcoActor, loaded on demand. The animated mascot (rig, scheduler, CSS) is about 10 KB that no page needs for its first
// paint, and loading/error/empty states sit in route bundles that every visitor downloads. So those states render this
// wrapper: the plain pose picture straight away (the same picture ElcoActor shows until its rig is ready, so nothing
// jumps), and the animated actor takes its place once its code has arrived. Same props as ElcoActor.
type Props = {
  pose?: string; wear?: string[]; act?: Act | null; actKey?: number | string; idle?: boolean; alive?: boolean; react?: boolean;
  alt?: string; className?: string; style?: CSSProperties; onTap?: () => void; testid?: string;
};

export default function ElcoActorLazy(props: Props) {
  const [Actor, setActor] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let off = false;
    import("./ElcoActor").then((m) => { if (!off) setActor(() => m.default as ComponentType<Props>); });
    return () => { off = true; };
  }, []);
  if (Actor) return <Actor {...props} />;
  const { pose = "neutral", className = "", style, alt, testid = "elco-actor" } = props;
  return (
    <span className={`elco-actor ${className}`} style={{ display: "inline-block", position: "relative", flex: "none", lineHeight: 0, ...style }}
      data-pose={pose} data-testid={testid} {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true as const })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/images/elco/poses/${pose}.svg`} alt="" draggable={false} decoding="async" style={{ display: "block", width: "auto", height: "100%", maxWidth: "none" }} />
    </span>
  );
}

"use client";

import { useEffect, useState, type ComponentType } from "react";
import MiniError from "./MiniError";

type Props = { error: Error & { digest?: string }; reset: () => void; home?: string; homeLabel?: string };

// What every error.tsx renders: MiniError at once, the full Elco state (RouteError, loaded separately) once it arrives.
// `load` picks which full component to bring in (the plain page one, or the dashboard one with the sidebar).
export default function RouteErrorLazy({ load = () => import("./RouteError").then((m) => m.default as ComponentType<Props>), ...props }: Props & { load?: () => Promise<ComponentType<Props>> }) {
  const [Full, setFull] = useState<ComponentType<Props> | null>(null);
  useEffect(() => {
    let off = false;
    load().then((C) => { if (!off) setFull(() => C); }).catch(() => {});
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return Full ? <Full {...props} /> : <MiniError {...props} />;
}

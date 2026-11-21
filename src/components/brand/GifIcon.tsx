import { forwardRef, type HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

// The official Global Impact Fellowship mark (public/images/logos/gif/gif-icon.png, the same file as gif.ielsco.com's
// brand/gif-icon-navy.png) used as a CSS mask filled with currentColor, so it stands in for a Lucide icon in the
// sidebar and follows its normal, hover and active colours like the Circle "C". The shape is the logo's own.
const GifIconBase = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement> & { size?: number | string; strokeWidth?: number | string; absoluteStrokeWidth?: boolean }>(
  function GifIcon({ size, strokeWidth: _sw, absoluteStrokeWidth: _abs, style, ...props }, ref) {
    void _sw; void _abs;
    const mask = "url(/images/logos/gif/gif-icon.png) center / contain no-repeat";
    return (
      <span ref={ref} role="img" {...props}
        style={{ display: "inline-block", width: size, height: size, backgroundColor: "currentColor", WebkitMask: mask, mask, ...style }} />
    );
  },
);

export const GifIcon = GifIconBase as unknown as LucideIcon;

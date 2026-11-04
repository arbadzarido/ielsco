import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

// The official IELS Circle "C" mark (public/images/logos/circle/circle-c-blue.svg, from the Circle logo pack), drawn in
// currentColor so it can stand in for a Lucide icon in the sidebar and follow its normal, hover and active colours.
// Only the paths' colour is changed; shapes and proportions are the logo's own. `strokeWidth` from callers is ignored.
const CircleCIconBase = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement> & { size?: number | string; absoluteStrokeWidth?: boolean }>(
  function CircleCIcon({ size, strokeWidth: _sw, absoluteStrokeWidth: _abs, ...props }, ref) {
    void _sw; void _abs;
    return (
      <svg ref={ref} viewBox="0 0 212 243" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size} {...props}>
        <path d="M196.435 66.869C186.248 45.4147 156.669 20.9192 133.893 16.6605C97.8241 9.9165 56.1397 23.5535 33.4419 53.6783C11.3056 83.058 5.07692 147.04 37.2857 171.894C49.0057 180.938 29.6912 215.79 37.2857 227.223C40.0295 231.353 70.928 202.542 74.1339 199.688C82.1471 192.555 89.3403 197.849 98.019 199.688C141.704 208.943 186.745 187.437 196.435 140.424"
          stroke="currentColor" strokeWidth="29.9497" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M88.0879 125.355C102.678 143.84 128.508 138.894 135.389 125.075" stroke="currentColor" strokeWidth="10.5705" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="91.1691" cy="97.3273" r="7.92786" fill="currentColor" />
        <circle cx="132.569" cy="98.2101" r="7.92786" fill="currentColor" />
      </svg>
    );
  },
);

export const CircleCIcon = CircleCIconBase as unknown as LucideIcon;

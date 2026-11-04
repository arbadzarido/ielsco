// Pure: the one Elco step IELSco offers a signed-in member (no imports, so node --test can load it). Destinations are Elco
// app routes; Elco asks for sign-in there when needed and returns to the same page.
export type ElcoState = {
  linked: boolean; elco_display_name?: string | null; active: boolean; tier?: "starter" | "pro"; ends_at?: string;
  speaking_club_per_month?: number | null; speaking_club_used?: number; mentoring_per_month?: number; mentoring_used?: number;
  exams: { modes: string[]; ends_at: string; source: string }[]; upcoming?: string | null;
};

export function nextStepFor(s: ElcoState | null, elcoUrl: string): { id: string; label: string; href: string } | null {
  if (!s) return null;
  if (!s.linked) return { id: "connect", label: "Connect Elco account", href: `${elcoUrl}/connect/ielsco` };
  const exam = s.exams[0];
  if (exam && (!s.active || s.tier === "pro")) return { id: "exam", label: "View my exam access", href: `${elcoUrl}/exam/${exam.modes[0]}` };
  if (!s.active) return { id: "plans", label: "Explore Elco plans", href: `${elcoUrl}/pricing?program=learning&from=ielsco` };
  if (s.tier === "starter") return { id: "pro", label: "Upgrade to Pro", href: `${elcoUrl}/pricing?program=learning&plan=pro&period=1&from=ielsco` };
  return { id: "exams", label: "Explore exam preparation", href: `${elcoUrl}/pricing?program=toefl&from=ielsco` };
}

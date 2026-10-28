"use client";

import { ELCO_ENABLED } from "@/lib/elco";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ProductTour, type TourStep } from "@/components/tour/ProductTour";
import { IELSCO_DASHBOARD_TOUR, loadTourStatus, saveTourStatus, type TourStatus } from "@/lib/tours";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { track } from "@/lib/analytics";

// First-visit tour of the member dashboard (the five menus and Elco Copilot). Shown once per user (completed or skipped), replayable from the
// account menu ("Take a tour" → /dashboard?tour=1). Independent of Elco's own tour.
export function DashboardTour({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const replay = params.get("tour") === "1";

  useEffect(() => {
    let cancelled = false;
    if (replay) { setOpen(true); return; }
    loadTourStatus(supabase, userId, IELSCO_DASHBOARD_TOUR.key, IELSCO_DASHBOARD_TOUR.version).then((status) => {
      // Small delay so the page has rendered its targets before the tour measures them.
      if (!cancelled && status === null) window.setTimeout(() => !cancelled && setOpen(true), 600);
    });
    return () => { cancelled = true; };
  }, [supabase, userId, replay]);

  useEffect(() => { if (open) track("tour_started", { replay }); }, [open, replay]);

  const close = (status: TourStatus) => {
    setOpen(false);
    track("tour_completed", { status });
    void saveTourStatus(supabase, userId, IELSCO_DASHBOARD_TOUR.key, IELSCO_DASHBOARD_TOUR.version, status);
    if (replay) router.replace(pathname);
  };

  // The five menus, then the Copilot button. Desktop targets the sidebar, phones the bottom bar; a step whose target
  // isn't on screen is skipped by ProductTour.
  const steps: TourStep[] = [
    { id: "home", targets: ['[data-testid="nav-home"]', '[data-testid="mobile-nav-home"]'], title: t("tour.homeTitle"), body: t("tour.homeBody") },
    { id: "discover", targets: ['[data-testid="nav-discover"]', '[data-testid="mobile-nav-discover"]'], title: t("tour.discoverTitle"), body: t("tour.discoverBody") },
    { id: "social", targets: ['[data-testid="nav-social"]', '[data-testid="mobile-nav-social"]'], title: t("tour.socialTitle"), body: t("tour.socialBody") },
    { id: "connect", targets: ['[data-testid="nav-connect"]', '[data-testid="mobile-nav-connect"]'], title: t("tour.connectTitle"), body: t("tour.connectBody") },
    { id: "more", targets: ['[data-testid="nav-more"]', '[data-testid="mobile-nav-more"]'], title: t("tour.moreTitle"), body: t("tour.moreBody") },
    { id: "copilot", targets: ['[data-testid="copilot-button"]'], title: t("tour.copilotTitle"), body: t("tour.copilotBody") },
    ...(ELCO_ENABLED ? [{ id: "elco", targets: ['[data-tour="ielsco-elco"]'], title: t("tour.elcoTitle"), body: t("tour.elcoBody") }] : []),
  ];

  return (
    <ProductTour
      steps={steps}
      open={open}
      onFinish={() => close("completed")}
      onSkip={() => close("skipped")}
      labels={{
        next: t("tour.next"), back: t("tour.back"), finish: t("tour.finish"), skip: t("tour.skip"), close: t("tour.close"),
        step: (n, total) => t("tour.step", { n, total }),
      }}
    />
  );
}

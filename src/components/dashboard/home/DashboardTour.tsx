"use client";

import { ELCO_ENABLED } from "@/lib/elco";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ProductTour, type TourStep } from "@/components/tour/ProductTour";
import { IELSCO_DASHBOARD_TOUR, loadTourStatus, saveTourStatus, type TourStatus } from "@/lib/tours";
import { useI18n } from "@/lib/i18n/I18nProvider";

// First-visit tour of the member dashboard. Shown once per user (completed or skipped), replayable from the
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

  const close = (status: TourStatus) => {
    setOpen(false);
    void saveTourStatus(supabase, userId, IELSCO_DASHBOARD_TOUR.key, IELSCO_DASHBOARD_TOUR.version, status);
    if (replay) router.replace(pathname);
  };

  const steps: TourStep[] = [
    { id: "home", targets: ['[data-tour="ielsco-home"]'], title: t("tour.homeTitle"), body: t("tour.homeBody") },
    { id: "resources", targets: ['[data-testid="nav-resources"]', '[data-testid="mobile-nav-resources"]'], title: t("tour.resourcesTitle"), body: t("tour.resourcesBody") },
    { id: "people", targets: ['[data-testid="nav-people"]', '[data-testid="mobile-nav-more"]'], title: t("tour.peopleTitle"), body: t("tour.peopleBody") },
    { id: "goals", targets: ['[data-testid="nav-my-goals"]', '[data-testid="mobile-nav-my-goals"]'], title: t("tour.goalsTitle"), body: t("tour.goalsBody") },
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

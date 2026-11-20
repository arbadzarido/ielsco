import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { STATUS_LABEL, STATUSES } from "@/lib/status";
import { PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Application status", description: "Check your GIF Summer 2027 application status, payments and next steps." };
export const dynamic = "force-dynamic";

export default async function Status() {
  if (await getAccount().catch(() => null)) redirect("/portal");
  return (
    <>
      <PageHero eyebrow="Application status" title="Your status lives in your portal."
        lead="For your privacy we show application details only after you sign in with the email you applied with.">
        <div className="btn-row"><Link className="btn btn-light" href="/login?next=/portal">Log in to check</Link><Link className="btn btn-secondary" href="/apply">Start an application</Link></div>
      </PageHero>
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><div className="eyebrow">What each status means</div><h2>From draft to delegate.</h2></div>
          <div className="table-wrap"><table className="t compact"><tbody>
            {STATUSES.map((s) => <tr key={s}><td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{STATUS_LABEL[s]}</td><td className="muted">{EXPLAIN[s]}</td></tr>)}
          </tbody></table></div>
        </div>
      </section>
    </>
  );
}

const EXPLAIN: Record<(typeof STATUSES)[number], string> = {
  draft: "Saved but not submitted. Finish and submit it from your portal.",
  submitted: "We have your application.",
  awaiting_payment: "Your next step is a payment (Elco Pro, mentoring fee or deposit).",
  payment_verification: "A payment is in progress and waiting for confirmation from the payment provider or finance.",
  phase_1_completed: "Phase 1 is complete (Fully Funded), or you are enrolled in mentoring and go straight to Phase 3.",
  phase_2_in_progress: "You have started your Phase 2 essay and deck.",
  phase_2_submitted: "Phase 2 received. Phase 3 opens on 25 May 2027.",
  phase_3_in_progress: "You have started your Phase 3 video pitch.",
  phase_3_submitted: "Phase 3 received.",
  under_evaluation: "Evaluators are scoring your application.",
  selected_fully_funded: "Selected as a Fully Funded delegate. Accept your offer in the portal.",
  selected_partial_funded: "Selected as a Partial Funded delegate. Read your award and accept in the portal.",
  not_selected: "Not selected for funding. You keep Elco Pro and any mentoring.",
  confirmed_participant: "Your seat is confirmed. Preparation steps are in your portal.",
  withdrawn: "The application was withdrawn.",
};

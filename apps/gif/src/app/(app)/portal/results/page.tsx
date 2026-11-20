import Link from "next/link";
import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { formatMoney } from "@/lib/pricing";
import { fmtDateTime } from "@/lib/format";
import { AcceptOffer } from "./AcceptOffer";

export default async function Results() {
  const c = await portalContext("/portal/results");
  const { app, detail } = c;
  if (!app || !detail) redirect("/portal");
  const published = !!app.outcome_published_at;
  const cash = detail.cashbacks;
  return (
    <>
      <h1>Results</h1>
      {!published ? (
        <div className="notice"><p>Results are published on {fmtDateTime(c.cohort.settings.dates.results)}. We will email you as soon as yours is ready.</p></div>
      ) : app.outcome === "not_selected" ? (
        <>
          <div className="notice"><p><strong>Not selected.</strong> Thank you for taking part. You were not selected for funding in GIF Summer 2027.</p></div>
          <p>Your Elco Pro access{app.pathway === "mentoring" ? " and the full mentoring programme are" : " is"} yours to keep. You can still join as a <Link href="/self-funded">Self-Funded delegate</Link> while seats remain: contact us to switch.</p>
        </>
      ) : (
        <>
          <div className="notice ok"><p><strong>Selected: {app.outcome === "fully_funded" ? "Fully Funded" : "Partial Funded"}.</strong> Congratulations{app.mode === "team" ? ` to team ${app.team_name}` : ""}!</p></div>
          <p>Your award details are sent in your result letter by email. {app.outcome === "partial_funded" ? "Any amount you still pay appears on your Payments page after you accept." : ""}</p>
          {app.offer_accepted_at ? <p className="badge ok">Offer accepted {fmtDateTime(app.offer_accepted_at)}</p> : c.isOwner ? <AcceptOffer /> : <p className="muted">Your team leader accepts the offer for the team.</p>}
        </>
      )}
      {cash.length > 0 && (
        <>
          <h2>Mentoring cashback</h2>
          <div className="table-wrap"><table className="t compact"><thead><tr><th>Delegate</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {cash.map((x) => <tr key={x.participant_id}><td>{detail.participants.find((p) => p.id === x.participant_id)?.legal_name}</td><td>{formatMoney(x.amount, x.currency as "IDR" | "USD")}</td><td>{x.status.replace(/_/g, " ")}</td></tr>)}
          </tbody></table></div>
          <p className="small muted">Cashback is paid after verification of identity, enrolment and payment. We will contact you for bank details.</p>
        </>
      )}
    </>
  );
}

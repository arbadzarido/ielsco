import Link from "next/link";
import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { fmtDate } from "@/lib/format";
import { ageOn } from "@/lib/validation";

export default async function Onboarding() {
  const c = await portalContext("/portal/onboarding");
  const { app, detail, me } = c;
  if (!app || !detail) redirect("/portal");
  const confirmed = app.status === "confirmed_participant" || me?.seat_status === "confirmed";
  const docs = detail.documents;
  const has = (k: string) => docs.some((d) => d.kind === k && (!me || d.participant_id === me.id || c.isOwner));
  const minor = me ? ageOn(me.date_of_birth, new Date("2027-07-27T00:00:00Z")) < 18 : false;
  const balanceOpen = detail.obligations.some((o) => o.kind === "balance" && o.status === "open" && (c.isOwner || o.participant_id === me?.id));
  const items: [string, boolean, React.ReactNode][] = [
    ["Seat confirmed", confirmed, confirmed ? "Your seat is confirmed." : "Your seat is confirmed when your deposit (Self-Funded) or offer acceptance (selected delegates) is complete."],
    ["Balance paid", !balanceOpen, balanceOpen ? <Link href="/portal/payments">Pay the balance</Link> : "Nothing outstanding."],
    ["Passport uploaded", has("passport"), <Link key="p" href="/portal/documents">Upload a passport scan (valid at least 6 months after the programme)</Link>],
    ["Visa checked", false, <Link key="v" href="/travel-visa-disclaimer">Check what your passport needs for Singapore, Malaysia and Thailand</Link>],
    ["Travel insurance", has("onboarding"), "Upload proof of travel and health insurance covering 27 July – 3 August 2027 (as an onboarding document)."],
    ...(minor ? [["Guardian consent", has("onboarding"), "You are under 18: upload a signed parent or guardian consent form (template sent by email)."] as [string, boolean, React.ReactNode]] : []),
    ["Orientation", false, "Orientation dates are announced in your portal during preparation."],
  ];
  return (
    <>
      <h1>Participant preparation</h1>
      <p className="lead">Starts {fmtDate(c.cohort.settings.dates.preparation_start, { day: "numeric", month: "long", year: "numeric" })}: about seven weeks for payment, visa, travel, insurance and orientation.</p>
      {!confirmed && <div className="notice"><p>Preparation opens once your seat is confirmed. You can already read the steps below.</p></div>}
      <ul className="progress">
        {items.map(([t, done, d]) => <li key={t} className={done ? "done" : ""}><span className="dot" aria-hidden="true">{done ? "✓" : ""}</span><div><strong>{t}</strong><span className="small muted">{d}</span></div></li>)}
      </ul>
      <p className="small muted" style={{ marginTop: 16 }}>Onboarding documents (itinerary, packing list, briefing) are published here and in Announcements during preparation.</p>
    </>
  );
}

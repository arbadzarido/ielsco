import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { getContent } from "@/lib/cms";
import { MENTORING_SESSIONS } from "@/lib/content";
import { fmtDate } from "@/lib/format";
import { MentorPlaceholders } from "@/components/Blocks";

export default async function MentoringPortal() {
  const c = await portalContext("/portal/mentoring");
  if (!c.app || c.app.pathway !== "mentoring") redirect("/portal");
  const enrolled = c.detail!.obligations.filter((o) => o.kind === "mentoring").every((o) => o.status === "paid" || o.status === "waived");
  const mentors = await getContent("mentors");
  return (
    <>
      <h1>Project Mentoring Program</h1>
      {enrolled ? <div className="notice ok"><p>You are enrolled. Session links and times are emailed before each Tuesday and posted in Announcements.</p></div>
        : <div className="notice warn"><p>Your enrolment is confirmed once the mentoring fee is verified. See Payments.</p></div>}
      <h2>Schedule</h2>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>#</th><th>Tuesday</th><th>Session</th></tr></thead>
        <tbody>{MENTORING_SESSIONS.map(([d, t], i) => <tr key={d} style={{ opacity: new Date(`${d}T23:59:59+07:00`) < new Date() ? 0.55 : 1 }}><td>{i + 1}</td><td>{fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}</td><td>{t}</td></tr>)}</tbody></table></div>
      <h2>After mentoring</h2>
      <p>You go straight to Phase 3 (video pitch, 25–27 May 2027), evaluated like every other applicant. If selected, cashback applies after verification.</p>
      <h2>Mentors</h2>
      <MentorPlaceholders mentors={mentors} />
    </>
  );
}

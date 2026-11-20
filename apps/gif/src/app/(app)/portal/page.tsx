import Link from "next/link";
import { portalContext, requiredActions, nextDeadlines } from "@/lib/portal";
import { progressSteps, STATUS_LABEL, PATHWAY_LABEL } from "@/lib/status";
import { publishedAnnouncements } from "@/lib/cms";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Countdown } from "@/components/Client";
import { tasksComplete, tasksFor } from "@/lib/tasks";
import { guardianBlocks } from "@/lib/guardian";
import { ResendGuardian } from "./ResendGuardian";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ submitted?: string; withdrawn?: string }> }) {
  const sp = await searchParams;
  const c = await portalContext();
  const { app, detail, me } = c;
  if (!app || !detail) {
    return (
      <>
        <h1>Welcome</h1>
        <p className="lead">Signed in as {c.account.email}.</p>
        {sp.withdrawn && <div className="notice"><p>Your application has been withdrawn. You can start a new one below.</p></div>}
        {c.account.staffRole && <div className="notice"><p>You are a staff member. Go to the <Link href="/admin">admin dashboard</Link>.</p></div>}
        <div className="notice"><p>You have no GIF Summer 2027 application yet. If a team leader added you, sign in with the exact email they entered.</p></div>
        <div className="btn-row"><Link className="btn btn-primary" href="/apply" data-track="apply_click">Start an application</Link><Link className="btn btn-secondary" href="/opportunities">Compare pathways</Link></div>
      </>
    );
  }
  const actions = requiredActions(c);
  const paidMine = detail.obligations.filter((o) => (c.isOwner || o.participant_id === me?.id) && ["elco_pro", "mentoring", "deposit"].includes(o.kind));
  const paid = paidMine.length > 0 && paidMine.every((o) => o.status === "paid" || o.status === "waived");
  const tasks = { required: tasksFor(c.cohort.settings).length > 0, done: detail.participants.filter((p) => !p.withdrawn_at && (c.isOwner || p.id === me?.id)).every((p) => tasksComplete(c.cohort.settings, p.social_tasks)) };
  const steps = progressSteps(app.pathway, app.status, paid || ["phase_1_completed", "phase_2_in_progress", "phase_2_submitted", "phase_3_in_progress", "phase_3_submitted", "under_evaluation", "confirmed_participant"].includes(app.status), tasks);
  const deadlines = nextDeadlines(c);
  const audience = ["all", app.pathway, ...(app.outcome && app.outcome !== "not_selected" && app.outcome_published_at ? ["selected"] : []), ...(app.status === "confirmed_participant" ? ["confirmed"] : [])];
  const news = await publishedAnnouncements(audience);
  const elco = detail.fulfilments.filter((f) => c.isOwner || f.participant_id === me?.id);
  return (
    <>
      {sp.submitted && <div className="notice ok" role="status"><p><strong>Application submitted.</strong> Your application ID is {sp.submitted}. We have emailed you a confirmation.</p></div>}
      <section className="welcome" aria-label="Your application">
        <div className="eyebrow">{PATHWAY_LABEL[app.pathway]} · {app.code}</div>
        <h1>Hello, {(me?.legal_name ?? c.account.email).split(" ")[0]}</h1>
        <p>
          Status: <span className="badge maroon">{STATUS_LABEL[app.status]}</span>
          {app.mode === "team" && <> · Team {app.team_name}{!c.isOwner && " (you are a member)"}</>}
        </p>
        <div className="route-mini" aria-label="Programme route"><span>🇸🇬 Singapore</span><span>🇲🇾 Malaysia</span><span>🇹🇭 Thailand</span><span className="when">27 Jul – 3 Aug 2027</span></div>
      </section>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <section>
          <h2 style={{ marginTop: 0 }}>Next steps</h2>
          {actions.length === 0 ? <p className="muted">Nothing needed from you right now. We&rsquo;ll email you when something changes.</p> : (
            <ul className="progress">
              {actions.map((a) => (
                <li key={a.label + a.href} className="current"><span className="dot" aria-hidden="true" />
                  <div><Link href={a.href}><strong>{a.label}</strong></Link>{a.detail && <span className="small muted">{a.detail}</span>}</div></li>
              ))}
            </ul>
          )}
          {elco.length > 0 && (
            <>
              <h2>Elco Pro</h2>
              <ul className="small" style={{ paddingLeft: 18 }}>
                {elco.map((f) => {
                  const who = detail.participants.find((p) => p.id === f.participant_id);
                  return <li key={f.id}>{who?.legal_name}: {f.status === "activated" ? <span className="badge ok">Active since {fmtDate(f.activated_at)}</span> : f.status === "pending_activation" ? <span className="badge warn">Paid · activation in progress</span> : f.status === "awaiting_payment" ? <span className="badge">Awaiting payment</span> : <span className="badge err">{f.status}</span>} <span className="muted">({f.elco_email})</span></li>;
                })}
              </ul>
              <p className="tiny muted">Activation is done by our team on the Elco account with this email. We email you once it is active.</p>
            </>
          )}
        </section>
        <section>
          <h2 style={{ marginTop: 0 }}>Your progress</h2>
          <ol className="progress">
            {steps.map((s, i) => <li key={s.key} className={s.state}><span className="dot" aria-hidden="true">{s.state === "done" ? "✓" : i + 1}</span><div><strong>{s.label}</strong><span className="small muted">{s.detail}</span></div></li>)}
          </ol>
        </section>
      </div>

      {deadlines[0] && <div className="strip" style={{ marginTop: 32, padding: "0 16px" }}><Countdown to={deadlines[0].at} label={`${deadlines[0].label} in`} /></div>}
      <h2>Upcoming dates</h2>
      <div className="table-wrap"><table className="t compact"><tbody>{deadlines.map((d) => <tr key={d.label}><td>{d.label}</td><td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(d.at)}</td></tr>)}</tbody></table></div>

      {detail.participants.some((p) => !p.withdrawn_at && guardianBlocks(p) && (c.isOwner || p.id === me?.id)) && <>
        <h2 id="guardian">Parent or guardian consent</h2>
        <p className="small muted">Delegates under 18 on 27 July 2027 need a parent's or legal guardian's consent before payment. We emailed the guardian a secure link.</p>
        <ul className="progress">{detail.participants.filter((p) => !p.withdrawn_at && guardianBlocks(p) && (c.isOwner || p.id === me?.id)).map((p) => (
          <li key={p.id} className="current"><span className="dot" aria-hidden="true" /><div><strong>{p.legal_name}</strong><span className="small muted">Guardian: {p.guardian_name} ({p.guardian_email})</span><ResendGuardian participantId={p.id} /></div></li>
        ))}</ul>
      </>}

      <h2>Announcements</h2>
      {news.length === 0 ? <p className="muted">No announcements yet.</p> : news.map((n) => (
        <article key={n.id} className="item" style={{ marginBottom: 20 }}><span className="kicker">{fmtDate(n.published_at)}</span><h3>{n.title}</h3>{n.body.split(/\n{2,}/).map((p, i) => <p key={i} style={{ marginTop: 8 }}>{p}</p>)}</article>
      ))}
    </>
  );
}

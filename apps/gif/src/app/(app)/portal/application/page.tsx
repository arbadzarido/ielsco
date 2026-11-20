import Link from "next/link";
import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { DOCS, requiredConsents } from "@/lib/legal";
import { EDUCATION_LEVELS } from "@/lib/validation";
import { STATUS_LABEL, PATHWAY_LABEL } from "@/lib/status";
import { countryName, fmtDate, fmtDateTime } from "@/lib/format";
import { TermsForm, WithdrawForm } from "./forms";

export default async function ApplicationPage() {
  const c = await portalContext("/portal/application");
  const { app, detail } = c;
  if (!app || !detail) redirect("/portal");
  if (app.status === "draft") redirect("/apply");
  const cats = requiredConsents(app.pathway);
  const missing = cats.filter((k) => !c.consents[k]);
  const docs = cats.map((k) => DOCS.find((d) => d.category === k)!);
  return (
    <>
      <div className="eyebrow">{app.code}</div>
      <h1>Application</h1>
      <p className="muted">Submitted {fmtDateTime(app.submitted_at)}. To change submitted details, email <a href="mailto:hello@ielsco.com">hello@ielsco.com</a> from your registered address; changes are made by our team and logged.</p>
      <dl className="kv" style={{ marginTop: 20 }}>
        <dt>Status</dt><dd>{STATUS_LABEL[app.status]}</dd>
        <dt>Pathway</dt><dd>{PATHWAY_LABEL[app.pathway]}</dd>
        <dt>Applying as</dt><dd>{app.mode === "team" ? `Team ${app.team_name}` : "Individual"}</dd>
        {app.project_title && <><dt>Project</dt><dd>{app.project_title}</dd></>}
        {app.project_idea && <><dt>Project idea</dt><dd style={{ whiteSpace: "pre-wrap" }}>{app.project_idea}</dd></>}
        {app.experience && <><dt>Experience</dt><dd style={{ whiteSpace: "pre-wrap" }}>{app.experience}</dd></>}
        <dt>Motivation</dt><dd style={{ whiteSpace: "pre-wrap" }}>{app.motivation}</dd>
        <dt>Heard about GIF from</dt><dd>{app.discovery_source}</dd>
      </dl>

      <h2>{app.mode === "team" ? "Team members" : "Your profile"}</h2>
      <div className="grid g2">
        {detail.participants.map((p) => (
          <div className="item" key={p.id}>
            <span className="kicker">{p.role === "leader" ? "Lead applicant" : "Member"}{p.seat_status === "confirmed" ? " · seat confirmed" : ""}</span>
            <h3>{p.legal_name}</h3>
            <dl className="kv small" style={{ marginTop: 10 }}>
              <dt>Email</dt><dd>{p.email}</dd><dt>WhatsApp</dt><dd>{p.whatsapp}</dd>
              <dt>Nationality</dt><dd>{countryName(p.nationality)} ({p.currency})</dd><dt>Residence</dt><dd>{countryName(p.residence_country)}</dd>
              <dt>Date of birth</dt><dd>{fmtDate(p.date_of_birth)}</dd>
              <dt>Institution</dt><dd>{p.institution}</dd><dt>Level</dt><dd>{EDUCATION_LEVELS[p.education_level as keyof typeof EDUCATION_LEVELS]}</dd>
              <dt>Background</dt><dd>{p.academic_background}</dd><dt>Country of study</dt><dd>{countryName(p.country_of_study)}</dd>
              <dt>Emergency contact</dt><dd>{p.emergency_name} ({p.emergency_relation}), {p.emergency_phone}</dd>
            </dl>
          </div>
        ))}
      </div>

      <h2 id="terms">Programme terms</h2>
      {missing.length === 0 ? <p className="muted">You accepted the current version of: {docs.map((d) => d.title).join(", ")}. <Link href="/terms-and-conditions">Read them again</Link>.</p>
        : <TermsForm docs={docs.map((d) => ({ slug: d.slug, title: d.title, category: d.category }))} />}

      {c.isOwner && !["withdrawn", "confirmed_participant"].includes(app.status) && (
        <>
          <h2>Withdraw</h2>
          <p className="muted small">Withdrawing cancels open payments for every member and cannot be undone. Refunds follow the <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
          <WithdrawForm />
        </>
      )}
    </>
  );
}

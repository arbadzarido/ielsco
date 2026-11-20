import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { taskLink, tasksFor, tasksSummary } from "@/lib/tasks";
import { fmtDateTime } from "@/lib/format";
import TasksForm from "./TasksForm";

const LABEL = { submitted: ["", "Waiting for verification"], verified: ["ok", "Verified"], not_found: ["err", "Not found: check and resubmit"] } as const;

export default async function Tasks() {
  const c = await portalContext("/portal/tasks");
  const { app, me } = c;
  if (!app || !me) redirect("/portal");
  if (app.pathway !== "fully_funded") redirect("/portal");
  const s = c.cohort.settings;
  const items = tasksFor(s);
  const sum = tasksSummary(s, me.social_tasks);
  return (
    <>
      <div className="eyebrow">Fully Funded · Phase 1</div>
      <h1>Social media tasks</h1>
      <p className="lead">Phase 1 has three parts: your application, Elco Pro, and these social media tasks. Each delegate does every task; our team then checks each one on Instagram.</p>
      {items.length === 0 ? <p className="muted">No tasks are required right now.</p> : <>
        <p><span className={`badge ${sum.verified === sum.total ? "ok" : ""}`}>{sum.verified} of {sum.total} verified</span>{me.instagram && <span className="small muted"> · checking @{me.instagram}</span>}</p>
        <ul className="progress" style={{ marginTop: 16 }}>
          {items.map((t) => {
            const st = me.social_tasks?.[t.key];
            const link = taskLink(s, t.link);
            return (
              <li key={t.key} className={st?.status === "verified" ? "done" : ""}>
                <span className="dot" aria-hidden="true">{st?.status === "verified" ? "✓" : ""}</span>
                <div><strong>{t.title}</strong><span className="small muted">{t.detail}{link && <> · <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a></>}</span>
                  {st && <span className={`badge ${LABEL[st.status][0]}`} style={{ marginTop: 6 }}>{LABEL[st.status][1]}</span>}
                  {st?.status === "not_found" && st.note && <span className="tiny muted"> {st.note}</span>}
                  {st && <span className="tiny muted" style={{ display: "block" }}>{fmtDateTime(st.at)}</span>}</div>
              </li>
            );
          })}
        </ul>
        {sum.verified < sum.total && <TasksForm handle={me.instagram ?? ""} tasks={items.filter((t) => me.social_tasks?.[t.key]?.status !== "verified").map((t) => ({ key: t.key, title: t.title }))} />}
        <p className="small muted" style={{ marginTop: 16 }}>Keep your account public (or accept a follow from @iels.co) until your tasks are verified. Phase 1 is complete once your Elco Pro payment and all tasks are verified{app.mode === "team" ? " for every team member" : ""}.</p>
      </>}
    </>
  );
}

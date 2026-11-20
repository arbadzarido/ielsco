import { requireStaff } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { getContent } from "@/lib/cms";
import { q } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { announcementAction, publishAnnouncementAction, saveContentAction, saveSettingsAction } from "@/app/actions/admin";

export default async function Content() {
  await requireStaff("content");
  const cohort = await currentCohort();
  const [faq, mentors, testimonials, photos] = await Promise.all([getContent("faq"), getContent("mentors"), getContent("testimonials"), getContent("photos")]);
  const anns = await q<{ id: string; title: string; audience: string; published_at: string | null; created_at: string }>(
    "select id, title, audience, published_at, created_at from gif.announcements where cohort_id = $1 order by created_at desc limit 30", [cohort.id]);
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  return (
    <>
      <h1>Content &amp; settings</h1>
      <p className="muted">Changes are validated, audited and appear on the public site within about 5 minutes. Existing payment obligations keep the amounts they were created with.</p>

      <h2>Announcements</h2>
      <ActionForm action={announcementAction} submit="Save announcement">
        <div className="fields-2">
          <label className="field"><span className="label">Title</span><input name="title" maxLength={160} /></label>
          <label className="field"><span className="label">Audience</span><select name="audience"><option value="all">Everyone with a submitted application</option><option value="fully_funded">Fully Funded applicants</option><option value="mentoring">Mentees</option><option value="self_funded">Self-Funded</option><option value="selected">Selected delegates</option><option value="confirmed">Confirmed participants</option></select></label>
        </div>
        <label className="field"><span className="label">Message (blank line = new paragraph)</span><textarea name="body" rows={5} /></label>
        <label className="check"><input type="checkbox" name="publish" /> <span>Publish now in the portal</span></label>
        <label className="check"><input type="checkbox" name="email" /> <span>Also email everyone in the audience (only when publishing)</span></label>
      </ActionForm>
      {anns.length > 0 && <div className="table-wrap" style={{ marginTop: 16 }}><table className="t compact"><tbody>{anns.map((a) => <tr key={a.id}><td>{a.title}</td><td>{a.audience}</td><td>{a.published_at ? `Published ${fmtDateTime(a.published_at)}` : "Draft"}</td>
        <td><ActionForm action={publishAnnouncementAction} submit={a.published_at ? "Unpublish" : "Publish"} className=""><input type="hidden" name="id" value={a.id} /></ActionForm></td></tr>)}</tbody></table></div>}

      <h2>Programme settings</h2>
      <p className="small muted">Deadlines (ISO 8601 with +07:00), prices, slots, capacity, open/closed switches, payment options and university status (&ldquo;planned&rdquo; until confirmed in writing). Founder decisions still null: mentoring_early_bird_until, deposit_due_days, balance_due, partial_funded_payable.</p>
      <ActionForm action={saveSettingsAction} submit="Save settings">
        <textarea name="settings" rows={28} defaultValue={json(cohort.settings)} spellCheck={false} style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13 }} />
      </ActionForm>

      {([["faq", "FAQ", faq, "[{ \"group\": \"…\", \"q\": \"…\", \"a\": \"…\" }]"], ["mentors", "Mentors (leave empty to show “coming soon”)", mentors, "[{ \"name\": \"…\", \"role\": \"Founder, …\", \"org\": \"NUS\", \"photo\": \"/photos/…\", \"bio\": \"…\" }] — only confirmed mentors"],
        ["testimonials", "Testimonials (real, with consent only)", testimonials, "[{ \"quote\": \"…\", \"name\": \"…\", \"role\": \"GIF 2026 delegate\", \"consent\": true }]"], ["photos", "Photos", photos, "Files must exist under /public/photos (deployed with the site)."]] as const).map(([key, title, value, hint]) => (
        <section key={key}>
          <h2>{title}</h2>
          <p className="small muted">{hint}</p>
          <ActionForm action={saveContentAction} submit={`Save ${key}`}>
            <input type="hidden" name="key" value={key} />
            <textarea name="value" rows={12} defaultValue={json(value)} spellCheck={false} style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13 }} />
          </ActionForm>
        </section>
      ))}
    </>
  );
}

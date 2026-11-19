import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

export default async function Audit() {
  await requireStaff("staff");
  const rows = await q<{ actor: string; action: string; entity: string; entity_id: string | null; data: unknown; ip: string | null; at: string }>(
    "select actor, action, entity, entity_id, data, ip, at from gif.audit_log order by at desc limit 300");
  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Latest 300 entries: status changes, payments, refunds, settings, staff and document access.</p>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>
        {rows.map((r, i) => <tr key={i}><td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.at)}</td><td>{r.actor}</td><td>{r.action}</td><td className="tiny">{r.entity} {r.entity_id}</td>
          <td className="tiny" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }}>{JSON.stringify(r.data).slice(0, 300)}</td></tr>)}
      </tbody></table></div>
    </>
  );
}

import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { staffAction } from "@/app/actions/admin";

const ROLES = { owner: "Everything, including staff", admin: "Applicants, status, selection, content", finance: "Payments, refunds, manual payments, Elco fulfilment", evaluator: "Score assigned applications only", viewer: "Read only" };

export default async function Staff() {
  await requireStaff("staff");
  const rows = await q<{ email: string; role: string; name: string | null; active: boolean; created_by: string | null }>("select email, role, name, active, created_by from gif.staff order by active desc, role, email");
  return (
    <>
      <h1>Staff</h1>
      <p className="muted">Staff sign in at /login with their email (one-time code). Access follows the role below; every change is audited.</p>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.email}><td>{r.email}</td><td>{r.name}</td><td>{r.role}</td><td>{r.active ? "yes" : "no"}</td></tr>)}</tbody></table></div>
      <h2>Add or change</h2>
      <ActionForm action={staffAction} submit="Save staff member">
        <div className="fields-2">
          <label className="field"><span className="label">Email</span><input name="email" type="email" /></label>
          <label className="field"><span className="label">Name</span><input name="name" /></label>
          <label className="field"><span className="label">Role</span><select name="role">{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}</select></label>
          <label className="field"><span className="label">Status</span><select name="active"><option value="on">Active</option><option value="off">Deactivated</option></select></label>
        </div>
      </ActionForm>
    </>
  );
}

// Drive folder routing for new documents. Pure, so the create API, the pre-create check, Admin's coverage view and the
// unit tests all use exactly the same rule:
//   the APPROVED route for the company and sensitivity that matches best — same division beats "any division", same
//   document type beats "any type"; a route for another division or another type never matches.
export interface FolderRoute {
  id: string; company_code: string; division_id: string | null; doc_type: string | null; sensitivity: string;
  drive_folder_id: string; folder_name: string; status: string; access_ok?: boolean | null;
}
export interface RouteQuery { company: string; division: string | null; docType: string; sensitivity: string }

const score = (r: FolderRoute, q: RouteQuery) =>
  (r.division_id === q.division && q.division ? 2 : r.division_id === null ? 0 : -99) + (r.doc_type === q.docType ? 1 : r.doc_type === null ? 0 : -99);

export function matchRoute(routes: FolderRoute[], q: RouteQuery, status = "approved"): FolderRoute | null {
  return routes.filter((r) => r.status === status && r.company_code === q.company && r.sensitivity === q.sensitivity && score(r, q) >= 0)
    .sort((a, b) => score(b, q) - score(a, q))[0] ?? null;
}

/** What a founder would need to approve or add, in words, for a query with no approved route. */
export function missingRouteText(q: RouteQuery, names: { company: string; division?: string | null }, proposed: FolderRoute | null): string {
  const what = `${names.company}, ${q.sensitivity}${q.division ? `, ${names.division ?? q.division}` : ", no division"}, ${q.docType}`;
  if (proposed) return `No approved Drive folder for ${what}. A founder has a proposed route to “${proposed.folder_name}” waiting for approval in Admin → Drive folder routes.`;
  return `No Drive folder route covers ${what}. A founder needs to add one in Admin → Drive folder routes, for ${names.company} ${q.sensitivity} documents${q.division ? ` (any division, or ${names.division ?? q.division})` : " with no division"}.`;
}

/** Company × sensitivity combinations with no approved company-wide route, with what still routes there. */
export function coverageGaps(routes: FolderRoute[], companies: string[], sensitivities: string[]) {
  const out: { company: string; sensitivity: string; general: "missing" | "proposed"; specific: FolderRoute[] }[] = [];
  for (const company of companies) for (const sensitivity of sensitivities) {
    const mine = routes.filter((r) => r.company_code === company && r.sensitivity === sensitivity);
    const general = mine.filter((r) => r.division_id === null && r.doc_type === null);
    if (general.some((r) => r.status === "approved")) continue;
    out.push({ company, sensitivity, general: general.some((r) => r.status === "proposed") ? "proposed" : "missing", specific: mine.filter((r) => r.status === "approved") });
  }
  return out;
}

/** A Drive folder ID from an ID or a drive.google.com folder link. */
export function folderIdFrom(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/folders\/([A-Za-z0-9_-]{10,})/) ?? s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(s) ? s : null;
}

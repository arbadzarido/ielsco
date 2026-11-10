# Company OS Documents: audit, route architecture and template-first generation

Status: implemented on branch `feat/os-document-templates`, not yet merged. What was tested and what was not is in section 7.

## 1. What was audited (the real code and production)

| Area | Finding |
|---|---|
| Register | `os_documents`: one row per document, files stay in Google Drive. Company, division, type and sensitivity were typed by hand on every new document. |
| Creating | `api/documents/create`: three modes (copy a Drive master template, upload, register an existing file). The file goes to the most specific **approved** route for company, division, type and sensitivity; it never uses a proposed route. A reference number (`IEL-CTR-2026-001`) is reserved from the database. |
| Templates | The 32 master templates are plain Drive files in `02.1 Master Templates`, listed live. No metadata about them lived anywhere: not company, not who may use them, not sensitivity. |
| Routes | `os_folder_routes`: 27 rows in production, **all approved** (HQ 14, IELSco 7, Elco AI 6). Resolution is pure and shared (`lib/os/routes.ts`). |
| Access | Row-level security through `os_can_view` / `os_can_create` / `os_can_edit` (founders; staff by company and division; guests only by explicit grant; Restricted needs an explicit grant). Drive sharing is never changed by Company OS; `Check access` only reports drift. |
| Approval and history | Document status `Draft → In Review → Approved` (approved only by a founder or the division manager, stamped in the database). Every change is in the audit log. |
| Drive | The service account reads (templates, folder checks); the founder-connected Google account writes. Integration health now shows each separately (PR #42). |
| Legal entities | `os_companies`: **IELSco = PT English Space Berkah Indonesia; Elco AI = PT Elco Edukasi Berkah Indonesia; HQ has no legal entity.** These are two different companies, which differs from the brief's "both under PT English Space Berkah Indonesia". The agreement therefore names the legal entity of the company chosen when it is generated. **Decision needed from a founder** (section 8). |

## 2. The "missing routes" report

The Routes screen lists five company × sensitivity pairs with no *company-wide* route: HQ Restricted, IELSco Confidential, IELSco Restricted, Elco AI Confidential, Elco AI Restricted. Reading the 27 actual routes:

| Pair | What already routes there | Recommendation |
|---|---|---|
| HQ · Restricted | Finance (`00.9 HQ Finance Overview`) | Leave. A company-wide Restricted route would be a dumping ground. |
| IELSco · Restricted | Finance, Governance (Legal & Corporate), People division (Personnel Records) | Leave. Restricted documents should always have a specific home. |
| Elco AI · Restricted | Finance, Governance, People division (Personnel Records) | Leave, same reason. |
| IELSco · Confidential | Partnerships division (`13 IELSco — Partnerships & Clients`) | **Add one specific route: People division** (below). Nothing company-wide. |
| Elco AI · Confidential | Partnerships division (`23 Elco — Partnerships & Clients`) | **Add one specific route: People division** (below). Nothing company-wide. |

So most "gaps" are intentional, and only the two People routes are needed for the Manager Offering Letter. Existing folders can be reused, and no new Drive folder is needed. Two routes already share a folder on purpose (IELSco Community and Growth both file in folder 12).

### Routes that need Founder approval

Proposed by the migration (status `proposed`, **not approved**; approve in Admin → Drive folder routes):

| Route | Folder it reuses |
|---|---|
| IELSco · People division · Confidential · any type | `16 IELSco — Personnel Records (Restricted)` |
| Elco AI · People division · Confidential · any type | `26 Elco — Personnel Records (Restricted)` |

Why it is safe: both folders are already Restricted, so a Confidential agreement there is no more widely readable than before. Approving changes nothing in Drive; it only lets Company OS file there. After approving, run **Check folder access** on each route. Company OS does not share the file with the manager: whoever shares it in Drive does so by hand.

## 3. How generation works now

1. **Documents → New document** opens the template catalog: search, category, type and company filters, *Recently used*, *Recommended for your divisions*, and a plain-language "use when" on each card. Uploading or registering an existing file is still there ("Add an existing file or upload instead").
2. Pick a template. Company, division, document type, sensitivity, who can read the result and where it is filed come **from the template**. If it supports one company or division, that one is used; if several, only the valid ones are offered.
3. Fill in only the template's fields. The server validates them, previews, and re-checks the template, company, division and permissions.
4. **Preview** needs no folder and no Drive connection, so a draft can always be reviewed.
5. **Save** needs an **approved** route and a connected Drive writer. If either is missing it says exactly what to do (for example "Approve the proposed route “16 IELSco — Personnel Records (Restricted)” for IELSco · People · Confidential in Admin → Drive folder routes") and writes nothing. It never falls back to another folder.
6. The register row is inserted as the caller (so the database re-checks), the number is reserved, the Google file is created in the approved folder, and the row records the template, template version, folder route, Drive file and URL. Templates that need approval start `In Review`.

## 4. The template registry

Table `os_doc_templates` (founders write, people see only what they may generate), with every change kept in `os_doc_template_versions`:

name, description, "use when", category, document type, default sensitivity, companies, divisions (or one fixed storage division), kind (`drive_copy` or `builtin`), who may generate it (`founders`, `authorized` named list, `staff`), who may read the result (`standard` or `named`), approval required, legal status, owner, fields, version, active.

The database refuses inconsistent templates (named readers with "any staff", Restricted with "any staff", a Drive-copy without a Drive file, an approval without an approver). Admin → **Document templates** shows route coverage per template and company, lets a founder edit metadata with a live "if you save" preview of where documents would be filed, manage the named list, give or withdraw legal approval, and read the version history. Existing Drive master templates are added one at a time ("Add a Drive master template"), inactive until a founder checks them. Nothing was overwritten.

## 5. Access to named documents (the Manager Offering Letter)

`access_mode = named` documents ignore division and workspace access. They are readable only by: founders; people with an explicit document grant; people on the template's authorised list; and the person the agreement is about, **only once a founder has approved it**. A People-division member who is not authorised, or another manager, gets no row at all (tested). A database trigger stops a document from a template pending legal review from being marked Approved.

## 6. What is in the Manager Offering Letter

One master text (`src/lib/os/manager-agreement.ts`), 16 clauses, no KPIs or targets, no incentive percentages, nine months in two phases computed from the start date (3 months at IDR 300,000, then 6 months at IDR 1,000,000 to 2,000,000, validated), remote work of about 12 hours a week with one 60-minute meeting at most, the development opportunities written as intentions and not guarantees, and balanced general terms. It is **Draft, pending legal review**: the document carries a banner and highlighted drafting notes at each point legal review must decide. See `docs/MANAGER-AGREEMENT-LEGAL-REVIEW.md`.

## 7. Tests, and what they do not prove

Tested locally: 29 unit tests (resolution, filters, validation, dates including month ends, amounts, text), 55 database tests on PGlite (registry, eligibility, named readers, draft guard, versions, ordinary documents unchanged), and a browser run against a **local stand-in for Google** (catalog, metadata, preview, route handling, the file it creates, named readers, Admin).
**Not tested against real Google**: converting the HTML into a Google Doc, how it looks there, and folder access for the new routes. The first real run is the Admin write test plus one internal-draft save with a sample name, then deleting that file.

## 8. Remaining actions

Deploy: merge the PR (the migration applies on merge). It adds tables and columns only, and approves nothing. Then:

1. Founder: approve the two People routes (section 2) and run Check folder access.
2. Founder: authorise the People personnel who may generate the agreement (Admin → Document templates → Manager Offering Letter).
3. Founder: decide which legal entity contracts Elco AI managers (section 1).
4. Legal review of the template (separate checklist). Only then mark it legally approved.
5. Optionally add the 32 Drive master templates to the catalog, one by one, with their company and sensitivity.

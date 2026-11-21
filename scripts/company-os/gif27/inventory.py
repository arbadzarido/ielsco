"""GIF Summer 2027 initial inventory for the Company OS programme workspace.

This file is the editable source for the seed migration
supabase/migrations/20261129010000_company_os_gif_summer_2027.sql (run `python3 build_seed.py` next to it).
After the seed is applied, the database is the source of truth: change records in Company OS (/os/gif), not here.

Labels used everywhere:
  Facts:     Confirmed (evidence on file) · Decided (founder decision on record) · Proposed · Estimated · Pending ·
             Unverified · Unknown · Outdated
  Decisions: Decided only where a founder decision is on record (docs/gif-platform/DECISIONS.md, IELSCO-INTEGRATION.md,
             the founder brief of 21 Nov 2026). Everything else is open, with a recommendation where evidence supports one.
  Costs:     no cost amounts are invented. Lines are "Not estimated" until a quote or an approved estimate exists.

People (os_people in production, 21 Nov 2026):
  PPL-0001 Arba (CEO, founder) · PPL-0002 Farrel (COO, founder) · PPL-0003 Didi (Growth Manager)
  PPL-0004 Shafira (Partnership Manager) · PPL-0005 Mojo (Creative Manager) · PPL-0006 Yasmine (People Manager)
  PPL-0007 Renita (Operations Manager) · PPL-0008 Acha (Marketing Manager)
"""

ARBA, FARREL, DIDI, SHAFIRA, MOJO, YASMINE, RENITA, ACHA = (
    "PPL-0001", "PPL-0002", "PPL-0003", "PPL-0004", "PPL-0005", "PPL-0006", "PPL-0007", "PPL-0008")
NAME = {ARBA: "Arba", FARREL: "Farrel", DIDI: "Didi", SHAFIRA: "Shafira", MOJO: "Mojo", YASMINE: "Yasmine",
        RENITA: "Renita", ACHA: "Acha"}

PROJECT = "PRJ-0033"
PROGRAMME = dict(code="GIF", name="Global Impact Fellowship (GIF) Summer 2027", starts_on="2027-07-27",
                 ends_on="2027-08-03", gif_cohort_id="summer-2027", countries=["Singapore", "Malaysia", "Thailand"],
                 approvers=[ARBA, FARREL])

PHASES = {1: "Initial planning", 2: "Research and decision-making", 3: "Recruitment preparation",
          4: "Recruitment and admissions", 5: "Partner engagement", 6: "Financial preparation", 7: "Programme design",
          8: "Travel and accommodation preparation", 9: "Local volunteer recruitment", 10: "Participant onboarding",
          11: "Pre-departure preparation", 12: "On-site execution", 13: "Departure and participant follow-up",
          14: "Financial reconciliation", 15: "Evaluation and reporting", 16: "Future development"}

# ── Workstreams (the prompt's areas A–O): one accountable person each ──────────────────────────────────────────────
WORKSTREAMS = [
    ("A", "Programme strategy and governance", FARREL, [ARBA], "None. Governance stays with the core team."),
    ("B", "Financial management and commercial planning", ARBA, [RENITA], "None for control. Vendors quote; Renita keeps on-site receipts."),
    ("C", "Recruitment, marketing and admissions", DIDI, [ACHA, MOJO, YASMINE], "Campus ambassadors and student organisations can share recruitment posts (no access to applicant data)."),
    ("D", "Website, dashboard and digital infrastructure", ARBA, [DIDI, RENITA], "None. Changes go through PR review and approval."),
    ("E", "Legal, compliance and safeguarding", YASMINE, [ARBA], "External counsel reviews; Arba approves and signs."),
    ("F", "Institutional relations and partnerships", SHAFIRA, [FARREL], "Host-university offices and student organisations as liaison, once confirmed in writing."),
    ("G", "Programme design and academic experience", ARBA, [FARREL, SHAFIRA, YASMINE], "Mentors, guest speakers and judges (external, confirmed in writing)."),
    ("H", "Travel and logistics", RENITA, [FARREL], "Licensed transport operators, accommodation, a local coordinator per country."),
    ("I", "Local community and volunteer operations", SHAFIRA, [YASMINE, RENITA], "Indonesian student associations (PPI), host-university student organisations, local volunteers, paid local coordinators."),
    ("J", "Event production and on-site operations", RENITA, [MOJO, FARREL], "Venue teams, AV vendors, local volunteers for registration, setup and teardown."),
    ("K", "Participant experience and welfare", YASMINE, [RENITA, ACHA], "Local volunteers as group buddies under core-team supervision; never alone with minors."),
    ("L", "Safety, risk and crisis management", FARREL, [YASMINE, RENITA], "Local coordinators know local emergency services; insurers' assistance lines."),
    ("M", "Communication and documentation", ACHA, [RENITA, MOJO], "None for official communication. Templates are reused by local coordinators."),
    ("N", "Monitoring, evaluation and impact", DIDI, [YASMINE, ARBA], "Volunteers can hand out feedback QR codes; analysis stays with Didi."),
    ("O", "Post-event management and future development", ACHA, [ARBA, MOJO, SHAFIRA], "Partners and volunteers receive appreciation; no external execution."),
]

TEAM = [
    # person, programme role, accountable, supports, approves, escalates to, country lead, on-site role, capacity, basis
    (ARBA, "Programme sponsor and approver (finance, legal, digital, curriculum)", ["B", "D", "G"], ["A", "E", "N", "O"],
     "Budget and every spend, legal documents and agreements, public statements, website and dashboard releases, curriculum. Co-approves decisions with Farrel.",
     "Final escalation", None, "Programme sponsor on site: partner and VIP relations, finance control, awards",
     "Founder; no hours cap on record.",
     "os_people: CEO, founder. DOC-0053: strategy, product and technical development, finance and fundraising, Courses & Learning; Arba approves financial and legal commitments and public statements."),
    (FARREL, "Programme Director (overall delivery, on-site lead)", ["A", "L"], ["F", "G", "H", "J"],
     "Operational decisions within the approved plan and budget; co-approves programme decisions with Arba.",
     "Arba for spend, contracts, legal and public statements", None,
     "Overall on-site lead and crisis lead (L). Holds the escalation phone.",
     "Founder; no hours cap on record. DOC-0053 flagged Farrel's load as very high (RSK-0014): keep his task count low.",
     "os_people: COO, founder. DOC-0053: GIF 2027 accountable owner; operations, project delivery, partnerships."),
    (RENITA, "Operations lead (logistics, run sheets, on-site operations)", ["H", "J"], ["B", "D", "I", "K", "L", "M"],
     "Within approved bookings: room lists, manifests, schedules.", "Farrel", "Malaysia",
     "Logistics lead; owns run sheets, manifests, rooming; supervises venue volunteers.",
     "Manager agreement: fully remote before travel, at most 2 h/day and 10 h/week.",
     "os_people: Operations Manager (DIV-02, manager). Agreement scope: operational systems, SOPs, workflows, coordination, reporting."),
    (SHAFIRA, "Partnerships and local support lead", ["F", "I"], ["G", "O"],
     "Outreach and follow-ups within approved scope; no commitments (Arba signs).", "Farrel; Arba for commitments", "Singapore",
     "Institutional host liaison and local coordinator/volunteer supervisor for the country she leads.",
     "Manager agreement: at most 2 h/day and 10 h/week.",
     "os_people: Partnership Manager (DIV-06, manager). Agreement scope: strategic partnerships, partner relations, negotiation coordination. Existing task TSK-0107."),
    (YASMINE, "Participant welfare and safeguarding lead", ["E", "K"], ["C", "I", "L", "N"],
     "Day-to-day welfare responses within the safeguarding policy.", "Farrel (Arba for legal)", None,
     "Designated safeguarding lead; participant welfare desk; volunteer briefing and wellbeing.",
     "Manager agreement: at most 2 h/day and 10 h/week.",
     "os_people: People Manager (DIV-05, manager). Agreement scope: recruitment, talent development, team engagement, people operations. Note: her OS role is 'founder' (see finding GIF-FND-006)."),
    (DIDI, "Recruitment and admissions lead; evaluation", ["C", "N"], ["D"],
     "Campaign timing within the approved calendar; no paid spend or public claims without Arba.", "Farrel for timing; Arba for spend and claims", None,
     "Participant check-in and attendance; feedback collection.",
     "Manager agreement: at most 2 h/day and 10 h/week.",
     "os_people: Growth Manager (DIV-03, manager). Agreement scope: acquisition, activation, retention, performance monitoring."),
    (ACHA, "Communication lead (participants, parents, public); post-event", ["M", "O"], ["C", "K"],
     "Templates and schedules within approved facts; public posts need Arba.", "Didi; Arba for public statements", "Thailand",
     "Participant communication, daily announcements, social media coverage.",
     "Manager agreement: at most 2 h/day and 10 h/week.",
     "os_people: Marketing Manager (PPL-0008; member of Growth DIV-03 in the OS; agreement names a Marketing division). Scope: campaigns, content distribution, brand communication."),
    (MOJO, "Creative and media lead", [], ["C", "J", "M", "O"],
     "Creative quality within the approved identity (IELSco design system).", "Acha; Arba for identity changes", None,
     "Photo and video documentation lead; stage visuals, signage, name tags.",
     "Manager agreement: at most 2 h/day and 10 h/week.",
     "os_people: Creative Manager (DIV-04). Agreement scope: creative direction, visual identity, content production."),
]

# ── Canonical facts ────────────────────────────────────────────────────────────────────────────────────────────────
DEC_SHEET = "Founder decision sheet 20 Nov 2026 (docs/gif-platform/DECISIONS.md)"
D21 = "Founder direction 21 Nov 2026 (docs/gif-platform/IELSCO-INTEGRATION.md)"
BRIEF = "Founder brief for the GIF workspace, 21 Nov 2026"
FACTS = [
    # key, label, category, value, unit, status, public, source, notes
    ("programme.name", "Programme name", "Identity", "Global Impact Fellowship (GIF) Summer 2027", None, "Confirmed", True, BRIEF, None),
    ("programme.organiser", "Organiser", "Identity", "IELSco (PT English Space Berkah Indonesia)", None, "Confirmed", True, "Manager agreements (company party); docs/COMPANY-OS.md", "Not Elco: PT Elco Edukasi Berkah Indonesia is a separate company."),
    ("programme.audience", "Audience", "Identity", "High school and university students; international participants, mainly from Southeast Asia and other Asian countries", None, "Decided", True, BRIEF, "Minimum age and the minors operating rules are open (GIF-DEC-007)."),
    ("programme.objectives", "Objectives", "Identity", "International exposure and cross-cultural exchange; experiential learning; leadership; social impact project development; mentoring and pitching; networking; academic and institutional exposure; conference, competition and awarding", None, "Decided", True, BRIEF, "Measurable outcomes and KPIs open (GIF-DEC-038)."),
    ("dates.programme", "Programme dates", "Dates", "27 July – 3 August 2027 (8 days, 7 nights)", None, "Decided", True, DEC_SHEET + "; gif.cohorts summer-2027", None),
    ("dates.programme_start", "First programme day", "Dates", "2027-07-27", "date", "Decided", True, DEC_SHEET, None),
    ("dates.programme_end", "Last programme day", "Dates", "2027-08-03", "date", "Decided", True, DEC_SHEET, None),
    ("programme.nights", "Nights of accommodation", "Dates", "7", "nights", "Decided", False, "Derived from the programme dates", "Arrival and departure timing per participant is open (GIF-DEC-004)."),
    ("route.countries", "Route", "Route", "Singapore → Malaysia → Thailand", None, "Decided", True, "gif.cohorts.route; site /program", None),
    ("route.cities", "Cities", "Route", "Singapore; Malaysian city not decided; Bangkok assumed for Chulalongkorn", None, "Pending", True, "DOC-0054 assumed Johor Bahru (UTM); website lists Universiti Malaya (Kuala Lumpur)", "See GIF-DEC-002 and GIF-FND-002."),
    ("route.malaysia_city", "Malaysia city", "Route", "Not decided: Kuala Lumpur (Universiti Malaya, UTM Kuala Lumpur) or Johor Bahru (UTM Johor Bahru)", None, "Pending", True, "GIF-FND-002", None),
    ("route.transport_modes", "Transport between countries", "Route", "Not decided. DOC-0054 recommends land Singapore → Malaysia and a flight Malaysia → Bangkok", None, "Proposed", False, "DOC-0054 route assessment (26 Oct 2026)", "GIF-DEC-003"),
    ("route.day_split", "Days per country", "Route", "Not decided", None, "Unknown", True, None, "GIF-DEC-004"),
    ("itinerary.status", "Day-by-day itinerary", "Route", "Not approved. Site says the full itinerary is shared with confirmed delegates from 8 June 2027", None, "Pending", True, "gif.ielsco.com/program", None),
    ("institutions.nus", "National University of Singapore (NUS)", "Institutions", "Planned engagement, not confirmed in writing", None, "Unverified", True, "Site settings universities[] status 'planned'; DOC-0054 says no written confirmation", None),
    ("institutions.um", "Universiti Malaya", "Institutions", "Planned engagement, not confirmed in writing", None, "Unverified", True, "Site settings universities[] status 'planned'", None),
    ("institutions.utm", "Universiti Teknologi Malaysia (UTM)", "Institutions", "Potential; not shown on the website", None, "Unverified", False, "DOC-0054 (Johor Bahru campus); founder brief lists UTM", None),
    ("institutions.chula", "Chulalongkorn University", "Institutions", "Planned engagement, not confirmed in writing", None, "Unverified", True, "Site settings universities[] status 'planned'", None),
    ("capacity.total", "Participant capacity", "Capacity", "100", "participants", "Proposed", False, "gif.cohorts.capacity and settings slots.capacity = 100; not in the founder decision sheet", "GIF-DEC-005"),
    ("capacity.minimum_viable", "Minimum viable cohort", "Capacity", "Not set", "participants", "Unknown", False, None, "GIF-DEC-005"),
    ("team.core_travelling", "Core travelling team", "Capacity", "8: Arba, Farrel, Acha, Yasmine, Didi, Shafira, Mojo, Renita", "people", "Decided", False, BRIEF, None),
    ("slots.fully_funded", "Fully Funded places", "Pathways", "10", "places", "Decided", True, DEC_SHEET, None),
    ("slots.partial_funded", "Partial Funded places", "Pathways", "10", "places", "Decided", True, DEC_SHEET, None),
    ("pathways.structure", "Pathways", "Pathways", "Fully Funded (competitive selection); Partial Funded (an outcome of the Fully Funded selection, no separate registration); Self-Funded (direct admission, subject to capacity); Project Mentoring (separate paid track)", None, "Decided", True, DEC_SHEET + "; " + D21, None),
    ("pathways.fully_funded_covers", "Fully Funded covers", "Pathways", "Programme fee, accommodation during the programme, in-programme transportation. International flights not included.", None, "Decided", True, DEC_SHEET, None),
    ("prices.partial_funded", "Partial Funded contribution", "Prices", "USD 699 / IDR 10,999,000", None, "Decided", True, DEC_SHEET, "Indonesian participants pay IDR, international participants USD; prices are separate, never converted."),
    ("prices.partial_funded.idr", "Partial Funded contribution (IDR)", "Prices", "10999000", "IDR", "Decided", True, DEC_SHEET, None),
    ("prices.self_funded", "Self-Funded fee", "Prices", "USD 899 / IDR 14,999,000", None, "Decided", True, DEC_SHEET, None),
    ("prices.self_funded.idr", "Self-Funded fee (IDR)", "Prices", "14999000", "IDR", "Decided", True, DEC_SHEET, None),
    ("prices.self_funded.usd", "Self-Funded fee (USD)", "Prices", "899", "USD", "Decided", True, DEC_SHEET, None),
    ("prices.mentoring_early", "Project Mentoring, Early Bird", "Prices", "USD 79 / IDR 1,199,000 until 31 Dec 2026 23:59 WIB", None, "Decided", True, DEC_SHEET, None),
    ("prices.mentoring_regular", "Project Mentoring, Regular", "Prices", "USD 99 / IDR 1,499,000", None, "Decided", True, DEC_SHEET, None),
    ("prices.mentoring_regular.idr", "Project Mentoring, Regular (IDR)", "Prices", "1499000", "IDR", "Decided", True, DEC_SHEET, None),
    ("prices.elco_pro", "Elco Pro (Fully Funded Phase 1 requirement)", "Prices", "IDR 98,000 for 3 months; kept whatever the outcome", None, "Decided", True, DEC_SHEET, "Revenue of PT Elco, not IELSco: never counted in the GIF budget."),
    ("prices.deposit", "Self-Funded deposit", "Payments", "USD 300 / IDR 5,000,000 (carried over from the original brief, not re-confirmed)", None, "Pending", True, "apps/gif settings prices.self_funded_deposit; DECISIONS.md open item 1", "GIF-DEC-001. Live in the payment flow since 20 Nov 2026."),
    ("payments.deposit_due", "Deposit due", "Payments", "Within 7 days of registration (Partial Funded: of accepting the offer)", None, "Decided", True, DEC_SHEET, None),
    ("payments.balance_due", "Balance due", "Payments", "30 June 2027", None, "Decided", True, DEC_SHEET, None),
    ("payments.gateway", "Payment gateway", "Payments", "Midtrans only; USD by invoice and bank transfer verified by Finance", None, "Decided", True, DEC_SHEET, None),
    ("payments.international_card", "International card payments", "Payments", "On: USD amount × IDR 18,500 charged in IDR through Midtrans; invoice remains available", None, "Decided", True, "Founder go-ahead 21 Nov 2026 (PR #64, docs/gif-platform/PAYMENTS.md)", "Whether the Midtrans account accepts foreign cards is unverified (GIF-RES-019)."),
    ("payments.invoice_bank_details", "Bank account for invoice payments", "Payments", "Not entered", None, "Unknown", False, "apps/gif settings invoice_bank_details = null", "GIF-DEC-027"),
    ("payments.cashback", "Mentoring cashback", "Payments", "Fully Funded USD 19 / IDR 299,000; Partial Funded USD 49 / IDR 749,000; after results and verification", None, "Decided", True, DEC_SHEET, None),
    ("payments.cashback_timing", "Cashback timing", "Payments", "Within 30 days of verification (proposal, bracketed in Mentoring Terms)", None, "Proposed", True, "DECISIONS.md open item 3", "GIF-DEC-023"),
    ("payments.refunds", "Refund rules", "Payments", "Mentoring 100% ≥7 days before 2 Feb, 50% before Session 4; balance 75% >60 days, 50% 30–60, 0% <30; deposit generally non-refundable except visa refusal, medical, cancellation", None, "Decided", True, DEC_SHEET, "Legal text is a draft pending counsel review (GIF-DEC-025)."),
    ("dates.self_funded_opens", "Self-Funded and Mentoring registration opens", "Recruitment", "20 Nov 2026 00:00 WIB", None, "Decided", True, D21, None),
    ("dates.fully_funded_opens", "Fully Funded applications open", "Recruitment", "25 Nov 2026 00:00 WIB", None, "Decided", True, D21, "Calendar events EV-0032/EV-0033 say pre-launch 7 Dec and launch 9 Jan (GIF-FND-004)."),
    ("dates.mentoring_sessions", "Project Mentoring sessions", "Recruitment", "2 Feb – 11 May 2027", None, "Decided", True, DEC_SHEET, None),
    ("dates.phase1_close", "Phase 1 closes", "Recruitment", "10 May 2027", None, "Decided", True, DEC_SHEET, None),
    ("dates.phase2", "Phase 2 (essay and pitch deck)", "Recruitment", "11 – 24 May 2027", None, "Decided", True, DEC_SHEET, None),
    ("dates.phase3", "Phase 3 (video presentation)", "Recruitment", "25 – 31 May 2027 (submit by 27 May, evaluation to 31 May)", None, "Decided", True, DEC_SHEET + "; apps/gif settings", None),
    ("dates.results", "Selection results", "Recruitment", "1 June 2027", None, "Decided", True, DEC_SHEET, None),
    ("dates.preparation", "Participant preparation", "Recruitment", "8 June – 26 July 2027", None, "Decided", True, DEC_SHEET, None),
    ("selection.requirements", "Fully Funded requirements", "Recruitment", "Phase 1: application, Elco Pro, 5 verified social media tasks; Phase 2: essay + 10–12 slide pitch deck; Phase 3: 3–5 minute video", None, "Decided", True, DEC_SHEET, "Recruitment post URL for the social tasks is not set (GIF-DEC-026)."),
    ("selection.criteria", "Selection criteria and rubric", "Recruitment", "Not approved", None, "Unknown", True, None, "GIF-DEC-028"),
    ("channels.application", "Where participants apply and pay", "Channels", "IELSco Dashboard (ielsco.com/dashboard/gif), opening the GIF engine by single sign-on. No Google Forms.", None, "Decided", True, D21, None),
    ("channels.website", "Programme website", "Channels", "https://gif.ielsco.com", None, "Confirmed", True, "Live", None),
    ("channels.contact", "Official contact", "Channels", "hello@ielsco.com · WhatsApp +62 882-9725-3491", None, "Confirmed", True, "apps/gif settings contact", None),
    ("legal.language", "Legal document language", "Legal", "Bahasa Indonesia primary, English translation", None, "Decided", True, DEC_SHEET, None),
    ("legal.status", "Legal documents", "Legal", "10 drafts live on the site, marked for counsel review", None, "Pending", True, "Every legal page: 'Draf untuk ditinjau penasihat hukum'", "GIF-DEC-025"),
    ("minors.guardian_consent", "Under-18 guardian consent", "Safeguarding", "Required by emailed link or signed form; payments blocked until recorded", None, "Decided", True, DEC_SHEET, None),
    ("minors.operations", "Minors: supervision, rooming, curfew", "Safeguarding", "Not set", None, "Unknown", True, "DECISIONS.md open item 4", "GIF-DEC-007"),
    ("insurance.requirement", "Travel insurance", "Safeguarding", "Required for every participant; minimum cover awaiting approval", None, "Pending", True, "Site /program; DECISIONS.md open item 5", "GIF-DEC-008"),
    ("visa.policy", "Visa support", "Safeguarding", "Participants are responsible for visas; IELSco provides supporting documents", None, "Proposed", True, "Site /program and Travel & Visa Disclaimer (draft)", "GIF-DEC-035"),
    ("scenario.low.self_funded", "Planning scenario LOW: Self-Funded participants", "Planning scenarios", "20", "participants", "Estimated", False, "Planning assumption for the budget model, not a target or forecast", "Change in the workspace; GIF-DEC-005 sets the real threshold."),
    ("scenario.base.self_funded", "Planning scenario BASE: Self-Funded participants", "Planning scenarios", "50", "participants", "Estimated", False, "Planning assumption, not a target or forecast", None),
    ("scenario.high.self_funded", "Planning scenario HIGH: Self-Funded participants", "Planning scenarios", "80", "participants", "Estimated", False, "Planning assumption: capacity 100 minus 20 funded places", None),
    ("scenario.mentoring", "Planning scenario: Project Mentoring sign-ups", "Planning scenarios", "40", "participants", "Estimated", False, "Planning assumption, not a target or forecast", None),
    ("fx.usd_idr_card", "Card payment rate", "Planning scenarios", "18500", "IDR per USD", "Decided", False, "PAYMENTS.md (fixed operational rate)", None),
]

# ── Decisions ──────────────────────────────────────────────────────────────────────────────────────────────────────
# Fields: code, title, question, background, why, current, evidence, options[(key,label,summary,pros,cons,cost,ops,participant,fact_updates)],
# recommended, recommendation, info_needed, delay, dependencies, priority, phase, deadline, basis, owner,
# status, related tasks, related outputs, related facts, related research, related risks
def O(key, label, summary, pros, cons, cost="", ops="", participant="", facts=None):
    return dict(key=key, label=label, summary=summary, pros=pros, cons=cons, cost=cost, operations=ops, participant=participant,
                fact_updates=facts or {})

DECISIONS = []
def D(code, title, question, background, why, current, options, recommended, recommendation, info_needed, delay, priority,
      phase, deadline, basis, owner=ARBA, status="Pending Decision", evidence=None, dependencies=None, tasks=(), outputs=(),
      facts=(), research=(), risks=(), decided=None):
    DECISIONS.append(dict(code=code, title=title, question=question, background=background, why=why, current=current,
                          evidence=evidence, options=options, recommended=recommended, recommendation=recommendation,
                          info_needed=info_needed, delay=delay, dependencies=dependencies, priority=priority, phase=phase,
                          deadline=deadline, basis=basis, owner=owner, status=status, tasks=list(tasks), outputs=list(outputs),
                          facts=list(facts), research=list(research), risks=list(risks), decided=decided))

D("GIF-DEC-001", "Confirm the Self-Funded deposit amount",
  "Is the Self-Funded deposit USD 300 / IDR 5,000,000, or another amount?",
  "Registration and payments for Self-Funded opened on 20 Nov 2026. The GIF engine charges a deposit of USD 300 / IDR 5,000,000, carried over from the original programme brief. The founder sheet of 20 Nov asked to keep the deposit configurable and not to invent one, and it was never re-confirmed against the new USD 899 / IDR 14,999,000 fee.",
  "Every Self-Funded registration now creates a deposit obligation with this amount. Changing it later means different terms for early and late registrants, refunds of differences, and edits to the Payment Terms, emails and receipts.",
  "Live in production with 3 applications on 21 Nov 2026 (aggregate count from gif.applications). PRJ-0033 also has an open task 'Secure USD 1,500 participant deposits' (TSK-0113), which matches neither figure.",
  [O("A", "Confirm USD 300 / IDR 5,000,000", "Keep the live amount (about 33% of the fee).", "No change for people who already registered; nothing to redeploy.", "Cash collected early may not cover vendor deposits if they are large.", "None", "None", "Same terms for everyone.", {"prices.deposit": "USD 300 / IDR 5,000,000"}),
   O("B", "Set a different fixed amount", "Choose an amount that matches expected vendor deposits.", "Can match cash-flow needs once quotes exist.", "Quotes don't exist yet; early registrants have different terms; needs settings change, legal text and email updates.", "Unknown until quotes", "Settings change + legal update", "Possible confusion for early registrants."),
   O("C", "Percentage of the fee", "e.g. a fixed share of the pathway fee.", "Scales if prices change.", "Engine stores fixed amounts per currency; needs code change.", "Development time", "Code change and tests", "Clear rule, odd-looking amounts.")],
  "A", "Confirm A now. It is already live, it is roughly a third of the fee, and changing it after people have paid creates unequal terms. Revisit only if vendor deposit quotes (GIF-RES-015) show a cash gap, and then for new registrants only.",
  "Vendor deposit terms for accommodation and coaches (GIF-RES-015, GIF-RES-016).",
  "Every new registration is charged an amount the founders have not confirmed; the Payment Terms stay bracketed.",
  "Critical", "Research and decision-making", "2026-11-28", "Payments are live; each day adds registrants under unconfirmed terms.", owner=ARBA,
  tasks=["GIF-T-012", "GIF-T-016"], outputs=["GIF-OUT-005", "GIF-OUT-009", "GIF-OUT-015", "GIF-OUT-016", "GIF-OUT-017", "GIF-OUT-023"],
  facts=["prices.deposit"], research=["GIF-RES-015"], risks=["GIF-RSK-016"])

D("GIF-DEC-002", "Choose the Malaysian city and host institution(s)",
  "Which city in Malaysia does GIF visit, and which university engagement do we pursue there?",
  "The plan of record (DOC-0054, 26 Oct 2026) routes Singapore → Johor Bahru (UTM) by land. The live website and the GIF engine settings list Universiti Malaya, which is in Kuala Lumpur. The founder brief lists both UM and UTM as potential destinations. UTM also has a Kuala Lumpur campus.",
  "The city decides the transport legs, accommodation, the Malaysia country plan, the partner outreach list and what the website says.",
  "Not decided. Website already names Universiti Malaya as 'planned'.",
  [O("A", "Kuala Lumpur: Universiti Malaya", "Coach Singapore → KL, fly KL → Bangkok.", "Matches the website; many KL–Bangkok flights; large student community and Indonesian student association.", "Long coach day from Singapore (border plus several hours).", "Coach day + KL accommodation", "One long transfer day", "Capital-city experience; tiring transfer day.", {"route.malaysia_city": "Kuala Lumpur (Universiti Malaya)"}),
   O("B", "Johor Bahru: UTM Johor Bahru", "Short land crossing from Singapore; fly from Johor Bahru or KL to Bangkok.", "Short cross-border leg; DOC-0054 baseline.", "Website must change (it names UM); onward flights from Johor Bahru are fewer.", "Lower coach cost; flight options to verify", "Short transfer", "Less time on the road.", {"route.malaysia_city": "Johor Bahru (UTM Johor Bahru)"}),
   O("C", "Kuala Lumpur with UM and UTM Kuala Lumpur", "As A, approaching both universities in KL.", "Two chances of a confirmed host in one city.", "More outreach work for Shafira.", "As A", "As A", "As A", {"route.malaysia_city": "Kuala Lumpur (Universiti Malaya and UTM Kuala Lumpur)"})],
  "C", "Provisionally C: Kuala Lumpur, approaching both Universiti Malaya and UTM's Kuala Lumpur campus. It keeps the website accurate and gives two chances of a confirmed host. Confirm only after GIF-RES-005 (transfer times and coach operators) and the first replies from both universities.",
  "Singapore → KL and KL/JB → Bangkok transfer times and costs (GIF-RES-005, GIF-RES-006); first responses from UM and UTM (GIF-T-041).",
  "Outreach, accommodation research and the itinerary can't start for Malaysia; the website keeps naming one university that may not be the host.",
  "Critical", "Research and decision-making", "2026-12-18", "Partner outreach starts in January (TL-021/022 in the old plan); accommodation research needs the city.",
  owner=FARREL, status="Needs Research", evidence="DOC-0054 §2 (Johor Bahru/UTM) vs apps/gif settings universities[] (Universiti Malaya) and gif.ielsco.com/program.",
  tasks=["GIF-T-008", "GIF-T-041", "GIF-T-060", "GIF-T-061"], outputs=["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-024", "GIF-OUT-025"],
  facts=["route.malaysia_city", "route.cities"], research=["GIF-RES-005", "GIF-RES-006"], risks=["GIF-RSK-001"])

D("GIF-DEC-003", "Choose how the group travels between countries",
  "How do participants move Singapore → Malaysia and Malaysia → Thailand?",
  "DOC-0054 assessed three routes: full land (about one day and night of travel to Bangkok with a second border; not recommended for a short programme), land plus one flight (recommended), and two countries only (fallback).",
  "Transport is one of the largest cost lines and the biggest safety and delay risk. It decides luggage rules, the arrival card and border procedures participants must prepare for, and the day split.",
  "Proposed in DOC-0054 (land + one flight); not decided.",
  [O("A", "Chartered coach to Malaysia, flight to Bangkok", "Licensed cross-border coach, then a group booking on a flight.", "One border by road with the group together; protects programme days.", "Flight cost and baggage fees per participant; group-fare terms.", "Coach charter + ~100 flight seats (quotes needed)", "Group check-in, baggage manifest", "Short Thailand transfer.", {"route.transport_modes": "Chartered coach Singapore → Malaysia; flight Malaysia → Bangkok"}),
   O("B", "Land all the way", "Coach/rail through to Bangkok.", "Lower ticket cost; 'overland' experience.", "Roughly a day of travel and a second land border; fatigue and delay risk; loses a programme day.", "Lower tickets, extra night", "Long day with minors", "Very tiring."),
   O("C", "Fly both legs", "Fly Singapore → Malaysia and Malaysia → Bangkok.", "Fastest.", "Two group check-ins; more cost; loses the land-border experience.", "Highest", "Two airport days", "Short but airport-heavy.")],
  "A", "A: chartered coach into Malaysia and one flight to Bangkok. It is DOC-0054's assessed baseline and keeps everyone together across the land border. Get coach and group-fare quotes before G2.",
  "Coach operator licensing for cross-border groups, border processing for coaches, group fares and baggage (GIF-RES-005, GIF-RES-006, GIF-RES-007).",
  "No transport quotes, so no budget; group fares get scarcer for late-July travel.",
  "Critical", "Research and decision-making", "2026-12-18", "Needed before transport quotes (GIF-T-061) and the budget gate.", owner=FARREL,
  tasks=["GIF-T-060", "GIF-T-061", "GIF-T-062"], outputs=["GIF-OUT-024", "GIF-OUT-025", "GIF-OUT-029", "GIF-OUT-018"],
  facts=["route.transport_modes"], research=["GIF-RES-005", "GIF-RES-006", "GIF-RES-007"], risks=["GIF-RSK-001", "GIF-RSK-011"])

D("GIF-DEC-004", "Split the 8 days across the three countries",
  "How many days and nights in Singapore, Malaysia and Thailand, and where do arrival and departure fall?",
  "27 Jul – 3 Aug is 8 days and 7 nights. The site says flights are to Singapore and from Thailand. Conference, competition and awarding days are not yet placed.",
  "Decides accommodation nights per city, venue needs, run sheets, staff rotation and where the conference and awarding happen.",
  "Not decided.",
  [O("A", "3 / 2 / 3", "Singapore 3 nights, Malaysia 2, Thailand 2 + departure day.", "Arrival buffer in Singapore; awarding in Bangkok at the end.", "Short Malaysia stay.", "", "", "", {"route.day_split": "Singapore 3 nights · Malaysia 2 nights · Thailand 2 nights; departure from Bangkok on 3 Aug"}),
   O("B", "2 / 3 / 2", "Singapore 2 nights, Malaysia 3, Thailand 2.", "Lower Singapore accommodation cost (usually the most expensive city).", "Less arrival buffer.", "", "", "", {"route.day_split": "Singapore 2 nights · Malaysia 3 nights · Thailand 2 nights; departure from Bangkok on 3 Aug"}),
   O("C", "Decide after partner replies", "Hold until hosts confirm dates.", "Fits host availability.", "Delays itinerary, budget and bookings.", "", "", "")],
  "B", "Provisionally B (2 / 3 / 2) to reduce the most expensive accommodation nights, but confirm only after the first host replies and accommodation quotes (GIF-RES-008). Put the conference and awarding in the final country so travel days don't cut into them.",
  "Accommodation prices per city for late July (GIF-RES-008); host availability (GIF-T-041).",
  "Itinerary, budget and venue research stay blocked; the website cannot show an itinerary on 8 Jun as promised.",
  "High", "Programme design", "2027-01-15", "Itinerary and budget scenarios (G2, 9 Apr) need it; outreach letters need proposed dates.", owner=FARREL,
  tasks=["GIF-T-050", "GIF-T-063"], outputs=["GIF-OUT-024", "GIF-OUT-028", "GIF-OUT-023"], facts=["route.day_split"], research=["GIF-RES-008"])

D("GIF-DEC-005", "Set participant capacity and the minimum viable cohort",
  "What is the maximum cohort, and below how many paying participants do we not run (or reduce scope)?",
  "The GIF engine has capacity 100 (cohort setting). The founder sheet decided 10 Fully Funded and 10 Partial Funded places but not total capacity or a minimum. Eight core staff travel.",
  "Capacity drives staff-to-participant ratios, coach and room blocks, venue sizes and the break-even point. The minimum protects against running at a loss.",
  "Capacity 100 is live in settings (status: proposed). No minimum.",
  [O("A", "Keep 100 and set a minimum at break-even", "Minimum = paying participants needed to cover fixed costs (from the budget model).", "Uses the model; protects cash.", "Needs quotes first.", "", "Ratio 1:12 with 8 staff before local support", "", {"capacity.total": "100"}),
   O("B", "Reduce capacity to 60", "Smaller, easier to run with 8 staff.", "Lower risk, one coach.", "Less revenue; Self-Funded closes earlier.", "", "1:7.5 with 8 staff", "", {"capacity.total": "60"}),
   O("C", "Capacity by bookings", "Grow capacity in steps as room/coach blocks are confirmed.", "Never oversells logistics.", "More admin.", "", "", "")],
  "A", "A: keep 100 as the ceiling and set the minimum viable cohort from the budget model once quotes exist (target by 9 Apr, G2). With 8 core staff, plan local support so no core member supervises more than one group alone.",
  "Fixed costs from quotes (GIF-BUD lines); supervision ratio for minors (GIF-DEC-007).",
  "Recruitment marketing can't state places; no go/no-go threshold for commitments.",
  "High", "Financial preparation", "2027-01-31", "Must exist before vendor deposits (G4) and should guide marketing intensity.", owner=ARBA,
  tasks=["GIF-T-017", "GIF-T-018"], outputs=["GIF-OUT-023", "GIF-OUT-005"], facts=["capacity.total", "capacity.minimum_viable"], risks=["GIF-RSK-015", "GIF-RSK-014"])

D("GIF-DEC-006", "Decide how the 8 core team members' travel is funded",
  "Does the GIF budget pay the core team's flights, accommodation and costs, and what exactly does the managers' 'fully funded' benefit include?",
  "The six manager agreements include 'GIF Summer 2027 Program, fully funded, three countries (details in the Program Confirmation)'. The Program Confirmation does not exist yet. Participants' Fully Funded award excludes international flights.",
  "Eight staff travel costs are a large fixed cost and a contractual promise. The Program Confirmation must say what is covered.",
  "Benefit promised in draft agreements; scope undefined.",
  [O("A", "Programme pays everything for all 8", "Flights, accommodation, transport, meals, insurance.", "Clear and fair; staff are working.", "Highest fixed cost.", "8 × full travel cost", "", ""),
   O("B", "Same as a Fully Funded participant, plus flights for staff on duty", "Managers' benefit mirrors Fully Funded; flights covered as a work cost.", "Consistent with participant award wording.", "Need a clear 'on duty' definition.", "", "", ""),
   O("C", "Same as Fully Funded participants (no flights)", "Staff pay their own flights.", "Lowest cost.", "May conflict with 'fully funded' in the agreements; staff are working.", "", "", "")],
  "B", "B: treat the 8 as working staff. Cover in-programme costs like a Fully Funded participant, and pay flights as a work cost. Write it into the Program Confirmation (GIF-OUT-038) and have counsel check it against the agreement wording.",
  "Flight estimates (GIF-RES-006); counsel's reading of 'fully funded' in the agreements.",
  "Budget stays incomplete; managers sign agreements with an undefined benefit.",
  "High", "Financial preparation", "2027-01-31", "Before agreements are signed and before the budget gate.", owner=ARBA,
  tasks=["GIF-T-019", "GIF-T-031"], outputs=["GIF-OUT-038", "GIF-OUT-023"], research=["GIF-RES-006"])

D("GIF-DEC-007", "Set the operating rules for under-18 participants",
  "Do we accept participants under 18, from what age, and with which supervision, rooming and curfew rules?",
  "The audience includes high school students. Guardian consent is built into the platform and blocks payment until recorded (decided 20 Nov). Supervision ratio, rooming, curfew, chaperones and emergency procedures for minors are not set (DECISIONS.md open item 4). Legal text says they will be shared before departure.",
  "Safeguarding is the highest-impact risk area. Rules decide staff ratios, rooms, volunteer roles, insurance and what parents are promised.",
  "Minors can apply and register now with guardian consent. No operating rules.",
  [O("A", "Accept 15–17 with strict rules", "Minimum age 15; separate rooming by gender and age band; curfew; no minor alone with any adult; designated safeguarding lead; ratio set from research.", "Keeps the high school audience; rules are explicit.", "More staff/volunteer coverage; more paperwork.", "Possibly more rooms", "Yasmine as safeguarding lead", "Parents get clear rules.", {"minors.operations": "Accepted from age 15 with separate rooming, curfew, two-adult rule and a designated safeguarding lead; ratio to be set"}),
   O("B", "Accept minors only with a parent or school chaperone", "Under-18s must travel with an adult chaperone.", "Lower duty of care on IELSco.", "Fewer high school participants; chaperone costs.", "", "", ""),
   O("C", "18+ only", "Change the audience to 18+.", "Simplest safeguarding.", "Contradicts the brief and live marketing; needs website and terms changes.", "", "", "")],
  "A", "A, with the ratio and age floor confirmed after GIF-RES-012 (safeguarding standards) and GIF-RES-013 (rules for minors travelling without parents in each country).",
  "GIF-RES-012, GIF-RES-013; insurer conditions for minors (GIF-RES-010).",
  "Minors are registering now without published rules; safeguarding policy and parent pack can't be written.",
  "Critical", "Research and decision-making", "2026-12-15", "High school recruitment is open; parents will ask before paying.", owner=FARREL, status="Needs Research",
  tasks=["GIF-T-033", "GIF-T-034", "GIF-T-087"], outputs=["GIF-OUT-019", "GIF-OUT-026", "GIF-OUT-010"], facts=["minors.operations"],
  research=["GIF-RES-012", "GIF-RES-013"], risks=["GIF-RSK-006", "GIF-RSK-007"])

D("GIF-DEC-008", "Decide the travel insurance arrangement",
  "Does each participant buy their own travel insurance with a minimum cover, or does IELSco arrange a group policy?",
  "The site says travel and health insurance covering the whole programme is required. Minimum cover is 'awaiting approval' (DECISIONS.md open item 5).",
  "Medical emergencies abroad are expensive. A gap in cover becomes IELSco's problem on site.",
  "Required; no minimum, no provider.",
  [O("A", "Group policy arranged by IELSco", "One insurer for everyone; cost included or added.", "Uniform cover; one assistance line.", "IELSco admin; price per person; may not fit international participants.", "Per-person premium (quote)", "One policy schedule", "Simple for families."),
   O("B", "Participant buys own policy meeting a minimum", "IELSco sets minimum medical, evacuation and cancellation cover and checks certificates.", "No premium cost to IELSco.", "Checking documents; varying claims processes.", "None", "Document checks before G5", "More work for families."),
   O("C", "Group policy for Indonesians, own policy for international participants", "Hybrid.", "Fits both audiences.", "Two processes.", "", "", "")],
  "C", "Provisionally C, pending quotes (GIF-RES-010). Set the minimum cover with the insurer's advice, and apply it to staff too.",
  "Quotes and coverage terms from at least two insurers (GIF-RES-010).",
  "Legal text stays bracketed; risk of uninsured participants.",
  "High", "Research and decision-making", "2027-02-26", "Insurance terms must be in the participant handbook and terms before results (1 Jun).", owner=ARBA,
  tasks=["GIF-T-035"], outputs=["GIF-OUT-010", "GIF-OUT-018"], facts=["insurance.requirement"], research=["GIF-RES-010"], risks=["GIF-RSK-003"])

D("GIF-DEC-009", "Retire the outdated GIF timeline rows and plan dates",
  "Do we mark the old 5–11 July GIF plan (DOC-0054 and the Master Timeline rows) as superseded?",
  "DOC-0054 and 52 Master Timeline items (TL-020 to TL-104 for GIF) were written for a 7-day programme on 5–11 Jul 2027 with applications opening 26 Apr 2027. The current baseline is 27 Jul – 3 Aug with recruitment since 20/25 Nov 2026. The new GIF milestones (WS10) are in the timeline alongside them.",
  "Two GIF timelines in the same OS will mislead the team. The old rows show 'Not started' tasks with dates that no longer apply.",
  "Both exist. Nothing was deleted or changed.",
  [O("A", "Mark old rows Cancelled with a pointer", "Set the old GIF rows to Cancelled with 'Superseded by WS10 (21 Nov 2026)'; mark DOC-0054 v0.1 superseded and keep it for the gate concept.", "One timeline; history kept.", "A one-off edit by a founder.", "", "", ""),
   O("B", "Update old rows in place", "Re-date the old rows instead of using WS10.", "Keeps TL ids.", "Mixes old structure with the new; many rows don't map.", "", "", ""),
   O("C", "Leave both", "", "", "Confusing; double counting on Home and timeline.", "", "", "")],
  "A", "A. Nothing is deleted: rows are kept, marked Cancelled with a pointer, and DOC-0054 is marked superseded on dates while its gate concept (G0–G5) carries over to GIF-DEC-040.",
  "None.", "The Home dashboard and the Timeline keep showing the wrong programme dates.",
  "Critical", "Initial planning", "2026-11-28", "Data hygiene; quick.", owner=FARREL,
  tasks=["GIF-T-003"], outputs=["GIF-OUT-002", "GIF-OUT-040"])

D("GIF-DEC-010", "Align the launch events with the live recruitment dates",
  "What do the 'GIF 2027 Open Pre-Launch' (7 Dec) and 'Official Launch' (9 Jan) calendar events mean now that registration opened 20 Nov and Fully Funded opens 25 Nov?",
  "Calendar events EV-0032 and EV-0033 predate the 21 Nov registration timeline.",
  "The marketing calendar, campaign content and announcements depend on one launch narrative.",
  "Conflicting.",
  [O("A", "Treat 25 Nov as launch; repurpose the events", "7 Dec becomes an info session; 9 Jan becomes a Fully Funded push / mentoring early-bird close follow-up.", "Matches the live platform.", "Event content needs rework.", "", "", ""),
   O("B", "Keep 9 Jan as the 'official' public launch", "Soft-open now, big launch in January.", "More preparation time for content.", "Mixed messages to applicants already registering.", "", "", ""),
   O("C", "Cancel both events", "", "Less work.", "Loses awareness moments.", "", "", "")],
  "A", "A: the platform is the truth. Repurpose both events into recruitment moments and update the campaign calendar.",
  "Didi and Acha's content plan.", "Campaign content contradicts the platform dates.",
  "High", "Recruitment preparation", "2026-11-28", "The 7 Dec event is two weeks away.", owner=DIDI,
  tasks=["GIF-T-020"], outputs=["GIF-OUT-021", "GIF-OUT-041"])

D("GIF-DEC-011", "Approve the eight-person responsibility model",
  "Do you approve the proposed workstream owners and roles for the 8 travelling team members?",
  "Proposed in this workspace (People tab) from os_people titles, DOC-0053 decision rights and the manager agreements (each manager at most 2 h/day, 10 h/week, remote before travel).",
  "Every task owner and escalation route depends on it.",
  "Proposed; tasks are pre-assigned on that basis and remain editable.",
  [O("A", "Approve as proposed", "", "Work starts with clear owners.", "", "", "", ""),
   O("B", "Approve with changes", "Say which workstreams move.", "", "Tasks need reassigning.", "", "", ""),
   O("C", "Reject; propose again", "", "", "Delays every workstream.", "", "", "")],
  "A", "A, with one caution: the six managers together have at most about 60 hours a week. Keep founders on decisions and approvals, and push execution to local support and vendors where the workspace marks it.",
  "None.", "Tasks have owners who haven't agreed to them.",
  "Critical", "Initial planning", "2026-11-30", "Assignments start now.", owner=ARBA, tasks=["GIF-T-002"])

D("GIF-DEC-012", "Confirm decision rights between Arba and Farrel for GIF",
  "Who approves what for GIF?",
  "DOC-0053 (draft): Farrel accountable for GIF 2027; Arba approves every financial and legal commitment, public statement and paid spend. Both answer the programme decisions in this workspace.",
  "Prevents double approvals and stalls.",
  "Draft (DOC-0053 not approved).",
  [O("A", "As DOC-0053", "Farrel: operations and programme delivery; Arba: money, legal, public statements, website/dashboard. Either may answer a decision in their area; Critical decisions need both.", "Clear.", "", "", "", ""),
   O("B", "Both approve everything", "", "Shared view.", "Slow.", "", "", ""),
   O("C", "Farrel approves all GIF; Arba only finance", "", "Fast.", "Public statements and legal exposure outside Arba.", "", "", "")],
  "A", "A. The workspace records who answered each decision, so the split is auditable.",
  "None.", "Ambiguous approvals.", "Critical", "Initial planning", "2026-11-30", "Needed for the decision queue itself.", owner=ARBA, tasks=["GIF-T-001"])

D("GIF-DEC-013", "Set spend approval and procurement rules for GIF",
  "Above what amount is Arba's prior approval and more than one quote required?",
  "No GIF budget, approval limits or procurement procedure is on record. Finance and legal are Restricted in the Company OS.",
  "Vendor bookings start after G4; on-site cash spending needs a rule.",
  "None.",
  [O("A", "Every commitment pre-approved by Arba; two quotes above a threshold", "Threshold set by Arba; on-site petty cash float with receipts.", "Tight control.", "Arba as bottleneck on site.", "", "", ""),
   O("B", "Farrel approves within approved budget lines; Arba above a threshold", "", "Faster on site.", "Requires an approved budget first.", "", "", "")],
  "B", "B once the budget is approved (G2); A until then. Arba sets the thresholds.",
  "Approved budget.", "Ad-hoc spending; reconciliation problems.", "High", "Financial preparation", "2026-12-31", "Before any vendor contact asks for deposits.", owner=ARBA,
  tasks=["GIF-T-014"], outputs=["GIF-OUT-023"], risks=["GIF-RSK-014"])

D("GIF-DEC-014", "Set the budget envelope, contingency and break-even rule",
  "What contingency reserve do we hold, and do we commit vendor deposits only when paid revenue covers fixed costs?",
  "The budget model in this workspace computes revenue from decided prices and planning scenarios. Costs are not estimated yet (no quotes).",
  "Protects IELSco from losses if recruitment is low.",
  "No budget.",
  [O("A", "10% contingency; commit only when paid revenue covers fixed costs", "", "", "", "", "", ""),
   O("B", "15% contingency; same commitment rule", "", "More buffer for FX and late changes.", "Higher break-even.", "", "", ""),
   O("C", "20% contingency", "", "Most buffer.", "Highest break-even.", "", "", "")],
  "B", "B: 15%, because costs are in SGD, MYR and THB but revenue is in IDR/USD, and quotes for late July may rise. Commit vendor deposits only against verified paid revenue.",
  "Quotes (GIF-RES-008, -015, -016).", "No go/no-go rule for commitments.", "High", "Financial preparation", "2027-02-26", "Before G2 (budget gate).", owner=ARBA,
  tasks=["GIF-T-015"], outputs=["GIF-OUT-023"], risks=["GIF-RSK-015", "GIF-RSK-017"])

D("GIF-DEC-015", "Choose the accommodation standard and rooming policy",
  "What type of accommodation and how many per room, separated how?",
  "Fully Funded covers accommodation. No standard is published.",
  "Accommodation is likely the largest cost line and a major part of the participant and parent experience.",
  "None.",
  [O("A", "Hostel/dorm-style, 4–6 per room", "", "Lowest cost.", "Less privacy; harder for minors' separation.", "", "", ""),
   O("B", "Budget hotel, 3–4 per room", "", "Balance of cost and safety.", "", "", "", ""),
   O("C", "Hotel, twin rooms", "", "Comfort.", "Highest cost.", "", "", "")],
  "B", "B, gender-separated, minors roomed only with minors of the same gender, staff rooms on the same floor. Confirm with quotes (GIF-RES-008).",
  "GIF-RES-008.", "No accommodation quotes, no budget.", "High", "Travel and accommodation preparation", "2027-01-31", "Quotes needed for G2.", owner=FARREL,
  tasks=["GIF-T-063"], outputs=["GIF-OUT-018", "GIF-OUT-029", "GIF-OUT-023"], research=["GIF-RES-008"])

D("GIF-DEC-016", "Choose the local support model in each country",
  "Who executes on the ground in Singapore, Malaysia and Thailand?",
  "Only 8 core staff travel. Local support has not been approached anywhere.",
  "Without local support the 8 must do registration, transport coordination, translation and setup themselves.",
  "None.",
  [O("A", "Paid local coordinator per country + volunteers", "One paid coordinator (or DMC) per country plus 4–8 volunteers from Indonesian student associations and host-university student organisations.", "Accountable local lead; volunteers for non-sensitive tasks.", "Coordinator fees.", "3 coordinator fees (quotes)", "", ""),
   O("B", "Volunteers only", "", "Lowest cost.", "No accountable local lead; reliability risk.", "", "", ""),
   O("C", "Destination management company (DMC) per country", "", "Handles transport, venues, guides.", "Highest cost; less control.", "", "", "")],
  "A", "A. Volunteers never handle money, medical information, minors alone or institutional commitments; each country has one core supervisor (Country lead).",
  "Availability and rates of local coordinators (GIF-RES-022); student organisations' interest (GIF-T-071).",
  "Local recruitment needs 4–6 months; leaving it late concentrates all work on the 8.",
  "High", "Local volunteer recruitment", "2027-01-15", "Outreach to local groups starts in January.", owner=FARREL,
  tasks=["GIF-T-070", "GIF-T-071", "GIF-T-072"], outputs=["GIF-OUT-030", "GIF-OUT-025"], research=["GIF-RES-022", "GIF-RES-023"], risks=["GIF-RSK-022"])

D("GIF-DEC-017", "Decide volunteer incentives and what IELSco covers for them",
  "What do local volunteers receive (meals, transport, certificate, kit, allowance)?",
  "Local support is not free by default.", "Affects recruitment of volunteers and the budget.", "None.",
  [O("A", "Meals, local transport, certificate, kit", "", "", "", "", "", ""),
   O("B", "As A plus a small daily allowance", "", "Better reliability.", "Cost; may create employment questions locally.", "", "", ""),
   O("C", "Certificate only", "", "Cheapest.", "Few volunteers.", "", "", "")],
  "A", "A, and ask local counsel or the host organisation whether any allowance creates obligations (GIF-RES-024).",
  "GIF-RES-024.", "Can't recruit volunteers.", "Medium", "Local volunteer recruitment", "2027-03-01", "Before volunteer recruitment opens.", owner=FARREL,
  tasks=["GIF-T-073"], outputs=["GIF-OUT-030", "GIF-OUT-031"], research=["GIF-RES-024"])

D("GIF-DEC-018", "Approve the institutional outreach approach",
  "Which universities do we approach, through which offices, for what (visit, session, co-hosted event), and who signs?",
  "No institution has confirmed anything. Shafira's TSK-0107 (research NUS, UTM, Chulalongkorn) is due 18 Dec. The website names NUS, UM and Chulalongkorn as 'planned'.",
  "Institutional engagement is a core participant promise and the hardest external dependency.",
  "Research stage.",
  [O("A", "One ask per university: a hosted campus session, through the international/outreach office", "Letter signed by Arba; Shafira coordinates.", "Clear, modest ask.", "", "", "", ""),
   O("B", "Broader partnership (MoU) asks", "", "Longer-term value.", "Slow; legal review on both sides; unlikely by July.", "", "", "")],
  "A", "A: a modest, specific ask per university, with an MoU only if the institution proposes one.",
  "TSK-0107 findings.", "Outreach slips past January; hosts' calendars fill.", "High", "Partner engagement", "2026-12-18", "Outreach letters go out in January.", owner=ARBA,
  tasks=["GIF-T-040", "GIF-T-041", "GIF-T-042"], outputs=["GIF-OUT-032", "GIF-OUT-033"], risks=["GIF-RSK-021"])

D("GIF-DEC-019", "Decide how the website names the universities until confirmed",
  "Keep naming NUS, Universiti Malaya and Chulalongkorn as 'planned visits' on gif.ielsco.com, or remove the names until written confirmation?",
  "The site shows 'Planned visits to NUS, Universiti Malaya and Chulalongkorn (status shown below)'. DOC-0053's brand rule says never name them as partners before written evidence. 'Planned' is not 'partner', but it still sets expectations.",
  "Reputational and consumer-protection risk if a visit doesn't happen.",
  "Live with 'planned' status labels.",
  [O("A", "Keep, with explicit 'subject to confirmation' wording and no logos", "", "Keeps marketing appeal; honest.", "Some risk if a visit falls through.", "", "Small copy change", ""),
   O("B", "Remove names until written confirmation", "", "Zero overclaim risk.", "Less attractive marketing now.", "", "Copy change", ""),
   O("C", "Keep as is", "", "", "", "", "", "")],
  "A", "A: keep the names only as 'planned, subject to confirmation', no logos or 'in partnership with', and add the same sentence to the FAQ and terms. Prepared as a draft change for review; not deployed.",
  "None.", "Expectations harden as more people register.", "Critical", "Recruitment preparation", "2026-11-28", "Recruitment traffic is rising with Fully Funded opening on 25 Nov.", owner=ARBA,
  tasks=["GIF-T-021"], outputs=["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-007"], facts=["institutions.nus", "institutions.um", "institutions.chula"], risks=["GIF-RSK-021", "GIF-RSK-020"])

D("GIF-DEC-020", "Define the conference, competition and awarding format",
  "What is the pitching competition (who competes, judged how, what awards), and is the conference a separate event?",
  "The objectives include project mentoring, pitching, conference, competition and awarding. No format, judges, awards or venue exist.",
  "Shapes the programme design, judges, venue size, AV and certificates.",
  "None.",
  [O("A", "Team pitching competition on the final full day, external judges, non-cash awards", "", "Simple; one big venue day.", "", "Venue + AV", "", ""),
   O("B", "Heats in each country, final in Bangkok", "", "Engagement across the route.", "Three venue setups.", "", "", ""),
   O("C", "Conference + pitching combined, co-hosted with a university", "", "Prestige.", "Depends on a host.", "", "", "")],
  "A", "A as the base, upgrading to C only if a host confirms in writing.",
  "Venue options (GIF-RES-020).", "Judges and venues get booked by others.", "Medium", "Programme design", "2027-02-26", "Before venue research and judge outreach.", owner=ARBA,
  tasks=["GIF-T-051", "GIF-T-052", "GIF-T-090"], outputs=["GIF-OUT-024", "GIF-OUT-035"], research=["GIF-RES-020"])

D("GIF-DEC-021", "Decide how Project Mentoring is delivered",
  "Who mentors, how many sessions, online or in person, and are mentors paid?",
  "Mentoring is sold now (Early Bird to 31 Dec) with sessions 2 Feb – 11 May. Mentor profiles are placeholders (DECISIONS.md open item 10).",
  "Paying customers expect named mentors and a schedule; refunds depend on Session 4 timing.",
  "Selling without confirmed mentors.",
  [O("A", "Online cohort sessions with 2–4 recruited mentors (honorarium)", "", "Scalable; schedule fixed now.", "Mentor fees.", "", "", ""),
   O("B", "Core team mentors", "", "No cost.", "Adds load to managers capped at 10 h/week.", "", "", ""),
   O("C", "Volunteer mentors from partner networks", "", "No cost.", "Reliability.", "", "", "")],
  "A", "A: recruit 2–4 mentors with written agreements by 15 Jan; publish the session schedule before the Early Bird ends if possible.",
  "Mentor candidates and fees (GIF-T-053).", "Customers may ask for refunds; credibility.", "High", "Programme design", "2026-12-31", "Sessions start 2 Feb 2027.", owner=ARBA,
  tasks=["GIF-T-053", "GIF-T-054"], outputs=["GIF-OUT-005", "GIF-OUT-017"])

D("GIF-DEC-023", "Confirm cashback payment timing",
  "When is the mentoring cashback paid after a Fully/Partial Funded result is verified?",
  "Site and Mentoring Terms say 'within 30 days of verification', bracketed as a proposal.", "Payment promise in legal text.", "Proposed.",
  [O("A", "Within 30 days of verification", "", "", "", "", "", "", {"payments.cashback_timing": "Within 30 days of verification"}),
   O("B", "Within 14 days", "", "", "", "", "", "", {"payments.cashback_timing": "Within 14 days of verification"})],
  "A", "A, as already drafted.", "None.", "Bracketed legal text.", "Medium", "Financial preparation", "2026-12-31", "Mentoring Terms need final text before counsel review.", owner=ARBA,
  outputs=["GIF-OUT-009", "GIF-OUT-005"], facts=["payments.cashback_timing"])

D("GIF-DEC-024", "Fill in the bracketed legal values",
  "Refund processing time, data retention periods and the dispute forum in the legal drafts.",
  "Proposed values are in [brackets] in the legal drafts (DECISIONS.md open item 6).", "Counsel needs final instructions.", "Bracketed.",
  [O("A", "Accept the proposed values for counsel review", "", "Fast.", "", "", "", ""),
   O("B", "Change values", "", "", "", "", "", "")],
  "A", "A, then let counsel change them if needed.", "Counsel.", "Counsel review can't finish.", "High", "Research and decision-making", "2026-12-15", "Before counsel review (GIF-DEC-025).", owner=ARBA,
  tasks=["GIF-T-030"], outputs=["GIF-OUT-009", "GIF-OUT-010", "GIF-OUT-011"])

D("GIF-DEC-025", "Commission counsel review of the participant legal documents",
  "Who reviews the 10 legal drafts, by when, and with what budget?",
  "All 10 GIF legal documents are drafts marked 'Draf untuk ditinjau penasihat hukum'. Participants are paying under them now.",
  "Payment, refund, liability, privacy and minors' consent terms must be enforceable.",
  "Not commissioned.",
  [O("A", "Indonesian counsel now, full set", "", "Covers PT IELSco and UU PDP.", "Fees.", "Counsel fee (quote)", "", ""),
   O("B", "Counsel for payment/refund/privacy/minors first, rest later", "", "Prioritises live risk.", "Two rounds.", "", "", "")],
  "B", "B: commission Indonesian counsel this month for the four live-risk documents (Payment Terms, Refund Policy, Privacy Policy, Parental Consent), the rest by February.",
  "Counsel quotes.", "Participants pay under unreviewed terms.", "Critical", "Research and decision-making", "2026-12-05", "Payments are live.", owner=ARBA,
  tasks=["GIF-T-030", "GIF-T-031"], outputs=["GIF-OUT-009", "GIF-OUT-010", "GIF-OUT-011", "GIF-OUT-012"], facts=["legal.status"], risks=["GIF-RSK-019"])

D("GIF-DEC-026", "Set the recruitment post for the Phase 1 social tasks",
  "Which Instagram post do applicants like, comment on and share?",
  "Fully Funded opens 25 Nov. Phase 1 includes 5 verified social tasks; 3 of them link to a recruitment post whose URL is not set (links point to @iels.co).",
  "Applicants can't complete Phase 1 tasks correctly; staff can't verify them consistently.",
  "Not set.",
  [O("A", "Publish the post by 24 Nov and set the URL", "", "Tasks work from day one.", "Tight.", "", "Settings change (Admin → Content)", ""),
   O("B", "Hide the 3 post tasks until the post exists", "", "No broken tasks.", "Later applicants have different tasks.", "", "", "")],
  "A", "A: Acha publishes the post, Didi sets `instagram.recruitment_post` in GIF Admin before 25 Nov.",
  "None.", "Broken Phase 1 instructions on launch day.", "Critical", "Recruitment and admissions", "2026-11-24", "Fully Funded opens 25 Nov 00:00 WIB.", owner=DIDI,
  tasks=["GIF-T-022"], outputs=["GIF-OUT-039", "GIF-OUT-015"])

D("GIF-DEC-027", "Choose the bank account for invoice payments",
  "Which account receives USD invoice payments?",
  "Invoice bank details are empty in the GIF engine; the code comment says Finance may designate a personal account.",
  "IELSco and Elco must keep separate records; personal accounts break auditability.",
  "Not entered.",
  [O("A", "A PT IELSco company account (USD or IDR)", "", "Auditable; separate entity.", "May need a USD account or conversion.", "", "", ""),
   O("B", "Designated personal account", "", "Quick.", "Commingling; audit and tax risk.", "", "", "")],
  "A", "A. If PT IELSco has no USD account, receive IDR at the published card rate or open one; avoid personal accounts.",
  "Bank account options (GIF-RES-026).", "International participants can't pay by invoice.", "High", "Financial preparation", "2026-11-30", "International registrations are open.", owner=ARBA,
  tasks=["GIF-T-013"], outputs=["GIF-OUT-016"], facts=["payments.invoice_bank_details"], research=["GIF-RES-026"], risks=["GIF-RSK-016"])

D("GIF-DEC-028", "Approve the selection committee and rubric",
  "Who evaluates Phase 2 and 3, with what rubric, and how are conflicts of interest handled?",
  "Evaluator roles exist in the GIF engine; no rubric or committee is on record.", "Fairness and defensibility of Fully Funded awards.", "Not set.",
  [O("A", "Arba, Farrel + 2 managers, written rubric, declared conflicts", "", "", "Load on managers in May.", "", "", ""),
   O("B", "Add 1–2 external evaluators", "", "Independence.", "Coordination.", "", "", "")],
  "B", "B: the rubric is published in summary in the Selection Terms; each application scored by two evaluators.",
  "None.", "Phase 2 opens 11 May.", "High", "Recruitment and admissions", "2027-04-15", "Four weeks before Phase 2.", owner=FARREL,
  tasks=["GIF-T-024", "GIF-T-025"], outputs=["GIF-OUT-006", "GIF-OUT-012"], facts=["selection.criteria"])

D("GIF-DEC-029", "Set waitlist, withdrawal and seat-release rules", "What happens when Self-Funded fills, and when someone withdraws?",
  "Self-Funded is 'subject to capacity'.", "Capacity and refund exposure.", "Not set.",
  [O("A", "Waitlist with 7-day offer windows", "", "", "", "", "", ""), O("B", "No waitlist", "", "", "", "", "", "")],
  "A", "A.", "None.", "Over-booking or unused places.", "Medium", "Recruitment and admissions", "2027-03-31", "Before Self-Funded could fill.", owner=DIDI,
  tasks=["GIF-T-026"], outputs=["GIF-OUT-005", "GIF-OUT-007"])

D("GIF-DEC-031", "Decide photo and video coverage", "In-house (Mojo and volunteers) or a hired local photographer/videographer per country?",
  "Media consent is part of the legal set (draft).", "Impact report, social content, future marketing.", "None.",
  [O("A", "Mojo leads, 1 trained volunteer per country", "", "Low cost.", "Mojo can't also run stage visuals.", "", "", ""),
   O("B", "Hire a local photographer for the conference/awarding day only", "", "Quality where it matters.", "Fee.", "", "", "")],
  "B", "B plus A for other days.", "Quotes.", "Booking late.", "Medium", "Programme design", "2027-04-30", "Before vendor bookings.", owner=MOJO,
  tasks=["GIF-T-091"], outputs=["GIF-OUT-028"])

D("GIF-DEC-032", "Choose communication channels for participants and parents", "Which official channels (WhatsApp groups, email, dashboard announcements) and who may post?",
  "Today assignments and decisions often live in WhatsApp.", "Safeguarding, consistency and a record.", "None.",
  [O("A", "Dashboard announcements + email as record; WhatsApp community for logistics, admins only post", "", "", "", "", "", ""),
   O("B", "WhatsApp only", "", "Familiar.", "No record; safeguarding risk.", "", "", "")],
  "A", "A: separate parent and participant groups; volunteers never in DM contact with minors.", "None.", "Ad-hoc groups form on their own.", "Medium", "Participant onboarding", "2027-03-31", "Before results (1 Jun).", owner=ACHA,
  tasks=["GIF-T-080"], outputs=["GIF-OUT-018", "GIF-OUT-019"])

D("GIF-DEC-033", "Decide certificate and award wording", "IELSco-only certificates, or co-branded with institutions?",
  "DOC-0054: co-branding only with written permission.", "Overclaim risk.", "None.",
  [O("A", "IELSco certificates; partner mention only with written permission", "", "", "", "", "", ""), O("B", "Co-branded", "", "", "Needs each institution's written approval.", "", "", "")],
  "A", "A.", "None.", "Printing deadline.", "Medium", "Programme design", "2027-05-31", "Printing in June.", owner=ARBA,
  tasks=["GIF-T-090"], outputs=["GIF-OUT-035"])

D("GIF-DEC-034", "Decide the alumni community home", "Fold GIF alumni into IELSco Circle or run a separate GIF alumni group?",
  "IELSco Circle (PRJ-0032) is active.", "Post-programme engagement.", "None.",
  [O("A", "Inside IELSco Circle", "", "One community.", "", "", "", ""), O("B", "Separate group", "", "", "Another channel to run.", "", "", "")],
  "A", "A.", "None.", "Low.", "Low", "Future development", "2027-06-30", "Before the programme ends.", owner=ACHA, tasks=["GIF-T-120"])

D("GIF-DEC-035", "Confirm the visa support policy", "What visa help does IELSco give (invitation letters, itineraries), and for whom?",
  "Site: participants are responsible; IELSco provides supporting documents. International participants may need visas for some of the three countries.",
  "Visa refusal is a refund trigger and a participant-experience risk.", "Proposed.",
  [O("A", "Supporting letter + itinerary on request; no guarantee", "", "", "", "", "", "", {"visa.policy": "Participants are responsible; IELSco issues a supporting letter and itinerary on request"}),
   O("B", "Restrict international admissions to visa-exempt nationalities", "", "Fewer refusals.", "Smaller market.", "", "", "")],
  "A", "A, plus an application-time nationality check so participants see visa needs before paying (GIF-RES-002).",
  "GIF-RES-001, GIF-RES-002.", "Late visa refusals and refunds.", "Medium", "Research and decision-making", "2027-02-26", "International recruitment is open.", owner=FARREL,
  tasks=["GIF-T-064"], outputs=["GIF-OUT-013", "GIF-OUT-018"], facts=["visa.policy"], research=["GIF-RES-001", "GIF-RES-002"], risks=["GIF-RSK-002"])

D("GIF-DEC-037", "Confirm the consent basis for Elco Pro data", "What personal data passes from GIF to PT Elco for Elco Pro, and under what consent?",
  "Elco Pro is a Fully Funded Phase 1 requirement, fulfilled manually by Finance until the Elco API exists. DOC-0053: no automatic data sharing between PT IELSco and PT Elco.",
  "Two separate PTs; UU PDP compliance.", "Manual fulfilment; consent wording not reviewed.",
  [O("A", "Explicit consent at purchase; only name + email passed", "", "", "", "", "", ""), O("B", "Applicant activates Elco Pro themselves with a code", "", "No data transfer.", "Extra step.", "", "", "")],
  "B", "B if Elco can issue codes; otherwise A, reviewed by counsel.", "Elco grant endpoint status (GIF-RES-027).", "Compliance risk.", "High", "Research and decision-making", "2026-12-15", "Fully Funded opens 25 Nov.", owner=ARBA,
  tasks=["GIF-T-032"], outputs=["GIF-OUT-011"], research=["GIF-RES-027"], risks=["GIF-RSK-018"])

D("GIF-DEC-038", "Set success criteria and KPIs", "What will count as success for GIF 2027?",
  "KPI definitions exist (KPI-0059 to KPI-0068) with no targets.", "Evaluation design and the impact report.", "No targets.",
  [O("A", "Approve the KPI set in this workspace with targets set at G2", "", "", "", "", "", ""), O("B", "Definitions only, no targets", "", "", "", "", "", "")],
  "A", "A.", "Baseline data from the GIF engine.", "Evaluation designed after the fact.", "Medium", "Initial planning", "2027-01-15", "Surveys must be designed before the programme.", owner=FARREL,
  tasks=["GIF-T-110"], outputs=["GIF-OUT-036"])

D("GIF-DEC-039", "Agree the fallback if a country or host falls through", "If a host or country becomes impossible, what do we do?",
  "DOC-0054 option C: two countries.", "Contingency planning and what terms promise.", "None.",
  [O("A", "Run in two countries with the same dates", "", "", "", "", "", ""), O("B", "Replace the host with a non-university activity", "", "", "", "", "", ""), O("C", "Postpone", "", "", "Refunds.", "", "", "")],
  "B", "B for a host, A for a country. Put the principle in the Terms.", "None.", "Improvised decisions under pressure.", "High", "Research and decision-making", "2027-03-12", "G1 partner gate.", owner=FARREL,
  tasks=["GIF-T-036"], risks=["GIF-RSK-021", "GIF-RSK-001"])

D("GIF-DEC-040", "Re-date the go/no-go gates for the 27 Jul baseline", "Do you approve the re-dated gates G0–G5 in the timeline (WS10)?",
  "DOC-0054 defined gates for a 5–11 July programme. WS10 carries them over to the new dates as proposals.", "Gates protect cash and reputation.", "Proposed in WS10.",
  [O("A", "Approve the WS10 gates", "", "", "", "", "", ""), O("B", "Change dates", "", "", "", "", "", "")],
  "A", "A.", "None.", "No formal checkpoints.", "High", "Initial planning", "2026-12-11", "G0 is proposed for 11 Dec.", owner=FARREL, tasks=["GIF-T-004"])

# Recorded decisions (evidence on file). Answered by founders before this workspace existed.
for code, title, final, src, facts in [
    ("GIF-DEC-041", "Programme pathways and places", "Fully Funded 10 places (competitive); Partial Funded 10 places as an outcome of the Fully Funded selection; Self-Funded direct admission subject to capacity; Project Mentoring as a separate paid track.", DEC_SHEET + "; " + D21, ["pathways.structure", "slots.fully_funded", "slots.partial_funded"]),
    ("GIF-DEC-042", "Participant prices and currencies", "Partial Funded USD 699 / IDR 10,999,000; Self-Funded USD 899 / IDR 14,999,000; Mentoring Early Bird USD 79 / IDR 1,199,000 to 31 Dec 2026, Regular USD 99 / IDR 1,499,000; Indonesians pay IDR, international participants USD, never converted.", DEC_SHEET, ["prices.partial_funded", "prices.self_funded", "prices.mentoring_early", "prices.mentoring_regular"]),
    ("GIF-DEC-043", "Payment gateway and international payments", "Midtrans only. USD by invoice and bank transfer verified by Finance; since 21 Nov international cards at USD × IDR 18,500 through Midtrans.", DEC_SHEET + "; founder go-ahead 21 Nov 2026 (PR #64)", ["payments.gateway", "payments.international_card"]),
    ("GIF-DEC-044", "Deposit timing, balance date and refund rules", "Deposit within 7 days of registration; balance by 30 Jun 2027; refund schedule as in the Refund Policy draft.", DEC_SHEET, ["payments.deposit_due", "payments.balance_due", "payments.refunds"]),
    ("GIF-DEC-045", "Recruitment and selection timeline", "Self-Funded and Mentoring open 20 Nov 2026; Fully Funded opens 25 Nov 2026; Phase 1 to 10 May; Phase 2 11–24 May; Phase 3 25–31 May; results 1 Jun; preparation 8 Jun – 26 Jul; programme 27 Jul – 3 Aug 2027.", DEC_SHEET + "; " + D21, ["dates.programme", "dates.phase1_close", "dates.phase2", "dates.phase3", "dates.results"]),
    ("GIF-DEC-046", "Applications and payments through the IELSco Dashboard; no Google Forms", "Participants register, apply, submit and pay at ielsco.com/dashboard/gif (GIF engine via single sign-on). GIF Google Forms are retired.", D21, ["channels.application"]),
    ("GIF-DEC-047", "Elco Pro as a Fully Funded Phase 1 requirement", "IDR 98,000 for 3 months, kept whatever the outcome; fulfilment by Finance manually until the Elco API exists.", DEC_SHEET, ["prices.elco_pro"]),
    ("GIF-DEC-048", "Under-18 guardian consent", "Guardian consent by emailed link or signed form; payments blocked until recorded.", DEC_SHEET, ["minors.guardian_consent"]),
    ("GIF-DEC-049", "Legal language and design system", "Legal documents in Bahasa Indonesia with English translation. GIF uses the IELSco public design system (decided 21 Nov 2026).", DEC_SHEET, ["legal.language"]),
]:
    D(code, title, title + "?", "Recorded before this workspace existed.", "Baseline for everything else.", final, [], None, None, None, None,
      "Medium", "Initial planning", None, None, owner=ARBA, status="Decided", evidence=src, facts=facts,
      decided=dict(final=final, reason="Founder decision on record: " + src, on="2026-11-21" if "21 Nov" in src and "20 Nov" not in src else "2026-11-20"))

# ── Research ───────────────────────────────────────────────────────────────────────────────────────────────────────
RESEARCH = [
    # code, question, why, country, info, source type, owner, due, decision links
    ("GIF-RES-001", "Entry requirements for Indonesian passport holders: Singapore, Malaysia, Thailand (visa-free stay, passport validity, onward ticket, proof of funds)", "Most participants are Indonesian; wrong guidance causes refused boarding or entry.", "All", "Allowed stay, passport validity rule, documents at the border", "Official immigration authority websites (ICA Singapore, Imigresen Malaysia, Thai MFA/Immigration)", FARREL, "2027-01-29", ["GIF-DEC-035"]),
    ("GIF-RES-002", "Visa needs for likely international nationalities (ASEAN and other Asian countries) for each of the three countries", "International participants pay USD and may need visas.", "All", "Visa-required nationalities, lead times, invitation letter requirements", "Official immigration and embassy websites", FARREL, "2027-01-29", ["GIF-DEC-035"]),
    ("GIF-RES-003", "Digital arrival cards and pre-arrival forms in each country (current requirement, timing, who fills for minors)", "Group processing at borders and airports.", "All", "Form name, when to submit, data required", "Official immigration websites", RENITA, "2027-05-31", []),
    ("GIF-RES-004", "Rules for minors travelling without parents: Indonesian exit rules and entry rules in SG/MY/TH (consent letters, notarisation)", "High school participants travel without parents.", "All", "Required letters/forms, translations, who signs", "Official immigration sources; counsel", YASMINE, "2027-01-15", ["GIF-DEC-007"]),
    ("GIF-RES-005", "Singapore → Malaysia by coach: cross-border coach licensing, checkpoint options and group processing time; operators that take groups of 50–100", "Decides city, route and day split.", "Malaysia", "Licensed operators, typical crossing times, coach capacity, quote", "Operator quotes; official checkpoint authorities", RENITA, "2026-12-15", ["GIF-DEC-002", "GIF-DEC-003"]),
    ("GIF-RES-006", "Malaysia → Bangkok flights: carriers, group booking terms, baggage, departure airports (KUL, JHB); and staff/participant flights to Singapore and from Bangkok", "Transport budget and day split.", "Thailand", "Group fares, deposit and name-change rules, baggage", "Airline group desks; travel agents", RENITA, "2026-12-15", ["GIF-DEC-002", "GIF-DEC-003", "GIF-DEC-006"]),
    ("GIF-RES-007", "Local transport in each city for a group (chartered bus vs public transport) and licensing", "Daily transport plan and cost.", "All", "Operators, hourly/day rates, licensing", "Operator quotes", RENITA, "2027-02-26", ["GIF-DEC-003"]),
    ("GIF-RES-008", "Group accommodation options for late July 2027 in Singapore, the Malaysian city and Bangkok (capacity for up to 110, room types, deposit and cancellation terms)", "Largest cost line; rooming policy.", "All", "Three options per city with quotes and terms", "Direct quotes", RENITA, "2027-02-26", ["GIF-DEC-004", "GIF-DEC-015"]),
    ("GIF-RES-009", "University visit procedures: NUS, Universiti Malaya, UTM (KL and JB), Chulalongkorn (which office, lead time, fees, group size limits)", "Institutional engagement is a core promise.", "All", "Office, contact route, lead time, conditions", "University official pages; direct contact", SHAFIRA, "2026-12-18", ["GIF-DEC-018", "GIF-DEC-002"]),
    ("GIF-RES-010", "Travel insurance products covering all three countries for Indonesians and international participants, including minors; medical, evacuation and cancellation cover", "Insurance requirement and minimum cover.", "All", "2+ insurer quotes, exclusions, claims process", "Insurer quotes", ARBA, "2027-02-12", ["GIF-DEC-008"]),
    ("GIF-RES-011", "Medical and emergency resources near each accommodation and venue (hospitals with international desks, emergency numbers, pharmacies)", "Emergency response plan.", "All", "Nearest hospitals, numbers, Indonesian embassy/consulate contacts", "Official sources; insurer network lists", FARREL, "2027-05-31", []),
    ("GIF-RES-012", "Safeguarding standards for youth travel programmes: supervision ratios, code of conduct, DBS-equivalent checks for staff/volunteers", "Minors policy and ratios.", "All", "Recognised standards and recommended ratios", "Safeguarding guidance from recognised bodies; counsel", YASMINE, "2026-12-11", ["GIF-DEC-007"]),
    ("GIF-RES-013", "Local requirements for hosting minors in each country (venues, accommodation registration, curfews)", "Minors policy.", "All", "Any legal requirement on organisers", "Counsel; host institutions", YASMINE, "2027-01-15", ["GIF-DEC-007"]),
    ("GIF-RES-014", "Public holidays, major events and weather in late July – early August 2027 (Thai Buddhist holidays, Singapore National Day rehearsals, Malaysian holidays; southwest monsoon)", "Venue availability, closures, crowds, rain plans.", "All", "Dates and expected impact", "Official government calendars; meteorological services", RENITA, "2027-01-29", []),
    ("GIF-RES-015", "Vendor deposit and cancellation terms (accommodation, coaches, flights, venues)", "Deposit amount decision and cash flow.", "All", "Deposit %, due dates, cancellation penalties", "Vendor quotes", ARBA, "2027-02-26", ["GIF-DEC-001", "GIF-DEC-014"]),
    ("GIF-RES-016", "Payment gateway fees: Midtrans MDR per method, international card fees, refund fees", "Budget line and net revenue.", "Indonesia", "Fee per method", "Midtrans account terms", ARBA, "2026-12-31", ["GIF-DEC-014"]),
    ("GIF-RES-017", "Exchange-rate exposure: SGD, MYR, THB vs IDR for budgeting; method for the rate used in the model", "Costs are in three foreign currencies.", "All", "Rate source and date, buffer", "Bank Indonesia reference rates", ARBA, "2027-01-15", ["GIF-DEC-014"]),
    ("GIF-RES-018", "Halal food and prayer facilities near venues/accommodation; dietary needs handling in each city", "Most Indonesian participants are Muslim; participant welfare.", "All", "Options per city, caterers", "Venue/caterer information; local coordinators", YASMINE, "2027-03-31", []),
    ("GIF-RES-019", "Midtrans account capabilities: foreign-issued cards on our MID, 3DS, business category acceptance for a travel programme", "International card payments are switched on.", "Indonesia", "Written confirmation from Midtrans", "Midtrans support", ARBA, "2026-12-05", []),
    ("GIF-RES-020", "Venues for the conference/pitching/awarding day (capacity 120+, AV, cost) in the final city", "Competition format and budget.", "Thailand", "3 venue options with quotes", "Venue quotes; host institution", RENITA, "2027-03-31", ["GIF-DEC-020"]),
    ("GIF-RES-021", "Indonesian personal data law (UU PDP) obligations for participant data, including minors' data and cross-border transfer", "Privacy policy and data retention.", "Indonesia", "Obligations and gaps vs current platform", "Counsel", ARBA, "2027-01-15", ["GIF-DEC-024"]),
    ("GIF-RES-022", "Local coordinators or DMCs in each country: availability, scope, rates", "Local support model.", "All", "2 options per country", "Quotes; recommendations from partners", SHAFIRA, "2027-01-29", ["GIF-DEC-016"]),
    ("GIF-RES-023", "Local student organisations and youth communities that could support (Indonesian student associations, host-university clubs, regional youth networks)", "Local volunteer supply.", "All", "Names, contact route, interest", "Official organisation pages; direct contact", SHAFIRA, "2027-01-29", ["GIF-DEC-016"]),
    ("GIF-RES-024", "Whether volunteer allowances or work by foreign staff create legal obligations locally (work pass/visa for core staff working on site)", "Staff and volunteer compliance.", "All", "Short legal note per country", "Counsel; host organisations", YASMINE, "2027-03-01", ["GIF-DEC-017"]),
    ("GIF-RES-025", "Mobile connectivity: regional eSIM/SIM options for staff and participants; costs", "Communication on site.", "All", "Options and price per person", "Provider websites", RENITA, "2027-05-31", []),
    ("GIF-RES-026", "PT IELSco bank account options for USD receipts", "Invoice payments.", "Indonesia", "Account, fees", "Bank", ARBA, "2026-11-30", ["GIF-DEC-027"]),
    ("GIF-RES-027", "Status of the Elco grant endpoint and whether Elco can issue activation codes", "Elco Pro fulfilment and consent.", "Indonesia", "Delivery date or code option", "Elco team (PT Elco)", ARBA, "2026-12-15", ["GIF-DEC-037"]),
    ("GIF-RES-028", "Tax treatment of programme fees and vendor payments abroad (VAT/PPN, withholding) for PT IELSco", "Pricing net of tax and accounting.", "Indonesia", "Accountant note", "Accountant", ARBA, "2027-01-31", ["GIF-DEC-014"]),
    ("GIF-RES-029", "Local event regulations for a 100–120 person private event in each country (permits usually handled by the venue?)", "Venue contracts.", "All", "What the organiser must apply for", "Venue; official sources", RENITA, "2027-03-31", []),
    ("GIF-RES-030", "Accessibility: wheelchair access at venues/accommodation/transport; process for participants with access needs", "Inclusive participation.", "All", "Per-venue notes", "Venues, operators", YASMINE, "2027-04-30", []),
]

# ── Risks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
RISKS = [
    # code, title, category, country, L, I, prevention, mitigation, contingency, escalation, owner, review, decide_before
    ("GIF-RSK-001", "Travel disruption between countries (border queues, coach breakdown, flight delay or cancellation)", "Travel", "All", 3, 4, "Licensed operators; buffer time on transfer days; group fares with rebooking terms.", "Live tracking; local coordinator on standby; snacks/water on coaches.", "Backup operator per leg; rebook on next flight; adjust run sheet.", "Renita → Farrel", RENITA, "2027-03-31", "Bookings"),
    ("GIF-RSK-002", "Participant refused a visa or entry", "Travel", "All", 2, 4, "Nationality check at application; supporting letters early.", "Refund per policy; alternative route if one country.", "Participant joins for available countries or is refunded.", "Farrel", FARREL, "2027-03-31", "Payments"),
    ("GIF-RSK-003", "Medical emergency abroad", "Welfare", "All", 3, 5, "Insurance required; medical forms; first-aid kit; briefings.", "Nearest hospital list; insurer assistance line; staff escort.", "Staff member stays with the participant; guardian informed; group continues.", "Yasmine → Farrel", YASMINE, "2027-05-31", "Travel"),
    ("GIF-RSK-004", "Accident or injury during activities or transport", "Safety", "All", 2, 5, "Activity risk checks; licensed transport; no unsupervised water activities.", "First aid; incident report within 1 hour.", "Medical and insurance process; family contact.", "Farrel", FARREL, "2027-05-31", "Travel"),
    ("GIF-RSK-005", "Participant misconduct", "Conduct", "All", 3, 3, "Code of conduct signed; briefings.", "Warning process; guardian contact for minors.", "Removal from activities or the programme per policy.", "Yasmine → Farrel", YASMINE, "2027-05-31", "Travel"),
    ("GIF-RSK-006", "Harassment or safeguarding incident", "Safeguarding", "All", 2, 5, "Safeguarding policy; two-adult rule; vetted staff/volunteers; separate rooming.", "Designated safeguarding lead; confidential reporting channel.", "Separate the parties; inform guardians and authorities as required.", "Yasmine → Arba and Farrel immediately", YASMINE, "2026-12-15", "Recruitment"),
    ("GIF-RSK-007", "Missing participant", "Safety", "All", 2, 5, "Buddy system; headcounts at every move; ID cards with emergency number.", "Search protocol with local coordinator.", "Police and embassy contact after the protocol threshold.", "Farrel", FARREL, "2027-05-31", "Travel"),
    ("GIF-RSK-008", "Lost passport or documents", "Travel", "All", 3, 3, "Copies stored securely; pouches; reminders.", "Embassy/consulate contacts per country.", "Staff escort to the embassy; itinerary change for that person.", "Renita", RENITA, "2027-06-30", "Travel"),
    ("GIF-RSK-009", "Accommodation problem (overbooking, unsafe or unsuitable rooms)", "Logistics", "All", 2, 4, "Contracts with room lists; site checks via local coordinator.", "Escalate to the property; rooming backup.", "Backup property list per city.", "Renita", RENITA, "2027-04-30", "Bookings"),
    ("GIF-RSK-010", "Venue cancellation or institutional visit cancelled", "Partners", "All", 3, 3, "Written confirmations; backup venue.", "Swap with an alternative activity.", "Fallback agenda per country (GIF-DEC-039).", "Shafira → Farrel", SHAFIRA, "2027-03-12", "Bookings"),
    ("GIF-RSK-011", "Vendor failure (transport, catering, AV)", "Logistics", "All", 2, 4, "Two quotes; contracts with service levels.", "Local coordinator sources a replacement.", "Backup vendor list.", "Renita", RENITA, "2027-04-30", "Bookings"),
    ("GIF-RSK-012", "Severe weather (monsoon rain, storms)", "Environment", "All", 3, 2, "Indoor alternatives for outdoor activities.", "Rain plans in run sheets.", "Reschedule outdoor items.", "Renita", RENITA, "2027-06-30", None),
    ("GIF-RSK-013", "Low recruitment (Self-Funded below the minimum viable cohort)", "Commercial", "All", 3, 5, "Campaign calendar; partner channels; tracking weekly.", "Push campaigns; adjust capacity.", "Reduce scope or postpone per gates (G2/G4).", "Didi → Arba", DIDI, "2027-02-26", "Payments"),
    ("GIF-RSK-014", "Unapproved or untracked spending", "Finance", "All", 2, 4, "Approval limits; budget lines; receipts rule.", "Weekly reconciliation.", "Freeze non-essential spend.", "Arba", ARBA, "2026-12-31", "Bookings"),
    ("GIF-RSK-015", "Financial shortfall (costs above revenue, FX movement)", "Finance", "All", 3, 5, "Contingency reserve; commit against paid revenue only.", "Monthly budget vs actual.", "Scope reduction; sponsor outreach.", "Arba", ARBA, "2027-02-26", "Bookings"),
    ("GIF-RSK-016", "Payment failure or reconciliation errors (gateway, invoices, duplicates)", "Finance", "Indonesia", 2, 3, "Engine handles duplicates/expiry; Finance verifies invoices.", "Weekly payment report.", "Manual payment path; customer support script.", "Arba", ARBA, "2026-12-31", "Payments"),
    ("GIF-RSK-017", "Refund exposure from cancellations or programme change", "Finance", "All", 2, 4, "Clear refund policy; counsel review.", "Track refundable amounts weekly.", "Reserve for refunds.", "Arba", ARBA, "2027-02-26", "Payments"),
    ("GIF-RSK-018", "Data breach or misuse of participant data (incl. minors, medical, passports)", "Data", "Indonesia", 2, 5, "Private storage, signed links, least privilege; no data in WhatsApp.", "Incident response plan.", "Notify affected people and authorities as UU PDP requires.", "Arba", ARBA, "2026-12-31", "Recruitment"),
    ("GIF-RSK-019", "Legal terms unenforceable or misleading (drafts live)", "Legal", "Indonesia", 3, 4, "Counsel review of live documents first.", "Bracketed values resolved.", "Update terms; notify participants of changes.", "Arba", ARBA, "2026-12-05", "Payments"),
    ("GIF-RSK-020", "Reputational damage (overclaimed partners, public incident, poor experience)", "Reputation", "All", 2, 4, "Claims match evidence; approved public copy.", "Holding statements; one spokesperson (Arba).", "Crisis communication plan.", "Arba", ARBA, "2027-03-31", "Recruitment"),
    ("GIF-RSK-021", "No written confirmation from institutions", "Partners", "All", 4, 3, "Early, specific asks; follow-ups.", "Alternative activities; two-university approach in Malaysia.", "Fallback agenda; adjust website wording.", "Shafira → Arba", SHAFIRA, "2027-03-12", "Recruitment"),
    ("GIF-RSK-022", "Local volunteer shortage or no-shows", "People", "All", 3, 3, "Recruit 30% more than needed; incentives; briefings.", "Reassign core staff by priority.", "Paid local help on the day.", "Shafira → Renita", SHAFIRA, "2027-05-31", "Travel"),
    ("GIF-RSK-023", "Core staff unavailable (illness, visa, conflicts) or overloaded before travel", "People", "All", 3, 4, "Each workstream has a support person; workload checked monthly against the 10 h/week cap.", "Cross-training; documented SOPs.", "Re-assign accountable owner.", "Farrel", FARREL, "2027-03-31", "Travel"),
    ("GIF-RSK-024", "Cybersecurity incident or outage of the GIF engine or dashboard (as on 21 Nov: database connection failure)", "Digital", "Indonesia", 3, 4, "Health monitoring; error pages; tested deploy process.", "Recovery runbook (PROD-RECOVERY doc).", "Manual registration and payment path.", "Arba", ARBA, "2026-12-15", "Payments"),
]

# ── Budget lines ───────────────────────────────────────────────────────────────────────────────────────────────────
# code, section, category, country, activity, description, basis, currency, unit, qty, unit_fact, qty_fact, owner, notes
BUDGET = [
    ("GIF-BUD-001", "Revenue", "Participant fees", "All", "Self-Funded", "Self-Funded fees (IDR price × scenario count)", "Formula", "IDR", None, None, "prices.self_funded.idr", "scenario.base.self_funded", ARBA, "Uses the BASE scenario. International participants pay USD; this line assumes IDR for simplicity until the nationality mix is known."),
    ("GIF-BUD-002", "Revenue", "Participant fees", "All", "Partial Funded", "Partial Funded contributions (10 places × IDR price)", "Formula", "IDR", None, None, "prices.partial_funded.idr", "slots.partial_funded", ARBA, "Assumes all 10 places are accepted."),
    ("GIF-BUD-003", "Revenue", "Project Mentoring", "All", "Mentoring", "Project Mentoring fees (Regular price × scenario count)", "Formula", "IDR", None, None, "prices.mentoring_regular.idr", "scenario.mentoring", ARBA, "Conservative: Early Bird sales are lower per person."),
    ("GIF-BUD-004", "Revenue", "Sponsorship", "All", "Sponsors", "Sponsorship and grants", "Not estimated", "IDR", None, None, None, None, ARBA, "Count only written commitments."),
    ("GIF-BUD-005", "Cost", "Accommodation", "Singapore", "Accommodation", "Participant and staff accommodation, Singapore", "Not estimated", "SGD", None, None, None, None, RENITA, "Quotes: GIF-RES-008."),
    ("GIF-BUD-006", "Cost", "Accommodation", "Malaysia", "Accommodation", "Participant and staff accommodation, Malaysia", "Not estimated", "MYR", None, None, None, None, RENITA, "City pending GIF-DEC-002."),
    ("GIF-BUD-007", "Cost", "Accommodation", "Thailand", "Accommodation", "Participant and staff accommodation, Bangkok", "Not estimated", "THB", None, None, None, None, RENITA, None),
    ("GIF-BUD-008", "Cost", "Transportation", "Malaysia", "Cross-border", "Coach Singapore → Malaysia", "Not estimated", "SGD", None, None, None, None, RENITA, "GIF-DEC-003."),
    ("GIF-BUD-009", "Cost", "Transportation", "Thailand", "Cross-border", "Flights Malaysia → Bangkok (participants and staff)", "Not estimated", "MYR", None, None, None, None, RENITA, "Group fare terms: GIF-RES-006."),
    ("GIF-BUD-010", "Cost", "Transportation", "All", "Local transport", "Local transport and airport transfers in each city", "Not estimated", "IDR", None, None, None, None, RENITA, None),
    ("GIF-BUD-011", "Cost", "Meals", "All", "Meals", "Meals during the programme (participants, staff, volunteers)", "Not estimated", "IDR", None, None, None, None, RENITA, "Fully Funded cover does not mention meals: confirm (GIF-FND-009)."),
    ("GIF-BUD-012", "Cost", "Venues", "All", "Venues", "Venue rental (conference, pitching, awarding, workshops)", "Not estimated", "IDR", None, None, None, None, RENITA, "GIF-RES-020."),
    ("GIF-BUD-013", "Cost", "Institutional visits", "All", "Institutions", "Institutional visit fees or hospitality", "Not estimated", "IDR", None, None, None, None, SHAFIRA, None),
    ("GIF-BUD-014", "Cost", "Event production", "All", "Production", "AV, stage, signage, printing, name tags", "Not estimated", "IDR", None, None, None, None, MOJO, None),
    ("GIF-BUD-015", "Cost", "Documentation", "All", "Media", "Photo/video (local photographer for the awarding day)", "Not estimated", "IDR", None, None, None, None, MOJO, "GIF-DEC-031."),
    ("GIF-BUD-016", "Cost", "Marketing", "Indonesia", "Recruitment", "Paid recruitment marketing", "Not estimated", "IDR", None, None, None, None, DIDI, "Arba approves paid spend."),
    ("GIF-BUD-017", "Cost", "Insurance", "All", "Insurance", "Group insurance (if GIF-DEC-008 chooses a group policy) and staff insurance", "Not estimated", "IDR", None, None, None, None, ARBA, None),
    ("GIF-BUD-018", "Cost", "Staff travel", "All", "Core team", "Core team flights (8 people)", "Not estimated", "IDR", None, 8, None, None, ARBA, "GIF-DEC-006."),
    ("GIF-BUD-019", "Cost", "Staff travel", "All", "Core team", "Core team in-programme costs (8 people: rooms, transport, meals)", "Not estimated", "IDR", None, 8, None, None, ARBA, "Included in accommodation/transport lines once quoted, or kept here: pick one to avoid double counting."),
    ("GIF-BUD-020", "Cost", "Fully Funded", "All", "Awards", "Fully Funded participants' covered costs (10 × per-participant cost)", "Not estimated", "IDR", None, 10, None, "slots.fully_funded", ARBA, "Computed once per-participant cost exists."),
    ("GIF-BUD-021", "Cost", "Local support", "All", "Local coordinators", "Local coordinators (one per country) and volunteer costs (meals, transport, kit)", "Not estimated", "IDR", None, None, None, None, SHAFIRA, "GIF-DEC-016/017."),
    ("GIF-BUD-022", "Cost", "Merchandise", "All", "Kit", "Participant kit (ID card, T-shirt) if approved", "Not estimated", "IDR", None, None, None, None, MOJO, "2026 had ID cards and shirts (Drive)."),
    ("GIF-BUD-023", "Cost", "Mentoring", "All", "Mentors", "Mentor honoraria", "Not estimated", "IDR", None, None, None, None, ARBA, "GIF-DEC-021."),
    ("GIF-BUD-024", "Cost", "Mentoring", "All", "Cashback", "Mentoring cashback: Fully Funded 10 × IDR 299,000", "Formula", "IDR", 299000, 10, None, "slots.fully_funded", ARBA, "Decided amounts; assumes every Fully Funded awardee bought mentoring (upper bound)."),
    ("GIF-BUD-025", "Cost", "Mentoring", "All", "Cashback", "Mentoring cashback: Partial Funded 10 × IDR 749,000", "Formula", "IDR", 749000, 10, None, "slots.partial_funded", ARBA, "Upper bound."),
    ("GIF-BUD-026", "Cost", "Payment fees", "Indonesia", "Gateway", "Midtrans fees", "Not estimated", "IDR", None, None, None, None, ARBA, "GIF-RES-016."),
    ("GIF-BUD-027", "Cost", "Legal", "Indonesia", "Counsel", "Counsel review of legal documents", "Not estimated", "IDR", None, None, None, None, ARBA, "GIF-DEC-025."),
    ("GIF-BUD-028", "Cost", "Equipment", "All", "Equipment", "First-aid kits, radios/eSIMs, power banks, signage stands", "Not estimated", "IDR", None, None, None, None, RENITA, None),
    ("GIF-BUD-029", "Reserve", "Contingency", "All", "Reserve", "Contingency reserve (% of costs, GIF-DEC-014)", "Not estimated", "IDR", None, None, None, None, ARBA, None),
    ("GIF-BUD-030", "Reserve", "Refunds", "All", "Reserve", "Refund reserve", "Not estimated", "IDR", None, None, None, None, ARBA, None),
]

# ── Outputs ────────────────────────────────────────────────────────────────────────────────────────────────────────
GH = "https://github.com/arbadzarido/ielsco/blob/main/"
OUTPUTS = [
    # code, title, type, audience, location, owner, version, approval, notes
    ("GIF-OUT-001", "GIF Summer 2027 concept note", "Document", "Internal", None, RENITA, "v0", "Draft", "TSK-0106 (In Progress). Must use the 27 Jul – 3 Aug baseline."),
    ("GIF-OUT-002", "DOC-0054 GIF 2027 Program Plan and Go/No-Go Gates", "Operational plan", "Internal", "https://docs.google.com/document/d/1NDwL3-CSvOWgp1FyKJGWdjD0LUx6ftv39XLV_7tidd0/edit", FARREL, "v0.1", "Outdated", "Dates (5–11 Jul, applications 26 Apr) superseded by the 21 Nov baseline. Gate concept reused in WS10."),
    ("GIF-OUT-003", "gif.ielsco.com home page", "Website page", "Public", "https://gif.ielsco.com", ARBA, "live", "Published", "apps/gif/src/app/(site)/page.tsx"),
    ("GIF-OUT-004", "gif.ielsco.com /program (programme and itinerary)", "Website page", "Public", "https://gif.ielsco.com/program", ARBA, "live", "Published", "Says the full itinerary is shared from 8 June 2027; names planned universities."),
    ("GIF-OUT-005", "Pathway pages: /fully-funded, /self-funded, /mentoring", "Website page", "Public", "https://gif.ielsco.com/self-funded", ARBA, "live", "Published", "Prices, places, deposit and balance."),
    ("GIF-OUT-006", "Selection process page /selection-process", "Website page", "Public", "https://gif.ielsco.com/selection-process", ARBA, "live", "Published", None),
    ("GIF-OUT-007", "FAQ page /faq", "Website page", "Public", "https://gif.ielsco.com/faq", ARBA, "live", "Published", None),
    ("GIF-OUT-008", "IELSco main site GIF entry points (ielsco.com links and banner)", "Website page", "Public", "https://ielsco.com", ARBA, "live", "Published", None),
    ("GIF-OUT-009", "Payment Terms and Refund Policy (draft legal pages)", "Legal document", "Participants", "https://gif.ielsco.com/payment-terms", ARBA, "draft", "Draft", "Live, labelled 'Draf untuk ditinjau penasihat hukum'."),
    ("GIF-OUT-010", "Terms and Conditions, Code of Conduct, Parental Consent, Media Consent (draft legal pages)", "Legal document", "Participants", "https://gif.ielsco.com/terms-and-conditions", YASMINE, "draft", "Draft", "Live, labelled as drafts."),
    ("GIF-OUT-011", "Privacy Policy (draft)", "Legal document", "Participants", "https://gif.ielsco.com/privacy-policy", ARBA, "draft", "Draft", None),
    ("GIF-OUT-012", "Selection Terms and Mentoring Terms (draft)", "Legal document", "Participants", "https://gif.ielsco.com/selection-terms", ARBA, "draft", "Draft", None),
    ("GIF-OUT-013", "Travel and Visa Disclaimer (draft)", "Legal document", "Participants", "https://gif.ielsco.com/travel-visa-disclaimer", FARREL, "draft", "Draft", None),
    ("GIF-OUT-014", "IELSco Dashboard GIF workspace (/dashboard/gif)", "Dashboard screen", "Participants", "https://ielsco.com/dashboard/gif", ARBA, "live", "Published", "Participant entry point."),
    ("GIF-OUT-015", "GIF engine settings (prices, dates, places, Phase 1 tasks)", "Dashboard screen", "Internal", GH + "apps/gif/src/lib/settings.ts", ARBA, "live", "Published", "Admin → Content & settings overrides the defaults per cohort (gif.cohorts.settings, empty on 21 Nov)."),
    ("GIF-OUT-016", "Payment flow: checkout, invoices, receipts", "Dashboard screen", "Participants", GH + "docs/gif-platform/PAYMENTS.md", ARBA, "live", "Published", None),
    ("GIF-OUT-017", "Participant email templates (GIF engine)", "Email template", "Participants", GH + "apps/gif/src/lib/email", ARBA, "live", "Published", None),
    ("GIF-OUT-018", "Participant handbook", "Handbook", "Participants", None, YASMINE, "v0", "Not started", "Before departure: travel, packing, code of conduct, emergency contacts, daily schedule."),
    ("GIF-OUT-019", "Parent and guardian information pack", "Handbook", "Parents and guardians", None, YASMINE, "v0", "Not started", None),
    ("GIF-OUT-020", "Pre-departure briefing deck", "Document", "Participants", "https://docs.google.com/presentation/d/1aSt8vCNG3KmZ0vQghKTSCBPECLqQP03xTMZIw4d8Z3k/edit", RENITA, "v0", "Not started", "Reference: GIF 2026 Outgoing Preparation & Travel Briefing."),
    ("GIF-OUT-021", "Recruitment campaign plan and content calendar", "Campaign asset", "Internal", "/os/campaigns", DIDI, "v0", "Not started", None),
    ("GIF-OUT-022", "Programme brochure / info pack", "Campaign asset", "Public", None, ACHA, "v0", "Not started", None),
    ("GIF-OUT-023", "Master budget and financial model", "Financial model", "Internal", "/os/gif?tab=budget", ARBA, "v0", "Draft", "In this workspace. Costs not estimated until quotes."),
    ("GIF-OUT-024", "Approved day-by-day itinerary", "Operational plan", "Participants", None, FARREL, "v0", "Not started", "Shared with confirmed delegates from 8 June."),
    ("GIF-OUT-025", "Country operating plans (Singapore, Malaysia, Thailand)", "Operational plan", "Internal", "/os/gif?tab=countries", RENITA, "v0", "Draft", "In this workspace."),
    ("GIF-OUT-026", "Safety, safeguarding and emergency plan", "Operational plan", "Internal", None, FARREL, "v0", "Not started", None),
    ("GIF-OUT-027", "Risk register", "Operational plan", "Internal", "/os/gif?tab=risks", FARREL, "v0", "Draft", "In this workspace."),
    ("GIF-OUT-028", "Daily run sheets and event scripts", "Run sheet", "Internal", "/os/gif?tab=onsite", RENITA, "v0", "Draft", "Skeleton in this workspace."),
    ("GIF-OUT-029", "Transport manifests and rooming lists", "Run sheet", "Internal", None, RENITA, "v0", "Not started", "Generated from the GIF engine participant list after confirmation."),
    ("GIF-OUT-030", "Volunteer role descriptions and briefing pack", "Document", "Volunteers", None, SHAFIRA, "v0", "Not started", None),
    ("GIF-OUT-031", "Volunteer agreement and code of conduct", "Legal document", "Volunteers", None, YASMINE, "v0", "Not started", None),
    ("GIF-OUT-032", "University engagement proposal pack", "Document", "Partners", "https://docs.google.com/presentation/d/1zf8grqIORIXV0ciOR31zvTuzb3zdcnRi7wBPSedgv-4/edit", SHAFIRA, "v0", "Draft", "Base: 'IELSco × Elco AI — School & University Partnership Proposal' deck; needs a GIF-specific ask."),
    ("GIF-OUT-033", "Institutional correspondence templates (request, follow-up, confirmation, thank-you)", "Template", "Partners", None, SHAFIRA, "v0", "Not started", None),
    ("GIF-OUT-034", "Participant announcement templates (results, onboarding, reminders, daily briefings)", "Template", "Participants", None, ACHA, "v0", "Not started", None),
    ("GIF-OUT-035", "Certificates and awards wording", "Document", "Participants", None, MOJO, "v0", "Not started", "TL-027 (old plan)."),
    ("GIF-OUT-036", "Evaluation framework and feedback surveys", "Document", "Internal", None, DIDI, "v0", "Not started", None),
    ("GIF-OUT-037", "Impact report", "Report", "Public", None, ACHA, "v0", "Not started", None),
    ("GIF-OUT-038", "Manager Program Confirmation (GIF benefit in the manager agreements)", "Legal document", "Internal", None, ARBA, "v0", "Not started", "Referenced in all six manager agreements; not yet written."),
    ("GIF-OUT-039", "Instagram recruitment post (Phase 1 tasks)", "Campaign asset", "Public", "https://www.instagram.com/iels.co", ACHA, "v0", "Not started", None),
    ("GIF-OUT-040", "Master Timeline GIF rows (TL-020 to TL-104)", "Operational plan", "Internal", "/os/timeline", FARREL, "26 Oct 2026", "Outdated", "Built for 5–11 Jul 2027."),
    ("GIF-OUT-041", "Calendar events EV-0032 (pre-launch 7 Dec) and EV-0033 (launch 9 Jan)", "Operational plan", "Internal", "/os/calendar", DIDI, "-", "Outdated", "Predate the 20/25 Nov opening."),
    ("GIF-OUT-042", "Final report and decision queue (this workspace)", "Report", "Internal", "/os/gif?tab=report", FARREL, "v1", "Draft", None),
]

# fact → outputs (and budget lines) that use it
FACT_LINKS = {
    "dates.programme": ["GIF-OUT-001", "GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-005", "GIF-OUT-010", "GIF-OUT-014", "GIF-OUT-015", "GIF-OUT-017", "GIF-OUT-018", "GIF-OUT-019", "GIF-OUT-020", "GIF-OUT-021", "GIF-OUT-022", "GIF-OUT-023", "GIF-OUT-024", "GIF-OUT-025", "GIF-OUT-028", "GIF-OUT-029", "GIF-OUT-033", "GIF-OUT-038"],
    "programme.nights": ["GIF-BUD-005", "GIF-BUD-006", "GIF-BUD-007", "GIF-BUD-011"],
    "route.countries": ["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-022", "GIF-OUT-025", "GIF-OUT-013"],
    "route.malaysia_city": ["GIF-OUT-004", "GIF-OUT-024", "GIF-OUT-025", "GIF-OUT-018", "GIF-BUD-006", "GIF-BUD-008", "GIF-BUD-009"],
    "route.cities": ["GIF-OUT-004", "GIF-OUT-024", "GIF-OUT-018"],
    "route.transport_modes": ["GIF-OUT-024", "GIF-OUT-018", "GIF-OUT-029", "GIF-BUD-008", "GIF-BUD-009"],
    "route.day_split": ["GIF-OUT-024", "GIF-OUT-028", "GIF-BUD-005", "GIF-BUD-006", "GIF-BUD-007"],
    "institutions.nus": ["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-022", "GIF-OUT-024", "GIF-OUT-032"],
    "institutions.um": ["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-022", "GIF-OUT-024", "GIF-OUT-032"],
    "institutions.utm": ["GIF-OUT-032", "GIF-OUT-024"],
    "institutions.chula": ["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-022", "GIF-OUT-024", "GIF-OUT-032"],
    "capacity.total": ["GIF-OUT-015", "GIF-OUT-005", "GIF-OUT-023"],
    "slots.fully_funded": ["GIF-OUT-005", "GIF-OUT-015", "GIF-OUT-023", "GIF-BUD-020", "GIF-BUD-024"],
    "slots.partial_funded": ["GIF-OUT-005", "GIF-OUT-015", "GIF-OUT-023", "GIF-BUD-002", "GIF-BUD-025"],
    "prices.partial_funded": ["GIF-OUT-005", "GIF-OUT-009", "GIF-OUT-014", "GIF-OUT-015", "GIF-OUT-016", "GIF-OUT-017", "GIF-OUT-021", "GIF-OUT-022"],
    "prices.partial_funded.idr": ["GIF-BUD-002"],
    "prices.self_funded": ["GIF-OUT-003", "GIF-OUT-005", "GIF-OUT-009", "GIF-OUT-014", "GIF-OUT-015", "GIF-OUT-016", "GIF-OUT-017", "GIF-OUT-021", "GIF-OUT-022"],
    "prices.self_funded.idr": ["GIF-BUD-001"],
    "prices.mentoring_early": ["GIF-OUT-005", "GIF-OUT-012", "GIF-OUT-015", "GIF-OUT-016", "GIF-OUT-021"],
    "prices.mentoring_regular": ["GIF-OUT-005", "GIF-OUT-012", "GIF-OUT-015", "GIF-OUT-016", "GIF-OUT-021"],
    "prices.mentoring_regular.idr": ["GIF-BUD-003"],
    "prices.deposit": ["GIF-OUT-005", "GIF-OUT-009", "GIF-OUT-014", "GIF-OUT-015", "GIF-OUT-016", "GIF-OUT-017", "GIF-OUT-023"],
    "payments.balance_due": ["GIF-OUT-005", "GIF-OUT-009", "GIF-OUT-015", "GIF-OUT-017", "GIF-OUT-018"],
    "payments.cashback_timing": ["GIF-OUT-012", "GIF-OUT-005"],
    "payments.invoice_bank_details": ["GIF-OUT-016", "GIF-OUT-017"],
    "dates.fully_funded_opens": ["GIF-OUT-003", "GIF-OUT-005", "GIF-OUT-015", "GIF-OUT-021", "GIF-OUT-041"],
    "dates.results": ["GIF-OUT-006", "GIF-OUT-015", "GIF-OUT-017", "GIF-OUT-021"],
    "dates.phase2": ["GIF-OUT-006", "GIF-OUT-015", "GIF-OUT-012"],
    "dates.phase3": ["GIF-OUT-006", "GIF-OUT-015", "GIF-OUT-012"],
    "selection.criteria": ["GIF-OUT-006", "GIF-OUT-012"],
    "minors.operations": ["GIF-OUT-010", "GIF-OUT-019", "GIF-OUT-026", "GIF-OUT-018", "GIF-OUT-030"],
    "insurance.requirement": ["GIF-OUT-004", "GIF-OUT-010", "GIF-OUT-018", "GIF-OUT-019"],
    "visa.policy": ["GIF-OUT-004", "GIF-OUT-013", "GIF-OUT-018"],
    "channels.contact": ["GIF-OUT-003", "GIF-OUT-017", "GIF-OUT-018", "GIF-OUT-019"],
    "legal.status": ["GIF-OUT-009", "GIF-OUT-010", "GIF-OUT-011", "GIF-OUT-012", "GIF-OUT-013"],
    "scenario.base.self_funded": ["GIF-BUD-001"],
    "scenario.mentoring": ["GIF-BUD-003"],
}

# ── Tasks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
# code, cat, phase, title, description, definition of done, owner, support, priority, due, country, external dependency,
# effort h, deliverable, flags(core, local, vendor, approval), automatable, simplify, waiting_on, critical, depends_on, adopt (existing TSK id)
TASKS = []
def T(code, cat, phase, title, desc, dod, owner, due, priority="P3 Normal", support=None, country="All", ext=None, effort=None,
      deliverable=None, core=True, local=False, vendor=False, approval=False, auto=None, simplify=None, waiting=None,
      critical=False, depends=(), adopt=None, decisions=(), outputs=(), budget=(), research=()):
    TASKS.append(dict(code=code, cat=cat, phase=phase, title=title, desc=desc, dod=dod, owner=owner, due=due, priority=priority,
                      support=support, country=country, ext=ext, effort=effort, deliverable=deliverable, core=core, local=local,
                      vendor=vendor, approval=approval, auto=auto, simplify=simplify, waiting=waiting, critical=critical,
                      depends=list(depends), adopt=adopt, decisions=list(decisions), outputs=list(outputs), budget=list(budget),
                      research=list(research)))

S = lambda *p: ", ".join(NAME[x] for x in p)

# A. Strategy and governance
T("GIF-T-001", "A", 1, "Agree GIF decision rights and the weekly decision review", "Arba and Farrel agree the approval split (GIF-DEC-012) and a fixed weekly 30-minute slot to answer the decision queue in /os/gif.", "GIF-DEC-012 is Decided in the workspace and a recurring weekly decision review is on the Company OS calendar.", FARREL, "2026-11-30", "P1 Critical", S(ARBA), effort=1, deliverable="Decision rights recorded; weekly review event", approval=True, decisions=["GIF-DEC-012"], critical=True)
T("GIF-T-002", "A", 1, "Confirm the eight-person allocation with each team member", "Walk each of the 8 through their proposed workstreams (People tab) and record agreement or changes.", "Each person has confirmed their role in writing (comment on the task); the team table is marked Approved by an approver.", FARREL, "2026-12-04", "P1 Critical", S(ARBA), effort=3, deliverable="Approved team allocation", approval=True, decisions=["GIF-DEC-011"], depends=["GIF-T-001"], critical=True)
T("GIF-T-003", "A", 1, "Mark the old GIF timeline rows and DOC-0054 dates as superseded", "After GIF-DEC-009, set TL-020…TL-104 GIF rows to Cancelled with 'Superseded by WS10' and add a superseded note to DOC-0054 v0.1.", "No GIF item on the Master Timeline shows the 5–11 Jul plan as active; DOC-0054 revision history notes the supersession.", FARREL, "2026-12-04", "P2 High", effort=1.5, deliverable="Clean timeline", approval=True, waiting="decision", decisions=["GIF-DEC-009"], outputs=["GIF-OUT-002", "GIF-OUT-040"])
T("GIF-T-004", "A", 1, "Hold gate G0 (programme baseline) review", "Review concept note, team allocation, top Critical decisions and the re-dated gates (WS10).", "G0 outcome (pass / rework) recorded as a decision log comment on GIF-DEC-040 with date and attendees.", FARREL, "2026-12-11", "P1 Critical", S(ARBA), effort=2, deliverable="G0 record", approval=True, decisions=["GIF-DEC-040"], depends=["GIF-T-005"], critical=True)
T("GIF-T-005", "A", 1, "Finish the GIF concept note on the 27 Jul – 3 Aug baseline", "Existing task TSK-0106. Use the canonical facts in /os/gif (Facts tab), not DOC-0054 dates.", "Concept note in Drive registered as a document, linked to GIF-OUT-001, reviewed by Farrel.", RENITA, "2026-12-11", "P2 High", S(FARREL), effort=6, deliverable="Concept note", adopt="TSK-0106", outputs=["GIF-OUT-001"], critical=True)
T("GIF-T-006", "A", 1, "Finish the master concept (programme design principles)", "Existing task TSK-0115 (Arba).", "Master concept summary attached to GIF-OUT-001 and the Facts tab reflects its decisions.", ARBA, "2026-12-11", "P2 High", effort=4, adopt="TSK-0115", outputs=["GIF-OUT-001"])
T("GIF-T-007", "A", 1, "Adopt this workspace as the GIF master timeline", "Existing task TSK-0114 ('Create master timeline'). WS10 milestones in the Timeline replace a separate sheet.", "Farrel reviews WS10 milestones and closes TSK-0114 with a link to /os/timeline?ws=WS10.", ARBA, "2026-12-04", "P3 Normal", S(FARREL), effort=1, adopt="TSK-0114", outputs=["GIF-OUT-040"])
T("GIF-T-008", "A", 2, "Run the weekly GIF review (status, risks, decisions)", "Every week until departure: overdue tasks, blocked items, new risks, decisions due this week. Notes as a Company OS meeting.", "Weekly meeting records exist for each week; the decision queue has no Critical item past its suggested deadline without a comment.", FARREL, "2027-07-23", "P2 High", S(RENITA), effort=20, deliverable="Weekly meeting notes", auto="Agenda can be generated from the workspace filters (overdue, blocked, due this week)")
T("GIF-T-009", "A", 2, "Define the change-control rule for public facts", "Any change to a public fact (dates, prices, places, institutions) goes through set fact → change record → revision tasks → approval before publishing.", "Rule written in the workspace report and agreed by Arba and Farrel; first change processed this way.", ARBA, "2026-12-11", "P2 High", S(FARREL), effort=1, approval=True, auto="Built into the workspace (Changes tab)")
T("GIF-T-010", "A", 2, "Resolve the data-quality findings", "Work through GIF-FND items: each is Resolved or Accepted as is, with a note.", "No High-severity finding is Open.", FARREL, "2026-12-18", "P2 High", S(ARBA), effort=3)

# B. Finance
T("GIF-T-011", "B", 6, "Build the GIF budget lines from quotes", "Replace 'Not estimated' lines with quotes or approved estimates; record basis and currency for each.", "Every cost line has a basis other than 'Not estimated' or a note why; total costs and break-even show in the Budget tab.", ARBA, "2027-03-31", "P1 Critical", S(RENITA), effort=8, deliverable="Quoted budget", depends=["GIF-T-061", "GIF-T-063"], outputs=["GIF-OUT-023"], critical=True)
T("GIF-T-012", "B", 6, "Confirm the deposit amount in the GIF engine and legal text", "After GIF-DEC-001, set or keep `prices.self_funded_deposit` and remove brackets in Payment Terms.", "GIF engine settings, Payment Terms and the deposit email show the decided amount; change recorded in the Changes tab.", ARBA, "2026-12-02", "P1 Critical", effort=1, approval=True, waiting="decision", decisions=["GIF-DEC-001"], outputs=["GIF-OUT-015", "GIF-OUT-009"], critical=True)
T("GIF-T-013", "B", 6, "Enter the invoice bank details", "After GIF-DEC-027, Finance enters the account in GIF Admin → Settings.", "An international test invoice shows the approved account; no personal account used unless approved in writing.", ARBA, "2026-12-02", "P1 Critical", effort=0.5, approval=True, waiting="decision", decisions=["GIF-DEC-027"], outputs=["GIF-OUT-016"])
T("GIF-T-014", "B", 6, "Write the GIF spend approval and receipts procedure", "Approval limits, quotes rule, petty cash float on site, receipts within 24 hours, reimbursement form.", "Procedure approved by Arba and stored as an SOP document linked to the workspace.", ARBA, "2026-12-31", "P2 High", S(RENITA), effort=3, deliverable="Finance SOP for GIF", approval=True, decisions=["GIF-DEC-013"])
T("GIF-T-015", "B", 6, "Set contingency and break-even rule in the model", "After GIF-DEC-014, add the reserve line amount and the commitment rule.", "Budget tab shows contingency and the break-even participant count per scenario.", ARBA, "2027-03-05", "P2 High", effort=2, waiting="decision", decisions=["GIF-DEC-014"], outputs=["GIF-OUT-023"])
T("GIF-T-016", "B", 6, "Weekly payments and receivables report", "From the GIF engine (live numbers in the workspace): paid, outstanding deposits, balances due 30 Jun, refunds.", "A weekly figure is recorded in the GIF review from Dec 2026 to Jul 2027.", ARBA, "2027-07-23", "P2 High", effort=10, auto="Live aggregates in /os/gif Overview from the GIF engine")
T("GIF-T-017", "B", 6, "Calculate the minimum viable cohort", "From quoted fixed costs and decided prices.", "Minimum viable cohort number recorded as a fact (capacity.minimum_viable) with the calculation in notes.", ARBA, "2027-04-02", "P1 Critical", effort=2, depends=["GIF-T-011"], decisions=["GIF-DEC-005"], critical=True)
T("GIF-T-018", "B", 6, "Hold gate G2 (budget and funding)", "Approve the budget scenario and the commitment rule.", "G2 recorded; budget lines approved or rejected.", ARBA, "2027-04-09", "P1 Critical", S(FARREL), effort=2, approval=True, depends=["GIF-T-017"], critical=True)
T("GIF-T-019", "B", 6, "Price the core team's travel", "After GIF-DEC-006, estimate flights and in-programme costs for 8 staff.", "Staff travel lines (GIF-BUD-018/019) have a basis and amount.", RENITA, "2027-02-26", "P2 High", effort=2, waiting="decision", decisions=["GIF-DEC-006"], budget=["GIF-BUD-018", "GIF-BUD-019"])
T("GIF-T-097", "B", 6, "Sponsor and grant outreach (optional revenue)", "Use the existing corporate partnership deck; count only written commitments.", "Sponsor pipeline in Partnerships with evidence statuses; any commitment recorded in the budget.", SHAFIRA, "2027-04-30", "P3 Normal", S(ARBA), effort=10, approval=True, budget=["GIF-BUD-004"])

# C. Recruitment, marketing, admissions
T("GIF-T-020", "C", 3, "Re-plan the GIF campaign calendar on the live dates", "Align campaign items with 20/25 Nov opening, Early Bird 31 Dec, Phase 1 close 10 May; repurpose EV-0032/EV-0033 (GIF-DEC-010).", "Campaign items exist in /os/campaigns from Nov 2026 to May 2027 with owners and dates; launch events updated.", DIDI, "2026-12-04", "P1 Critical", S(ACHA, MOJO), effort=6, deliverable="Campaign calendar", decisions=["GIF-DEC-010"], outputs=["GIF-OUT-021", "GIF-OUT-041"])
T("GIF-T-021", "C", 3, "Prepare the university-wording change for the website", "Draft copy: 'planned visits, subject to confirmation', no logos; FAQ and terms sentence (GIF-DEC-019). As a PR for review only.", "PR opened with the wording change; not merged until Arba approves.", ARBA, "2026-12-02", "P1 Critical", S(ACHA), effort=1.5, approval=True, waiting="decision", decisions=["GIF-DEC-019"], outputs=["GIF-OUT-003", "GIF-OUT-004", "GIF-OUT-007"])
T("GIF-T-022", "C", 4, "Publish the recruitment post and set its URL for Phase 1 tasks", "Acha publishes the post; Didi sets instagram.recruitment_post in GIF Admin.", "The three post-linked Phase 1 tasks open the real post; verified with a test account.", ACHA, "2026-11-24", "P1 Critical", S(DIDI), effort=2, deliverable="Live post + setting", decisions=["GIF-DEC-026"], outputs=["GIF-OUT-039", "GIF-OUT-015"], critical=True)
T("GIF-T-023", "C", 4, "Answer participant enquiries within 2 working days", "Shared inbox hello@ielsco.com and WhatsApp; FAQ answers reused.", "Enquiry log shows median response under 2 working days each month.", DIDI, "2027-07-23", "P2 High", S(ACHA), effort=30, auto="FAQ snippets; dashboard status answers most 'where is my application' questions", simplify="Point people to their dashboard status instead of answering by hand")
T("GIF-T-024", "C", 4, "Write the selection rubric for Phase 2 and Phase 3", "Criteria, weights, scoring guidance, conflict-of-interest declaration.", "Rubric approved (GIF-DEC-028) and loaded into GIF Admin → Evaluate.", FARREL, "2027-04-15", "P1 Critical", S(YASMINE, DIDI), effort=5, approval=True, decisions=["GIF-DEC-028"], outputs=["GIF-OUT-006", "GIF-OUT-012"], critical=True)
T("GIF-T-025", "C", 4, "Brief evaluators and assign applications", "Assign two evaluators per application in GIF Admin.", "Every Phase 2/3 application has two evaluators by 11 May; evaluators confirmed training.", FARREL, "2027-05-10", "P1 Critical", S(YASMINE), effort=3, depends=["GIF-T-024"], critical=True)
T("GIF-T-026", "C", 4, "Set up the waitlist and withdrawal process", "After GIF-DEC-029.", "Waitlist rule in FAQ; staff steps documented; tested with one withdrawal in staging.", DIDI, "2027-04-15", "P3 Normal", effort=2, decisions=["GIF-DEC-029"])
T("GIF-T-027", "C", 4, "Verify Phase 1 social tasks weekly", "Staff verify each delegate's tasks in GIF Admin (Verified / Not found / Pending).", "No task stays 'Pending review' more than 7 days.", DIDI, "2027-05-10", "P2 High", S(ACHA), effort=15, simplify="Batch weekly; cap time per check")
T("GIF-T-028", "C", 4, "Publish selection results and handle offers", "Results on 1 Jun via the platform; Partial Funded offers with 7-day deposit window.", "Results published 1 Jun; every offer has an accepted/declined/expired status by 15 Jun.", FARREL, "2027-06-15", "P1 Critical", S(DIDI), effort=4, approval=True, critical=True)
T("GIF-T-029", "C", 3, "Run information sessions for applicants", "At least 3 online sessions (Fully Funded focus) using IELSco Circle.", "Sessions held with attendance numbers recorded in the campaign calendar.", DIDI, "2027-04-30", "P3 Normal", S(ACHA, SHAFIRA), effort=6, local=True)
T("GIF-T-098", "C", 3, "Recruit campus ambassadors (share-only role)", "Students share posts and info-session links; no access to applicant data.", "Ambassador list with consent; content kit shared.", ACHA, "2027-01-31", "P4 Low", effort=4, local=True, simplify="Optional: drop if capacity is tight")

# D. Website, dashboard, digital
T("GIF-T-091", "J", 12, "Plan photo and video coverage", "After GIF-DEC-031: shot list, media consent check, local photographer brief.", "Shot list and coverage schedule attached to the run sheet; consent list checked.", MOJO, "2027-06-30", "P3 Normal", effort=4, vendor=True, decisions=["GIF-DEC-031"], budget=["GIF-BUD-015"])
T("GIF-T-092", "D", 3, "Monitor GIF engine health and recovery", "Check /api/health daily during recruitment; follow PROD-RECOVERY runbook on failure.", "Health checks logged; any outage has an incident note within 24 hours.", ARBA, "2027-08-03", "P1 Critical", effort=10, auto="Uptime monitor on /api/health (free tier)", critical=True)
T("GIF-T-093", "D", 3, "Website content accuracy check against canonical facts", "Each month compare website, dashboard and email facts with the Facts tab.", "Monthly check comment on this task; mismatches create change records.", DIDI, "2027-07-15", "P2 High", S(ARBA), effort=6, auto="Facts are listed with 'public' flag for a quick comparison")
T("GIF-T-094", "D", 10, "User acceptance test of participant journey", "Before results: test registration, payment, Phase 2/3 upload, results, onboarding on phone and desktop.", "UAT checklist completed with issues logged and fixed or accepted.", DIDI, "2027-04-30", "P2 High", S(RENITA), effort=6)
T("GIF-T-095", "D", 10, "Export confirmed participant data for operations", "Securely export confirmed delegates (names, rooming needs, dietary, emergency contacts) for manifests; restricted access.", "Export stored in a Restricted location; access list = core team only; deleted per retention rule after the programme.", RENITA, "2027-06-20", "P2 High", effort=2, auto="GIF Admin export (CSV with formula-injection guard)")
T("GIF-T-096", "D", 3, "Configure Google sign-in through IELSco for GIF (Supabase redirect URL)", "DECISIONS.md open item 11.", "Google sign-in works on the IELSco path into GIF; tested.", ARBA, "2026-12-15", "P3 Normal", effort=1)

# E. Legal, compliance, safeguarding
T("GIF-T-030", "E", 2, "Instruct counsel on the participant legal documents", "After GIF-DEC-024/025: brief counsel with the 10 drafts, decided values and open questions.", "Counsel engaged in writing; live-risk documents returned with comments.", ARBA, "2026-12-18", "P1 Critical", S(YASMINE), effort=4, vendor=True, approval=True, waiting="decision", decisions=["GIF-DEC-024", "GIF-DEC-025"], outputs=["GIF-OUT-009", "GIF-OUT-010", "GIF-OUT-011", "GIF-OUT-012"], critical=True)
T("GIF-T-031", "E", 2, "Draft the Manager Program Confirmation", "The document the six manager agreements reference for the GIF benefit.", "Draft reviewed by counsel; matches GIF-DEC-006.", ARBA, "2027-01-31", "P2 High", S(YASMINE), effort=3, approval=True, waiting="decision", decisions=["GIF-DEC-006"], outputs=["GIF-OUT-038"])
T("GIF-T-032", "E", 2, "Review Elco Pro data and consent flow", "After GIF-DEC-037.", "Consent wording and data passed to PT Elco documented and approved.", ARBA, "2026-12-31", "P2 High", effort=2, decisions=["GIF-DEC-037"])
T("GIF-T-033", "E", 2, "Write the safeguarding policy and two-adult rule", "Covers minors, staff/volunteer conduct, reporting, designated safeguarding lead.", "Policy approved by Arba; all 8 core staff acknowledged it.", YASMINE, "2027-01-31", "P1 Critical", S(FARREL), effort=6, approval=True, waiting="decision", decisions=["GIF-DEC-007"], outputs=["GIF-OUT-026"], critical=True)
T("GIF-T-034", "E", 10, "Collect guardian consent and medical/emergency forms", "Platform guardian consent plus a medical/dietary/emergency form for every confirmed participant.", "100% of confirmed participants have consent (minors) and forms before G5.", YASMINE, "2027-07-09", "P1 Critical", S(RENITA), effort=6, auto="Guardian consent is automated in the GIF engine", critical=True)
T("GIF-T-035", "E", 11, "Check insurance certificates (or issue the group policy)", "After GIF-DEC-008.", "Every participant and staff member has valid cover meeting the minimum before G5.", RENITA, "2027-07-09", "P1 Critical", effort=4, waiting="decision", decisions=["GIF-DEC-008"], critical=True)
T("GIF-T-036", "E", 2, "Add the fallback principle to the Terms", "After GIF-DEC-039.", "Terms state what happens if a host/country changes; reviewed by counsel.", ARBA, "2027-03-19", "P2 High", effort=1, approval=True, decisions=["GIF-DEC-039"], outputs=["GIF-OUT-010"])
T("GIF-T-037", "E", 15, "Apply the data retention and deletion schedule after the programme", "Delete or anonymise medical, passport and emergency data per the Privacy Policy.", "Deletion log recorded; only retained data per policy remains.", ARBA, "2027-09-30", "P2 High", effort=2)
T("GIF-T-038", "E", 9, "Volunteer agreement and screening", "Agreement, code of conduct, ID check and references for volunteers working with participants.", "Every on-site volunteer has a signed agreement and passed screening before the programme.", YASMINE, "2027-06-30", "P1 Critical", S(SHAFIRA), effort=4, outputs=["GIF-OUT-031"])

# F. Institutional relations
T("GIF-T-040", "F", 5, "Research NUS, UM, UTM and Chulalongkorn engagement routes", "Existing task TSK-0107. Add UM and UTM Kuala Lumpur; record office, contact route, lead time (GIF-RES-009).", "Findings recorded in GIF-RES-009; one record per institution in Partnerships with evidence status.", SHAFIRA, "2026-12-18", "P1 Critical", effort=6, adopt="TSK-0107", research=["GIF-RES-009"], critical=True)
T("GIF-T-041", "F", 5, "Send engagement requests to each institution", "Letter signed by Arba with the specific ask (GIF-DEC-018) and proposed dates.", "Requests sent to every target; each Partnerships record at 'Contacted' with the date.", SHAFIRA, "2027-01-22", "P1 Critical", S(ARBA), effort=6, approval=True, depends=["GIF-T-040"], decisions=["GIF-DEC-018"], outputs=["GIF-OUT-032", "GIF-OUT-033"], critical=True)
T("GIF-T-042", "F", 5, "Follow up and hold meetings with institutions", "Fortnightly follow-ups; meeting notes in Partnerships.", "Each institution is at 'Interested' or 'Declined', or follow-up count ≥3 with notes, by 5 Mar.", SHAFIRA, "2027-03-05", "P1 Critical", S(FARREL), effort=10, depends=["GIF-T-041"], critical=True)
T("GIF-T-043", "F", 5, "Hold gate G1 (partners)", "Review written confirmations; decide fallbacks (GIF-DEC-039).", "G1 outcome recorded; website wording updated through change control if needed.", FARREL, "2027-03-12", "P1 Critical", S(ARBA, SHAFIRA), effort=2, approval=True, depends=["GIF-T-042"], critical=True)
T("GIF-T-044", "F", 5, "Obtain written confirmations and session requirements", "Emails/letters on file; requirements (group size, ID, dress code, timing).", "Each confirmed host has written confirmation attached and requirements listed in the country plan.", SHAFIRA, "2027-04-21", "P1 Critical", effort=4, depends=["GIF-T-043"], critical=True)
T("GIF-T-045", "F", 7, "Recruit guest speakers, mentors and judges", "Written agreements; travel/fees per decisions.", "Each speaker/judge confirmed in writing with date and session.", SHAFIRA, "2027-05-31", "P2 High", S(ARBA), effort=8, approval=True, decisions=["GIF-DEC-020"])
T("GIF-T-046", "F", 13, "Send partner and host thank-you letters", "Within 7 days after the programme.", "Every host, speaker, judge and local partner received a thank-you with photos/certificate.", SHAFIRA, "2027-08-10", "P2 High", S(ACHA), effort=3, outputs=["GIF-OUT-033"])

# G. Programme design
T("GIF-T-050", "G", 7, "Draft the learning outcomes and day-by-day programme", "Educationally coherent: project development thread across all days; reflection each evening.", "Draft itinerary with learning outcome per day reviewed by Farrel; uses decided day split.", ARBA, "2027-03-26", "P1 Critical", S(FARREL, YASMINE), effort=8, waiting="decision", decisions=["GIF-DEC-004"], outputs=["GIF-OUT-024"], critical=True)
T("GIF-T-051", "G", 7, "Design the pitching competition and awards", "Format, rules, judging criteria, awards (GIF-DEC-020).", "Competition guide approved; judges briefed by 30 Jun.", ARBA, "2027-04-30", "P2 High", S(DIDI), effort=5, decisions=["GIF-DEC-020"], outputs=["GIF-OUT-035"])
T("GIF-T-052", "G", 7, "Finalise the itinerary with hosts", "Confirmed sessions per country; times; venues.", "Itinerary marked Approved in outputs; shared with delegates from 8 Jun.", FARREL, "2027-06-05", "P1 Critical", S(RENITA, SHAFIRA), effort=6, approval=True, depends=["GIF-T-044", "GIF-T-050"], outputs=["GIF-OUT-024"], critical=True)
T("GIF-T-053", "G", 7, "Recruit Project Mentoring mentors", "2–4 mentors with written agreements (GIF-DEC-021).", "Mentors confirmed and profiles published on the site (with consent) before 15 Jan.", ARBA, "2027-01-15", "P1 Critical", S(SHAFIRA), effort=6, waiting="decision", decisions=["GIF-DEC-021"], budget=["GIF-BUD-023"], critical=True)
T("GIF-T-054", "G", 7, "Publish the mentoring session schedule", "2 Feb – 11 May sessions with dates and links.", "Schedule visible in /portal/mentoring; session 1 ready by 2 Feb.", ARBA, "2027-01-25", "P1 Critical", effort=3, depends=["GIF-T-053"])
T("GIF-T-055", "G", 7, "Prepare cultural exchange and reflection sessions", "Evening reflection guide; cultural activities that don't need extra vendors.", "Session guides attached to the run sheet.", YASMINE, "2027-06-30", "P3 Normal", effort=4, local=True)

# H. Travel and logistics
T("GIF-T-060", "H", 8, "Route feasibility check for the decided cities", "Transfer times, checkpoints, flight options; supports GIF-DEC-002/003.", "GIF-RES-005 and GIF-RES-006 findings recorded with sources and dates.", RENITA, "2026-12-15", "P1 Critical", S(FARREL), effort=6, research=["GIF-RES-005", "GIF-RES-006"], critical=True)
T("GIF-T-061", "H", 8, "Get transport quotes (coach, flights, local transport)", "At least two quotes per leg.", "Quotes attached to budget lines GIF-BUD-008/009/010.", RENITA, "2027-02-26", "P1 Critical", effort=6, vendor=True, waiting="decision", decisions=["GIF-DEC-003"], budget=["GIF-BUD-008", "GIF-BUD-009", "GIF-BUD-010"], critical=True)
T("GIF-T-062", "H", 8, "Book transport after G4", "Group flight booking, coach contracts, local transport.", "Contracts signed by Arba; booking references in the country plans.", RENITA, "2027-06-11", "P1 Critical", effort=6, vendor=True, approval=True, depends=["GIF-T-099"], critical=True)
T("GIF-T-063", "H", 8, "Get accommodation quotes in each city", "Three options per city (GIF-RES-008) meeting the rooming policy.", "Quotes attached to GIF-BUD-005/006/007.", RENITA, "2027-02-26", "P1 Critical", S(SHAFIRA), effort=6, vendor=True, decisions=["GIF-DEC-015", "GIF-DEC-004"], budget=["GIF-BUD-005", "GIF-BUD-006", "GIF-BUD-007"], critical=True)
T("GIF-T-064", "H", 10, "Publish travel and visa guidance for participants", "Per nationality group, from GIF-RES-001/002; supporting letters process.", "Guidance in the handbook and dashboard; letter template ready.", FARREL, "2027-06-08", "P2 High", S(RENITA), effort=4, decisions=["GIF-DEC-035"], outputs=["GIF-OUT-018", "GIF-OUT-013"])
T("GIF-T-065", "H", 11, "Collect participant arrival and departure flights", "Form in the portal onboarding; airport transfer plan.", "Every confirmed participant's flights recorded by 10 Jul.", RENITA, "2027-07-10", "P1 Critical", effort=3, auto="GIF portal onboarding fields", critical=True)
T("GIF-T-066", "H", 11, "Room allocation and rooming lists", "From the rooming policy; minors separated.", "Rooming lists sent to each property by 15 Jul; Yasmine checked safeguarding rules.", RENITA, "2027-07-15", "P1 Critical", S(YASMINE), effort=4, outputs=["GIF-OUT-029"], critical=True)
T("GIF-T-067", "H", 11, "Transport manifests and contingency routes", "Per leg: passenger list, staff in charge, backup operator.", "Manifests and contingency notes in the run sheet folder by 20 Jul.", RENITA, "2027-07-20", "P1 Critical", effort=4, outputs=["GIF-OUT-029"], critical=True)
T("GIF-T-068", "H", 11, "Connectivity and currency plan", "eSIM/SIM for staff; guidance for participants (GIF-RES-025).", "Staff connectivity bought; guidance in the handbook.", RENITA, "2027-07-10", "P3 Normal", effort=2, research=["GIF-RES-025"])
T("GIF-T-099", "H", 8, "Hold gate G4 (commitments) and sign bookings", "Bookings only against paid revenue per GIF-DEC-014.", "G4 recorded; Arba signed or deferred each contract.", ARBA, "2027-06-04", "P1 Critical", S(FARREL), effort=2, approval=True, depends=["GIF-T-018", "GIF-T-028"], critical=True)

# I. Local community and volunteers
T("GIF-T-070", "I", 9, "Map local support organisations in each country", "Indonesian student associations, host-university student organisations, youth networks (GIF-RES-023).", "At least 3 organisations per country recorded in Local partners with status and contact route.", SHAFIRA, "2027-01-29", "P2 High", S(YASMINE), effort=6, local=True, research=["GIF-RES-023"])
T("GIF-T-071", "I", 9, "Approach local organisations for support", "Specific asks by support type; no commitments without Arba.", "Each mapped organisation Contacted; responses recorded.", SHAFIRA, "2027-03-15", "P2 High", effort=8, local=True, approval=True, depends=["GIF-T-070"], decisions=["GIF-DEC-016"])
T("GIF-T-072", "I", 9, "Engage a local coordinator per country", "Paid coordinator or DMC (GIF-DEC-016); written scope; fee approved.", "Three coordinators confirmed in writing by 30 Apr.", SHAFIRA, "2027-04-30", "P1 Critical", S(RENITA), effort=6, local=True, vendor=True, approval=True, waiting="decision", decisions=["GIF-DEC-016"], research=["GIF-RES-022"], budget=["GIF-BUD-021"], critical=True)
T("GIF-T-073", "I", 9, "Recruit and select local volunteers", "Role descriptions (GIF-OUT-030); 30% buffer; screening (GIF-T-038).", "Volunteer roster per country with roles and shifts by 30 Jun.", YASMINE, "2027-06-30", "P2 High", S(SHAFIRA), effort=8, local=True, decisions=["GIF-DEC-017"], outputs=["GIF-OUT-030"])
T("GIF-T-074", "I", 11, "Volunteer onboarding and briefing", "Online briefing 2 weeks before; on-site briefing day 1 in each country.", "Every volunteer attended a briefing; attendance recorded.", YASMINE, "2027-07-20", "P2 High", effort=4, local=True)
T("GIF-T-075", "I", 13, "Volunteer appreciation", "Certificates, thank-you, invitation to IELSco Circle.", "All volunteers received a certificate and thank-you by 10 Aug.", YASMINE, "2027-08-10", "P3 Normal", S(ACHA), effort=2)

# J. Event production
T("GIF-T-080", "M", 10, "Set up official participant and parent channels", "After GIF-DEC-032: dashboard announcements, email, WhatsApp communities (admins only).", "Channels live before results; posting rules written; minors' safeguarding rule applied.", ACHA, "2027-05-31", "P2 High", S(YASMINE), effort=2, decisions=["GIF-DEC-032"])
T("GIF-T-081", "J", 12, "Write run sheets for every programme day", "From the approved itinerary: times, places, leads, volunteers, contingencies.", "Run sheet entries exist for all 8 days with status Confirmed by 20 Jul.", RENITA, "2027-07-20", "P1 Critical", S(FARREL), effort=8, depends=["GIF-T-052"], outputs=["GIF-OUT-028"], critical=True)
T("GIF-T-082", "J", 12, "Venue booking and technical requirements for the conference/awarding day", "Venue contract; AV; stage; power; internet; capacity.", "Venue booked (after G4) with a tech rider; walkthrough by local coordinator.", RENITA, "2027-06-18", "P1 Critical", S(MOJO), effort=5, vendor=True, approval=True, research=["GIF-RES-020"], budget=["GIF-BUD-012", "GIF-BUD-014"], critical=True)
T("GIF-T-083", "J", 12, "Event script, MC and moderation plan for the conference/awarding", "Script, MC, timekeeper, judges' flow.", "Script approved; rehearsal held the day before.", MOJO, "2027-07-15", "P2 High", S(ACHA, ARBA), effort=4)
T("GIF-T-084", "J", 12, "Printed materials, signage and name tags", "Within the IELSco design system.", "Print files approved and ordered by 10 Jul.", MOJO, "2027-07-10", "P2 High", effort=4, vendor=True, budget=["GIF-BUD-014", "GIF-BUD-022"])
T("GIF-T-085", "J", 12, "Equipment checklist and packing", "First aid, radios/eSIMs, power banks, banners, printed lists.", "Checklist complete and packed by 24 Jul.", RENITA, "2027-07-24", "P2 High", effort=2, budget=["GIF-BUD-028"])
T("GIF-T-086", "J", 12, "Daily team briefing and debrief", "07:00 briefing and 21:00 debrief each day (proposed).", "Briefing/debrief notes recorded each day in the Daily on-site checklist.", FARREL, "2027-08-03", "P1 Critical", S(RENITA), effort=8)

# K. Participant experience
T("GIF-T-087", "K", 10, "Write the participant handbook and parent pack", "Before-departure guidance, code of conduct, minors' rules, packing, emergency contacts.", "Handbook and parent pack approved and published to confirmed delegates by 15 Jun.", YASMINE, "2027-06-15", "P1 Critical", S(ACHA, RENITA), effort=8, approval=True, decisions=["GIF-DEC-007", "GIF-DEC-032"], outputs=["GIF-OUT-018", "GIF-OUT-019"], critical=True)
T("GIF-T-088", "K", 11, "Pre-departure briefings", "Two online briefings (proposed 19 Jun and 10 Jul); recordings for those absent.", "Both held; attendance ≥90% or recording watched (tracked).", RENITA, "2027-07-10", "P1 Critical", S(YASMINE, FARREL), effort=6, outputs=["GIF-OUT-020"])
T("GIF-T-089", "K", 10, "Group allocation and buddy system", "Project teams and travel groups; each group has a core supervisor and a volunteer buddy.", "Groups published to delegates by 15 Jul.", YASMINE, "2027-07-15", "P2 High", S(DIDI), effort=3)
T("GIF-T-090", "K", 13, "Certificates and awards", "IELSco certificates; award certificates; issue digitally (GIF-DEC-033).", "Certificates issued to every completing participant by 13 Aug.", MOJO, "2027-08-13", "P2 High", S(DIDI), effort=3, auto="Generate from the attendance list", decisions=["GIF-DEC-033"], outputs=["GIF-OUT-035"])
T("GIF-T-100", "K", 12, "Participant welfare desk on site", "Daily slot for questions, complaints, lost items; log kept.", "Welfare log exists for each day; every complaint has a response.", YASMINE, "2027-08-03", "P1 Critical", effort=6, local=True)

# L. Safety and risk
T("GIF-T-101", "L", 2, "Write the emergency response plan", "Medical, missing participant, incident reporting, escalation tree, emergency contacts per country (GIF-RES-011).", "Plan approved; laminated cards printed; tested in a tabletop exercise by 9 Jul.", FARREL, "2027-06-30", "P1 Critical", S(YASMINE, RENITA), effort=8, approval=True, research=["GIF-RES-011"], outputs=["GIF-OUT-026"], critical=True)
T("GIF-T-102", "L", 11, "Hold gate G5 (final readiness)", "Pre-event readiness checklist all Done; risks reviewed.", "G5 outcome recorded; any 'No' item has an owner and a fix date before 27 Jul.", FARREL, "2027-07-13", "P1 Critical", S(ARBA), effort=2, approval=True, critical=True)
T("GIF-T-103", "L", 2, "Monthly risk review", "Update likelihood/impact; close or add risks.", "Every risk has a review date in the future and a comment for the month.", FARREL, "2027-07-15", "P2 High", effort=6)
T("GIF-T-104", "L", 12, "Incident log and reporting on site", "Every incident logged within 1 hour; serious ones escalated immediately.", "Incident log complete; reviewed at debrief each day.", FARREL, "2027-08-03", "P1 Critical", S(YASMINE), effort=2)

# M. Communication and documentation
T("GIF-T-105", "M", 3, "Create communication templates", "Results, onboarding, payment reminders, daily briefings, emergencies (GIF-OUT-034).", "Templates approved and stored; used for the first results announcement.", ACHA, "2027-05-15", "P2 High", S(DIDI), effort=5, outputs=["GIF-OUT-034"])
T("GIF-T-106", "M", 3, "Communication calendar for participants and parents", "Who gets what when from results to post-event.", "Calendar entries from 1 Jun to 31 Aug in /os/campaigns or calendar.", ACHA, "2027-05-25", "P3 Normal", effort=3)
T("GIF-T-107", "M", 1, "Register GIF documents in Company OS", "Every GIF output that is a document gets an os_documents record and link (GIF-OUT ↔ DOC).", "Outputs tab shows a Company OS document for every Drive document.", RENITA, "2027-01-15", "P3 Normal", effort=3, auto="Document register (Company OS → Documents)")
T("GIF-T-108", "M", 12, "On-site contact directory", "Staff, local coordinators, vendors, hosts, emergency services per country.", "Directory in the run sheet pack by 20 Jul; mobile-friendly.", ACHA, "2027-07-20", "P2 High", S(RENITA), effort=2)

# N. Monitoring and evaluation
T("GIF-T-110", "N", 15, "Design the evaluation framework and surveys", "Pre/post survey, daily pulse, learning outcomes evidence, KPIs (GIF-DEC-038).", "Framework approved; surveys built before 30 Jun.", DIDI, "2027-06-30", "P2 High", S(YASMINE), effort=5, decisions=["GIF-DEC-038"], outputs=["GIF-OUT-036"])
T("GIF-T-111", "N", 4, "Monthly recruitment funnel report", "Applications by pathway and status from the GIF engine.", "Report recorded monthly in the GIF review.", DIDI, "2027-06-30", "P3 Normal", effort=6, auto="Live aggregates in /os/gif")
T("GIF-T-112", "N", 15, "Analyse feedback and attendance", "Within 10 days after the programme.", "Analysis shared with the team; feeds the impact report.", DIDI, "2027-08-13", "P2 High", effort=4)

# O. Post-event
T("GIF-T-113", "B", 14, "Financial reconciliation and vendor settlements", "Budget vs actual per line; receipts; vendor balances; refunds.", "Reconciliation approved by Arba; no unexplained difference.", ARBA, "2027-08-31", "P1 Critical", S(RENITA), effort=6, critical=True)
T("GIF-T-114", "O", 15, "Staff debrief and lessons learned", "Within 14 days; what to keep, change, drop.", "Debrief notes with owners for each 2028 recommendation.", FARREL, "2027-08-17", "P2 High", effort=3)
T("GIF-T-115", "O", 15, "Impact report", "Outcomes, testimonials (with consent), media.", "Report approved by Arba and published.", ACHA, "2027-08-31", "P2 High", S(DIDI, MOJO), effort=8, approval=True, outputs=["GIF-OUT-037"])
T("GIF-T-116", "O", 15, "Media archive and testimonial collection", "Consent-checked photos/videos archived in Drive; testimonials collected.", "Archive folder registered; testimonial consents on file.", MOJO, "2027-08-20", "P3 Normal", effort=4)
T("GIF-T-117", "O", 13, "Post-event participant communication", "Thank-you, certificates, survey, alumni invitation.", "Sent to all participants within 7 days.", ACHA, "2027-08-10", "P2 High", effort=2)
T("GIF-T-118", "O", 16, "Website update after the programme", "Recap, impact report link; remove past-tense issues. Via PR review.", "PR approved and merged.", ARBA, "2027-09-15", "P3 Normal", S(ACHA), effort=2, approval=True)
T("GIF-T-119", "O", 16, "GIF Summer 2028 recommendations", "From debrief, evaluation and finance.", "Recommendations document approved as input to 2028 planning.", FARREL, "2027-09-30", "P3 Normal", S(ARBA), effort=4)
T("GIF-T-120", "O", 16, "Set up the alumni community", "After GIF-DEC-034.", "Alumni invited; first activity scheduled.", ACHA, "2027-08-31", "P3 Normal", effort=2, decisions=["GIF-DEC-034"])

# Country tasks (one accountable country lead per country)
for i, (c, lead) in enumerate([("Singapore", SHAFIRA), ("Malaysia", RENITA), ("Thailand", ACHA)]):
    n = 130 + i * 3
    T(f"GIF-T-{n}", "H", 8, f"{c}: complete the country operating plan", f"Fill every section of the {c} plan (Countries tab) with status and evidence.", f"Every {c} plan section is Confirmed or has an owner and date for the open item by 15 Jun.", lead, "2027-06-15", "P2 High", country=c, effort=6, local=True, outputs=["GIF-OUT-025"])
    T(f"GIF-T-{n+1}", "I", 9, f"{c}: local coordinator site check", f"Local coordinator visits accommodation and venues in {c} and reports (photos, access, risks).", "Site check report attached to the country plan by 10 Jul.", lead, "2027-07-10", "P2 High", country=c, ext="Local coordinator", effort=1, core=False, local=True)
    T(f"GIF-T-{n+2}", "L", 11, f"{c}: emergency resources sheet", f"Nearest hospitals, police, Indonesian embassy/consulate, insurer line for {c}.", "Sheet verified by the local coordinator and printed.", lead, "2027-07-15", "P1 Critical", country=c, effort=1, local=True, research=["GIF-RES-011"])

# ── Checklists ─────────────────────────────────────────────────────────────────────────────────────────────────────
CHECKLISTS = [
    ("Pre-event readiness", [
        ("Every Critical decision is Decided", FARREL, "2027-06-25"), ("Budget approved at G2 and bookings signed at G4", ARBA, "2027-06-04"),
        ("Written confirmation from each host on file", SHAFIRA, "2027-04-21"), ("Itinerary approved and shared with delegates", FARREL, "2027-06-08"),
        ("Accommodation and transport contracts signed", RENITA, "2027-06-11"), ("Local coordinators confirmed in all three countries", SHAFIRA, "2027-04-30"),
        ("Volunteer rosters and briefings done", YASMINE, "2027-07-20"), ("Insurance verified for every participant and staff member", RENITA, "2027-07-09"),
        ("Guardian consent and medical forms 100% complete", YASMINE, "2027-07-09"), ("Emergency plan tested (tabletop)", FARREL, "2027-07-09"),
        ("Rooming lists and manifests sent", RENITA, "2027-07-20"), ("Run sheets confirmed for all 8 days", RENITA, "2027-07-20"),
        ("Participant handbook and parent pack published", YASMINE, "2027-06-15"), ("Balances paid or exceptions approved", ARBA, "2027-06-30"),
        ("Post-event survey, certificate template and reconciliation sheet prepared", DIDI, "2027-07-15"),
    ]),
    ("Daily on-site", [
        ("07:00 team briefing: headcount plan, risks, weather, changes", FARREL, None), ("Headcount at every departure and arrival", RENITA, None),
        ("Volunteer roles confirmed with the local coordinator", SHAFIRA, None), ("Welfare desk open; dietary and medical needs checked", YASMINE, None),
        ("Attendance recorded for sessions", DIDI, None), ("Photos and consent list checked", MOJO, None),
        ("Daily announcement to participants and parents", ACHA, None), ("Receipts collected and petty cash logged", RENITA, None),
        ("21:00 debrief: incidents, issues, tomorrow's changes", FARREL, None), ("Curfew check (minors)", YASMINE, None),
    ]),
    ("Post-event", [
        ("All participants departed safely; departures confirmed", RENITA, "2027-08-03"), ("Thank-you messages to participants, parents, hosts, volunteers", ACHA, "2027-08-10"),
        ("Feedback survey closed and analysed", DIDI, "2027-08-13"), ("Certificates issued", MOJO, "2027-08-13"),
        ("Vendor balances settled; refunds processed", ARBA, "2027-08-31"), ("Budget vs actual reconciled", ARBA, "2027-08-31"),
        ("Incident review completed", FARREL, "2027-08-17"), ("Staff debrief held", FARREL, "2027-08-17"),
        ("Impact report published", ACHA, "2027-08-31"), ("Data retention applied", ARBA, "2027-09-30"),
        ("2028 recommendations recorded", FARREL, "2027-09-30"),
    ]),
    ("Journey: before departure", [
        ("Result and welcome message", ACHA, "2027-06-01"), ("Onboarding in the dashboard (forms, flights, consent)", RENITA, "2027-06-20"),
        ("Payment reminders until balance date", ARBA, "2027-06-30"), ("Handbook and parent pack", YASMINE, "2027-06-15"),
        ("Pre-departure briefing 1", RENITA, "2027-06-19"), ("Group allocation and buddy", YASMINE, "2027-07-15"),
        ("Pre-departure briefing 2 and packing list", RENITA, "2027-07-10"), ("Cultural preparation module", YASMINE, "2027-07-10"),
    ]),
    ("Journey: during programme", [
        ("Airport welcome and check-in in Singapore", RENITA, "2027-07-27"), ("Daily briefing and schedule", ACHA, None),
        ("Group supervision and buddy check-ins", YASMINE, None), ("Feedback pulse each evening", DIDI, None),
        ("Complaints and lost items handled at the welfare desk", YASMINE, None),
    ]),
    ("Journey: after programme", [
        ("Departure coordination from Bangkok", RENITA, "2027-08-03"), ("Certificates and awards", MOJO, "2027-08-13"),
        ("Feedback survey", DIDI, "2027-08-10"), ("Alumni community invitation", ACHA, "2027-08-31"),
        ("Testimonials with consent", MOJO, "2027-08-20"), ("Continued mentoring / follow-up opportunities", ARBA, "2027-09-15"),
    ]),
]

# ── Country plans ──────────────────────────────────────────────────────────────────────────────────────────────────
SECTIONS = ["Arrival and departure", "Accommodation", "Transportation", "Institutional engagement", "Local community support",
            "Venues", "Activities", "Local suppliers", "Emergency resources", "Daily operations"]
COUNTRY_LEAD = {"Singapore": SHAFIRA, "Malaysia": RENITA, "Thailand": ACHA}
COUNTRY_KNOWN = {
    ("Singapore", "Arrival and departure"): ("Proposed", "Participants arrive in Singapore (site: 'Plan your arrival in Singapore'). Programme starts 27 Jul.", "Arrival window and airport transfer plan (GIF-RES-003)."),
    ("Singapore", "Institutional engagement"): ("Pending", "NUS planned, not confirmed in writing.", "GIF-T-040/041."),
    ("Malaysia", "Arrival and departure"): ("Pending", "Entry by land from Singapore if GIF-DEC-003 option A.", "City (GIF-DEC-002)."),
    ("Malaysia", "Institutional engagement"): ("Pending", "Universiti Malaya planned on the website; UTM potential.", "GIF-DEC-002, GIF-T-041."),
    ("Thailand", "Arrival and departure"): ("Proposed", "Participants depart from Thailand (site). Last day 3 Aug.", "Departure transfers; group flight in."),
    ("Thailand", "Institutional engagement"): ("Pending", "Chulalongkorn planned, not confirmed in writing.", "GIF-T-041."),
    ("Thailand", "Daily operations"): ("Unknown", None, "Thai holidays in late July 2027 to check (TL-104, GIF-RES-014)."),
}

# ── Local partners (status reflects reality: nobody has been contacted for GIF 2027) ──────────────────────────────
PARTNERS = [
    # code, organisation, country, city, kind, support types, status, notes
    ("GIF-LP-001", "National University of Singapore (international/outreach office)", "Singapore", "Singapore", "University", ["Campus or institutional liaison", "Venue preparation"], "To research", "TSK-0107"),
    ("GIF-LP-002", "Universiti Malaya (international office)", "Malaysia", "Kuala Lumpur", "University", ["Campus or institutional liaison"], "To research", "Website lists UM as planned"),
    ("GIF-LP-003", "Universiti Teknologi Malaysia (KL or Johor Bahru campus)", "Malaysia", None, "University", ["Campus or institutional liaison"], "To research", "City depends on GIF-DEC-002"),
    ("GIF-LP-004", "Chulalongkorn University (international affairs)", "Thailand", "Bangkok", "University", ["Campus or institutional liaison", "Venue preparation"], "To research", None),
    ("GIF-LP-005", "Indonesian student association in Singapore (PPI Singapura)", "Singapore", "Singapore", "Student organisation", ["Participant assistance", "Local orientation", "Translation and communication", "Registration and attendance"], "To research", "Verify the current organisation and contact through official channels"),
    ("GIF-LP-006", "Indonesian student association in Malaysia (PPI Malaysia / campus branch)", "Malaysia", None, "Student organisation", ["Participant assistance", "Local orientation", "Registration and attendance"], "To research", None),
    ("GIF-LP-007", "Indonesian student association in Thailand (PPI Thailand)", "Thailand", "Bangkok", "Student organisation", ["Participant assistance", "Local orientation", "Translation and communication"], "To research", None),
    ("GIF-LP-008", "Host-university student clubs and societies (Singapore)", "Singapore", "Singapore", "Student organisation", ["Cultural activities", "Event setup and teardown", "Documentation and photography"], "To research", None),
    ("GIF-LP-009", "Host-university student representative council or clubs (Malaysia)", "Malaysia", None, "Student organisation", ["Cultural activities", "Event setup and teardown"], "To research", None),
    ("GIF-LP-010", "Host-university student government or clubs (Thailand)", "Thailand", "Bangkok", "Student organisation", ["Cultural activities", "Translation and communication", "Event setup and teardown"], "To research", None),
    ("GIF-LP-011", "Regional youth networks with local chapters (e.g. AIESEC or similar)", "Regional", None, "Youth community", ["Participant assistance", "Cultural activities"], "Identified", "Idea only; verify relevance and chapters"),
    ("GIF-LP-012", "Paid local coordinator or DMC, Singapore", "Singapore", "Singapore", "Paid local coordinator", ["Local coordination", "Transportation coordination", "Emergency assistance"], "To research", "GIF-RES-022"),
    ("GIF-LP-013", "Paid local coordinator or DMC, Malaysia", "Malaysia", None, "Paid local coordinator", ["Local coordination", "Transportation coordination", "Emergency assistance"], "To research", "GIF-RES-022"),
    ("GIF-LP-014", "Paid local coordinator or DMC, Thailand", "Thailand", "Bangkok", "Paid local coordinator", ["Local coordination", "Translation and communication", "Transportation coordination", "Emergency assistance"], "To research", "GIF-RES-022"),
    ("GIF-LP-015", "Cross-border coach operator (Singapore → Malaysia)", "Malaysia", None, "Vendor", ["Transportation coordination"], "To research", "GIF-RES-005"),
    ("GIF-LP-016", "Indonesian embassies and consulates (SG, MY, TH) for emergencies", "Regional", None, "Institution", ["Emergency assistance"], "Identified", "Contact sheet only; no request"),
]

# ── Findings ───────────────────────────────────────────────────────────────────────────────────────────────────────
FINDINGS = [
    ("GIF-FND-001", "Two GIF timelines with different programme dates", "DOC-0054 and 52 GIF rows on the Master Timeline (TL-020 to TL-104) use a 7-day programme on 5–11 Jul 2027 with applications from 26 Apr 2027. The platform and founder decisions use 27 Jul – 3 Aug 2027 with registration since 20 Nov 2026.", "DOC-0054 §2; os_timeline_items TL-051 'GIF 2027 event (seven days)' due 2027-07-11; apps/gif settings dates; gif.cohorts summer-2027", "High", "Mark old rows Cancelled with a pointer to WS10 (GIF-DEC-009).", "GIF-DEC-009"),
    ("GIF-FND-002", "Malaysia city conflict: Johor Bahru (UTM) vs Kuala Lumpur (Universiti Malaya)", "DOC-0054 plans UTM Johor Bahru; the website and engine settings list Universiti Malaya (Kuala Lumpur); UTM is not on the website.", "DOC-0054 §2; apps/gif/src/lib/settings.ts universities[]", "High", "Decide the city (GIF-DEC-002).", "GIF-DEC-002"),
    ("GIF-FND-003", "Deposit task conflicts with the platform", "PRJ-0033 has 'Secure USD 1,500 participant deposits' (TSK-0113, Arba, Ready, due 13 Nov, overdue; duplicate TSK-0122 cancelled). The engine charges USD 300 / IDR 5,000,000, itself unconfirmed.", "os_tasks TSK-0113; apps/gif settings prices.self_funded_deposit", "High", "Close or rewrite TSK-0113 after GIF-DEC-001.", "GIF-DEC-001"),
    ("GIF-FND-004", "Launch calendar events predate the live opening", "EV-0032 'GIF 2027 Open Pre-Launch' (7 Dec 2026) and EV-0033 'GIF 2027 Official Launch' (9 Jan 2027) vs Self-Funded/Mentoring open 20 Nov and Fully Funded 25 Nov 2026.", "os_events EV-0032, EV-0033; docs/gif-platform/IELSCO-INTEGRATION.md §4", "Medium", "Repurpose the events (GIF-DEC-010).", "GIF-DEC-010"),
    ("GIF-FND-005", "Vague and overdue PRJ-0033 tasks", "TSK-0112 'Follow up sales prospects' (Arba, due 13 Nov) has no definition of done; TSK-0114/0115 overdue since 13 Nov. Cancelled duplicates TSK-0121 to TSK-0127 exist.", "os_tasks", "Low", "Rewrite TSK-0112 as specific sponsor or partner tasks, or cancel; re-date TSK-0114/0115 (adopted as GIF-T-007/006).", None),
    ("GIF-FND-006", "Yasmine has the founder role in Company OS", "os_people PPL-0006 (Nashwa Maulida Yasmine, People Manager) has org_role 'founder', which gives access to every record including Restricted finance and legal. DOC-0053 lists two founders (Arba, Farrel). Her manager agreement is a manager engagement.", "os_people PPL-0006; DOC-0053 §2; manager agreement", "High", "Founder to confirm; if unintended, change her role to manager in Admin → People (an access change: needs Arba's OK).", None),
    ("GIF-FND-007", "Marketing division not in the Company OS", "Acha's agreement is for a Marketing division; in the OS she is a non-manager member of Growth (DIV-03). DOC-0053 had no Marketing division.", "os_person_divisions; manager agreement (Marketing)", "Medium", "Founder to decide whether Marketing becomes a division or stays inside Growth. GIF assigns Acha by name either way.", None),
    ("GIF-FND-008", "Role names differ between DOC-0053 and the current directory", "DOC-0053 (26 Oct) has Shafira as People, Operations and Partnerships vacant. The OS directory (Nov) has Shafira as Partnership Manager, Yasmine as People Manager, Renita as Operations Manager, Acha as Marketing Manager. The directory and the agreements are newer.", "DOC-0053 §2 vs os_people/os_person_profiles", "Medium", "Treat the directory as current; update DOC-0053 when it is next revised.", None),
    ("GIF-FND-009", "Meals are not in the Fully Funded cover", "Fully Funded covers programme fee, accommodation and in-programme transportation. Meals are not mentioned anywhere public.", "apps/gif settings awards; founder brief", "Medium", "Decide whether meals are in the programme fee and say so on the site and in the handbook.", None),
    ("GIF-FND-010", "UTM missing from the website university list", "The founder brief and DOC-0054 include UTM; the site lists NUS, UM and Chulalongkorn only.", "apps/gif settings universities[]", "Low", "Resolved by GIF-DEC-002/019.", "GIF-DEC-019"),
    ("GIF-FND-011", "Company OS project PRJ-0033 has no description or definition of done", "The GIF project exists (Active, owner Arba, Operations) with no description, success metric or definition of done.", "os_projects PRJ-0033", "Low", "Fill from the Facts tab once GIF-DEC-038 is decided.", "GIF-DEC-038"),
    ("GIF-FND-012", "Master Timeline links GIF to G0–G5 gates on the old dates", "Gate items TL-024 (G1, 12 Mar), TL-029 (G0, 15 Jan), TL-036 (G3, 23 Apr), TL-046 (G4, 1 Jun), TL-049 (G5, 25 Jun).", "os_timeline_items", "Medium", "Re-dated gates in WS10 (GIF-DEC-040).", "GIF-DEC-040"),
]

# ── Milestones (Master Timeline WS10) ──────────────────────────────────────────────────────────────────────────────
# title, start, due, owner, status, approved?, gate, dependencies, deliverable(completion), risk, major(critical path), refs
MILESTONES = [
    ("Self-Funded and Mentoring registration opens", "2026-11-20", "2026-11-20", ARBA, "Done", True, None, None, "Registration live on the IELSco Dashboard", None, False, "GIF-DEC-045"),
    ("Fully Funded applications open", "2026-11-25", "2026-11-25", DIDI, "Not started", True, None, "GIF-T-022", "Applications open with working Phase 1 tasks", "Broken Phase 1 links", True, "GIF-DEC-026"),
    ("G0 programme baseline gate", "2026-12-11", "2026-12-11", FARREL, "Not started", False, "G0", "GIF-T-002, GIF-T-005", "Concept note, team allocation and Critical decisions answered", "Work proceeds on unapproved assumptions", True, "GIF-DEC-040"),
    ("Route, cities and day split decided", "2026-12-01", "2027-01-15", FARREL, "Not started", False, None, "GIF-T-060", "GIF-DEC-002/003/004 Decided", "No quotes, no budget, no outreach dates", True, "GIF-DEC-002, GIF-DEC-003, GIF-DEC-004"),
    ("Mentoring Early Bird ends", "2026-12-31", "2026-12-31", ARBA, "Not started", True, None, None, "Price switches to Regular", None, False, "GIF-DEC-042"),
    ("Institutional requests sent", "2027-01-04", "2027-01-22", SHAFIRA, "Not started", False, None, "GIF-T-040", "Every target institution Contacted", "Hosts' calendars fill", True, "GIF-T-041"),
    ("Project Mentoring sessions run", "2027-02-02", "2027-05-11", ARBA, "Not started", True, None, "GIF-T-053", "Sessions delivered", "No mentors confirmed", False, "GIF-DEC-021"),
    ("Transport and accommodation quotes in", "2027-01-18", "2027-02-26", RENITA, "Not started", False, None, "Route decided", "Quotes attached to budget lines", "Budget gate slips", True, "GIF-T-061, GIF-T-063"),
    ("G1 partner gate", "2027-03-12", "2027-03-12", FARREL, "Not started", False, "G1", "GIF-T-042", "Hosts confirmed or fallback chosen", "Itinerary can't be finalised", True, "GIF-DEC-039"),
    ("G2 budget and funding gate", "2027-04-09", "2027-04-09", ARBA, "Not started", False, "G2", "GIF-T-011, GIF-T-017", "Budget approved; minimum viable cohort set", "Commitments without a budget", True, "GIF-DEC-014"),
    ("Local coordinators confirmed (3 countries)", "2027-02-01", "2027-04-30", SHAFIRA, "Not started", False, None, "GIF-DEC-016", "Written scope with each coordinator", "Core team overloaded on site", True, "GIF-T-072"),
    ("Phase 1 closes", "2027-05-10", "2027-05-10", DIDI, "Not started", True, None, None, "Phase 1 complete", None, False, "GIF-DEC-045"),
    ("Phase 2 (essay and pitch deck)", "2027-05-11", "2027-05-24", FARREL, "Not started", True, None, "GIF-T-024", "Submissions evaluated", None, False, "GIF-DEC-045"),
    ("Phase 3 (video presentation)", "2027-05-25", "2027-05-31", FARREL, "Not started", True, None, "GIF-T-025", "Evaluations complete", None, False, "GIF-DEC-045"),
    ("Selection results", "2027-06-01", "2027-06-01", FARREL, "Not started", True, None, "GIF-T-028", "Results published", None, True, "GIF-DEC-045"),
    ("G4 commitment gate: bookings signed", "2027-06-04", "2027-06-04", ARBA, "Not started", False, "G4", "GIF-T-018, GIF-T-028", "Contracts signed against paid revenue", "Late bookings; higher prices", True, "GIF-T-099"),
    ("Itinerary shared with confirmed delegates", "2027-06-08", "2027-06-08", FARREL, "Not started", True, None, "GIF-T-052", "Approved itinerary in the dashboard", "Site promise missed", True, "GIF-T-052"),
    ("Participant preparation", "2027-06-08", "2027-07-26", YASMINE, "Not started", True, None, None, "Handbook, briefings, forms", None, False, "GIF-DEC-045"),
    ("Pre-departure briefing 1", "2027-06-19", "2027-06-19", RENITA, "Not started", False, None, "GIF-T-087", "Briefing held", None, False, "GIF-T-088"),
    ("Balance due", "2027-06-30", "2027-06-30", ARBA, "Not started", True, None, None, "Balances paid", "Cash shortfall", False, "GIF-DEC-044"),
    ("Pre-departure briefing 2 and final checks", "2027-07-10", "2027-07-10", RENITA, "Not started", False, None, "GIF-T-088", "Briefing held; forms 100%", None, False, "GIF-T-088"),
    ("G5 final readiness review", "2027-07-13", "2027-07-13", FARREL, "Not started", False, "G5", "Pre-event readiness checklist", "All readiness items Done or owned", "Travel with gaps", True, "GIF-T-102"),
    ("Manifests, rooming lists and run sheets final", "2027-07-20", "2027-07-20", RENITA, "Not started", False, None, "GIF-T-066, GIF-T-067, GIF-T-081", "Sent to vendors and team", None, True, "GIF-T-081"),
    ("GIF Summer 2027 programme", "2027-07-27", "2027-08-03", FARREL, "Not started", True, None, "G5", "Programme delivered", None, True, "GIF-DEC-045"),
    ("Certificates, thank-yous and survey closed", "2027-08-04", "2027-08-13", ACHA, "Not started", False, None, None, "Issued and closed", None, False, "GIF-T-090, GIF-T-117"),
    ("Financial reconciliation and impact report", "2027-08-04", "2027-08-31", ARBA, "Not started", False, None, None, "Reconciled; report published", None, False, "GIF-T-113, GIF-T-115"),
    ("Close-out and 2028 recommendations", "2027-09-01", "2027-09-30", FARREL, "Not started", False, None, None, "Recommendations approved", None, False, "GIF-T-119"),
]

# ── Run sheet skeleton (country per day is open: GIF-DEC-004) ─────────────────────────────────────────────────────
RUN_DAYS = ["2027-07-27", "2027-07-28", "2027-07-29", "2027-07-30", "2027-07-31", "2027-08-01", "2027-08-02", "2027-08-03"]
